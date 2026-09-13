import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getBookings, getRooms, getAuditLogs } from '../services/api';
import { getBusinessDate, getTaxRules } from '../services/hotelConfig';
import { calculateTaxes } from '../utils/formatters';

const PMSContext = createContext();

export const PMSProvider = ({ children }) => {
  const [businessDate, setBusinessDate] = useState(() => getBusinessDate());
  const [taxRules, setTaxRules] = useState(() => getTaxRules());
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [folios, setFolios] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);

  const loadAllState = useCallback(async () => {
    try {
      const bDate = getBusinessDate();
      const tRules = getTaxRules();
      const [rList, bList, logs] = await Promise.all([
        getRooms().catch(() => []),
        getBookings().catch(() => []),
        getAuditLogs().catch(() => []),
      ]);

      setBusinessDate(bDate);
      setTaxRules(tRules || []);
      setRooms(rList || []);
      setReservations(bList || []);
      setAuditLogs(logs || []);
    } catch (err) {
      console.error("Error loading PMSContext data", err);
    }
  }, []);

  useEffect(() => {
    loadAllState();
    window.addEventListener("pms_bookings_updated", loadAllState);
    window.addEventListener("pms_rooms_updated", loadAllState);
    window.addEventListener("pms_taxes_updated", loadAllState);
    window.addEventListener("pms_business_date_updated", loadAllState);
    window.addEventListener("storage", loadAllState);
    return () => {
      window.removeEventListener("pms_bookings_updated", loadAllState);
      window.removeEventListener("pms_rooms_updated", loadAllState);
      window.removeEventListener("pms_taxes_updated", loadAllState);
      window.removeEventListener("pms_business_date_updated", loadAllState);
      window.removeEventListener("storage", loadAllState);
    };
  }, [loadAllState]);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type, id: Date.now() });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Add new reservation
  const addReservation = (newResData) => {
    const resId = `res-${Date.now().toString().slice(-4)}`;
    const resCode = `GV-${Math.floor(1000 + Math.random() * 9000)}`;

    const newReservation = {
      id: resId,
      resCode,
      status: newResData.status || 'Reserved',
      nightlyRateUSD: parseFloat(newResData.nightlyRateUSD) || 150.00,
      isTaxExempt: newResData.isTaxExempt || false,
      guestsCount: parseInt(newResData.guestsCount, 10) || 1,
      vipStatus: newResData.vipStatus || 'Standard',
      ...newResData
    };

    setReservations((prev) => [newReservation, ...prev]);

    // Create empty folio structure
    setFolios((prev) => ({
      ...prev,
      [resId]: {
        reservationId: resId,
        guestName: newReservation.guestName,
        roomNumber: newReservation.roomNumber,
        folioA: [],
        folioB: [],
        payments: []
      }
    }));

    // Update room status if assigned
    if (newReservation.roomId) {
      setRooms((prevRooms) =>
        prevRooms.map((room) =>
          room.id === newReservation.roomId
            ? { ...room, status: newReservation.status === 'Checked-In' ? 'Occupied' : 'Reserved' }
            : room
        )
      );
    }

    showToast(`Reservation ${resCode} created for ${newReservation.guestName}`);
    return newReservation;
  };

  // Update existing reservation
  const updateReservation = (resId, updatedFields) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === resId ? { ...r, ...updatedFields } : r))
    );
    showToast(`Reservation updated successfully`);
  };

  // Extend or adjust stay dates (Check-In / Check-Out drag handles)
  const extendStayDates = (resId, newCheckIn, newCheckOut) => {
    const res = reservations.find((r) => r.id === resId);
    if (!res) return;

    const updatedCheckIn = newCheckIn || res.checkIn;
    const updatedCheckOut = newCheckOut || res.checkOut;

    if (updatedCheckIn > updatedCheckOut) {
      showToast('Check-In date cannot be after Check-Out date', 'warning');
      return;
    }

    setReservations((prev) =>
      prev.map((r) =>
        r.id === resId
          ? {
              ...r,
              checkIn: updatedCheckIn,
              checkOut: updatedCheckOut
            }
          : r
      )
    );

    showToast(`Updated dates for ${res.guestName}: ${updatedCheckIn} to ${updatedCheckOut}`);
  };

  // Room move (mid-stay room change)
  const moveRoom = (resId, newRoomId, newRoomNumber, newRateUSD) => {
    const reservation = reservations.find((r) => r.id === resId);
    if (!reservation) return;

    const oldRoomId = reservation.roomId;

    setReservations((prev) =>
      prev.map((r) =>
        r.id === resId
          ? {
              ...r,
              roomId: newRoomId,
              roomNumber: newRoomNumber,
              nightlyRateUSD: newRateUSD ?? r.nightlyRateUSD
            }
          : r
      )
    );

    setRooms((prevRooms) =>
      prevRooms.map((room) => {
        if (room.id === oldRoomId) {
          return { ...room, status: 'Vacant', housekeeping: 'Dirty' };
        }
        if (room.id === newRoomId) {
          return { ...room, status: 'Occupied', housekeeping: 'Clean' };
        }
        return room;
      })
    );

    if (newRateUSD && newRateUSD !== reservation.nightlyRateUSD) {
      addFolioCharge(resId, 'folioA', {
        category: 'Room Move Adjustment',
        description: `Room Move from ${reservation.roomNumber} to ${newRoomNumber} (New Rate $${newRateUSD}/nt)`,
        amountUSD: 0
      });
    }

    showToast(`Guest moved from Room ${reservation.roomNumber} to Room ${newRoomNumber}`);
  };

  // Check-In Guest
  const checkInGuest = (resId) => {
    const reservation = reservations.find((r) => r.id === resId);
    if (!reservation) return;

    setReservations((prev) =>
      prev.map((r) => (r.id === resId ? { ...r, status: 'Checked-In' } : r))
    );

    if (reservation.roomId) {
      setRooms((prevRooms) =>
        prevRooms.map((room) =>
          room.id === reservation.roomId
            ? { ...room, status: 'Occupied', housekeeping: 'Clean' }
            : room
        )
      );
    }

    showToast(`Checked in ${reservation.guestName} to Room ${reservation.roomNumber}`);
  };

  // Check-Out Guest
  const checkOutGuest = (resId) => {
    const reservation = reservations.find((r) => r.id === resId);
    if (!reservation) return;

    setReservations((prev) =>
      prev.map((r) => (r.id === resId ? { ...r, status: 'Checked-Out' } : r))
    );

    if (reservation.roomId) {
      setRooms((prevRooms) =>
        prevRooms.map((room) =>
          room.id === reservation.roomId
            ? { ...room, status: 'Vacant', housekeeping: 'Dirty' }
            : room
        )
      );
    }

    showToast(`Checked out ${reservation.guestName} from Room ${reservation.roomNumber}`);
  };

  // Folio Operations: Add Charge
  const addFolioCharge = (resId, folioType = 'folioA', charge) => {
    const chargeItem = {
      id: `chg-${Date.now()}`,
      date: businessDate,
      category: charge.category || 'Incidental',
      description: charge.description,
      amountUSD: parseFloat(charge.amountUSD) || 0
    };

    setFolios((prev) => {
      const folio = prev[resId] || {
        reservationId: resId,
        folioA: [],
        folioB: [],
        payments: []
      };

      return {
        ...prev,
        [resId]: {
          ...folio,
          [folioType]: [...(folio[folioType] || []), chargeItem]
        }
      };
    });

    showToast(`Charge of $${chargeItem.amountUSD.toFixed(2)} added to ${folioType.toUpperCase()}`);
  };

  // Folio Operations: Add Payment
  const addFolioPayment = async (resId, payment) => {
    const paymentItem = {
      id: `pay-${Date.now()}`,
      date: businessDate,
      method: payment.method || payment.mode || "Cash",
      description: payment.description || payment.note || 'Payment Received',
      amountUSD: parseFloat(payment.amountUSD || payment.amount) || 0,
      amount: parseFloat(payment.amountUSD || payment.amount) || 0,
    };

    setFolios((prev) => {
      const folio = prev[resId] || {
        reservationId: resId,
        folioA: [],
        folioB: [],
        payments: []
      };

      return {
        ...prev,
        [resId]: {
          ...folio,
          payments: [...(folio.payments || []), paymentItem]
        }
      };
    });

    try {
      const { addPayment } = await import("../services/api");
      if (typeof addPayment === "function") {
        await addPayment(resId, paymentItem);
      }
    } catch (e) {
      console.error("Failed to post payment to backend API:", e);
    }

    showToast(`Payment of $${paymentItem.amountUSD.toFixed(2)} recorded`);
  };

  // Split Folio
  const moveFolioItem = (resId, itemId, fromFolioKey, toFolioKey) => {
    setFolios((prev) => {
      const folio = prev[resId];
      if (!folio) return prev;

      const itemToMove = folio[fromFolioKey]?.find((i) => i.id === itemId);
      if (!itemToMove) return prev;

      return {
        ...prev,
        [resId]: {
          ...folio,
          [fromFolioKey]: folio[fromFolioKey].filter((i) => i.id !== itemId),
          [toFolioKey]: [...folio[toFolioKey], itemToMove]
        }
      };
    });
    showToast(`Item moved to ${toFolioKey.toUpperCase()}`);
  };

  // Update Tax Rules
  const updateTaxRules = (newRules) => {
    setTaxRules(newRules);
    showToast('Tax rules updated successfully');
  };

  // Room Status Change & Room Blocking with Start & End Dates
  const updateRoomStatus = (roomId, newStatus, newHousekeeping) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? {
              ...r,
              ...(newStatus && { status: newStatus }),
              ...(newHousekeeping && { housekeeping: newHousekeeping })
            }
          : r
      )
    );
    showToast(`Room status updated`);
  };

  // Block Room for Date Range
  const blockRoom = (roomId, blockReason = 'Maintenance / Out of Order', startDate, endDate) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    const fromDate = startDate || businessDate;
    const toDate = endDate || '2026-07-31';

    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? { ...r, status: 'Out-of-Order', housekeeping: 'Maintenance', blockReason }
          : r
      )
    );

    const blockResId = `block-${Date.now().toString().slice(-4)}`;
    const newBlock = {
      id: blockResId,
      resCode: `BLOCK-${room.number}`,
      guestName: `[BLOCKED] ${blockReason}`,
      guestEmail: '',
      guestPhone: '',
      roomId: room.id,
      roomNumber: room.number,
      roomType: room.type,
      checkIn: fromDate,
      checkOut: toDate,
      status: 'Blocked',
      guestsCount: 0,
      nightlyRateUSD: 0,
      isTaxExempt: true,
      vipStatus: 'Blocked',
      notes: `${blockReason} (${fromDate} to ${toDate})`
    };

    setReservations((prev) => [newBlock, ...prev]);
    showToast(`Room ${room.number} blocked from ${fromDate} to ${toDate}`);
  };

  // Release Room Block
  const releaseRoomBlock = (roomId) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? { ...r, status: 'Vacant', housekeeping: 'Clean', blockReason: null }
          : r
      )
    );

    setReservations((prev) =>
      prev.filter((res) => !(res.roomId === roomId && res.status === 'Blocked'))
    );

    showToast(`Room ${room.number} block released`);
  };

  // Automated Night Audit Execution
  const runNightAudit = (auditorName = 'Front Desk Manager') => {
    const checkedInRes = reservations.filter((r) => r.status === 'Checked-In');

    let totalPostedRoomRev = 0;
    let totalPostedTaxes = 0;
    let postedCount = 0;

    checkedInRes.forEach((res) => {
      const roomCharge = res.nightlyRateUSD;
      const { totalTax, breakdown } = calculateTaxes(roomCharge, taxRules, res.isTaxExempt);

      const roomChargeItem = {
        id: `na-chg-room-${Date.now()}-${res.id}`,
        date: businessDate,
        category: 'Room Rate',
        description: `Night Audit Room Posting - Room ${res.roomNumber}`,
        amountUSD: roomCharge
      };

      const taxItems = breakdown.map((t) => ({
        id: `na-chg-tax-${Date.now()}-${res.id}-${t.id}`,
        date: businessDate,
        category: 'Tax',
        description: `${t.name} (${t.type === 'percent' ? t.rate + '%' : '$' + t.rate})`,
        amountUSD: t.amount
      }));

      setFolios((prev) => {
        const folio = prev[res.id] || {
          reservationId: res.id,
          guestName: res.guestName,
          roomNumber: res.roomNumber,
          folioA: [],
          folioB: [],
          payments: []
        };
        return {
          ...prev,
          [res.id]: {
            ...folio,
            folioA: [...folio.folioA, roomChargeItem, ...taxItems]
          }
        };
      });

      totalPostedRoomRev += roomCharge;
      totalPostedTaxes += totalTax;
      postedCount++;
    });

    const totalOccupied = checkedInRes.length;
    const occupancyPercent = rooms.length > 0 ? parseFloat(((totalOccupied / rooms.length) * 100).toFixed(1)) : 0;
    const adr = totalOccupied > 0 ? parseFloat((totalPostedRoomRev / totalOccupied).toFixed(2)) : 0;
    const revpar = rooms.length > 0 ? parseFloat((totalPostedRoomRev / rooms.length).toFixed(2)) : 0;

    const currentDate = new Date(businessDate);
    currentDate.setDate(currentDate.getDate() + 1);
    const nextBusinessDate = currentDate.toISOString().split('T')[0];

    const newAuditLog = {
      id: `na-${businessDate}`,
      auditDate: businessDate,
      completedAt: new Date().toLocaleString(),
      auditor: auditorName,
      totalRoomsOccupied: totalOccupied,
      occupancyPercent,
      totalRoomRevenueUSD: totalPostedRoomRev,
      totalTaxCollectedUSD: totalPostedTaxes,
      totalIncidentalRevenueUSD: 145.00,
      grandTotalRevenueUSD: totalPostedRoomRev + totalPostedTaxes + 145.00,
      adrUSD: adr,
      revparUSD: revpar,
      postedFolioCount: postedCount,
      status: 'COMPLETED & LOCKED'
    };

    setAuditLogs((prev) => [newAuditLog, ...prev]);
    setBusinessDate(nextBusinessDate);

    showToast(`Night Audit for ${businessDate} completed! Date rolled to ${nextBusinessDate}`);
    return newAuditLog;
  };

  return (
    <PMSContext.Provider
      value={{
        businessDate,
        taxRules,
        rooms,
        reservations,
        folios,
        auditLogs,
        toastMessage,
        addReservation,
        updateReservation,
        extendStayDates,
        moveRoom,
        checkInGuest,
        checkOutGuest,
        addFolioCharge,
        addFolioPayment,
        moveFolioItem,
        updateTaxRules,
        updateRoomStatus,
        blockRoom,
        releaseRoomBlock,
        runNightAudit,
        showToast
      }}
    >
      {children}
    </PMSContext.Provider>
  );
};

export const usePMS = () => {
  const context = useContext(PMSContext);
  if (!context) throw new Error('usePMS must be used within a PMSProvider');
  return context;
};
