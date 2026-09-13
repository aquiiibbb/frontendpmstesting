import React, { useState } from 'react';
import { usePMS } from '../../context/PMSContext';
import { formatUSD, formatDate } from '../../utils/formatters';
import { 
  FileText, 
  Download, 
  Printer, 
  TrendingUp, 
  DollarSign, 
  BedDouble, 
  PieChart,
  Layers,
  Search
} from 'lucide-react';

export const MasterReport = () => {
  const { 
    rooms, 
    reservations, 
    folios, 
    auditLogs, 
    taxRules, 
    businessDate, 
    showToast 
  } = usePMS();

  const [activeReportTab, setActiveReportTab] = useState('flash');

  // Compute Master Financial Totals
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.status === 'Occupied').length;
  const occupancyPercent = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : '0';

  let totalRoomRevenue = 0;
  let totalTaxRevenue = 0;
  let totalIncidentalRevenue = 0;
  let totalPaymentsReceived = 0;

  Object.values(folios).forEach((f) => {
    (f.folioA || []).forEach((c) => {
      if (c.category === 'Room Rate') totalRoomRevenue += c.amountUSD;
      else if (c.category === 'Tax') totalTaxRevenue += c.amountUSD;
      else totalIncidentalRevenue += c.amountUSD;
    });
    (f.folioB || []).forEach((c) => {
      totalIncidentalRevenue += c.amountUSD;
    });
    (f.payments || []).forEach((p) => {
      totalPaymentsReceived += p.amountUSD;
    });
  });

  const grandTotalRevenue = totalRoomRevenue + totalTaxRevenue + totalIncidentalRevenue;
  const adr = occupiedRooms > 0 ? totalRoomRevenue / occupiedRooms : 0;
  const revpar = totalRooms > 0 ? totalRoomRevenue / totalRooms : 0;
  const accountsReceivableBalance = grandTotalRevenue - totalPaymentsReceived;

  const [showEmail, setShowEmail] = useState(true);
  const [showNights, setShowNights] = useState(true);
  const [showPhone, setShowPhone] = useState(true);

  const handleExportCSV = () => {
    const headers = ["Res Code", "Guest Name", ...(showEmail ? ["Email"] : []), ...(showPhone ? ["Phone"] : []), "Room #", ...(showNights ? ["Nights"] : []), "Total Charges", "Total Payments", "Balance Due"];
    const rows = reservations.map((res) => {
      const folio = folios[res.id] || { folioA: [], folioB: [], payments: [] };
      const chg = [...(folio.folioA || []), ...(folio.folioB || [])].reduce((acc, c) => acc + (c.amountUSD || c.amount || 0), 0);
      const pay = (folio.payments || []).reduce((acc, p) => acc + (p.amountUSD || p.amount || 0), 0);
      const bal = chg - pay;
      return [
        res.resCode || res.id,
        res.guestName || res.guest,
        ...(showEmail ? [res.email || ""] : []),
        ...(showPhone ? [res.phone || ""] : []),
        res.roomNumber || res.room,
        ...(showNights ? [res.nights || 1] : []),
        chg.toFixed(2),
        pay.toFixed(2),
        bal.toFixed(2)
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Master_Report_${businessDate || new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast?.(`Master Report exported to CSV with custom columns!`);
  };

  return (
    <div className="reports-view">
      <div className="reports-header">
        <div>
          <h2>All-in-One Executive Master Report</h2>
        </div>

        <div className="reports-actions">
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <Printer size={16} /> Print Report
          </button>
          <button className="btn btn-primary" onClick={handleExportCSV}>
            <Download size={16} /> Export to CSV
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeReportTab === 'flash' ? 'active' : ''}`}
          onClick={() => setActiveReportTab('flash')}
        >
          <TrendingUp size={16} /> Manager Flash Report
        </button>
        <button
          className={`tab-btn ${activeReportTab === 'ledger' ? 'active' : ''}`}
          onClick={() => setActiveReportTab('ledger')}
        >
          <DollarSign size={16} /> Daily Revenue & Tax Ledger
        </button>
        <button
          className={`tab-btn ${activeReportTab === 'guestar' ? 'active' : ''}`}
          onClick={() => setActiveReportTab('guestar')}
        >
          <Layers size={16} /> Guest Ledger & Accounts Receivable
        </button>
        <button
          className={`tab-btn ${activeReportTab === 'audithistory' ? 'active' : ''}`}
          onClick={() => setActiveReportTab('audithistory')}
        >
          <FileText size={16} /> Night Audit Log Archive
        </button>
      </div>

      {/* 1. Manager Flash Report Tab */}
      {activeReportTab === 'flash' && (
        <div className="report-content">
          <div className="flash-summary-grid">
            <div className="flash-card glassmorphism">
              <span className="card-label">TOTAL GRAND REVENUE ($ USD)</span>
              <h3 className="text-emerald">{formatUSD(grandTotalRevenue)}</h3>
              <div className="flash-breakdown">
                <span>Room Rev: {formatUSD(totalRoomRevenue)}</span>
                <span>Tax: {formatUSD(totalTaxRevenue)}</span>
                <span>Incidentals: {formatUSD(totalIncidentalRevenue)}</span>
              </div>
            </div>

            <div className="flash-card glassmorphism">
              <span className="card-label">PROPERTY OCCUPANCY</span>
              <h3>{occupancyPercent}%</h3>
              <div className="flash-breakdown">
                <span>{occupiedRooms} Sold / {totalRooms} Total Capacity</span>
              </div>
            </div>

            <div className="flash-card glassmorphism">
              <span className="card-label">AVERAGE DAILY RATE (ADR)</span>
              <h3>{formatUSD(adr)}</h3>
              <div className="flash-breakdown">
                <span>RevPAR: {formatUSD(revpar)}</span>
              </div>
            </div>

            <div className="flash-card glassmorphism">
              <span className="card-label">ACCOUNTS RECEIVABLE BALANCE</span>
              <h3 className={accountsReceivableBalance > 0 ? 'text-amber' : 'text-emerald'}>
                {formatUSD(accountsReceivableBalance)}
              </h3>
              <div className="flash-breakdown">
                <span>Total Collected: {formatUSD(totalPaymentsReceived)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Daily Revenue & Tax Ledger Tab */}
      {activeReportTab === 'ledger' && (
        <div className="report-content card glassmorphism">
          <div className="card-header">
            <h3>Itemized Revenue & Tax Category Ledger</h3>
          </div>
          <div className="table-responsive">
            <table className="pms-table">
              <thead>
                <tr>
                  <th>Revenue / Tax Category</th>
                  <th>Description & Rate Scope</th>
                  <th>Amount ($ USD)</th>
                  <th>% of Grand Revenue</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Room Nightly Charges</strong></td>
                  <td>Core Accommodation Revenue</td>
                  <td className="text-emerald fw-bold">{formatUSD(totalRoomRevenue)}</td>
                  <td>{grandTotalRevenue > 0 ? ((totalRoomRevenue / grandTotalRevenue) * 100).toFixed(1) : 0}%</td>
                </tr>

                {taxRules.map((tax) => {
                  let taxAmt = 0;
                  Object.values(folios).forEach((f) => {
                    (f.folioA || []).forEach((c) => {
                      if (c.category === 'Tax' && c.description.includes(tax.name)) {
                        taxAmt += c.amountUSD;
                      }
                    });
                  });
                  return (
                    <tr key={tax.id}>
                      <td><span className="category-pill bg-purple">{tax.name}</span></td>
                      <td>{tax.type === 'percent' ? `${tax.rate}% on ${tax.appliedTo}` : `$${tax.rate} Flat`}</td>
                      <td className="text-blue fw-bold">{formatUSD(taxAmt)}</td>
                      <td>{grandTotalRevenue > 0 ? ((taxAmt / grandTotalRevenue) * 100).toFixed(1) : 0}%</td>
                    </tr>
                  );
                })}

                <tr>
                  <td><strong>Food, Beverage, Spa & Extras</strong></td>
                  <td>Room Service, Amenities, Valet, Spa</td>
                  <td className="text-emerald fw-bold">{formatUSD(totalIncidentalRevenue)}</td>
                  <td>{grandTotalRevenue > 0 ? ((totalIncidentalRevenue / grandTotalRevenue) * 100).toFixed(1) : 0}%</td>
                </tr>

                <tr className="table-row-total">
                  <td><strong>GRAND REVENUE TOTAL ($ USD)</strong></td>
                  <td>All posted charges + taxes</td>
                  <td className="text-emerald fw-bold">{formatUSD(grandTotalRevenue)}</td>
                  <td>100.0%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Guest Ledger & AR Tab */}
      {activeReportTab === 'guestar' && (
        <div className="report-content card" style={{ background: "#ffffff", border: "1px solid #e2e8f0", color: "#0f172a", borderRadius: "12px", padding: "20px" }}>
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
            <h3 style={{ color: "#0f172a", margin: 0, fontSize: "16px", fontWeight: "800" }}>Active Guest Ledger & Outstanding Balances</h3>

            {/* DYNAMIC COLUMN FILTER CHECKBOXES */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", background: "#f8fafc", padding: "6px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px" }}>
              <span style={{ fontWeight: 800, color: "#2563eb", textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.5px" }}>Display Columns:</span>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "#0f172a", fontWeight: 600 }}>
                <input type="checkbox" checked={showEmail} onChange={(e) => setShowEmail(e.target.checked)} style={{ accentColor: "#f59e0b" }} /> Email
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "#f8fafc", fontWeight: 600 }}>
                <input type="checkbox" checked={showPhone} onChange={(e) => setShowPhone(e.target.checked)} style={{ accentColor: "#f59e0b" }} /> Phone
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "#f8fafc", fontWeight: 600 }}>
                <input type="checkbox" checked={showNights} onChange={(e) => setShowNights(e.target.checked)} style={{ accentColor: "#f59e0b" }} /> Nights
              </label>
            </div>
          </div>

          <div className="table-responsive">
            <table className="pms-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr style={{ background: "#1e293b", color: "#94a3b8", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  <th style={{ padding: "12px 14px", borderBottom: "2px solid #334155" }}>Res Code</th>
                  <th style={{ padding: "12px 14px", borderBottom: "2px solid #334155" }}>Guest Name</th>
                  {showEmail && <th style={{ padding: "12px 14px", borderBottom: "2px solid #334155" }}>Email</th>}
                  {showPhone && <th style={{ padding: "12px 14px", borderBottom: "2px solid #334155" }}>Phone</th>}
                  <th style={{ padding: "12px 14px", borderBottom: "2px solid #334155" }}>Room #</th>
                  {showNights && <th style={{ padding: "12px 14px", borderBottom: "2px solid #334155" }}>Nights</th>}
                  <th style={{ padding: "12px 14px", borderBottom: "2px solid #334155" }}>Total Charges ($)</th>
                  <th style={{ padding: "12px 14px", borderBottom: "2px solid #334155" }}>Total Payments ($)</th>
                  <th style={{ padding: "12px 14px", borderBottom: "2px solid #334155" }}>Balance Due ($ USD)</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((res) => {
                  const folio = folios[res.id] || { folioA: [], folioB: [], payments: [] };
                  const chg = [...(folio.folioA || []), ...(folio.folioB || [])].reduce((acc, c) => acc + (c.amountUSD || c.amount || 0), 0);
                  const pay = (folio.payments || []).reduce((acc, p) => acc + (p.amountUSD || p.amount || 0), 0);
                  const bal = chg - pay;

                  return (
                    <tr key={res.id} style={{ borderBottom: "1px solid #1e293b", fontSize: "13.5px" }}>
                      <td style={{ padding: "12px 14px" }}><strong style={{ color: "#f59e0b" }}>{res.resCode || res.id}</strong></td>
                      <td style={{ padding: "12px 14px", fontWeight: 700, color: "#ffffff" }}>{res.guestName || res.guest}</td>
                      {showEmail && <td style={{ padding: "12px 14px", color: "#cbd5e1" }}>{res.email || "N/A"}</td>}
                      {showPhone && <td style={{ padding: "12px 14px", color: "#cbd5e1" }}>{res.phone || "N/A"}</td>}
                      <td style={{ padding: "12px 14px", fontWeight: 700, color: "#38bdf8" }}>Room {res.roomNumber || res.room}</td>
                      {showNights && <td style={{ padding: "12px 14px", color: "#cbd5e1" }}>{res.nights || 1} Nights</td>}
                      <td style={{ padding: "12px 14px", color: "#ffffff" }}>{formatUSD(chg)}</td>
                      <td style={{ padding: "12px 14px", color: "#34d399", fontWeight: 700 }}>{formatUSD(pay)}</td>
                      <td style={{ padding: "12px 14px", color: bal > 0 ? '#fbbf24' : '#34d399', fontWeight: 800 }}>
                        {formatUSD(bal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Audit Log History Tab */}
      {activeReportTab === 'audithistory' && (
        <div className="report-content card glassmorphism">
          <div className="card-header">
            <h3>Historical Night Audit Execution Logs</h3>
          </div>
          <div className="table-responsive">
            <table className="pms-table">
              <thead>
                <tr>
                  <th>Audit Date</th>
                  <th>Timestamp</th>
                  <th>Auditor</th>
                  <th>Rooms Occupied</th>
                  <th>Occupancy %</th>
                  <th>Room Revenue ($ USD)</th>
                  <th>Tax Revenue ($ USD)</th>
                  <th>Grand Revenue ($ USD)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td><strong>{formatDate(log.auditDate)}</strong></td>
                    <td>{log.completedAt}</td>
                    <td>{log.auditor}</td>
                    <td>{log.totalRoomsOccupied} Rooms</td>
                    <td>{log.occupancyPercent}%</td>
                    <td className="text-emerald">{formatUSD(log.totalRoomRevenueUSD)}</td>
                    <td className="text-blue">{formatUSD(log.totalTaxCollectedUSD)}</td>
                    <td className="text-emerald fw-bold">{formatUSD(log.grandTotalRevenueUSD)}</td>
                    <td>
                      <span className="badge badge-success">{log.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
