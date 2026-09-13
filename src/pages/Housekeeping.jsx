import { useState, useEffect, useMemo } from "react";
import { getRooms, getRoomTypes, getBookings, updateRoomHousekeeping, createBooking, cancelBooking } from "../services/api";
import { exportToExcel, exportToPDF, exportToWord } from "../utils/exportUtils";
import "./housekeeping.css";

const DEFAULT_STAFF_MEMBERS = ["Suresh Yadav (Head)", "Neha Joshi", "Ramesh Kumar", "Pooja Sharma", "Unassigned"];

export default function Housekeeping() {
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // Custom Housekeepers Provision (ITEM 8 MATCH)
  const [staffMembers, setStaffMembers] = useState(() => {
    const saved = localStorage.getItem("pms_housekeeper_staff");
    return saved ? JSON.parse(saved) : DEFAULT_STAFF_MEMBERS;
  });
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");

  function handleAddHousekeeper(e) {
    e.preventDefault();
    if (!newStaffName.trim()) return;
    const name = newStaffName.trim();
    if (staffMembers.includes(name)) {
      triggerToast(`Housekeeper "${name}" already exists`);
      return;
    }
    const updated = [...staffMembers, name];
    setStaffMembers(updated);
    localStorage.setItem("pms_housekeeper_staff", JSON.stringify(updated));
    setNewStaffName("");
    setShowAddStaffModal(false);
    triggerToast(`Added Housekeeper: ${name} 👤`);
  }

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [occupancyFilter, setOccupancyFilter] = useState("ALL");
  const [floorFilter, setFloorFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Selected rooms for bulk action
  const [selectedRooms, setSelectedRooms] = useState(new Set());
  const [bulkStaff, setBulkStaff] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [rData, tData, bData] = await Promise.all([getRooms(), getRoomTypes(), getBookings()]);
      setRooms(rData);
      setRoomTypes(tData);
      setBookings(bData.filter((b) => b.status !== "cancelled"));
    } catch (err) {
      setError(err.message || "Failed to load housekeeping data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    window.addEventListener("pms_rooms_updated", loadData);
    return () => window.removeEventListener("pms_rooms_updated", loadData);
  }, []);

  function triggerToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  // Calculate statistics (Inspected Box Removed per Item 8)
  const stats = useMemo(() => {
    const total = rooms.length;
    let clean = 0;
    let dirty = 0;
    let outOfOrder = 0;

    rooms.forEach((r) => {
      const hk = (r.housekeeping || "clean").toLowerCase();
      if (hk === "clean" || hk === "inspected") clean += 1;
      else if (hk === "dirty") dirty += 1;
      else if (hk === "out_of_order" || hk === "out-of-order" || r.status === "maintenance") outOfOrder += 1;
      else clean += 1;
    });

    return { total, clean, dirty, outOfOrder };
  }, [rooms]);

  // Unique floors list
  const floors = useMemo(() => {
    const set = new Set();
    rooms.forEach((r) => set.add(r.floor || 1));
    return Array.from(set).sort((a, b) => a - b);
  }, [rooms]);

  // Map of current occupancy status per room
  const occupancyMap = useMemo(() => {
    const todayISO = new Date().toISOString().slice(0, 10);
    const map = {};
    rooms.forEach((r) => {
      const activeBooking = bookings.find(
        (b) => b.room === r.no && b.status !== "cancelled" && b.checkIn <= todayISO && b.checkOut >= todayISO
      );
      if (activeBooking) {
        const isCheckoutToday = activeBooking.checkOut === todayISO;
        map[r.no] = {
          occupied: true,
          guest: activeBooking.guest,
          checkoutToday: isCheckoutToday,
          status: activeBooking.status,
        };
      } else {
        map[r.no] = { occupied: false, guest: null, checkoutToday: false };
      }
    });
    return map;
  }, [rooms, bookings]);

  // Filtered rooms list
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const hk = (r.housekeeping || "clean").toLowerCase();
      if (statusFilter === "CLEAN" && hk !== "clean") return false;
      if (statusFilter === "DIRTY" && hk !== "dirty") return false;
      if (statusFilter === "INSPECTED" && hk !== "inspected") return false;
      if (statusFilter === "OUT_OF_ORDER" && hk !== "out_of_order" && hk !== "out-of-order" && r.status !== "maintenance") return false;

      if (occupancyFilter === "OCCUPIED" && !occupancyMap[r.no]?.occupied) return false;
      if (occupancyFilter === "VACANT" && occupancyMap[r.no]?.occupied) return false;

      if (floorFilter !== "ALL" && String(r.floor || 1) !== String(floorFilter)) return false;
      if (typeFilter !== "ALL" && r.type !== typeFilter) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchNo = r.no.toLowerCase().includes(term);
        const matchType = (r.type || "").toLowerCase().includes(term);
        const matchStaff = (r.assignedStaff || "").toLowerCase().includes(term);
        const matchRemark = (r.remark || r.notes || "").toLowerCase().includes(term);
        const matchGuest = (occupancyMap[r.no]?.guest || "").toLowerCase().includes(term);
        if (!matchNo && !matchType && !matchStaff && !matchRemark && !matchGuest) return false;
      }
      return true;
    });
  }, [rooms, statusFilter, occupancyFilter, floorFilter, typeFilter, searchTerm, occupancyMap]);

  // Handle single room housekeeping status change (synced with Calendar)
  async function handleStatusChange(roomNo, targetHkStatus) {
    try {
      const targetRoom = rooms.find((r) => String(r.no).trim() === String(roomNo).trim());
      const currentHk = (targetRoom?.housekeeping || "clean").toLowerCase();
      const currentStatus = targetRoom?.status || "available";
      const isCurrentlyBlocked = currentHk === "out_of_order" || currentHk === "blocked" || currentStatus === "maintenance";

      // Toggle unblock if already blocked and user clicks Block again
      let newHkStatus = targetHkStatus;
      if (targetHkStatus === "out_of_order" && isCurrentlyBlocked) {
        newHkStatus = "clean";
      }

      const roomStatusMap = {
        clean: "available",
        dirty: "cleaning",
        inspected: "available",
        out_of_order: "maintenance",
        blocked: "maintenance",
      };
      const newRoomStatus = roomStatusMap[newHkStatus] || "available";

      // 1. Update room record in DB / LocalStorage
      const updated = await updateRoomHousekeeping(roomNo, {
        housekeeping: newHkStatus,
        status: newRoomStatus,
      });

      setRooms((prev) => prev.map((r) => (String(r.no).trim() === String(roomNo).trim() ? { ...r, ...updated, housekeeping: newHkStatus, status: newRoomStatus } : r)));

      // 2. Sync with Calendar Bookings List (room_pms_bookings)
      const allBookings = await getBookings();
      const strRoomNo = String(roomNo).trim();
      const existingBlock = allBookings.find(
        (b) => String(b.room).trim() === strRoomNo && (b.status === "blocked" || b.status === "maintenance" || (b.guest && b.guest.includes("Blocked")))
      );

      if (newHkStatus === "out_of_order" || newHkStatus === "blocked") {
        if (!existingBlock) {
          const todayISO = new Date().toISOString().slice(0, 10);
          const endISO = new Date(Date.now() + 86400000).toISOString().slice(0, 10); // Exactly 1 night block (Today to Tomorrow)
          const blockRecord = {
            guest: `🔒 Blocked (Maintenance)`,
            room: strRoomNo,
            roomType: targetRoom?.type || "Standard",
            checkIn: todayISO,
            checkOut: endISO,
            status: "blocked",
            color: "#64748b",
            notes: "[Blocked: Maintenance] Out of Order from Housekeeping List",
            source: "Maintenance",
            amount: 0,
            paid: 0,
          };
          const created = await createBooking(blockRecord);
          setBookings((prev) => [...prev, created]);
        }
        triggerToast(`Room ${roomNo} Blocked / Out of Order ⚠️ (Calendar Synced)`);
      } else {
        if (existingBlock) {
          await cancelBooking(existingBlock.id);
          setBookings((prev) => prev.filter((b) => b.id !== existingBlock.id));
        }
        triggerToast(`Room ${roomNo} marked ${newHkStatus.toUpperCase()} 🟢 (Calendar Synced)`);
      }

      // Broadcast global custom event so Calendar page re-renders instantly
      window.dispatchEvent(new CustomEvent("pms_rooms_updated", { detail: updated }));
      window.dispatchEvent(new CustomEvent("pms_bookings_updated"));
    } catch (err) {
      triggerToast(err.message || "Could not update room status");
    }
  }

  // Handle assigned staff change
  async function handleStaffAssign(roomNo, staffName) {
    try {
      const updated = await updateRoomHousekeeping(roomNo, { assignedStaff: staffName });
      setRooms((prev) => prev.map((r) => (r.no === roomNo ? { ...r, ...updated } : r)));
      triggerToast(`Room ${roomNo} assigned to ${staffName}`);
    } catch (err) {
      triggerToast(err.message || "Could not assign staff");
    }
  }

  // Handle remark change
  async function handleRemarkChange(roomNo, remarkText) {
    try {
      const updated = await updateRoomHousekeeping(roomNo, { remark: remarkText, notes: remarkText });
      setRooms((prev) => prev.map((r) => (r.no === roomNo ? { ...r, remark: remarkText, notes: remarkText, ...updated } : r)));
    } catch (err) {
      console.error(err);
    }
  }

  // Handle Export (Excel, PDF, Word)
  function handleExport(format) {
    const headers = [
      "Room #",
      "Category",
      "Floor",
      "Occupancy Status",
      "Housekeeping Status",
      "Assigned Housekeeper",
      "Remark / Comments",
    ];
    const data = filteredRooms.map((r) => {
      const occ = occupancyMap[r.no];
      const occText = occ?.occupied ? `Occupied (${occ.guest})` : "Vacant";
      const hkText = (r.housekeeping || "clean").toUpperCase();
      return [
        r.no,
        r.type,
        `Floor ${r.floor || 1}`,
        occText,
        hkText,
        r.assignedStaff || "Unassigned",
        r.remark || r.notes || "—",
      ];
    });

    const title = "Housekeeping & Room Status List";
    if (format === "excel") exportToExcel("Housekeeping_Room_Status", title, headers, data);
    else if (format === "pdf") exportToPDF(title, headers, data);
    else if (format === "word") exportToWord("Housekeeping_Room_Status", title, headers, data);
    triggerToast(`Exported report in ${format.toUpperCase()} format`);
  }

  // Bulk actions
  function toggleSelectRoom(roomNo) {
    setSelectedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(roomNo)) next.delete(roomNo);
      else next.add(roomNo);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedRooms.size === filteredRooms.length) {
      setSelectedRooms(new Set());
    } else {
      setSelectedRooms(new Set(filteredRooms.map((r) => r.no)));
    }
  }

  async function handleBulkMarkClean() {
    if (selectedRooms.size === 0) return;
    try {
      for (const roomNo of selectedRooms) {
        await updateRoomHousekeeping(roomNo, { housekeeping: "clean" });
      }
      triggerToast(`${selectedRooms.size} Rooms marked CLEAN (Calendar Synced)`);
      setSelectedRooms(new Set());
      loadData();
    } catch (err) {
      triggerToast(err.message || "Bulk update failed");
    }
  }

  async function handleBulkAssignStaff() {
    if (selectedRooms.size === 0 || !bulkStaff) return;
    try {
      for (const roomNo of selectedRooms) {
        await updateRoomHousekeeping(roomNo, { assignedStaff: bulkStaff });
      }
      triggerToast(`${selectedRooms.size} Rooms assigned to ${bulkStaff}`);
      setSelectedRooms(new Set());
      setBulkStaff("");
      loadData();
    } catch (err) {
      triggerToast(err.message || "Bulk assign failed");
    }
  }

  return (
    <div className="hk-page">
      {/* HEADER BAR */}
      <div className="hk-header">
        <div>
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>Housekeeping</h1>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={loadData}>
          Refresh Board
        </button>
      </div>

      {toast && <div className="hk-toast">{toast}</div>}
      {error && <div className="hk-error">{error}</div>}

      {/* STATS OVERVIEW METRICS (INSPECTED BOX REMOVED AS REQUESTED) */}
      <div className="hk-stats-grid">
        <div className="hk-stat-card total">
          <span className="lbl">Total Inventory</span>
          <strong className="val">{stats.total} Rooms</strong>
        </div>
        <div
          className={`hk-stat-card clean ${statusFilter === "CLEAN" ? "active" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "CLEAN" ? "ALL" : "CLEAN")}
        >
          <span className="lbl">🟢 Clean &amp; Ready</span>
          <strong className="val">{stats.clean}</strong>
        </div>
        <div
          className={`hk-stat-card dirty ${statusFilter === "DIRTY" ? "active" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "DIRTY" ? "ALL" : "DIRTY")}
        >
          <span className="lbl">🔴 Dirty / Needs Cleaning</span>
          <strong className="val">{stats.dirty}</strong>
        </div>
        <div
          className={`hk-stat-card ooo ${statusFilter === "OUT_OF_ORDER" ? "active" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "OUT_OF_ORDER" ? "ALL" : "OUT_OF_ORDER")}
        >
          <span className="lbl">⚠️ Out of Order</span>
          <strong className="val">{stats.outOfOrder}</strong>
        </div>
      </div>

      {/* FILTER & TOOLBAR BAR */}
      <div className="hk-toolbar">
        <div className="hk-search-wrap">
          <input
            type="text"
            placeholder="Search room #, type, staff, comments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="hk-filter-group">
          <label>Status:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="CLEAN">🟢 Clean</option>
            <option value="DIRTY">🔴 Dirty</option>
            <option value="INSPECTED">🔵 Inspected</option>
            <option value="OUT_OF_ORDER">⚠️ Out of Order</option>
          </select>
        </div>

        <div className="hk-filter-group">
          <label>Occupancy:</label>
          <select value={occupancyFilter} onChange={(e) => setOccupancyFilter(e.target.value)}>
            <option value="ALL">All Occupancy</option>
            <option value="OCCUPIED">👤 Occupied</option>
            <option value="VACANT">⚪ Vacant</option>
          </select>
        </div>

        <div className="hk-filter-group">
          <label>Floor:</label>
          <select value={floorFilter} onChange={(e) => setFloorFilter(e.target.value)}>
            <option value="ALL">All Floors</option>
            {floors.map((f) => (
              <option key={f} value={f}>Floor {f}</option>
            ))}
          </select>
        </div>

        <div className="hk-filter-group">
          <label>Category:</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="ALL">All Categories</option>
            {roomTypes.map((t) => (
              <option key={t.id} value={t.name}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* EXPORT ACTION BUTTONS */}
        <div className="hk-export-group" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddStaffModal(true)}
            style={{ fontWeight: 700, background: "#0284c7", borderColor: "#0284c7", color: "#ffffff", padding: "6px 14px", borderRadius: "6px" }}
          >
            👤 + Add Housekeeper
          </button>

          <button
            type="button"
            className="btn-export btn-export-excel"
            title="Export list to Excel (.xls)"
            onClick={() => handleExport("excel")}
          >
            📊 Excel (.xls)
          </button>
          <button
            type="button"
            className="btn-export btn-export-pdf"
            title="Export list to PDF (.pdf)"
            onClick={() => handleExport("pdf")}
          >
            📄 PDF (.pdf)
          </button>
          <button
            type="button"
            className="btn-export btn-export-word"
            title="Export list to Word (.doc)"
            onClick={() => handleExport("word")}
          >
            📝 Word (.doc)
          </button>
        </div>

        {/* BULK ACTIONS STRIP */}
        {selectedRooms.size > 0 && (
          <div className="hk-bulk-strip">
            <span className="count">{selectedRooms.size} Selected</span>
            <button type="button" className="btn btn-success btn-xs" onClick={handleBulkMarkClean}>
              ✓ Mark Clean
            </button>
            <select
              className="bulk-select"
              value={bulkStaff}
              onChange={(e) => setBulkStaff(e.target.value)}
            >
              <option value="">Assign Housekeeper...</option>
              {staffMembers.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {bulkStaff && (
              <button type="button" className="btn btn-primary btn-xs" onClick={handleBulkAssignStaff}>
                Apply Staff
              </button>
            )}
          </div>
        )}
      </div>

      {/* HIGH-DENSITY HOUSEKEEPING LIST TABLE */}
      {loading ? (
        <div className="hk-loading">Loading housekeeping status list...</div>
      ) : (
        <div className="hk-table-card">
          <table className="hk-table">
            <thead>
              <tr>
                <th className="col-chk">
                  <input
                    type="checkbox"
                    checked={filteredRooms.length > 0 && selectedRooms.size === filteredRooms.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>Room #</th>
                <th className="col-category">Category</th>
                <th>Floor</th>
                <th>Occupancy Status</th>
                <th>Housekeeping Status</th>
                <th>Assigned Housekeeper</th>
                <th>Remark / Comments</th>
                <th>Calendar Sync</th>
                <th className="text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map((room) => {
                const hkStatus = (room.housekeeping || "clean").toLowerCase();
                const occ = occupancyMap[room.no] || { occupied: false };
                const isSelected = selectedRooms.has(room.no);

                let statusBadgeCls = "badge-clean";
                let statusText = "🟢 Clean";
                if (hkStatus === "dirty") {
                  statusBadgeCls = "badge-dirty";
                  statusText = "🔴 Dirty";
                } else if (hkStatus === "inspected") {
                  statusBadgeCls = "badge-inspected";
                  statusText = "🔵 Inspected";
                } else if (hkStatus === "out_of_order" || hkStatus === "out-of-order" || room.status === "maintenance") {
                  statusBadgeCls = "badge-ooo";
                  statusText = "⚠️ Out of Order";
                }

                return (
                  <tr key={room.no} className={isSelected ? "selected-row" : ""}>
                    <td className="col-chk">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRoom(room.no)}
                      />
                    </td>
                    <td className="col-room">
                      <strong>{room.no}</strong>
                    </td>
                    <td className="col-category">
                      <span className="room-type-tag">{room.type}</span>
                    </td>
                    <td>Floor {room.floor || 1}</td>
                    <td>
                      {occ.occupied ? (
                        <span className="occ-tag occupied">
                          👤 {occ.guest} {occ.checkoutToday ? " (Checkout Today)" : " (In-House)"}
                        </span>
                      ) : (
                        <span className="occ-tag vacant">⚪ Vacant</span>
                      )}
                    </td>
                    <td>
                      <span className={`hk-status-tag ${statusBadgeCls}`}>
                        {statusText}
                      </span>
                    </td>
                    <td>
                      <select
                        className="inline-staff-select"
                        value={room.assignedStaff || "Unassigned"}
                        onChange={(e) => handleStaffAssign(room.no, e.target.value)}
                      >
                        {staffMembers.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="hk-remark-input"
                        placeholder="Add comments / notes..."
                        value={room.remark || room.notes || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRooms((prev) => prev.map((r) => (r.no === room.no ? { ...r, remark: val, notes: val } : r)));
                        }}
                        onBlur={(e) => handleRemarkChange(room.no, e.target.value)}
                      />
                    </td>
                    <td>
                      <span className="cal-sync-pill" title="Status automatically reflects on Tape Chart Calendar">
                        ⚡ Live Synced
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="hk-table-actions">
                        <button
                          type="button"
                          className={`btn btn-xs ${hkStatus === "clean" ? "btn-success" : "btn-outline"}`}
                          title="Mark Clean"
                          onClick={() => handleStatusChange(room.no, "clean")}
                        >
                          🟢 Clean
                        </button>
                        <button
                          type="button"
                          className={`btn btn-xs ${hkStatus === "dirty" ? "btn-danger" : "btn-outline"}`}
                          title="Mark Dirty"
                          onClick={() => handleStatusChange(room.no, "dirty")}
                        >
                          🔴 Dirty
                        </button>
                        <button
                          type="button"
                          className={`btn btn-xs ${hkStatus === "out_of_order" || hkStatus === "blocked" || room.status === "maintenance" ? "btn-warning" : "btn-outline"}`}
                          title={hkStatus === "out_of_order" || hkStatus === "blocked" || room.status === "maintenance" ? "Unblock Room / Make Available" : "Block Room / Out of Order"}
                          onClick={() => handleStatusChange(room.no, "out_of_order")}
                          style={hkStatus === "out_of_order" || hkStatus === "blocked" || room.status === "maintenance" ? { background: "#f59e0b", color: "#ffffff", fontWeight: 800 } : {}}
                        >
                          {hkStatus === "out_of_order" || hkStatus === "blocked" || room.status === "maintenance" ? "⚠️ Blocked" : "⚠️ Block"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* PROVISION MODAL TO ADD NEW HOUSEKEEPER (ITEM 8 MATCH) */}
      {showAddStaffModal && (
        <div className="fm-submodal-overlay" onClick={() => setShowAddStaffModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="fm-submodal-card animate-scale-in" onClick={(e) => e.stopPropagation()} style={{ background: "#ffffff", padding: "24px", borderRadius: "12px", width: "400px", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
            <h3 style={{ margin: "0 0 12px 0", color: "#0f172a", fontSize: "16px", fontWeight: 800 }}>👤 Provision New Housekeeper</h3>
            <p style={{ margin: "0 0 16px 0", color: "#64748b", fontSize: "13px" }}>Add housekeeper staff member for assignment and task scheduling.</p>
            <form onSubmit={handleAddHousekeeper}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 700, color: "#334155" }}>Housekeeper Full Name:</label>
              <input
                type="text"
                autoFocus
                required
                className="form-control"
                placeholder="e.g. Maria Garcia / John Doe"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", marginBottom: "16px", fontSize: "14px" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddStaffModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ background: "#0284c7", borderColor: "#0284c7", color: "#ffffff", fontWeight: 700 }}>+ Save Housekeeper</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
