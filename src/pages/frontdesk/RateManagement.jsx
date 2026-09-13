import { useState, useEffect, useMemo } from "react";
import CustomDatePicker from "../../components/CustomDatePicker";
import "./rateManagement.css";
import {
  getRoomTypes,
  getRatePlans,
  getDailyRatesMap,
  saveDailyRate,
  bulkUpdateDailyRates,
  getTaxInclusiveSetting,
  saveTaxInclusiveSetting,
  getActiveTaxPercent,
  STORAGE_KEY_ROOM_NUMBERS,
} from "../../services/hotelConfig";


function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function RateManagement() {
  const [startDate, setStartDate] = useState(() => todayISO());
  const [viewDays, setViewDays] = useState(7); // 7 | 14 | 30
  const [roomTypes, setRoomTypes] = useState(() => getRoomTypes());
  const [ratePlans, setRatePlans] = useState(() => getRatePlans());
  const [dailyRatesMap, setDailyRatesMap] = useState(() => getDailyRatesMap());
  const [filterSearch, setFilterSearch] = useState("");
  const [currency, setCurrency] = useState("$");

  // INLINE CELL EDIT MODAL
  const [editingCell, setEditingCell] = useState(null); // { roomType, ratePlan, dateStr, price, minStay, stopSell }
  const [inlinePriceInput, setInlinePriceInput] = useState("");
  const [inlineMinStayInput, setInlineMinStayInput] = useState("1");
  const [inlineStopSell, setInlineStopSell] = useState(false);

  // BULK UPDATE MODAL
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    startDate: todayISO(),
    endDate: todayISO(),
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // 0-6
    roomTypes: [],
    ratePlans: [],
    adjustmentType: "fixed", // fixed | percent | flat
    fixedPrice: "175",
    adjustmentVal: "15",
    minStay: "1",
    stopSell: false,
  });

  const [isTaxInclusive, setIsTaxInclusive] = useState(() => getTaxInclusiveSetting());
  const [activeTaxPct, setActiveTaxPct] = useState(() => getActiveTaxPercent());

  // LISTEN TO LIVE CONFIG EVENTS
  useEffect(() => {
    async function loadApiRoomTypes() {
      try {
        const { getRoomTypes: apiGetRoomTypes } = await import("../../services/api");
        const res = await apiGetRoomTypes();
        const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        if (list.length > 0) {
          setRoomTypes(list);
          try {
            localStorage.setItem("hotelpms_room_types_v3", JSON.stringify(list));
          } catch {}
        }
      } catch (err) {
        console.error("Failed to load room types from API in RateManagement:", err);
      }
    }
    loadApiRoomTypes();

    function handleSync() {
      setDailyRatesMap(getDailyRatesMap());
      setRoomTypes(getRoomTypes());
      setRatePlans(getRatePlans());
      setIsTaxInclusive(getTaxInclusiveSetting());
      setActiveTaxPct(getActiveTaxPercent());
    }
    window.addEventListener("pms_daily_rates_updated", handleSync);
    window.addEventListener("pms_room_types_updated", handleSync);
    window.addEventListener("pms_rooms_updated", handleSync);
    window.addEventListener("pms_rate_plans_updated", handleSync);
    window.addEventListener("pms_tax_inclusive_updated", handleSync);
    window.addEventListener("pms_taxes_updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("pms_daily_rates_updated", handleSync);
      window.removeEventListener("pms_room_types_updated", handleSync);
      window.removeEventListener("pms_rooms_updated", handleSync);
      window.removeEventListener("pms_rate_plans_updated", handleSync);
      window.removeEventListener("pms_tax_inclusive_updated", handleSync);
      window.removeEventListener("pms_taxes_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  // GENERATE DATES ARRAY
  const datesList = useMemo(() => {
    const list = [];
    const start = new Date(startDate);
    for (let i = 0; i < viewDays; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const monthDay = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      list.push({ iso, dayName, monthDay, dateObj: d });
    }
    return list;
  }, [startDate, viewDays]);

  // DATE NAV HANDLERS
  function handlePrevDays() {
    const d = new Date(startDate);
    d.setDate(d.getDate() - viewDays);
    setStartDate(d.toISOString().split("T")[0]);
  }

  function handleNextDays() {
    const d = new Date(startDate);
    d.setDate(d.getDate() + viewDays);
    setStartDate(d.toISOString().split("T")[0]);
  }

  // CELL CLICK HANDLER
  function handleOpenCellEdit(rtName, rpName, dateStr) {
    const key = `${rtName}_${rpName}_${dateStr}`;
    const existing = dailyRatesMap[key] || {};
    
    const rt = roomTypes.find((t) => t.name === rtName);
    const rp = ratePlans.find((p) => p.name === rpName);
    const planNights = Math.max(1, Number(rp?.nights) || 1);
    const planAdj = Number(rp?.adjustment || 0);
    
    let baseRate = planAdj > 0 ? (planAdj / planNights) : Number(rt?.price || 0);
    const basePrice = existing.price !== undefined ? existing.price : Math.round(baseRate * 100) / 100;
    
    const taxMultiplier = isTaxInclusive && activeTaxPct > 0 ? (1 + activeTaxPct / 100) : 1;
    const displayedPrice = Math.round((basePrice * taxMultiplier) * 100) / 100;

    setEditingCell({ rtName, rpName, dateStr, key });
    setInlinePriceInput(String(displayedPrice));
    setInlineMinStayInput(String(existing.minStay || planNights));
    setInlineStopSell(Boolean(existing.stopSell));
  }

  function handleSaveInlineCell(e) {
    e.preventDefault();
    if (!editingCell) return;

    const enteredVal = Number(inlinePriceInput || 0);
    const taxMultiplier = isTaxInclusive && activeTaxPct > 0 ? (1 + activeTaxPct / 100) : 1;
    const basePriceToSave = enteredVal / taxMultiplier;

    saveDailyRate(editingCell.key, {
      price: Math.round(basePriceToSave * 100) / 100,
      minStay: Number(inlineMinStayInput || 1),
      stopSell: inlineStopSell,
    });

    setEditingCell(null);
  }

  // BULK UPDATE SUBMIT HANDLER
  function handleSaveBulkSubmit(e) {
    e.preventDefault();
    if (bulkForm.roomTypes.length === 0 || bulkForm.ratePlans.length === 0) {
      alert("Please select at least one Room Type and one Rate Plan.");
      return;
    }

    const taxMultiplier = isTaxInclusive && activeTaxPct > 0 ? (1 + activeTaxPct / 100) : 1;
    const fixedPriceVal = (bulkForm.adjustmentType === "fixed" && isTaxInclusive && activeTaxPct > 0)
      ? String(Math.round((Number(bulkForm.fixedPrice || 0) / taxMultiplier) * 100) / 100)
      : bulkForm.fixedPrice;

    bulkUpdateDailyRates({
      ...bulkForm,
      fixedPrice: fixedPriceVal,
    });
    setShowBulkModal(false);
  }

  // DYNAMIC RESOLUTION OF CONFIGURED ROOM TYPES
  const activeRoomTypes = useMemo(() => {
    if (Array.isArray(roomTypes)) return roomTypes;
    return [];
  }, [roomTypes]);

  // FILTERED ROOM TYPES
  const filteredRoomTypes = useMemo(() => {
    if (!filterSearch) return activeRoomTypes;
    return activeRoomTypes.filter((t) =>
      t.name.toLowerCase().includes(filterSearch.toLowerCase())
    );
  }, [activeRoomTypes, filterSearch]);

  return (
    <div className="rm-container">
      {/* TOP WORKSPACE HEADER */}
      <div className="rm-header">
        <div className="rm-header-left">
          <h1>Rate Management</h1>
        </div>
        <div className="rm-header-actions" style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "nowrap" }}>
          {activeTaxPct > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 38,
                padding: "0 14px",
                borderRadius: 10,
                border: "1.5px solid #cbd5e1",
                background: "#f8fafc",
                color: "#475569",
                fontSize: 12,
                fontWeight: 800,
                whiteSpace: "nowrap"
              }}
            >
              Active Tax: {activeTaxPct}%
            </span>
          )}
          <select
            value={isTaxInclusive ? "inclusive" : "exclusive"}
            onChange={(e) => {
              const nextVal = e.target.value === "inclusive";
              setIsTaxInclusive(nextVal);
              saveTaxInclusiveSetting(nextVal);
            }}
            style={{
              height: 38,
              padding: "0 14px",
              borderRadius: 10,
              border: "1.5px solid #cbd5e1",
              fontWeight: "800",
              fontSize: 12.5,
              color: isTaxInclusive ? "#2563eb" : "#0f172a",
              background: "#ffffff",
              outline: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
              boxShadow: "0 1px 3px rgba(15,23,42,0.04)"
            }}
          >
            <option value="exclusive">🏷️ Rates: Tax Exclusive</option>
            <option value="inclusive">🧾 Rates: Tax Inclusive</option>
          </select>

          <button
            type="button"
            className="rm-btn-teal"
            onClick={() => {
              setBulkForm({
                startDate: startDate,
                endDate: datesList[datesList.length - 1]?.iso || startDate,
                daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                roomTypes: roomTypes.map((t) => t.name),
                ratePlans: ratePlans.map((p) => p.name),
                adjustmentType: "fixed",
                fixedPrice: "175",
                adjustmentVal: "15",
                minStay: "1",
                stopSell: false,
              });
              setShowBulkModal(true);
            }}
          >
            ⚡ Bulk Update Rates
          </button>
        </div>
      </div>

      {/* TOOLBAR CONTROLS */}
      <div className="rm-toolbar">
        <div className="rm-toolbar-left">
          <div className="rm-date-nav">
            <button type="button" className="rm-nav-btn" onClick={handlePrevDays}>
              ◀ Prev
            </button>
            <button type="button" className="rm-nav-btn" onClick={() => setStartDate(todayISO())}>
              Today
            </button>
            <button type="button" className="rm-nav-btn" onClick={handleNextDays}>
              Next ▶
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>Start Date:</span>
            <div style={{ width: "160px" }}>
              <CustomDatePicker
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <div className="rm-view-pills">
            <button
              type="button"
              className={`rm-view-pill ${viewDays === 7 ? "active" : ""}`}
              onClick={() => setViewDays(7)}
            >
              7 Days
            </button>
            <button
              type="button"
              className={`rm-view-pill ${viewDays === 14 ? "active" : ""}`}
              onClick={() => setViewDays(14)}
            >
              14 Days
            </button>
            <button
              type="button"
              className={`rm-view-pill ${viewDays === 30 ? "active" : ""}`}
              onClick={() => setViewDays(30)}
            >
              30 Days
            </button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input
            type="text"
            className="rm-search-input"
            placeholder="Search room category..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
          />


        </div>
      </div>

      {/* RATE MATRIX DATA TABLE */}
      {activeRoomTypes.length === 0 ? (
        <div style={{ background: "#ffffff", borderRadius: 12, padding: "48px 24px", textAlign: "center", border: "2px dashed #cbd5e1", margin: "20px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏨</div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>No Room Categories Configured Yet</h2>
          <p style={{ color: "#64748b", fontSize: 14, maxWidth: 520, margin: "0 auto 24px", lineHeight: 1.6 }}>
            You haven&apos;t configured any room categories or room numbers yet. Configure your room categories under <strong>Property Setup ➔ Room Types</strong> or add room numbers to feed date-wise setup rates!
          </p>
          <a
            href="/configuration"
            className="rm-btn-teal"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", padding: "12px 24px", fontSize: 14, fontWeight: 800 }}
          >
            ⚙️ Configure Room Categories Now
          </a>
        </div>
      ) : (
        <div className="rm-table-wrapper">
          <table className="rm-table">
            <thead>
              <tr>
                <th style={{ minWidth: 240 }}>Room Category / Rate Plan</th>
                {datesList.map((d) => (
                  <th key={d.iso} className="date-col">
                    <div className="rm-date-header">
                      <span className="day">{d.dayName}</span>
                      <span className="num">{d.monthDay}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRoomTypes.map((rt) => (
                <tr key={rt.id || rt.name} className="rm-category-row">
                  <td colSpan={datesList.length + 1} style={{ padding: "12px 16px" }}>
                    <div className="rm-category-title">
                      <span>🏢 {rt.name}</span>
                    </div>
                  </td>
                </tr>
              )).flatMap((categoryElement, idx) => {
                const rt = filteredRoomTypes[idx];
                const taxMultiplier = isTaxInclusive && activeTaxPct > 0 ? (1 + activeTaxPct / 100) : 1;

                const planRows = ratePlans.map((rp) => {
                  const planNights = Math.max(1, Number(rp?.nights) || 1);
                  const planPrice = Number(rp?.adjustment || 0);
                  const baseNightlyRate = planPrice > 0 ? (planPrice / planNights) : Number(rt?.price || 0);
                  const displayedNightlyRate = Math.round((baseNightlyRate * taxMultiplier) * 100) / 100;

                  return (
                    <tr key={`${rt.name}_${rp.name}`} className="rm-plan-row">
                      <td className="rm-plan-name">
                        <span style={{ fontSize: "12px" }}>🏷️</span> {rp.name}
                        {baseNightlyRate > 0 && (
                          <span style={{ fontSize: "10.5px", color: "#000000", marginLeft: 6, fontWeight: 800 }}>
                            ({currency}{displayedNightlyRate.toFixed(2)}/night)
                          </span>
                        )}
                      </td>
                      {datesList.map((d) => {
                        const key = `${rt.name}_${rp.name}_${d.iso}`;
                        const entry = dailyRatesMap[key];
                        const basePrice = entry?.price !== undefined ? entry.price : baseNightlyRate;
                        const displayedPrice = Math.round((basePrice * taxMultiplier) * 100) / 100;
                        const isModified = entry?.price !== undefined;
                        const isStopSell = Boolean(entry?.stopSell);
                        const minStay = entry?.minStay || planNights;

                        return (
                          <td key={d.iso} style={{ textAlign: "center" }}>
                            <div
                              className={`rm-cell-card ${isModified ? "modified" : ""} ${isStopSell ? "stop-sell" : ""}`}
                              onClick={() => handleOpenCellEdit(rt.name, rp.name, d.iso)}
                              title={`Click to edit rate for ${rt.name} (${rp.name}) on ${d.iso}`}
                            >
                              <span className="rm-cell-price">
                                {currency}{Number(displayedPrice).toFixed(2)}
                              </span>
                              <span className="rm-cell-badge">
                                {isStopSell ? "🚫 Closed" : minStay > 1 ? `Min ${minStay}N` : isModified ? "Custom ✏️" : "Standard"}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                });
                return [categoryElement, ...planRows];
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* INLINE CELL EDIT MODAL */}
      {editingCell && (
        <div className="rm-modal-overlay" onClick={() => setEditingCell(null)}>
          <div className="rm-modal-card" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="rm-modal-head">
              <h3>✏️ Edit Daily Rate</h3>
              <button type="button" className="rm-modal-close" onClick={() => setEditingCell(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveInlineCell} className="rm-modal-body">
              <div style={{ background: "#f8fafc", padding: "14px 18px", borderRadius: "10px", fontSize: 13, border: "1px solid #e2e8f0" }}>
                <strong style={{ fontSize: "14px", color: "#0f172a" }}>{editingCell.rtName}</strong> • <span style={{ color: "#475569", fontWeight: 700 }}>{editingCell.rpName}</span>
                <div style={{ color: "#64748b", fontSize: "12px", marginTop: 4, fontWeight: 600 }}>Date: {editingCell.dateStr}</div>
              </div>

              <div className="rm-field-group">
                <label className="rm-field-label">DAILY PRICE ({currency}) {isTaxInclusive ? "· Tax Inclusive" : "· Tax Exclusive"} *</label>
                <input
                  type="number"
                  step="0.01"
                  value={inlinePriceInput}
                  onChange={(e) => setInlinePriceInput(e.target.value)}
                  required
                  autoFocus
                  style={{ height: 44, borderRadius: 10, border: "1.5px solid #cbd5e1", padding: "0 14px", fontSize: 18, fontWeight: 800, color: "#0f172a", outline: "none", background: "#ffffff" }}
                />
              </div>

              <div className="rm-modal-actions">
                <button type="button" className="rm-btn-cancel" onClick={() => setEditingCell(null)}>Cancel</button>
                <button type="submit" className="rm-btn-submit">Save Rate</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK RATE UPDATE MODAL */}
      {showBulkModal && (
        <div className="rm-modal-overlay" onClick={() => setShowBulkModal(false)}>
          <div className="rm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="rm-modal-head">
              <h3>⚡ Bulk Update Rates</h3>
              <button type="button" className="rm-modal-close" onClick={() => setShowBulkModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveBulkSubmit} className="rm-modal-body">
              {/* STEP 1: DATE RANGE & DAYS */}
              <div className="rm-field-group">
                <label className="rm-field-label">1. DATE RANGE &amp; DAYS OF WEEK</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Start Date</span>
                    <CustomDatePicker
                      value={bulkForm.startDate}
                      onChange={(e) => setBulkForm({ ...bulkForm, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>End Date</span>
                    <CustomDatePicker
                      value={bulkForm.endDate}
                      onChange={(e) => setBulkForm({ ...bulkForm, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="rm-days-pills" style={{ marginTop: 10 }}>
                  {[
                    { num: 1, label: "Mon" },
                    { num: 2, label: "Tue" },
                    { num: 3, label: "Wed" },
                    { num: 4, label: "Thu" },
                    { num: 5, label: "Fri" },
                    { num: 6, label: "Sat" },
                    { num: 0, label: "Sun" },
                  ].map((d) => {
                    const isSelected = bulkForm.daysOfWeek.includes(d.num);
                    return (
                      <button
                        key={d.num}
                        type="button"
                        className={`rm-day-pill ${isSelected ? "selected" : ""}`}
                        onClick={() => {
                          const updated = isSelected
                            ? bulkForm.daysOfWeek.filter((x) => x !== d.num)
                            : [...bulkForm.daysOfWeek, d.num];
                          setBulkForm({ ...bulkForm, daysOfWeek: updated });
                        }}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP 2: TARGET CATEGORIES */}
              <div className="rm-field-group">
                <label className="rm-field-label">2. TARGET ROOM TYPES &amp; RATE PLANS</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700, display: "block", marginBottom: 6 }}>Room Categories:</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {roomTypes.map((t) => {
                        const checked = bulkForm.roomTypes.includes(t.name);
                        return (
                          <label key={t.id || t.name} className="rm-checkbox-item">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const updated = e.target.checked
                                  ? [...bulkForm.roomTypes, t.name]
                                  : bulkForm.roomTypes.filter((x) => x !== t.name);
                                setBulkForm({ ...bulkForm, roomTypes: updated });
                              }}
                            />
                            <span>{t.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700, display: "block", marginBottom: 6 }}>Rate Plans:</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {ratePlans.map((p) => {
                        const checked = bulkForm.ratePlans.includes(p.name);
                        return (
                          <label key={p.id || p.name} className="rm-checkbox-item">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const updated = e.target.checked
                                  ? [...bulkForm.ratePlans, p.name]
                                  : bulkForm.ratePlans.filter((x) => x !== p.name);
                                setBulkForm({ ...bulkForm, ratePlans: updated });
                              }}
                            />
                            <span>{p.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 3: RATE ADJUSTMENTS */}
              <div className="rm-field-group">
                <label className="rm-field-label">3. RATE ADJUSTMENTS &amp; PRICING</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <label className="rm-checkbox-item">
                    <input
                      type="radio"
                      name="adjustmentType"
                      checked={bulkForm.adjustmentType === "fixed"}
                      onChange={() => setBulkForm({ ...bulkForm, adjustmentType: "fixed" })}
                    />
                    <span>Set Fixed Price:</span>
                    <input
                      type="number"
                      value={bulkForm.fixedPrice}
                      onChange={(e) => setBulkForm({ ...bulkForm, fixedPrice: e.target.value })}
                      disabled={bulkForm.adjustmentType !== "fixed"}
                      style={{ width: 110, height: 36, padding: "0 10px", borderRadius: 8, border: "1.5px solid #cbd5e1", fontSize: 14, fontWeight: 700, outline: "none" }}
                    />
                  </label>

                  <label className="rm-checkbox-item">
                    <input
                      type="radio"
                      name="adjustmentType"
                      checked={bulkForm.adjustmentType === "percent"}
                      onChange={() => setBulkForm({ ...bulkForm, adjustmentType: "percent" })}
                    />
                    <span>Adjust by Percentage (%):</span>
                    <input
                      type="number"
                      placeholder="+15 or -10"
                      value={bulkForm.adjustmentVal}
                      onChange={(e) => setBulkForm({ ...bulkForm, adjustmentVal: e.target.value })}
                      disabled={bulkForm.adjustmentType !== "percent"}
                      style={{ width: 110, height: 36, padding: "0 10px", borderRadius: 8, border: "1.5px solid #cbd5e1", fontSize: 14, fontWeight: 700, outline: "none" }}
                    />
                  </label>
                </div>
              </div>

              <div className="rm-modal-actions">
                <button type="button" className="rm-btn-cancel" onClick={() => setShowBulkModal(false)}>Cancel</button>
                <button type="submit" className="rm-btn-submit">Apply Bulk Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
