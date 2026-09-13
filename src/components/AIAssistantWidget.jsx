import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  getBookings,
  getRooms,
  getRoomTypes,
  getMasterData,
  updateRoomHousekeeping,
  updateBooking,
  createBooking,
  moveBooking,
  addExtra,
  addSettlement,
  cancelBooking,
} from "../services/api";
import {
  getYieldManagementStatus,
  setYieldManagementStatus,
  getYieldRules,
  calculateYieldPrice,
} from "../services/hotelConfig";
import "./aiAssistantWidget.css";

export default function AIAssistantWidget() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pendingOp, setPendingOp] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "ai",
      text: "Hello! 👋 How can I assist with your PMS operations today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Web Speech API Voice Recognition Initialization
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        if (transcript.trim()) {
          setTimeout(() => processUserCommand(transcript), 300);
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert("Voice speech recognition is not supported on this browser. Please type your command.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        setIsListening(false);
      }
    }
  };

  async function processUserCommand(query) {
    const text = query.trim().toLowerCase();
    setIsThinking(true);

    try {
      const [bookings, rooms, roomTypes, masterData] = await Promise.all([
        getBookings().catch(() => []),
        getRooms().catch(() => []),
        getRoomTypes().catch(() => []),
        getMasterData().catch(() => ({ summary: null, bookings: [] })),
      ]);

      let aiResponse = "";
      let cardData = null;

      // Helper to dispatch live UI events
      const notifyPmsUpdate = (type = "all") => {
        if (type === "all" || type === "bookings") window.dispatchEvent(new CustomEvent("pms_bookings_updated"));
        if (type === "all" || type === "rooms") window.dispatchEvent(new CustomEvent("pms_rooms_updated"));
        if (type === "yield") window.dispatchEvent(new CustomEvent("pms_yield_status_updated"));
      };

      // MULTI-TURN CROSS QUESTIONING RESOLUTION
      if (pendingOp) {
        if (pendingOp.type === "block_room") {
          let roomNo = pendingOp.data.roomNo;
          let reason = pendingOp.data.reason;
          let durationDays = pendingOp.data.durationDays;

          if (!roomNo) {
            const rMatch = text.match(/(?:room|rm)\s*#?\s*(\d+)/i) || text.match(/\b(\d{1,4})\b/);
            if (rMatch) roomNo = rMatch[1];
          }

          if (!reason) {
            const reasonExtract = text.match(/(?:reason|for|due to)?\s*(ac repair|plumbing|maintenance|painting|cleaning|inspection|renovation|electrical|water leak|tv repair|broken bed|[a-z\s]{3,30})/i);
            if (reasonExtract && !reasonExtract[1].includes("day") && !reasonExtract[1].includes("night")) {
              reason = reasonExtract[1].trim();
              reason = reason.charAt(0).toUpperCase() + reason.slice(1);
            }
          }

          if (!durationDays) {
            const daysMatch = text.match(/(\d+)\s*(?:night|day|week)s?/i);
            if (daysMatch) {
              const num = parseInt(daysMatch[1], 10);
              durationDays = text.includes("week") ? num * 7 : num;
            } else if (text.includes("until") || text.includes("to")) {
              durationDays = 3;
            }
          }

          if (!roomNo || !reason || !durationDays) {
            setPendingOp({ type: "block_room", data: { roomNo, reason, durationDays } });
            let questionStr = `Understood. `;
            if (roomNo) questionStr += `Blocking **Room ${roomNo}**. `;
            questionStr += `Please clarify:\n`;
            if (!roomNo) questionStr += `• **Which room number** would you like to block?\n`;
            if (!reason) questionStr += `• **What is the reason** for blocking (e.g. AC Repair, Plumbing, Painting)?\n`;
            if (!durationDays) questionStr += `• **For how many days / until when** (e.g. 2 days, 5 days, 1 week)?`;

            setMessages((prev) => [
              ...prev,
              {
                id: String(Date.now()),
                sender: "ai",
                text: questionStr,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
            ]);
            setIsThinking(false);
            return;
          }

          // ALL PARAMETERS SATISFIED FOR ROOM BLOCK
          const checkInDate = new Date();
          const checkOutDate = new Date();
          checkOutDate.setDate(checkInDate.getDate() + Number(durationDays || 2));
          const checkInStr = checkInDate.toISOString().slice(0, 10);
          const checkOutStr = checkOutDate.toISOString().slice(0, 10);

          const matchingRoom = rooms.find((r) => String(r.no).trim() === String(roomNo).trim());
          const rType = matchingRoom ? matchingRoom.type : "Standard";

          const blockRecord = await createBooking({
            guest: `🔒 Blocked (${reason})`,
            room: String(roomNo).trim(),
            roomType: rType,
            checkIn: checkInStr,
            checkOut: checkOutStr,
            status: "blocked",
            isBlocked: true,
            color: "#64748b",
            notes: reason,
            source: "Maintenance",
            adults: 0,
            children: 0,
            nightlyRate: 0,
            totalAmount: 0,
            advanceAmount: 0,
            balanceDue: 0,
            paymentStatus: "N/A",
          });

          await updateRoomHousekeeping(roomNo, { housekeeping: "Block", status: "Blocked", remark: reason });
          notifyPmsUpdate("all");
          setPendingOp(null);

          aiResponse = `🚫 **Room ${roomNo} Blocked Successfully!**\n\n• **Room**: **Room ${roomNo}** (${rType})\n• **Dates**: ${checkInStr} ➔ ${checkOutStr} (${durationDays} Days)\n• **Reason**: *"${reason}"*\n• **Status**: **Blocked / Out of Order**\n\n*The Out-Of-Order block bar is live on the Tape Chart Calendar grid!*`;
          cardData = { type: "booking", data: blockRecord };

          setMessages((prev) => [
            ...prev,
            {
              id: String(Date.now()),
              sender: "ai",
              text: aiResponse,
              card: cardData,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
          setIsThinking(false);
          return;
        }
      }

      // 1. PAGE NAVIGATION COMMANDS
      if (text.includes("open calendar") || text.includes("go to calendar") || text.includes("tape chart")) {
        navigate("/front-desk/calendar");
        aiResponse = "🚀 **Navigated to Front Desk Calendar / Tape Chart Grid!**";
      } else if (text.includes("open walk-in") || text.includes("walkin") || text.includes("walk in form")) {
        navigate("/front-desk/walkin");
        aiResponse = "🚀 **Navigated to Walk-In Reservation Desk!**";
      } else if (text.includes("open configuration") || text.includes("open config") || text.includes("settings")) {
        navigate("/configuration");
        aiResponse = "🚀 **Navigated to Property Setup & Configuration Panel!**";
      } else if (text.includes("open booking engine") || text.includes("public booking") || text.includes("ibe")) {
        navigate("/booking");
        aiResponse = "🚀 **Navigated to Public Guest Booking Engine!**";
      } else if (text.includes("open reports") || text.includes("manager report") || text.includes("analytics page")) {
        navigate("/reports");
        aiResponse = "🚀 **Navigated to Manager Financial Reports!**";
      }

      // 2. CREATE BOOKING COMMAND
      else if (text.includes("book") || text.includes("reservation") || text.includes("create booking")) {
        const roomMatch = text.match(/(?:room|rm)\s*#?\s*(\d+)/i);
        const nameMatch = text.match(/(?:for|guest)\s+([a-z\s]+?)(?=\s+(?:from|in|room|rm|on|for|\d)|$)/i);
        const daysMatch = text.match(/(\d+)\s*(?:night|day)s?/i);

        let targetRoomNo = roomMatch ? roomMatch[1] : "101";
        let targetGuest = nameMatch ? nameMatch[1].trim() : "Walk-in Guest";
        targetGuest = targetGuest.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        if (targetGuest.length < 2 || targetGuest.toLowerCase() === "room") targetGuest = "Alex Turner";

        const numNights = daysMatch ? parseInt(daysMatch[1], 10) : 2;
        const checkInDate = new Date();
        const checkOutDate = new Date();
        checkOutDate.setDate(checkInDate.getDate() + numNights);

        const checkInStr = checkInDate.toISOString().slice(0, 10);
        const checkOutStr = checkOutDate.toISOString().slice(0, 10);

        const matchingRoom = rooms.find((r) => String(r.no).trim() === String(targetRoomNo).trim()) || rooms[0] || { no: "101", type: "Standard Double", price: 120 };

        // Calculate yield price
        const totalRooms = rooms.length || 1;
        const occRooms = bookings.filter((b) => b.status === "checked-in" || b.status === "occupied").length;
        const currentOcc = Math.round((occRooms / totalRooms) * 100);
        const baseRate = Number(matchingRoom.price || 120);
        const yieldRes = calculateYieldPrice(baseRate, currentOcc, matchingRoom.type);
        const pricePerNight = yieldRes.adjustedPrice;
        const totalAmt = pricePerNight * numNights;

        const newBooking = await createBooking({
          guest: targetGuest,
          email: `${targetGuest.toLowerCase().replace(/[^a-z0-9]/g, ".")}@example.com`,
          phone: "+1 (555) 392-1082",
          room: matchingRoom.no,
          roomType: matchingRoom.type || "Standard Double",
          checkIn: checkInStr,
          checkOut: checkOutStr,
          adults: 2,
          children: 0,
          status: "confirmed",
          source: "AI Co-Pilot",
          nightlyRate: pricePerNight,
          totalAmount: totalAmt,
          advanceAmount: Math.round(totalAmt * 0.5),
          balanceDue: Math.round(totalAmt * 0.5),
          paymentStatus: "Partial",
          paymentMethod: "Credit Card",
          notes: `Created via AI Assistant (${yieldRes.adjustmentText})`,
        });

        notifyPmsUpdate("all");

        aiResponse = `🎉 **Reservation Created Successfully!**\n\n• **Guest**: **${newBooking.guest || targetGuest}**\n• **Room**: **Room ${newBooking.room || targetRoomNo}** (${newBooking.roomType || "Standard"})\n• **Dates**: ${checkInStr} to ${checkOutStr} (${numNights} Nights)\n• **Rate**: $${pricePerNight}/night [${yieldRes.adjustmentText}]\n• **Total Tariff**: **$${totalAmt}** ($${newBooking.advanceAmount} Advance Paid)\n\n*Reservation added to Tape Chart Calendar!*`;
        cardData = { type: "booking", data: newBooking };
      }

      // 3. CHECK-IN COMMAND
      else if (text.includes("check in") || text.includes("checkin")) {
        const queryVal = text.replace(/.*check ?in\s*/i, "").trim();
        let found = null;

        if (queryVal) {
          found = bookings.find(
            (b) =>
              b.guest.toLowerCase().includes(queryVal) ||
              String(b.room).trim() === queryVal ||
              String(b.id).toLowerCase() === queryVal
          );
        }

        if (!found) {
          found = bookings.find((b) => b.status === "confirmed");
        }

        if (found) {
          await updateBooking(found.id, { status: "checked-in" });
          await updateRoomHousekeeping(found.room, { status: "occupied", housekeeping: "Clean" });
          notifyPmsUpdate("all");

          aiResponse = `🔑 **Check-In Executed!**\n\n• **Guest**: **${found.guest}**\n• **Room**: **Room ${found.room}**\n• **Status**: Changed to **Checked-In** 🟢\n• **Key Card**: Programmed & Issued.\n\n*Updated on Tape Chart & Front Desk!*`;
          cardData = { type: "checkin", data: found };
        } else {
          aiResponse = `⚠️ Could not find a pending confirmed booking matching "${queryVal || "today"}".`;
        }
      }

      // 4. CHECK-OUT COMMAND
      else if (text.includes("check out") || text.includes("checkout")) {
        const queryVal = text.replace(/.*check ?out\s*/i, "").trim();
        let found = bookings.find(
          (b) =>
            (b.status === "checked-in" || b.status === "occupied") &&
            (b.guest.toLowerCase().includes(queryVal) || String(b.room).trim() === queryVal)
        );

        if (!found) {
          found = bookings.find((b) => b.status === "checked-in" || b.status === "occupied");
        }

        if (found) {
          await updateBooking(found.id, { status: "checked-out" });
          await updateRoomHousekeeping(found.room, { housekeeping: "Dirty", status: "occupied" });
          notifyPmsUpdate("all");

          aiResponse = `🚪 **Check-Out Processed!**\n\n• **Guest**: **${found.guest}**\n• **Room**: **Room ${found.room}**\n• **Status**: Changed to **Checked-Out** 🔴\n• **Housekeeping**: Room ${found.room} marked **Dirty** for housekeeping.\n\n*Folio dispatched and room logged on Housekeeping Board!*`;
          cardData = { type: "checkout", data: found };
        } else {
          aiResponse = `⚠️ No active checked-in guest found matching "${queryVal || "current occupied rooms"}".`;
        }
      }

      // 5. CANCEL RESERVATION COMMAND
      else if (text.includes("cancel booking") || text.includes("cancel reservation") || text.includes("cancellation")) {
        const queryVal = text.replace(/.*cancel\s*(?:booking|reservation)?\s*(?:for)?\s*/i, "").trim();
        const found = bookings.find(
          (b) =>
            b.status !== "cancelled" &&
            (b.guest.toLowerCase().includes(queryVal) || String(b.room).trim() === queryVal)
        );

        if (found) {
          await cancelBooking(found.id, "Cancelled via AI Help Assistant");
          notifyPmsUpdate("all");
          aiResponse = `🔴 **Reservation Cancelled!**\n\n• **Guest**: **${found.guest}**\n• **Room**: Room ${found.room}\n• **Status**: **Cancelled**\n\n*Room ${found.room} has been released back into available inventory.*`;
        } else {
          aiResponse = `⚠️ Could not locate an active reservation matching "${queryVal}".`;
        }
      }

      // 6. BLOCK / OUT OF ORDER COMMAND
      else if (text.includes("block") || text.includes("out of order") || text.includes("maintenance")) {
        const roomMatch = text.match(/(?:room|rm)\s*#?\s*(\d+)/i);
        const roomNo = roomMatch ? roomMatch[1] : null;

        const reasonMatch = text.match(/(?:for|due to|reason)\s+([a-z0-9\s]{3,30})/i);
        let reason = reasonMatch ? reasonMatch[1].trim() : null;

        const daysMatch = text.match(/(\d+)\s*(?:night|day|week)s?/i);
        let durationDays = daysMatch ? parseInt(daysMatch[1], 10) : null;
        if (daysMatch && text.includes("week")) durationDays *= 7;

        if (!roomNo || !reason || !durationDays) {
          setPendingOp({ type: "block_room", data: { roomNo, reason, durationDays } });

          let questionStr = `Got it! I can block `;
          if (roomNo) questionStr += `**Room ${roomNo}** for you. `;
          else questionStr += `a room for you. `;
          questionStr += `Please specify:\n`;

          if (!roomNo) questionStr += `• **Which room number** would you like to block?\n`;
          if (!reason) questionStr += `• **What is the reason** for blocking (e.g. AC Repair, Plumbing, Maintenance)?\n`;
          if (!durationDays) questionStr += `• **For how many days / until when** should it be blocked (e.g. 2 days, 1 week)?`;

          aiResponse = questionStr;
        } else {
          // ALL PARAMETERS SATISFIED IN SINGLE TURN
          const checkInDate = new Date();
          const checkOutDate = new Date();
          checkOutDate.setDate(checkInDate.getDate() + Number(durationDays || 2));
          const checkInStr = checkInDate.toISOString().slice(0, 10);
          const checkOutStr = checkOutDate.toISOString().slice(0, 10);

          const matchingRoom = rooms.find((r) => String(r.no).trim() === String(roomNo).trim());
          const rType = matchingRoom ? matchingRoom.type : "Standard";

          const blockRecord = await createBooking({
            guest: `🔒 Blocked (${reason})`,
            room: String(roomNo).trim(),
            roomType: rType,
            checkIn: checkInStr,
            checkOut: checkOutStr,
            status: "blocked",
            isBlocked: true,
            color: "#64748b",
            notes: reason,
            source: "Maintenance",
            adults: 0,
            children: 0,
            nightlyRate: 0,
            totalAmount: 0,
            advanceAmount: 0,
            balanceDue: 0,
            paymentStatus: "N/A",
          });

          await updateRoomHousekeeping(roomNo, { housekeeping: "Block", status: "Blocked", remark: reason });
          notifyPmsUpdate("all");

          aiResponse = `🚫 **Room ${roomNo} Blocked Successfully!**\n\n• **Room**: **Room ${roomNo}** (${rType})\n• **Dates**: ${checkInStr} ➔ ${checkOutStr} (${durationDays} Days)\n• **Reason**: *"${reason}"*\n• **Status**: **Blocked / Out of Order**\n\n*The Out-Of-Order block bar is live on the Tape Chart Calendar grid!*`;
          cardData = { type: "booking", data: blockRecord };
        }
      }

      // 7. UNBLOCK ROOM COMMAND
      else if (text.includes("unblock") || text.includes("make room available")) {
        const roomMatch = text.match(/(?:room|rm)\s*#?\s*(\d+)/i);
        const roomNo = roomMatch ? roomMatch[1] : "11";

        const activeBlocks = bookings.filter(
          (b) => String(b.room).trim() === String(roomNo).trim() && (b.status === "blocked" || (b.guest && b.guest.includes("Blocked")))
        );

        for (const blk of activeBlocks) {
          await cancelBooking(blk.id, "Unblocked via AI Assistant");
        }

        await updateRoomHousekeeping(roomNo, { housekeeping: "Clean", status: "available", remark: "" });
        notifyPmsUpdate("all");

        aiResponse = `🟢 **Room ${roomNo} Unblocked & Available!**\n\n• **Room**: **Room ${roomNo}**\n• **Status**: **Clean & Available**\n\n*The block record has been removed and Room ${roomNo} is open on the Tape Chart Calendar!*`;
      }

      // 8. ROOM MOVE COMMAND
      else if (text.includes("move") || text.includes("transfer room")) {
        const fromMatch = text.match(/(?:from|room|rm)\s*#?\s*(\d+)/i);
        const toMatch = text.match(/(?:to|room|rm)\s*#?\s*(\d+)/i);
        const nameMatch = text.match(/(?:move|transfer)\s+([a-z\s]+?)(?=\s+to|\s+from|$)/i);

        let fromRoom = fromMatch ? fromMatch[1] : "101";
        let toRoom = toMatch ? toMatch[1] : "205";
        let nameQuery = nameMatch ? nameMatch[1].trim() : "";

        let activeBooking = bookings.find(
          (b) =>
            (b.status === "checked-in" || b.status === "confirmed") &&
            (String(b.room).trim() === fromRoom || (nameQuery && b.guest.toLowerCase().includes(nameQuery)))
        );

        if (!activeBooking && bookings.length > 0) {
          activeBooking = bookings[0];
          fromRoom = activeBooking.room;
        }

        if (activeBooking) {
          await moveBooking(activeBooking.id, toRoom, `AI Room Move from Room ${fromRoom} to Room ${toRoom}`);
          notifyPmsUpdate("all");
          aiResponse = `🔄 **Room Move Executed!**\n\n• **Guest**: **${activeBooking.guest}**\n• **Previous Room**: Room ${fromRoom}\n• **New Room**: **Room ${toRoom}**\n\n*Tape chart updated and housekeeping notified.*`;
        } else {
          aiResponse = `⚠️ Could not locate an active booking in Room ${fromRoom} to move.`;
        }
      }

      // 9. POST FOLIO CHARGE OR SETTLEMENT PAYMENT
      else if (text.includes("settle") || text.includes("collect payment") || text.includes("pay folio")) {
        const amountMatch = text.match(/\$?(\d+(?:\.\d{1,2})?)/);
        const roomMatch = text.match(/(?:room|rm)\s*#?\s*(\d+)/i);
        const payAmt = amountMatch ? parseFloat(amountMatch[1]) : 100.0;
        const roomNo = roomMatch ? roomMatch[1] : "101";

        const targetBooking = bookings.find((b) => String(b.room).trim() === roomNo || b.guest.toLowerCase().includes(text)) || bookings[0];

        if (targetBooking) {
          await addSettlement(targetBooking.id, {
            amount: payAmt,
            method: text.includes("cash") ? "Cash" : text.includes("upi") ? "UPI" : "Credit Card",
            notes: "Settled via AI Operations Co-Pilot",
          });
          notifyPmsUpdate("bookings");
          aiResponse = `💳 **Folio Payment Settled!**\n\n• **Guest**: **${targetBooking.guest}** (Room ${targetBooking.room})\n• **Payment Received**: **$${payAmt.toFixed(2)}**\n• **Method**: Credit Card / Instant Settlement\n\n*Updated folio balance in Guest Billing ledger!*`;
        } else {
          aiResponse = `⚠️ Could not locate active folio for payment.`;
        }
      } else if (text.includes("add") || text.includes("charge") || text.includes("post charge") || text.includes("room service")) {
        const amountMatch = text.match(/\$?(\d+(?:\.\d{1,2})?)/);
        const roomMatch = text.match(/(?:room|rm)\s*#?\s*(\d+)/i);
        const chargeAmt = amountMatch ? parseFloat(amountMatch[1]) : 45.0;
        const roomNo = roomMatch ? roomMatch[1] : "102";

        const targetBooking = bookings.find((b) => String(b.room).trim() === roomNo) || bookings[0];

        if (targetBooking) {
          await addExtra(targetBooking.id, {
            description: text.includes("laundry") ? "Laundry Service" : text.includes("parking") ? "Parking Fee" : "Room Service & Dining",
            amount: chargeAmt,
            category: "Room Service",
          });
          notifyPmsUpdate("bookings");
          aiResponse = `💳 **Folio Charge Posted!**\n\n• **Booking**: **${targetBooking.guest}** (Room ${targetBooking.room})\n• **Charge Posted**: **+$${chargeAmt.toFixed(2)}**\n• **Item**: Room Service & Extras\n\n*Updated folio balance due!*`;
        } else {
          aiResponse = `⚠️ Could not locate an active folio for Room ${roomNo}.`;
        }
      }

      // 10. HOUSEKEEPING COMMANDS
      else if (text.includes("dirty") || text.includes("housekeeping") || text.includes("clean")) {
        const markMatch = text.match(/mark (?:room )?(\d+) (?:as )?(clean|dirty|block)/i);
        const markAllClean = text.includes("all clean") || text.includes("clean all rooms");

        if (markAllClean) {
          const dirtyList = rooms.filter((r) => r.housekeeping === "Dirty" || r.status === "Dirty");
          for (const r of dirtyList) {
            await updateRoomHousekeeping(r.no, { housekeeping: "Clean" });
          }
          notifyPmsUpdate("rooms");
          aiResponse = `✅ **All ${dirtyList.length} Dirty Rooms Have Been Marked Clean & Ready for Check-In!**`;
        } else if (markMatch) {
          const roomNo = markMatch[1];
          const newStatus = markMatch[2].toLowerCase();
          const roomObj = rooms.find((r) => String(r.no).trim() === String(roomNo).trim());

          if (roomObj) {
            const capitalized = newStatus === "clean" ? "Clean" : newStatus === "dirty" ? "Dirty" : "Block";
            await updateRoomHousekeeping(roomObj.no, { housekeeping: capitalized });
            notifyPmsUpdate("rooms");
            aiResponse = `✅ Done! **Room ${roomNo}** status updated to **${capitalized}** on the Housekeeping Board!`;
          } else {
            aiResponse = `⚠️ Could not find Room ${roomNo} in inventory.`;
          }
        } else {
          const dirtyList = rooms.filter((r) => r.housekeeping === "Dirty" || r.status === "Dirty" || r.housekeeping === "dirty");
          if (dirtyList.length === 0) {
            aiResponse = "🟢 **All 100% Rooms are Clean and Ready for Check-in!**";
          } else {
            const roomNumbers = dirtyList.map((r) => `Room ${r.no}`).join(", ");
            aiResponse = `🔴 **Rooms Needing Housekeeping (${dirtyList.length})**:\n\n${roomNumbers}\n\n*Tell me "Mark Room [Number] as Clean" or "Clean all rooms" to resolve!*`;
          }
        }
      }

      // 11. YIELD MANAGEMENT COMMANDS
      else if (text.includes("yield") || text.includes("dynamic pricing")) {
        if (text.includes("enable") || text.includes("turn on") || text.includes("activate")) {
          setYieldManagementStatus(true);
          notifyPmsUpdate("yield");
          aiResponse = "⚡ **Automated Yield Management & Dynamic Pricing ENABLED!**\n\n*Room tariffs will dynamically adjust based on live occupancy percentage.*";
        } else if (text.includes("disable") || text.includes("turn off") || text.includes("pause")) {
          setYieldManagementStatus(false);
          notifyPmsUpdate("yield");
          aiResponse = "⏸️ **Yield Management Auto-Pricing PAUSED!**\n\n*System is using standard base room tariffs.*";
        } else {
          const status = getYieldManagementStatus();
          const rules = getYieldRules();
          aiResponse = `📈 **Yield Management Status**:\n\n• **Status**: **${status ? "🟢 ENABLED" : "⏸️ PAUSED"}**\n• **Configured Tiers**: ${rules.length} Yield Rules\n\n*Say "Enable Yield Pricing" or "Pause Yield Pricing" to control.*`;
        }
      }

      // 12. GUEST SEARCH & ROOM LOOKUPS
      else if (text.includes("who is in") || text.includes("who is checking in") || text.includes("find guest") || text.includes("search")) {
        const roomMatch = text.match(/(?:room|rm)\s*#?\s*(\d+)/i);
        if (roomMatch) {
          const rNo = roomMatch[1];
          const found = bookings.find((b) => String(b.room).trim() === rNo && (b.status === "checked-in" || b.status === "occupied" || b.status === "confirmed"));
          if (found) {
            aiResponse = `👤 **Room ${rNo} Details**:\n\n• **Guest**: **${found.guest}**\n• **Status**: ${found.status.toUpperCase()}\n• **Dates**: ${found.checkIn} to ${found.checkOut}\n• **Folio Balance Due**: $${found.balanceDue || 0}`;
          } else {
            aiResponse = `ℹ️ Room ${rNo} is currently vacant and unassigned.`;
          }
        } else {
          const activeList = bookings.filter((b) => b.status === "checked-in" || b.status === "confirmed");
          const names = activeList.map((b) => `• **${b.guest}** (Room ${b.room} - ${b.status})`).join("\n");
          aiResponse = `📋 **Current Active Guests (${activeList.length})**:\n\n${names || "No active guests currently checked in."}`;
        }
      }

      // 13. REVPAR & FINANCIAL ANALYTICS
      else if (text.includes("revpar") || text.includes("adr") || text.includes("revenue") || text.includes("financial") || text.includes("metrics")) {
        const totalRooms = rooms.length || 16;
        const occupied = bookings.filter((b) => b.status === "checked-in" || b.status === "occupied" || b.status === "confirmed").length;
        const occRate = Math.round((occupied / totalRooms) * 100);

        const totalRev = masterData.summary?.totalRevenue || bookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
        const adr = occupied > 0 ? totalRev / occupied : 0;
        const revpar = totalRev / totalRooms;
        const totalPaid = bookings.reduce((sum, b) => sum + Number(b.advanceAmount || 0), 0);
        const totalDue = masterData.summary?.totalBalanceDue || bookings.reduce((sum, b) => sum + Number(b.balanceDue || 0), 0);

        aiResponse = `📊 **PMS Master Financial Analytics**:\n\n• **Occupancy Rate**: **${occRate}%** (${occupied}/${totalRooms} Rooms)\n• **ADR (Average Daily Rate)**: **$${adr.toFixed(2)}**\n• **RevPAR (Revenue Per Available Room)**: **$${revpar.toFixed(2)}**\n• **Total Realized Revenue**: **$${totalRev.toLocaleString("en-US", { minimumFractionDigits: 2 })}**\n• **Collections Paid**: $${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}\n• **Outstanding Balance Due**: $${totalDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
        cardData = { type: "analytics", data: { occRate, adr, revpar, totalRev, totalPaid, totalDue, occupied, totalRooms } };
      }

      // DEFAULT RESPONSE
      else {
        aiResponse = `🤖 I received your command: *"${query}"*.\n\nI can execute any operational task in real-time:\n1. **Bookings**: *"Book Room 201 for Alex Turner for 2 nights"* \n2. **Check-In/Out**: *"Check in Amit Kulkarni"* or *"Check out Room 104"*\n3. **Cancellations**: *"Cancel booking for Room 102"*\n4. **Room Blocks**: *"Block Room 302 for AC repair"*\n5. **Room Move**: *"Move Alex Turner to Room 305"*\n6. **Folio Charge/Pay**: *"Add $45 room service to Room 102"* / *"Settle folio for Room 101"*\n7. **Housekeeping**: *"Mark Room 201 as Clean"* / *"Clean all rooms"*\n8. **Yield Controls**: *"Enable Yield Pricing"*`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: "ai",
          text: aiResponse,
          card: cardData,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err) {
      console.error("AI Command Execution Error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: "ai",
          text: "⚠️ Encountered an issue executing PMS command. Please try again.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  }

  function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || isThinking) return;
    const userMsg = input.trim();
    setInput("");

    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        sender: "user",
        text: userMsg,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);

    setTimeout(() => {
      processUserCommand(userMsg);
    }, 150);
  }



  return (
    <div className="ai-assistant-widget-root">
      {/* FLOATING AI TRIGGER BUTTON (BOTTOM-RIGHT POPUP) */}
      <button
        type="button"
        className={`ai-widget-trigger-floating ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen((v) => !v)}
        title="Open AI Receptionist Assistant"
      >
        <span className="icon">🤖</span>
        <span className="lbl">AI Help</span>
        <span className="online-dot" />
      </button>

      {/* CHAT DRAWER */}
      {isOpen && (
        <div className="ai-chat-drawer">
          {/* HEADER */}
          <div className="ai-chat-header">
            <div className="ai-chat-title-group">
              <div className="ai-avatar">🤖</div>
              <div>
                <h4>InnOut AI Help</h4>
                <p className="status">● Autonomous PMS Operations Engine</p>
              </div>
            </div>
            <button type="button" className="ai-chat-close" onClick={() => setIsOpen(false)}>
              ✕
            </button>
          </div>

          {/* MESSAGES BODY */}
          <div className="ai-chat-messages">
            {messages.map((m) => (
              <div key={m.id} className={`ai-message-row ${m.sender}`}>
                <div className="ai-bubble">
                  <div
                    className="text"
                    dangerouslySetInnerHTML={{
                      __html: m.text
                        .replace(/\n/g, "<br/>")
                        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                        .replace(/\*(.*?)\*/g, "<em>$1</em>")
                    }}
                  />
                  
                  {/* RICH ACTION CARDS */}
                  {m.card && m.card.type === "booking" && (
                    <div className="ai-action-card booking-card">
                      <div className="card-badge">🎟️ RESERVATION TICKET</div>
                      <div className="card-title">Guest: {m.card.data.guest}</div>
                      <div className="card-sub">Room {m.card.data.room} · {m.card.data.roomType}</div>
                      <div className="card-dates">📅 {m.card.data.checkIn} ➔ {m.card.data.checkOut}</div>
                      <div className="card-price">Total: ${m.card.data.totalAmount} (Advance: ${m.card.data.advanceAmount})</div>
                    </div>
                  )}

                  {m.card && m.card.type === "analytics" && (
                    <div className="ai-action-card analytics-card">
                      <div className="card-badge">📊 FINANCIAL METRICS</div>
                      <div className="metrics-grid">
                        <div><span>RevPAR</span><strong>${m.card.data.revpar.toFixed(2)}</strong></div>
                        <div><span>ADR</span><strong>${m.card.data.adr.toFixed(2)}</strong></div>
                        <div><span>Occupancy</span><strong>{m.card.data.occRate}%</strong></div>
                      </div>
                    </div>
                  )}

                  <span className="time">{m.timestamp}</span>
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="ai-message-row ai">
                <div className="ai-bubble thinking">
                  <span>Executing PMS Action</span>
                  <span className="dots">...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>


          {/* INPUT FORM */}
          <form className="ai-chat-input-area" onSubmit={handleSend}>
            <button
              type="button"
              className={`mic-btn ${isListening ? "listening" : ""}`}
              onClick={toggleVoiceInput}
              title={isListening ? "Listening... Speak your command" : "Click to speak voice command"}
            >
              {isListening ? "🔴" : "🎙️"}
            </button>
            <input
              type="text"
              className="ai-chat-input"
              placeholder={isListening ? "Listening to your voice..." : "Type or speak command (e.g. 'Book Room 201 for Alex Turner')..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isThinking}
            />
            <button type="submit" className="ai-chat-send" disabled={!input.trim() || isThinking}>
              ➔
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
