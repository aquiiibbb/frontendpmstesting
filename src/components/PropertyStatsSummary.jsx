import React, { useState, useMemo } from "react";
import { Printer, Eye, Shield, Zap, DollarSign, CreditCard } from "lucide-react";
import { getBusinessDate } from "../services/hotelConfig";
import "./propertyStatsSummary.css";

export default function PropertyStatsSummary({ rooms = [], bookings = [] }) {
  const activeBizDate = useMemo(() => getBusinessDate(), []);

  // Compute 7-day range starting from business date
  const days = useMemo(() => {
    const baseDate = new Date(activeBizDate.length === 10 ? activeBizDate + "T00:00:00" : activeBizDate);
    const validBase = isNaN(baseDate.getTime()) ? new Date() : baseDate;
    const result = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(validBase);
      d.setDate(d.getDate() + i);
      const dateISO = d.toISOString().slice(0, 10);
      const monthShort = d.toLocaleString("en-US", { month: "short" });
      const dayNum = d.getDate();
      const weekdayShort = d.toLocaleString("en-US", { weekday: "short" }).toUpperCase();
      result.push({
        date: dateISO,
        dayNum,
        monthShort,
        weekdayShort,
        label: `${dayNum} ${monthShort}`,
      });
    }
    return result;
  }, [activeBizDate]);

  // Compute 5 daily metrics across the 7 days
  const dailyStats = useMemo(() => {
    const totalRoomCount = Array.isArray(rooms) ? rooms.length : 0;

    return days.map((day) => {
      let soldCount = 0;
      let dailyRevenue = 0;

      (bookings || []).forEach((b) => {
        if (!b || b.status === "cancelled" || b.isDeleted) return;
        const cIn = String(b.checkIn || "").slice(0, 10);
        const cOut = String(b.checkOut || "").slice(0, 10);

        if (cIn <= day.date && cOut > day.date) {
          soldCount++;
          const nights = Math.max(1, Math.round((new Date(cOut) - new Date(cIn)) / 86400000)) || 1;
          const rate = Number(b.ratePerNight || b.nightlyRateUSD || (b.totalAmount ? b.totalAmount / nights : 120));
          dailyRevenue += rate;
        }
      });

      const availableCount = Math.max(0, totalRoomCount - soldCount);
      const occupancyPct = totalRoomCount > 0 ? Math.min(100, Math.round((soldCount / totalRoomCount) * 100)) : 0;

      const dailyPayment = (bookings || []).reduce((sum, b) => {
        if (!b || b.status === "cancelled" || b.isDeleted) return sum;
        let pSum = 0;

        if (Array.isArray(b.payments) && b.payments.length > 0) {
          const paysForDay = b.payments.filter((p) => {
            const pDate = String(p.date || p.createdAt || p.timestamp || "").slice(0, 10);
            return pDate === day.date;
          });
          pSum += paysForDay.reduce((acc, p) => acc + Number(p.amountUSD || p.amount || 0), 0);
        } else if (Number(b.advanceAmount || b.paidAmount || 0) > 0) {
          const advanceTxnDate = String(
            b.advancePaymentDate || b.paymentDate || b.bookingDate || b.createdAt || b.createdDate || b.date || ""
          ).slice(0, 10);
          if (advanceTxnDate === day.date) {
            pSum += Number(b.advanceAmount || b.paidAmount || 0);
          }
        }
        return sum + pSum;
      }, 0);

      return {
        date: day.date,
        sold: soldCount,
        available: availableCount,
        occupancy: occupancyPct,
        revenue: Math.round(dailyRevenue),
        payment: Math.round(dailyPayment),
      };
    });
  }, [days, rooms, bookings]);

  function handlePrintReport() {
    window.print();
  }

  return (
    <div className="property-stats-card">
      <div className="stats-card-header">
        <div className="stats-title-group">
          <h3>📊 Property Stats & Daily Inventory</h3>
          <p>Real-time occupancy, inventory availability, revenue, and collections summary</p>
        </div>
        <button type="button" className="stats-print-action-btn" onClick={handlePrintReport}>
          <Printer size={14} /> Print Stats Report
        </button>
      </div>

      <div className="stats-matrix-table-wrap">
        <table className="stats-matrix-table">
          <thead>
            <tr>
              <th className="th-metric-header">METRIC / DATE</th>
              {days.map((d) => (
                <th key={d.date} className="th-date-col">
                  <span className="th-day-badge">{d.dayNum} {d.monthShort}</span>
                  <span className="th-weekday">{d.weekdayShort}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* ROW 1: OCCUPANCY (%) */}
            <tr className="tr-occupancy">
              <td className="td-metric-label">
                <Eye size={14} className="metric-icon" /> <span>OCCUPANCY (%)</span>
              </td>
              {dailyStats.map((s) => (
                <td key={`occ-${s.date}`} className="td-val highlight-occ">
                  {s.occupancy}%
                </td>
              ))}
            </tr>

            {/* ROW 2: TOTAL AVAILABLE */}
            <tr className="tr-available">
              <td className="td-metric-label">
                <Shield size={14} className="metric-icon" /> <span>TOTAL AVAILABLE</span>
              </td>
              {dailyStats.map((s) => (
                <td key={`avail-${s.date}`} className="td-val highlight-avail">
                  {s.available}
                </td>
              ))}
            </tr>

            {/* ROW 3: TOTAL SOLD */}
            <tr className="tr-sold">
              <td className="td-metric-label">
                <Zap size={14} className="metric-icon" /> <span>TOTAL SOLD</span>
              </td>
              {dailyStats.map((s) => (
                <td key={`sold-${s.date}`} className="td-val highlight-sold">
                  {s.sold}
                </td>
              ))}
            </tr>

            {/* ROW 4: ROOM REVENUE ($) */}
            <tr className="tr-revenue">
              <td className="td-metric-label">
                <DollarSign size={14} className="metric-icon" /> <span>ROOM REVENUE</span>
              </td>
              {dailyStats.map((s) => (
                <td key={`rev-${s.date}`} className="td-val highlight-rev">
                  ${s.revenue.toLocaleString()}
                </td>
              ))}
            </tr>

            {/* ROW 5: PAYMENT COLLECTED ($) */}
            <tr className="tr-payment">
              <td className="td-metric-label">
                <CreditCard size={14} className="metric-icon" /> <span>PAYMENT COLLECTED</span>
              </td>
              {dailyStats.map((s) => (
                <td key={`pay-${s.date}`} className="td-val highlight-pay">
                  ${s.payment.toLocaleString()}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
