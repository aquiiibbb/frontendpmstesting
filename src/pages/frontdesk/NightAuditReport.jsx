import React, { useState, useEffect, useMemo } from "react";
import { getBookings, getRooms } from "../../services/api";
import CustomDatePicker from "../../components/CustomDatePicker";
import { getBusinessDate } from "../../services/hotelConfig";
import { exportToExcel, exportToPDF, exportToWord } from "../../utils/exportUtils";
import { 
  Moon, 
  Download, 
  Printer, 
  FileText,
  Calendar as CalendarIcon,
  CreditCard,
  UserCheck,
  UserX,
  PlusCircle,
  ShieldCheck,
  DollarSign,
  ArrowLeft,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import "./masterreport.css";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatMoney(v) {
  return `$${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" }).format(d);
}

export default function NightAuditReport() {
  const [auditDate, setAuditDate] = useState(() => getBusinessDate() || todayISO());
  const [activeTab, setActiveTab] = useState("all_transactions"); // "all_transactions", "checkins", "checkouts", "new_bookings", "blocks"
  const [bookingsList, setBookingsList] = useState([]);
  const [roomsList, setRoomsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    window.addEventListener("pms_bookings_updated", fetchData);
    window.addEventListener("pms_rooms_updated", fetchData);
    window.addEventListener("storage", fetchData);
    return () => {
      window.removeEventListener("pms_bookings_updated", fetchData);
      window.removeEventListener("pms_rooms_updated", fetchData);
      window.removeEventListener("storage", fetchData);
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bList, rList] = await Promise.all([getBookings(), getRooms()]);
      setBookingsList(Array.isArray(bList) ? bList : []);
      setRoomsList(Array.isArray(rList) ? rList : []);
    } catch (err) {
      console.error("Error loading Night Audit report data", err);
    } finally {
      setLoading(false);
    }
  };

  // --- COMPUTE AUDIT ACTIVITIES FOR THE PARTICULAR SELECTED DATE ---
  const auditActivity = useMemo(() => {
    const targetDate = auditDate;

    // 1. CHECK-INS EXECUTED ON PARTICULAR DATE
    const checkInsHappened = bookingsList.filter((b) => {
      const statusLower = (b.status || "").toLowerCase();
      if (statusLower === "cancelled" || b.isDeleted) return false;
      const isBlock = statusLower === "blocked" || statusLower === "maintenance" || statusLower === "out-of-order" || Boolean(b.isBlocked);
      if (isBlock) return false;

      // Check-in occurred on targetDate
      const actualCheckIn = b.actualCheckInDate || b.checkInDate || b.checkIn;
      return actualCheckIn === targetDate || (b.checkIn === targetDate && (statusLower === "checked-in" || statusLower === "checked_in" || statusLower === "in-house"));
    });

    // 2. CHECK-OUTS EXECUTED ON PARTICULAR DATE
    const checkOutsHappened = bookingsList.filter((b) => {
      const statusLower = (b.status || "").toLowerCase();
      if (b.isDeleted) return false;
      const actualCheckOut = b.actualCheckOutDate || b.checkOutDate || b.checkOut;
      return actualCheckOut === targetDate || (b.checkOut === targetDate && (statusLower === "checked-out" || statusLower === "checked_out" || statusLower === "completed"));
    });

    // 3. NEW RESERVATIONS CREATED ON PARTICULAR DATE
    const newBookingsCreated = bookingsList.filter((b) => {
      const createdRaw = b.bookingDate || b.createdDate || b.createdAt || b.date;
      if (!createdRaw) return b.checkIn === targetDate;
      return String(createdRaw).slice(0, 10) === targetDate;
    });

    // 4. FINANCIAL TRANSACTIONS & PAYMENTS POSTED ON PARTICULAR DATE
    const financialTransactions = [];
    bookingsList.forEach((b) => {
      const guestName = b.guest || b.fullName || "Guest";
      const roomNo = b.room || "Unassigned";

      // Check Payments
      if (Array.isArray(b.payments)) {
        b.payments.forEach((p, idx) => {
          const pDate = p.date || p.timestamp || b.checkIn;
          if (String(pDate).slice(0, 10) === targetDate) {
            financialTransactions.push({
              id: p.id || `pay_${b.id}_${idx}`,
              guest: guestName,
              room: roomNo,
              type: "Payment Settlement",
              category: p.type || "Guest Payment",
              payMethod: p.method || b.paymentMethod || "Credit Card",
              amount: Number(p.amount || 0),
              isCredit: true,
              notes: p.notes || "Payment received at desk",
              user: p.createdBy || "FrontDesk Staff"
            });
          }
        });
      }

      // Check Extras / POS Charges posted on date
      if (Array.isArray(b.extras)) {
        b.extras.forEach((e, idx) => {
          const eDate = e.date || e.timestamp || b.checkIn;
          if (String(eDate).slice(0, 10) === targetDate) {
            financialTransactions.push({
              id: e.id || `ext_${b.id}_${idx}`,
              guest: guestName,
              room: roomNo,
              type: "Extra Charge / POS",
              category: e.category || "Addon Service",
              payMethod: "Folio Charge",
              amount: Number(e.amountUSD || e.amount || 0),
              isCredit: false,
              notes: e.description || e.name || "Room charge",
              user: "FrontDesk Staff"
            });
          }
        });
      }

      // If checkIn on targetDate, record Room Tariff
      if (b.checkIn === targetDate && (b.status || "").toLowerCase() !== "cancelled") {
        const sub = Number(b.subtotal || (Number(b.ratePerNight || 149) * Number(b.nights || 1)));
        financialTransactions.push({
          id: `tariff_${b.id}`,
          guest: guestName,
          room: roomNo,
          type: "Nightly Room Tariff",
          category: "Room Revenue",
          payMethod: "Room Charge",
          amount: sub,
          isCredit: false,
          notes: `Nightly room tariff for ${b.roomType || 'Standard'}`,
          user: "System Night Audit"
        });
      }
    });

    // 5. ROOM BLOCK & MAINTENANCE ACTIONS ON PARTICULAR DATE
    const blocksHappened = bookingsList.filter((b) => {
      const statusLower = (b.status || "").toLowerCase();
      const isBlock = statusLower === "blocked" || statusLower === "maintenance" || statusLower === "out-of-order" || Boolean(b.isBlocked);
      if (!isBlock) return false;
      return b.checkIn <= targetDate && b.checkOut >= targetDate;
    });

    // Financial Metrics for Selected Date
    const totalPostings = financialTransactions.filter((t) => !t.isCredit).reduce((sum, t) => sum + t.amount, 0);
    const totalPayments = financialTransactions.filter((t) => t.isCredit).reduce((sum, t) => sum + t.amount, 0);
    const netDayBalance = totalPostings - totalPayments;

    return {
      targetDate,
      checkInsHappened,
      checkOutsHappened,
      newBookingsCreated,
      financialTransactions,
      blocksHappened,
      totalPostings,
      totalPayments,
      netDayBalance
    };
  }, [auditDate, bookingsList]);

  // Export Data Handler
  const getExportData = () => {
    if (activeTab === "checkins") {
      const headers = ["Guest Name", "Room #", "Room Category", "Check-In Date", "Check-Out Date", "Status"];
      const data = auditActivity.checkInsHappened.map((b) => [
        b.guest || b.fullName, b.room, b.roomType || "Standard", b.checkIn, b.checkOut, (b.status || "CHECKED-IN").toUpperCase()
      ]);
      return { title: `Check-Ins Executed on ${formatDateDisplay(auditDate)}`, headers, data };
    }

    if (activeTab === "checkouts") {
      const headers = ["Guest Name", "Room #", "Room Category", "Check-In Date", "Check-Out Date", "Total Folio ($)", "Balance Due ($)"];
      const data = auditActivity.checkOutsHappened.map((b) => [
        b.guest || b.fullName, b.room, b.roomType || "Standard", b.checkIn, b.checkOut, formatMoney(b.totalAmount), formatMoney(b.balanceDue || 0)
      ]);
      return { title: `Check-Outs Executed on ${formatDateDisplay(auditDate)}`, headers, data };
    }

    if (activeTab === "new_bookings") {
      const headers = ["Booking ID", "Guest Name", "Room #", "Check-In Date", "Check-Out Date", "Total Tariff ($)"];
      const data = auditActivity.newBookingsCreated.map((b) => [
        b.id || b.referenceCode, b.guest || b.fullName, b.room, b.checkIn, b.checkOut, formatMoney(b.totalAmount)
      ]);
      return { title: `New Reservations Created on ${formatDateDisplay(auditDate)}`, headers, data };
    }

    // Default: All Transactions
    const headers = ["Tx ID", "Guest Name", "Room #", "Transaction Type", "Category", "Payment Method", "Amount ($)", "Auditor / User"];
    const data = auditActivity.financialTransactions.map((t) => [
      t.id, t.guest, t.room, t.type, t.category, t.payMethod, `${t.isCredit ? '-' : '+'}${formatMoney(t.amount)}`, t.user
    ]);
    return { title: `Night Audit Transactions Log (${formatDateDisplay(auditDate)})`, headers, data };
  };

  const handleExportExcel = () => {
    const { title, headers, data } = getExportData();
    exportToExcel(`Night_Audit_Report_${auditDate}`, title, headers, data);
  };

  const handleExportWord = () => {
    const { title, headers, data } = getExportData();
    exportToWord(`Night_Audit_Report_${auditDate}`, title, headers, data);
  };

  const handleExportPDF = () => {
    const { title, headers, data } = getExportData();
    exportToPDF(title, headers, data);
  };

  return (
    <div className="ucr-container" style={{ padding: "24px 32px", background: "#ffffff" }}>
      {/* 1. HEADER & EXPORT TOOLBAR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.3px" }}>
            🌙 Particular Date Night Audit Report
          </h1>
          <p style={{ margin: "4px 0 0 0", fontSize: "13.5px", color: "#64748b" }}>
            Audit all financial transactions, payments, check-ins, check-outs, and new bookings on any selected date
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className="btn btn-secondary" onClick={handleExportExcel} style={{ background: "#ffffff", color: "#0f172a", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <Download size={15} /> Export Excel
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleExportWord} style={{ background: "#ffffff", color: "#0f172a", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <FileText size={15} /> Export Word
          </button>
          <button type="button" className="btn btn-primary" onClick={handleExportPDF} style={{ background: "#0f172a", color: "#ffffff", border: "none", borderRadius: "8px", padding: "8px 16px", fontSize: "13px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <Printer size={15} /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* 2. PARTICULAR DATE SELECTOR & DAY NAVIGATOR */}
      <div style={{ display: "flex", gap: "18px", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", background: "#f8fafc", padding: "16px 20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
        <button
          type="button"
          onClick={() => setAuditDate((d) => addDaysISO(d, -1))}
          style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", fontWeight: "700", color: "#0f172a", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <ArrowLeft size={15} /> Previous Day
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>Select Particular Audit Date:</label>
          <CustomDatePicker value={auditDate} onChange={setAuditDate} />
        </div>

        <button
          type="button"
          onClick={() => setAuditDate((d) => addDaysISO(d, 1))}
          style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", fontWeight: "700", color: "#0f172a", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          Next Day <ArrowRight size={15} />
        </button>

        <button
          type="button"
          onClick={() => setAuditDate(todayISO())}
          style={{ background: "#0f172a", color: "#ffffff", border: "none", borderRadius: "8px", padding: "8px 16px", fontSize: "13px", fontWeight: "800", cursor: "pointer", marginLeft: "auto" }}
        >
          Jump to Today ({todayISO()})
        </button>
      </div>

      {/* 4. ACTIVITY SECTION TABS FOR PARTICULAR DATE */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "2px solid #e2e8f0", marginBottom: "20px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setActiveTab("all_transactions")}
          style={{
            padding: "10px 18px",
            fontSize: "13.5px",
            fontWeight: "800",
            border: "none",
            borderBottom: activeTab === "all_transactions" ? "3px solid #0f172a" : "3px solid transparent",
            background: activeTab === "all_transactions" ? "#f1f5f9" : "transparent",
            color: activeTab === "all_transactions" ? "#0f172a" : "#64748b",
            borderRadius: "8px 8px 0 0",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <CreditCard size={16} /> 💳 Financial Payments &amp; Charges ({auditActivity.financialTransactions.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("checkins")}
          style={{
            padding: "10px 18px",
            fontSize: "13.5px",
            fontWeight: "800",
            border: "none",
            borderBottom: activeTab === "checkins" ? "3px solid #0f172a" : "3px solid transparent",
            background: activeTab === "checkins" ? "#f1f5f9" : "transparent",
            color: activeTab === "checkins" ? "#0f172a" : "#64748b",
            borderRadius: "8px 8px 0 0",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <UserCheck size={16} /> 📥 Check-Ins Executed ({auditActivity.checkInsHappened.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("checkouts")}
          style={{
            padding: "10px 18px",
            fontSize: "13.5px",
            fontWeight: "800",
            border: "none",
            borderBottom: activeTab === "checkouts" ? "3px solid #0f172a" : "3px solid transparent",
            background: activeTab === "checkouts" ? "#f1f5f9" : "transparent",
            color: activeTab === "checkouts" ? "#0f172a" : "#64748b",
            borderRadius: "8px 8px 0 0",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <UserX size={16} /> 📤 Check-Outs Executed ({auditActivity.checkOutsHappened.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("new_bookings")}
          style={{
            padding: "10px 18px",
            fontSize: "13.5px",
            fontWeight: "800",
            border: "none",
            borderBottom: activeTab === "new_bookings" ? "3px solid #0f172a" : "3px solid transparent",
            background: activeTab === "new_bookings" ? "#f1f5f9" : "transparent",
            color: activeTab === "new_bookings" ? "#0f172a" : "#64748b",
            borderRadius: "8px 8px 0 0",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <PlusCircle size={16} /> 📝 New Bookings Created ({auditActivity.newBookingsCreated.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("blocks")}
          style={{
            padding: "10px 18px",
            fontSize: "13.5px",
            fontWeight: "800",
            border: "none",
            borderBottom: activeTab === "blocks" ? "3px solid #0f172a" : "3px solid transparent",
            background: activeTab === "blocks" ? "#f1f5f9" : "transparent",
            color: activeTab === "blocks" ? "#0f172a" : "#64748b",
            borderRadius: "8px 8px 0 0",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <ShieldCheck size={16} /> 🛠️ Room Blocks Active ({auditActivity.blocksHappened.length})
        </button>
      </div>

      {/* SUB-TABLE 1: FINANCIAL TRANSACTIONS & PAYMENTS */}
      {activeTab === "all_transactions" && (
        <div style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "12px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f1f5f9", borderBottom: "1.5px solid #cbd5e1" }}>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>Tx / Ref ID</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>Guest Name</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>Room #</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>Transaction Type</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>Category</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>Method</th>
                <th style={{ padding: "12px 14px", textAlign: "right", fontWeight: "800", color: "#0f172a" }}>Amount ($)</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>Auditor / User</th>
              </tr>
            </thead>
            <tbody>
              {auditActivity.financialTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                    No financial payments or charges posted on {formatDateDisplay(auditDate)}.
                  </td>
                </tr>
              ) : (
                auditActivity.financialTransactions.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: "1px solid #e2e8f0", background: "#ffffff" }}>
                    <td style={{ padding: "12px 14px", fontWeight: "800", color: "#2563eb" }}>{tx.id}</td>
                    <td style={{ padding: "12px 14px", fontWeight: "800", color: "#0f172a" }}>{tx.guest}</td>
                    <td style={{ padding: "12px 14px", fontWeight: "700" }}>Room {tx.room}</td>
                    <td style={{ padding: "12px 14px", fontWeight: "700" }}>{tx.type}</td>
                    <td style={{ padding: "12px 14px", color: "#64748b" }}>{tx.category}</td>
                    <td style={{ padding: "12px 14px", fontWeight: "700" }}>{tx.payMethod}</td>
                    <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: "900", color: tx.isCredit ? "#047857" : "#0f172a" }}>
                      {tx.isCredit ? `+${formatMoney(tx.amount)}` : formatMoney(tx.amount)}
                    </td>
                    <td style={{ padding: "12px 14px", color: "#64748b", fontSize: "12px" }}>{tx.user}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SUB-TABLE 2: CHECK-INS EXECUTED */}
      {activeTab === "checkins" && (
        <div style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "12px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f1f5f9", borderBottom: "1.5px solid #cbd5e1" }}>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>Guest Name</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>Room #</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>Category</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>Check-In Date</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>Check-Out Date</th>
                <th style={{ padding: "12px 14px", textAlign: "center", fontWeight: "800", color: "#0f172a" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {auditActivity.checkInsHappened.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                    No check-ins executed on {formatDateDisplay(auditDate)}.
                  </td>
                </tr>
              ) : (
                auditActivity.checkInsHappened.map((b) => (
                  <tr key={b.id} style={{ borderBottom: "1px solid #e2e8f0", background: "#ffffff" }}>
                    <td style={{ padding: "12px 14px", fontWeight: "800", color: "#0f172a" }}>{b.guest || b.fullName}</td>
                    <td style={{ padding: "12px 14px", fontWeight: "700" }}>Room {b.room}</td>
                    <td style={{ padding: "12px 14px" }}>{b.roomType || "Standard Room"}</td>
                    <td style={{ padding: "12px 14px" }}>{b.checkIn}</td>
                    <td style={{ padding: "12px 14px" }}>{b.checkOut}</td>
                    <td style={{ padding: "12px 14px", textAlign: "center" }}>
                      <span style={{ padding: "3px 10px", borderRadius: "6px", background: "#dcfce7", color: "#166534", fontWeight: "800", fontSize: "12px" }}>
                        CHECKED-IN
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SUB-TABLE 3: CHECK-OUTS EXECUTED */}
      {activeTab === "checkouts" && (
        <div style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "12px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f1f5f9", borderBottom: "1.5px solid #cbd5e1" }}>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>Guest Name</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>Room #</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>Check-In Date</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>Check-Out Date</th>
                <th style={{ padding: "12px 14px", textAlign: "right", fontWeight: "800", color: "#0f172a" }}>Total Folio Bill ($)</th>
                <th style={{ padding: "12px 14px", textAlign: "center", fontWeight: "800", color: "#0f172a" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {auditActivity.checkOutsHappened.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                    No check-outs executed on {formatDateDisplay(auditDate)}.
                  </td>
                </tr>
              ) : (
                auditActivity.checkOutsHappened.map((b) => (
                  <tr key={b.id} style={{ borderBottom: "1px solid #e2e8f0", background: "#ffffff" }}>
                    <td style={{ padding: "12px 14px", fontWeight: "800", color: "#0f172a" }}>{b.guest || b.fullName}</td>
                    <td style={{ padding: "12px 14px", fontWeight: "700" }}>Room {b.room}</td>
                    <td style={{ padding: "12px 14px" }}>{b.checkIn}</td>
                    <td style={{ padding: "12px 14px" }}>{b.checkOut}</td>
                    <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: "800" }}>{formatMoney(b.totalAmount)}</td>
                    <td style={{ padding: "12px 14px", textAlign: "center" }}>
                      <span style={{ padding: "3px 10px", borderRadius: "6px", background: "#f1f5f9", color: "#475569", fontWeight: "800", fontSize: "12px" }}>
                        CHECKED-OUT
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SUB-TABLE 4: NEW RESERVATIONS CREATED */}
      {activeTab === "new_bookings" && (
        <div style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "12px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f1f5f9", borderBottom: "1.5px solid #cbd5e1" }}>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>Booking Ref</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>Guest Name</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>Room #</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>Check-In</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>Check-Out</th>
                <th style={{ padding: "12px 14px", textAlign: "right", fontWeight: "800", color: "#0f172a" }}>Total Tariff ($)</th>
              </tr>
            </thead>
            <tbody>
              {auditActivity.newBookingsCreated.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                    No new reservations created on {formatDateDisplay(auditDate)}.
                  </td>
                </tr>
              ) : (
                auditActivity.newBookingsCreated.map((b) => (
                  <tr key={b.id} style={{ borderBottom: "1px solid #e2e8f0", background: "#ffffff" }}>
                    <td style={{ padding: "12px 14px", fontWeight: "800", color: "#2563eb" }}>{b.id || b.referenceCode}</td>
                    <td style={{ padding: "12px 14px", fontWeight: "800", color: "#0f172a" }}>{b.guest || b.fullName}</td>
                    <td style={{ padding: "12px 14px", fontWeight: "700" }}>Room {b.room}</td>
                    <td style={{ padding: "12px 14px" }}>{b.checkIn}</td>
                    <td style={{ padding: "12px 14px" }}>{b.checkOut}</td>
                    <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: "800", color: "#0f172a" }}>{formatMoney(b.totalAmount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SUB-TABLE 5: ROOM BLOCK ACTIONS */}
      {activeTab === "blocks" && (
        <div style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "12px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f1f5f9", borderBottom: "1.5px solid #cbd5e1" }}>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>Room #</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>Block Category</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>Block Start</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>Block End</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>Remark / Notes</th>
              </tr>
            </thead>
            <tbody>
              {auditActivity.blocksHappened.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                    No maintenance room blocks active on {formatDateDisplay(auditDate)}.
                  </td>
                </tr>
              ) : (
                auditActivity.blocksHappened.map((b) => (
                  <tr key={b.id} style={{ borderBottom: "1px solid #e2e8f0", background: "#ffffff" }}>
                    <td style={{ padding: "12px 14px", fontWeight: "800", color: "#0f172a" }}>Room {b.room}</td>
                    <td style={{ padding: "12px 14px", fontWeight: "700", color: "#991b1b" }}>🛠️ Out of Order (Maintenance)</td>
                    <td style={{ padding: "12px 14px" }}>{b.checkIn}</td>
                    <td style={{ padding: "12px 14px" }}>{b.checkOut}</td>
                    <td style={{ padding: "12px 14px", color: "#64748b" }}>{b.notes || b.reason || "Scheduled Maintenance"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
