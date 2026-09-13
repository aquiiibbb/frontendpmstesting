import React, { useState, useEffect, useMemo } from "react";
import { getBookings, getRooms } from "../../services/api";
import CustomDatePicker from "../../components/CustomDatePicker";
import { exportToExcel, exportToPDF, exportToWord } from "../../utils/exportUtils";
import { 
  Percent, 
  BarChart3, 
  Download, 
  Printer, 
  FileText,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight,
  Building,
  CheckCircle2,
  AlertCircle
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
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(d);
}

export default function RateInventoryReport() {
  const [fromDate, setFromDate] = useState(() => todayISO());
  const [toDate, setToDate] = useState(() => addDaysISO(todayISO(), 14));
  const [selectedRoomType, setSelectedRoomType] = useState("ALL");
  const [bookingsList, setBookingsList] = useState([]);
  const [roomsList, setRoomsList] = useState([]);
  const [expandedDateRows, setExpandedDateRows] = useState({});
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
      console.error("Error loading Rate & Inventory report data", err);
    } finally {
      setLoading(false);
    }
  };

  // Fallback Rooms list if unconfigured
  const effectiveRooms = useMemo(() => {
    if (roomsList && roomsList.length > 0) return roomsList;
    return [
      { no: "101", type: "Single Room", price: 120, status: "available" },
      { no: "102", type: "Single Room", price: 120, status: "available" },
      { no: "103", type: "Single Room", price: 120, status: "available" },
      { no: "104", type: "Single Room", price: 120, status: "available" },
      { no: "201", type: "Double Room", price: 180, status: "available" },
      { no: "202", type: "Double Room", price: 180, status: "available" },
      { no: "203", type: "Double Room", price: 180, status: "available" },
      { no: "204", type: "Double Room", price: 180, status: "available" },
      { no: "301", type: "Triple Room", price: 240, status: "maintenance" },
      { no: "302", type: "Triple Room", price: 240, status: "available" },
      { no: "303", type: "Triple Room", price: 240, status: "available" }
    ];
  }, [roomsList]);

  // Unique Room Categories
  const roomCategories = useMemo(() => {
    const set = new Set();
    effectiveRooms.forEach((r) => set.add(r.type || "Standard Room"));
    return Array.from(set);
  }, [effectiveRooms]);

  // Filter rooms by category dropdown
  const filteredRooms = useMemo(() => {
    if (selectedRoomType === "ALL") return effectiveRooms;
    return effectiveRooms.filter((r) => (r.type || "Standard Room").toLowerCase() === selectedRoomType.toLowerCase());
  }, [effectiveRooms, selectedRoomType]);

  // Build array of dates from fromDate to toDate
  const datesArray = useMemo(() => {
    const dates = [];
    if (!fromDate || !toDate) return dates;
    let curr = fromDate;
    let safetyCounter = 0;
    while (curr <= toDate && safetyCounter < 100) {
      dates.push(curr);
      curr = addDaysISO(curr, 1);
      safetyCounter++;
    }
    return dates;
  }, [fromDate, toDate]);

  // Compute Date-by-Date Availability & Sales Matrix Data
  const matrixData = useMemo(() => {
    const totalPhysical = filteredRooms.length;

    const dateRows = datesArray.map((dateStr) => {
      // Find all non-cancelled bookings occupying rooms on dateStr
      const activeBookingsOnDate = bookingsList.filter((b) => {
        const statusLower = (b.status || "").toLowerCase();
        if (statusLower === "cancelled" || b.isDeleted) return false;
        const isBlock = statusLower === "blocked" || statusLower === "maintenance" || statusLower === "out-of-order" || Boolean(b.isBlocked);
        if (isBlock) return false;

        // Matches room category filter
        if (selectedRoomType !== "ALL") {
          const catName = b.roomType || b.accommodation || "";
          const roomObj = effectiveRooms.find((r) => String(r.no) === String(b.room));
          const roomCat = roomObj ? roomObj.type : catName;
          if (roomCat.toLowerCase() !== selectedRoomType.toLowerCase()) return false;
        }

        return b.checkIn <= dateStr && b.checkOut > dateStr;
      });

      // Find maintenance blocks on dateStr
      const blocksOnDate = bookingsList.filter((b) => {
        const statusLower = (b.status || "").toLowerCase();
        if (statusLower === "cancelled" || b.isDeleted) return false;
        const isBlock = statusLower === "blocked" || statusLower === "maintenance" || statusLower === "out-of-order" || Boolean(b.isBlocked);
        if (!isBlock) return false;

        if (selectedRoomType !== "ALL") {
          const roomObj = effectiveRooms.find((r) => String(r.no) === String(b.room));
          if (roomObj && roomObj.type.toLowerCase() !== selectedRoomType.toLowerCase()) return false;
        }

        return b.checkIn <= dateStr && b.checkOut >= dateStr;
      });

      const soldCount = Math.min(totalPhysical, activeBookingsOnDate.length);
      const blockedCount = Math.min(totalPhysical - soldCount, blocksOnDate.length);
      const availableCount = Math.max(0, totalPhysical - soldCount - blockedCount);
      const occupancyPct = totalPhysical > 0 ? Math.min(100, Math.round((soldCount / totalPhysical) * 100)) : 0;

      const dailyRevenue = activeBookingsOnDate.reduce((sum, b) => {
        const rate = Number(b.ratePerNight || b.nightlyRateUSD || (b.subtotal / Math.max(1, b.nights)) || 149);
        return sum + rate;
      }, 0);

      const adr = soldCount > 0 ? dailyRevenue / soldCount : 0;

      // Category Breakdown for this specific date
      const categoryBreakdown = roomCategories.map((catName) => {
        const catRooms = effectiveRooms.filter((r) => (r.type || "Standard Room").toLowerCase() === catName.toLowerCase());
        const catPhysical = catRooms.length;

        const catSold = activeBookingsOnDate.filter((b) => {
          const roomObj = effectiveRooms.find((r) => String(r.no) === String(b.room));
          const typeMatch = roomObj ? roomObj.type : (b.roomType || b.accommodation);
          return (typeMatch || "").toLowerCase() === catName.toLowerCase();
        }).length;

        const catBlocked = blocksOnDate.filter((b) => {
          const roomObj = effectiveRooms.find((r) => String(r.no) === String(b.room));
          return roomObj && (roomObj.type || "").toLowerCase() === catName.toLowerCase();
        }).length;

        const catAvailable = Math.max(0, catPhysical - catSold - catBlocked);
        const catRate = catRooms[0]?.price || catRooms[0]?.rate || 150;

        return {
          catName,
          catPhysical,
          catAvailable,
          catSold,
          catBlocked,
          catRate
        };
      });

      return {
        dateStr,
        totalPhysical,
        availableCount,
        soldCount,
        blockedCount,
        occupancyPct,
        dailyRevenue,
        adr,
        categoryBreakdown
      };
    });

    // Aggregates across date range
    const totalDays = dateRows.length || 1;
    const totalPotentialUnits = totalPhysical * totalDays;
    const totalSoldUnits = dateRows.reduce((acc, r) => acc + r.soldCount, 0);
    const totalBlockedUnits = dateRows.reduce((acc, r) => acc + r.blockedCount, 0);
    const totalAvailableUnits = dateRows.reduce((acc, r) => acc + r.availableCount, 0);
    const totalRevenueEarned = dateRows.reduce((acc, r) => acc + r.dailyRevenue, 0);
    const avgOccupancyPct = totalPotentialUnits > 0 ? Math.min(100, Math.round((totalSoldUnits / totalPotentialUnits) * 100)) : 0;
    const avgAdr = totalSoldUnits > 0 ? totalRevenueEarned / totalSoldUnits : 0;

    return {
      totalPhysical,
      totalDays,
      totalPotentialUnits,
      totalAvailableUnits,
      totalSoldUnits,
      totalBlockedUnits,
      totalRevenueEarned,
      avgOccupancyPct,
      avgAdr,
      dateRows
    };
  }, [datesArray, filteredRooms, bookingsList, effectiveRooms, selectedRoomType, roomCategories]);

  const toggleExpandRow = (dateStr) => {
    setExpandedDateRows((prev) => ({ ...prev, [dateStr]: !prev[dateStr] }));
  };

  // Export Data Handlers
  const getExportData = () => {
    const headers = ["Date", "Day", "Total Physical Rooms", "Available Rooms", "Sold / Occupied", "Blocked (OOO)", "Occupancy %", "ADR ($)", "Daily Revenue ($)"];
    const data = matrixData.dateRows.map((r) => [
      r.dateStr,
      formatDateDisplay(r.dateStr),
      r.totalPhysical,
      r.availableCount,
      r.soldCount,
      r.blockedCount,
      `${r.occupancyPct}%`,
      formatMoney(r.adr),
      formatMoney(r.dailyRevenue)
    ]);
    return { title: `Rate & Inventory Report (${fromDate} to ${toDate})`, headers, data };
  };

  const handleExportExcel = () => {
    const { title, headers, data } = getExportData();
    exportToExcel(`Rate_Inventory_Report_${fromDate}_to_${toDate}`, title, headers, data);
  };

  const handleExportWord = () => {
    const { title, headers, data } = getExportData();
    exportToWord(`Rate_Inventory_Report_${fromDate}_to_${toDate}`, title, headers, data);
  };

  const handleExportPDF = () => {
    const { title, headers, data } = getExportData();
    exportToPDF(title, headers, data);
  };

  return (
    <div className="ucr-container" style={{ padding: "24px 32px", background: "#ffffff" }}>
      {/* 1. EXPORT TOOLBAR */}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
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

      {/* 2. FILTER CONTROLS BAR */}
      <div style={{ display: "flex", gap: "18px", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", background: "#f8fafc", padding: "16px 20px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>From Date:</label>
          <CustomDatePicker value={fromDate} onChange={setFromDate} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>To Date:</label>
          <CustomDatePicker value={toDate} onChange={setToDate} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>Room Category:</label>
          <select
            value={selectedRoomType}
            onChange={(e) => setSelectedRoomType(e.target.value)}
            style={{
              height: "38px",
              padding: "0 14px",
              borderRadius: "8px",
              border: "1.5px solid #cbd5e1",
              fontSize: "13px",
              fontWeight: "700",
              color: "#0f172a",
              background: "#ffffff",
              outline: "none",
              cursor: "pointer"
            }}
          >
            <option value="ALL">All Room Categories ({effectiveRooms.length} Rooms)</option>
            {roomCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: "6px", alignItems: "center", marginLeft: "auto" }}>
          <button type="button" onClick={() => { setFromDate(todayISO()); setToDate(addDaysISO(todayISO(), 7)); }} className="ucr-preset-btn">
            Next 7 Days
          </button>
          <button type="button" onClick={() => { setFromDate(todayISO()); setToDate(addDaysISO(todayISO(), 14)); }} className="ucr-preset-btn">
            Next 15 Days
          </button>
          <button type="button" onClick={() => { setFromDate(todayISO()); setToDate(addDaysISO(todayISO(), 30)); }} className="ucr-preset-btn">
            Next 30 Days
          </button>
        </div>
      </div>

      {/* 3. STREAMLINED DATE-BY-DATE AVAILABILITY TABLE */}
      <div style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "12px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", borderBottom: "1.5px solid #cbd5e1" }}>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>Date</th>
              <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: "800", color: "#0f172a" }}>Total Capacity</th>
              <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: "800", color: "#0f172a" }}>Available Rooms</th>
              <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: "800", color: "#0f172a" }}>Sold / Occupied</th>
              <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: "800", color: "#0f172a" }}>Blocked (OOO)</th>
            </tr>
          </thead>
          <tbody>
            {matrixData.dateRows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                  No dates selected. Please choose a valid date range.
                </td>
              </tr>
            ) : (
              matrixData.dateRows.map((row) => (
                <tr
                  key={row.dateStr}
                  style={{
                    borderBottom: "1px solid #e2e8f0",
                    background: "#ffffff",
                    transition: "background 0.15s ease"
                  }}
                >
                  <td style={{ padding: "12px 16px", fontWeight: "800", color: "#0f172a" }}>
                    {formatDateDisplay(row.dateStr)}
                    <span style={{ fontSize: "11px", color: "#64748b", display: "block", fontWeight: "600" }}>{row.dateStr}</span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: "700", color: "#0f172a" }}>{row.totalPhysical} Rooms</td>
                  <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: "700", color: "#0f172a" }}>{row.availableCount}</td>
                  <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: "700", color: "#0f172a" }}>{row.soldCount}</td>
                  <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: "700", color: "#0f172a" }}>{row.blockedCount}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr style={{ background: "#f8fafc", fontWeight: "900", borderTop: "2px solid #cbd5e1" }}>
              <td style={{ padding: "14px 16px", color: "#0f172a" }}>TOTALS ({matrixData.totalDays} DAYS)</td>
              <td style={{ padding: "14px 16px", textAlign: "center", color: "#0f172a" }}>{matrixData.totalPhysical} Rooms</td>
              <td style={{ padding: "14px 16px", textAlign: "center", color: "#0f172a" }}>{matrixData.totalAvailableUnits} Total Vacant</td>
              <td style={{ padding: "14px 16px", textAlign: "center", color: "#0f172a" }}>{matrixData.totalSoldUnits} Total Sold</td>
              <td style={{ padding: "14px 16px", textAlign: "center", color: "#0f172a" }}>{matrixData.totalBlockedUnits} Total Blocked</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
