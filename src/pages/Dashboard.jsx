import React, { useState, useEffect, useCallback, useMemo } from "react";
import { getBookings, getRooms } from "../services/api";
import { getBusinessDate } from "../services/hotelConfig";
import { formatUSD } from "../utils/formatters";
import PropertyStatsSummary from "../components/PropertyStatsSummary";
import "./Dashboard.css";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function Dashboard() {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [miscTransactions, setMiscTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mode Toggles for Charts (Daily 30D vs Monthly)
  const [revenueMode, setRevenueMode] = useState("daily"); // "daily" | "monthly"
  const [occupancyMode, setOccupancyMode] = useState("daily"); // "daily" | "monthly"

  // Selected Month Offset for Booking Source Section
  const [selectedMonthOffset, setSelectedMonthOffset] = useState(0);

  // Hover States for Tooltips
  const [hoveredRevPoint, setHoveredRevPoint] = useState(null);
  const [hoveredOccPoint, setHoveredOccPoint] = useState(null);

  const activeBizDate = useMemo(() => getBusinessDate(), []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [bList, rList] = await Promise.all([getBookings(), getRooms()]);
      setBookings(bList || []);
      setRooms(rList || []);

      // Load Misc Transactions
      try {
        const saved = localStorage.getItem("pms_misc_transactions");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setMiscTransactions(parsed.filter(t => t.id !== "MSC-1001" && t.id !== "MSC-1002" && t.id !== "MSC-1003"));
          } else {
            setMiscTransactions([]);
          }
        } else {
          setMiscTransactions([]);
        }
      } catch (e) {
        setMiscTransactions([]);
      }
    } catch (e) {
      console.error("Error loading dashboard data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener("pms_bookings_updated", loadData);
    window.addEventListener("pms_rooms_updated", loadData);
    window.addEventListener("pms_misc_updated", loadData);
    window.addEventListener("storage", loadData);
    return () => {
      window.removeEventListener("pms_bookings_updated", loadData);
      window.removeEventListener("pms_rooms_updated", loadData);
      window.removeEventListener("pms_misc_updated", loadData);
      window.removeEventListener("storage", loadData);
    };
  }, [loadData]);

  // 1. Calculate Daily 30-Day Analytics
  const daily30Data = useMemo(() => {
    const baseDate = new Date(activeBizDate || new Date().toISOString().slice(0, 10));
    const result = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      const dateISO = d.toISOString().slice(0, 10);
      const monthShort = d.toLocaleString("en-US", { month: "short" });
      const dayNum = d.getDate();
      const dateLabel = `${monthShort} ${dayNum}`;

      let dayRevenue = 0;
      let dayOccupied = 0;

      (bookings || []).forEach((b) => {
        if (!b || b.status === "cancelled" || b.status === "no-show") return;
        const checkIn = b.checkIn;
        const checkOut = b.checkOut;

        if (checkIn <= dateISO && checkOut > dateISO) {
          dayOccupied += 1;
          const rate = Number(b.ratePerNight || b.nightlyRateUSD || (b.totalAmount ? b.totalAmount / Math.max(1, (new Date(checkOut) - new Date(checkIn)) / 86400000) : 120));
          dayRevenue += rate;
        }
      });

      result.push({
        dateISO,
        dateLabel,
        revenue: Math.round(dayRevenue * 100) / 100,
        occupied: dayOccupied
      });
    }
    return result;
  }, [bookings, activeBizDate]);

  // 2. Calculate Monthly Analytics (12 Months)
  const monthly12Data = useMemo(() => {
    const baseDate = new Date(activeBizDate || new Date().toISOString().slice(0, 10));
    const result = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const monthKey = `${yyyy}-${mm}`;
      const dateLabel = d.toLocaleString("en-US", { month: "short", year: "2-digit" });

      let monthRevenue = 0;
      let occupiedCount = 0;

      (bookings || []).forEach((b) => {
        if (!b || b.status === "cancelled" || b.status === "no-show") return;
        if (b.checkIn && b.checkIn.startsWith(monthKey)) {
          const total = Number(b.totalAmount || b.subtotal || (b.ratePerNight ? b.ratePerNight * 2 : 200));
          monthRevenue += total;
          occupiedCount += 1;
        }
      });

      result.push({
        dateISO: monthKey,
        dateLabel,
        revenue: Math.round(monthRevenue * 100) / 100,
        occupied: occupiedCount
      });
    }
    return result;
  }, [bookings, activeBizDate]);

  // Active Datasets based on Toggles
  const revSeries = revenueMode === "daily" ? daily30Data : monthly12Data;
  const occSeries = occupancyMode === "daily" ? daily30Data : monthly12Data;

  // Selected Month Target for Source Analytics
  const targetSourceDate = useMemo(() => {
    const d = new Date(activeBizDate || new Date().toISOString().slice(0, 10));
    d.setMonth(d.getMonth() + selectedMonthOffset);
    return d;
  }, [activeBizDate, selectedMonthOffset]);

  const targetMonthKey = useMemo(() => {
    const yyyy = targetSourceDate.getFullYear();
    const mm = String(targetSourceDate.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}`;
  }, [targetSourceDate]);

  const targetMonthLabel = useMemo(() => {
    return `${MONTH_NAMES[targetSourceDate.getMonth()]} ${targetSourceDate.getFullYear()}`;
  }, [targetSourceDate]);

  // 3. Calculate Source Analytics for Selected Month
  const sourceAnalytics = useMemo(() => {
    const monthBookings = (bookings || []).filter((b) => {
      if (!b || b.status === "cancelled" || b.status === "no-show") return false;
      return b.checkIn && b.checkIn.startsWith(targetMonthKey);
    });

    const sourceMap = {};

    monthBookings.forEach((b) => {
      const rawSource = b.source || b.channel || b.bookingSource || "Direct";
      const sourceName = rawSource.trim() || "Direct";
      const rev = Number(b.totalAmount || b.subtotal || (b.ratePerNight ? b.ratePerNight * 2 : 200));

      if (!sourceMap[sourceName]) {
        sourceMap[sourceName] = { reservations: 0, revenue: 0 };
      }
      sourceMap[sourceName].reservations += 1;
      sourceMap[sourceName].revenue += rev;
    });

    const totalReservations = Object.values(sourceMap).reduce((acc, x) => acc + x.reservations, 0);
    const totalRevenue = Object.values(sourceMap).reduce((acc, x) => acc + x.revenue, 0);

    const sourcesList = Object.keys(sourceMap).map((src) => {
      const item = sourceMap[src];
      const avgBk = item.reservations > 0 ? item.revenue / item.reservations : 0;
      const pct = totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0;

      return {
        source: src,
        reservations: item.reservations,
        revenue: Math.round(item.revenue * 100) / 100,
        avgBooking: Math.round(avgBk * 100) / 100,
        percentOfRevenue: Math.round(pct * 10) / 10
      };
    });

    sourcesList.sort((a, b) => b.revenue - a.revenue);

    return {
      totalReservations,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      overallAvg: totalReservations > 0 ? Math.round((totalRevenue / totalReservations) * 100) / 100 : 0,
      sourcesList
    };
  }, [bookings, targetMonthKey]);

  // 4. Calculate Misc Sales & Expenses Analytics
  const miscAnalytics = useMemo(() => {
    let totalSales = 0;
    let totalExpenses = 0;

    const settlementMap = {
      "Cash": { sales: 0, expenses: 0 },
      "Credit / Debit Card": { sales: 0, expenses: 0 },
      "Online / UPI": { sales: 0, expenses: 0 },
      "Room Charge": { sales: 0, expenses: 0 },
      "Other": { sales: 0, expenses: 0 }
    };

    (miscTransactions || []).forEach((t) => {
      const amt = Number(t.amountUSD || t.amount || 0);
      const method = t.settlement || "Cash";
      const bucket = settlementMap[method] ? method : "Other";

      if (t.type === "SALE") {
        totalSales += amt;
        settlementMap[bucket].sales += amt;
      } else if (t.type === "EXPENSE") {
        totalExpenses += amt;
        settlementMap[bucket].expenses += amt;
      }
    });

    const netBalance = totalSales - totalExpenses;
    const totalVolume = totalSales + totalExpenses;

    let settlementList = Object.keys(settlementMap).map((method) => {
      const item = settlementMap[method];
      const methodNet = item.sales - item.expenses;
      const methodVol = item.sales + item.expenses;
      const pct = totalVolume > 0 ? (methodVol / totalVolume) * 100 : 0;

      return {
        method,
        sales: item.sales,
        expenses: item.expenses,
        net: methodNet,
        percent: Math.round(pct * 10) / 10
      };
    }).filter(row => row.sales > 0 || row.expenses > 0);

    return {
      totalSales: Math.round(totalSales * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netBalance: Math.round((totalSales - totalExpenses) * 100) / 100,
      settlementList
    };
  }, [miscTransactions]);

  // Executive Master KPI Summary metrics for Dashboard
  const kpiSummary = useMemo(() => {
    const activeList = (bookings || []).filter((b) => !b.isDeleted && b.status !== "cancelled");
    const totalRev = activeList.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
    const inHouseCount = activeList.filter((b) => b.status === "checked-in" || b.status === "occupied").length;
    const totalRooms = (rooms || []).length;
    const occPercent = totalRooms > 0 ? Math.min(100, Math.round((inHouseCount / totalRooms) * 100)) : 0;
    const adr = activeList.length > 0 ? totalRev / activeList.length : 0;
    const revpar = totalRooms > 0 ? totalRev / totalRooms : 0;

    return {
      totalRev: Math.round(totalRev * 100) / 100,
      inHouseCount,
      totalRooms,
      occPercent,
      adr: Math.round(adr * 100) / 100,
      revpar: Math.round(revpar * 100) / 100,
    };
  }, [bookings, rooms]);

  return (
    <div className="dashboard-realtime-container">
      {/* 📊 PROPERTY STATS & DAILY INVENTORY SUMMARY MATRIX */}
      <PropertyStatsSummary rooms={rooms} bookings={bookings} />

      {/* 0. EXECUTIVE MASTER KPI SUMMARY CARDS (#fff6e3 Master Box Highlights) */}
      <div className="dash-kpi-strip">
        <div className="dash-kpi-card">
          <span className="lbl">Total Hotel Revenue</span>
          <strong className="val">${kpiSummary.totalRev.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
        </div>

        <div className="dash-kpi-card">
          <span className="lbl">Occupancy Rate</span>
          <strong className="val">{kpiSummary.occPercent}% Occupied ({kpiSummary.inHouseCount}/{kpiSummary.totalRooms})</strong>
        </div>

        <div className="dash-kpi-card">
          <span className="lbl">ADR (Avg Daily Rate)</span>
          <strong className="val">${kpiSummary.adr.toFixed(2)}</strong>
        </div>

        <div className="dash-kpi-card">
          <span className="lbl">RevPAR (Revenue Per Room)</span>
          <strong className="val">${kpiSummary.revpar.toFixed(2)}</strong>
        </div>
      </div>

      {/* 1. TOP CHARTS GRID (REVENUE TREND & OCCUPANCY TREND) */}
      <div className="dash-charts-grid-2">
        {/* REVENUE TREND CHART CARD */}
        <div className="dash-card">
          <div className="dash-card-head">
            <div>
              <h3 className="dash-card-title">Real-Time Revenue Trend</h3>
              <p className="dash-card-sub">
                {revenueMode === "daily" ? "Daily room revenue (Last 30 Days)" : "Monthly room revenue (Last 12 Months)"}
              </p>
            </div>
            <div className="dash-pill-toggle">
              <button
                type="button"
                className={`dash-pill-btn ${revenueMode === "daily" ? "active" : ""}`}
                onClick={() => setRevenueMode("daily")}
              >
                Daily (30D)
              </button>
              <button
                type="button"
                className={`dash-pill-btn ${revenueMode === "monthly" ? "active" : ""}`}
                onClick={() => setRevenueMode("monthly")}
              >
                Monthly (12M)
              </button>
            </div>
          </div>

          <div className="dash-chart-container">
            {(() => {
              const width = 560;
              const height = 180;
              const padL = 45;
              const padR = 15;
              const padT = 15;
              const padB = 25;
              const chartW = width - padL - padR;
              const chartH = height - padT - padB;

              const maxVal = Math.max(...revSeries.map((d) => d.revenue), 1000);

              const points = revSeries.map((d, i) => {
                const x = padL + (i / Math.max(1, revSeries.length - 1)) * chartW;
                const y = padT + chartH - (d.revenue / maxVal) * chartH;
                return { x, y, ...d };
              });

              const pathD = points.length > 0
                ? points.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`, "")
                : "";

              const areaD = points.length > 0
                ? `${pathD} L ${points[points.length - 1].x} ${padT + chartH} L ${points[0].x} ${padT + chartH} Z`
                : "";

              return (
                <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0f172a" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* GRID LINES */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                    const y = padT + chartH - pct * chartH;
                    const val = Math.round(maxVal * pct);
                    return (
                      <g key={i}>
                        <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                        <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="10" fontWeight="800" fill="#000000">
                          ${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                        </text>
                      </g>
                    );
                  })}

                  {/* AREA & LINE (BLACK / DARK SLATE) */}
                  <path d={areaD} fill="url(#revGrad)" />
                  <path d={pathD} fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                  {/* INTERACTIVE POINTS */}
                  {points.map((p, i) => (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={hoveredRevPoint?.dateISO === p.dateISO ? 5 : 3}
                      fill="#ffffff"
                      stroke="#0f172a"
                      strokeWidth="2"
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => setHoveredRevPoint(p)}
                      onMouseLeave={() => setHoveredRevPoint(null)}
                    />
                  ))}
                </svg>
              );
            })()}
          </div>
        </div>

        {/* OCCUPANCY TREND CHART CARD */}
        <div className="dash-card">
          <div className="dash-card-head">
            <div>
              <h3 className="dash-card-title">Real-Time Occupancy Trend</h3>
              <p className="dash-card-sub">
                {occupancyMode === "daily" ? "Daily rooms occupied (Last 30 Days)" : "Monthly rooms occupied (Last 12 Months)"}
              </p>
            </div>
            <div className="dash-pill-toggle">
              <button
                type="button"
                className={`dash-pill-btn ${occupancyMode === "daily" ? "active" : ""}`}
                onClick={() => setOccupancyMode("daily")}
              >
                Daily (30D)
              </button>
              <button
                type="button"
                className={`dash-pill-btn ${occupancyMode === "monthly" ? "active" : ""}`}
                onClick={() => setOccupancyMode("monthly")}
              >
                Monthly (12M)
              </button>
            </div>
          </div>

          <div className="dash-chart-container">
            {(() => {
              const width = 560;
              const height = 180;
              const padL = 35;
              const padR = 15;
              const padT = 15;
              const padB = 25;
              const chartW = width - padL - padR;
              const chartH = height - padT - padB;

              const totalRoomsCount = Math.max(1, rooms.length || 10);
              const maxVal = Math.max(...occSeries.map((d) => d.occupied), totalRoomsCount);

              const points = occSeries.map((d, i) => {
                const x = padL + (i / Math.max(1, occSeries.length - 1)) * chartW;
                const y = padT + chartH - (d.occupied / maxVal) * chartH;
                return { x, y, ...d };
              });

              const pathD = points.length > 0
                ? points.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`, "")
                : "";

              const areaD = points.length > 0
                ? `${pathD} L ${points[points.length - 1].x} ${padT + chartH} L ${points[0].x} ${padT + chartH} Z`
                : "";

              return (
                <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }}>
                  <defs>
                    <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#475569" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#475569" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* GRID LINES */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                    const y = padT + chartH - pct * chartH;
                    const val = Math.round(maxVal * pct);
                    return (
                      <g key={i}>
                        <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                        <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="10" fontWeight="800" fill="#000000">
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  {/* AREA & LINE (CHARCOAL SLATE) */}
                  <path d={areaD} fill="url(#occGrad)" />
                  <path d={pathD} fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                  {/* INTERACTIVE POINTS */}
                  {points.map((p, i) => (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={hoveredOccPoint?.dateISO === p.dateISO ? 5 : 3}
                      fill="#ffffff"
                      stroke="#475569"
                      strokeWidth="2"
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => setHoveredOccPoint(p)}
                      onMouseLeave={() => setHoveredOccPoint(null)}
                    />
                  ))}
                </svg>
              );
            })()}
          </div>
        </div>
      </div>

      {/* 2. BOOKINGS BY SOURCE SECTION */}
      <div>
        <div className="dash-section-header">
          BOOKINGS BY SOURCE — RESERVATIONS &amp; SALES PER MONTH
        </div>

        <div className="dash-card">
          <div className="dash-card-head">
            <div>
              <h3 className="dash-card-title">Reservations &amp; Revenue by Booking Source</h3>
              <p className="dash-card-sub">
                {targetMonthLabel} — {sourceAnalytics.totalReservations} reservations · {formatUSD(sourceAnalytics.totalRevenue)} revenue
              </p>
            </div>

            {/* MONTH SELECTOR CONTROLS */}
            <div className="dash-month-selector">
              <button
                type="button"
                className="dash-month-nav-btn"
                onClick={() => setSelectedMonthOffset((prev) => prev - 1)}
                title="Previous Month"
              >
                ‹
              </button>
              <span className="dash-month-label">{targetMonthLabel}</span>
              <button
                type="button"
                className="dash-month-nav-btn"
                onClick={() => setSelectedMonthOffset((prev) => prev + 1)}
                title="Next Month"
              >
                ›
              </button>
            </div>
          </div>

          {/* DUAL BAR CHART BY SOURCE (BLACK & CHARCOAL) */}
          <div className="dash-chart-container">
            {(() => {
              const width = 800;
              const height = 280;
              const padL = 50;
              const padR = 65;
              const padT = 25;
              const padB = 65;
              const chartW = width - padL - padR;
              const chartH = height - padT - padB;

              const maxRes = Math.max(...sourceAnalytics.sourcesList.map((s) => s.reservations), 9);
              const maxRev = Math.max(...sourceAnalytics.sourcesList.map((s) => s.revenue), 60000);

              const leftTicks = [0, 3, 6, 9];
              const rightTicks = [0, 20000, 40000, 60000];

              const groupStep = chartW / Math.max(1, sourceAnalytics.sourcesList.length);

              return (
                <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }}>
                  {/* GRID LINES & Y-AXIS LABELS */}
                  {rightTicks.map((tick, i) => {
                    const y = padT + chartH - (tick / 60000) * chartH;
                    return (
                      <g key={i}>
                        <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                        <text x={width - padR + 8} y={y + 4} textAnchor="start" fontSize="11" fontWeight="800" fill="#000000">
                          {tick === 0 ? "$0" : `$${(tick / 1000).toFixed(0)}k`}
                        </text>
                      </g>
                    );
                  })}

                  {leftTicks.map((tick, i) => {
                    const y = padT + chartH - (tick / 9) * chartH;
                    return (
                      <text key={`lt_${i}`} x={padL - 10} y={y + 4} textAnchor="end" fontSize="11" fontWeight="800" fill="#000000">
                        {tick}
                      </text>
                    );
                  })}

                  {/* GROUPED BARS FOR EACH SOURCE */}
                  {sourceAnalytics.sourcesList.map((src, idx) => {
                    const groupX = padL + idx * groupStep + groupStep / 2;

                    const resH = (src.reservations / 9) * chartH;
                    const resY = padT + chartH - resH;

                    const revH = (src.revenue / 60000) * chartH;
                    const revY = padT + chartH - revH;

                    const barW = 32;

                    return (
                      <g key={src.source}>
                        {/* DARK BAR: RESERVATIONS */}
                        <rect
                          x={groupX - barW - 4}
                          y={resY}
                          width={barW}
                          height={resH}
                          fill="#0f172a"
                          rx="4"
                        />

                        {/* GREY BAR: REVENUE */}
                        <rect
                          x={groupX + 4}
                          y={revY}
                          width={barW}
                          height={revH}
                          fill="#64748b"
                          rx="4"
                        />

                        {/* X-AXIS LABEL */}
                        <text x={groupX} y={padT + chartH + 22} textAnchor="middle" fontSize="12" fontWeight="700" fill="#000000">
                          {src.source}
                        </text>
                      </g>
                    );
                  })}

                  {/* BOTTOM LEGEND */}
                  <g transform={`translate(${width / 2 - 90}, ${height - 14})`}>
                    <rect x="0" y="-4" width="12" height="12" rx="3" fill="#0f172a" />
                    <text x="18" y="6" fontSize="12" fontWeight="700" fill="#000000">Reservations</text>

                    <rect x="110" y="-4" width="12" height="12" rx="3" fill="#64748b" />
                    <text x="128" y="6" fontSize="12" fontWeight="700" fill="#000000">Revenue</text>
                  </g>
                </svg>
              );
            })()}
          </div>

          {/* DETAILED SOURCE SUMMARY TABLE */}
          <div className="dash-source-table-wrapper">
            <table className="dash-source-table">
              <thead>
                <tr>
                  <th>SOURCE</th>
                  <th>RESERVATIONS</th>
                  <th>REVENUE</th>
                  <th>AVG / BOOKING</th>
                  <th>% OF REVENUE</th>
                </tr>
              </thead>
              <tbody>
                {sourceAnalytics.sourcesList.map((row) => (
                  <tr key={row.source}>
                    <td><strong>{row.source}</strong></td>
                    <td>{row.reservations}</td>
                    <td>{formatUSD(row.revenue)}</td>
                    <td>{formatUSD(row.avgBooking)}</td>
                    <td>{row.percentOfRevenue}%</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td><strong>Total</strong></td>
                  <td><strong>{sourceAnalytics.totalReservations}</strong></td>
                  <td><strong>{formatUSD(sourceAnalytics.totalRevenue)}</strong></td>
                  <td><strong>{formatUSD(sourceAnalytics.overallAvg)}</strong></td>
                  <td><strong>100.0%</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. MISC OPERATIONS — DAILY SALES & EXPENSES ANALYTICS SECTION */}
      <div>
        <div className="dash-section-header">
          MISC OPERATIONS — DAILY SALES &amp; EXPENSES ANALYTICS
        </div>

        <div className="dash-card">
          <div className="dash-card-head">
            <div>
              <h3 className="dash-card-title">Misc Sales vs Operational Expenses Breakdown</h3>
              <p className="dash-card-sub">
                Total Sales: {formatUSD(miscAnalytics.totalSales)} · Total Expenses: {formatUSD(miscAnalytics.totalExpenses)} · Net Operating Balance: {formatUSD(miscAnalytics.netBalance)}
              </p>
            </div>
          </div>

          {/* DUAL BAR CHART FOR MISC SALES VS EXPENSES */}
          <div className="dash-chart-container">
            {(() => {
              const width = 800;
              const height = 260;
              const padL = 50;
              const padR = 65;
              const padT = 25;
              const padB = 65;
              const chartW = width - padL - padR;
              const chartH = height - padT - padB;

              const maxAmount = Math.max(
                ...miscAnalytics.settlementList.map((s) => Math.max(s.sales, s.expenses)),
                100
              );

              const ticks = [0, maxAmount * 0.25, maxAmount * 0.5, maxAmount * 0.75, maxAmount];
              const groupStep = chartW / Math.max(1, miscAnalytics.settlementList.length);

              return (
                <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }}>
                  {/* GRID LINES & Y-AXIS LABELS */}
                  {ticks.map((tick, i) => {
                    const y = padT + chartH - (tick / Math.max(1, maxAmount)) * chartH;
                    return (
                      <g key={i}>
                        <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                        <text x={padL - 10} y={y + 4} textAnchor="end" fontSize="11" fontWeight="800" fill="#000000">
                          ${tick.toFixed(0)}
                        </text>
                      </g>
                    );
                  })}

                  {/* GROUPED BARS FOR MISC SETTLEMENT METHODS */}
                  {miscAnalytics.settlementList.map((row, idx) => {
                    const groupX = padL + idx * groupStep + groupStep / 2;

                    const salesH = (row.sales / Math.max(1, maxAmount)) * chartH;
                    const salesY = padT + chartH - salesH;

                    const expH = (row.expenses / Math.max(1, maxAmount)) * chartH;
                    const expY = padT + chartH - expH;

                    const barW = 32;

                    return (
                      <g key={row.method}>
                        {/* DARK SLATE BAR: SALES */}
                        <rect
                          x={groupX - barW - 4}
                          y={salesY}
                          width={barW}
                          height={salesH}
                          fill="#0f172a"
                          rx="4"
                        />

                        {/* GREY BAR: EXPENSES */}
                        <rect
                          x={groupX + 4}
                          y={expY}
                          width={barW}
                          height={expH}
                          fill="#64748b"
                          rx="4"
                        />

                        {/* X-AXIS LABEL */}
                        <text x={groupX} y={padT + chartH + 22} textAnchor="middle" fontSize="12" fontWeight="700" fill="#000000">
                          {row.method}
                        </text>
                      </g>
                    );
                  })}

                  {/* BOTTOM LEGEND */}
                  <g transform={`translate(${width / 2 - 90}, ${height - 14})`}>
                    <rect x="0" y="-4" width="12" height="12" rx="3" fill="#0f172a" />
                    <text x="18" y="6" fontSize="12" fontWeight="700" fill="#000000">Misc Sales</text>

                    <rect x="110" y="-4" width="12" height="12" rx="3" fill="#64748b" />
                    <text x="128" y="6" fontSize="12" fontWeight="700" fill="#000000">Misc Expenses</text>
                  </g>
                </svg>
              );
            })()}
          </div>

          {/* MISC BREAKDOWN TABLE */}
          <div className="dash-source-table-wrapper">
            <table className="dash-source-table">
              <thead>
                <tr>
                  <th>SETTLEMENT METHOD</th>
                  <th>MISC SALES</th>
                  <th>MISC EXPENSES</th>
                  <th>NET BALANCE</th>
                  <th>% VOLUME</th>
                </tr>
              </thead>
              <tbody>
                {miscAnalytics.settlementList.map((row) => (
                  <tr key={row.method}>
                    <td><strong>{row.method}</strong></td>
                    <td>{formatUSD(row.sales)}</td>
                    <td>{formatUSD(row.expenses)}</td>
                    <td>{formatUSD(row.net)}</td>
                    <td>{row.percent}%</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td><strong>Total Net Operating Balance</strong></td>
                  <td><strong>{formatUSD(miscAnalytics.totalSales)}</strong></td>
                  <td><strong>{formatUSD(miscAnalytics.totalExpenses)}</strong></td>
                  <td><strong>{formatUSD(miscAnalytics.netBalance)}</strong></td>
                  <td><strong>100.0%</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
