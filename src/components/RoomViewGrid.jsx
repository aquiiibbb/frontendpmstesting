import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  getRoomLayoutOrder,
  saveRoomLayoutOrder,
  getRoomLayoutDimensions,
  saveRoomLayoutDimensions,
  getRoomLayoutCoords,
  saveRoomLayoutCoords,
  getStatusColors,
} from "../services/hotelConfig";
import { getBookingStatusColors } from "../pages/frontdesk/Calendar";
import {
  Sparkles,
  BedDouble,
  User,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Layers,
  Move,
  Scaling,
  Grid
} from "lucide-react";
import "./roomViewGrid.css";

export default function RoomViewGrid({
  rooms = [],
  roomTypes = [],
  bookings = []
}) {
  // Custom 2D coordinates layout map: { roomNo: { x: number, y: number } }
  const [coordsMap, setCoordsMap] = useState(() => getRoomLayoutCoords());
  // Custom dimensions map: { roomNo: { width: number, height: number } }
  const [dimensionsMap, setDimensionsMap] = useState(() => getRoomLayoutDimensions());

  const [statusColors, setStatusColors] = useState(() => getStatusColors());

  useEffect(() => {
    function updateColors() {
      setStatusColors(getStatusColors());
    }
    window.addEventListener("pms_status_colors_updated", updateColors);
    return () => window.removeEventListener("pms_status_colors_updated", updateColors);
  }, []);

  // Active drag/resize state for live visual feedback
  const [activeDraggingRoomNo, setActiveDraggingRoomNo] = useState(null);
  const [resizingState, setResizingState] = useState(null); // { roomNo, width, height }

  // Canvas board container reference
  const canvasRef = useRef(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [floorFilter, setFloorFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState("");

  function triggerToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  // Calculate today's ISO date string YYYY-MM-DD
  const todayISO = new Date().toISOString().slice(0, 10);

  // Safe rooms list (guaranteeing non-null objects with valid room numbers)
  const safeRooms = useMemo(() => (rooms || []).filter((r) => r && r.no !== undefined && r.no !== null), [rooms]);

  // Helper to test if booking or guest name indicates a Block / Maintenance record
  function isBlockBooking(b) {
    if (!b) return false;
    const st = String(b.status || "").toLowerCase();
    const g = String(b.guest || b.fullName || "").toLowerCase();
    return (
      st === "blocked" ||
      st === "block" ||
      st === "maintenance" ||
      st === "out-of-order" ||
      st === "ooo" ||
      g.includes("blocked") ||
      g.includes("maintenance") ||
      g.includes("out of order")
    );
  }

  // Map occupancy & blocked status for each room
  const occupancyMap = useMemo(() => {
    const map = {};
    safeRooms.forEach((r) => {
      const rNo = String(r.no).trim();
      const hk = String(r.housekeeping || "").toLowerCase();
      const rSt = String(r.status || "").toLowerCase();

      const isRoomLevelBlocked =
        hk === "out_of_order" ||
        hk === "out-of-order" ||
        hk === "ooo" ||
        hk === "blocked" ||
        rSt === "maintenance" ||
        rSt === "blocked" ||
        rSt === "ooo";

      const activeBooking = (bookings || []).find((b) => {
        if (!b || String(b.room || "").trim() !== rNo || b.status === "cancelled" || b.isDeleted) return false;
        const cIn = String(b.checkIn || "").slice(0, 10);
        const cOut = String(b.checkOut || "").slice(0, 10);
        return cIn <= todayISO && cOut >= todayISO;
      });

      const isBookingLevelBlocked = activeBooking ? isBlockBooking(activeBooking) : false;

      if (isRoomLevelBlocked || isBookingLevelBlocked) {
        map[r.no] = {
          blocked: true,
          occupied: false,
          booking: activeBooking || null,
          guest: activeBooking ? (activeBooking.guest || activeBooking.fullName || "Blocked") : "Blocked",
          reason: activeBooking?.notes || activeBooking?.guest || r.notes || "Maintenance / Blocked",
        };
      } else if (activeBooking) {
        const cOut = String(activeBooking.checkOut || "").slice(0, 10);
        const isCheckoutToday = cOut === todayISO;
        const bkStatus = String(activeBooking.status || "").toLowerCase();
        const isConfirmed = bkStatus === "confirmed" || bkStatus === "reserved" || bkStatus === "booked";

        map[r.no] = {
          blocked: false,
          occupied: true,
          isConfirmed,
          booking: activeBooking,
          guest: activeBooking.guest || activeBooking.fullName || "Guest",
          checkIn: String(activeBooking.checkIn || "").slice(0, 10),
          checkOut: cOut,
          checkoutToday: isCheckoutToday,
          status: activeBooking.status,
        };
      } else {
        map[r.no] = { blocked: false, occupied: false, booking: null, guest: null, checkoutToday: false };
      }
    });
    return map;
  }, [safeRooms, bookings, todayISO]);

  // Unique list of floors
  const floors = useMemo(() => {
    const set = new Set();
    safeRooms.forEach((r) => set.add(r.floor || 1));
    return Array.from(set).sort((a, b) => a - b);
  }, [safeRooms]);

  // Filtered Rooms according to selected filters
  const filteredRooms = useMemo(() => {
    return safeRooms.filter((r) => {
      const hk = (r.housekeeping || "clean").toLowerCase();
      const occ = occupancyMap[r.no];

      if (statusFilter === "VACANT_CLEAN" && (occ?.occupied || occ?.blocked || hk !== "clean")) return false;
      if (statusFilter === "OCCUPIED" && !occ?.occupied) return false;
      if (statusFilter === "DIRTY" && hk !== "dirty") return false;
      if (statusFilter === "OUT_OF_ORDER" && !occ?.blocked) return false;

      if (floorFilter !== "ALL" && String(r.floor || 1) !== String(floorFilter)) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchNo = String(r.no).toLowerCase().includes(term);
        const matchType = (r.type || "").toLowerCase().includes(term);
        const matchGuest = (occ?.guest || "").toLowerCase().includes(term);
        if (!matchNo && !matchType && !matchGuest) return false;
      }

      return true;
    });
  }, [safeRooms, statusFilter, floorFilter, searchTerm, occupancyMap]);

  // Freeform 2D Canvas Mouse Dragging (repositioning room anywhere on floor plan)
  function handleMoveMouseDown(e, roomNo, initialLeft, initialTop) {
    e.stopPropagation();
    e.preventDefault();

    setActiveDraggingRoomNo(roomNo);

    const startX = e.clientX;
    const startY = e.clientY;

    let currentX = initialLeft;
    let currentY = initialTop;

    function onMouseMove(moveEvent) {
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      // Restrict position within canvas board boundaries
      currentX = Math.max(10, Math.min(2200, Math.round(initialLeft + deltaX)));
      currentY = Math.max(10, Math.min(1800, Math.round(initialTop + deltaY)));

      setCoordsMap((prev) => {
        const nextMap = { ...prev, [roomNo]: { x: currentX, y: currentY } };
        return nextMap;
      });
    }

    function onMouseUp() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setActiveDraggingRoomNo(null);

      setCoordsMap((prev) => {
        saveRoomLayoutCoords(prev);
        return prev;
      });

      triggerToast(`Room #${roomNo} positioned at (${currentX}px, ${currentY}px) 📍`);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  // Interactive Mouse Resizing
  function handleResizeMouseDown(e, roomNo, cardEl) {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;

    const startWidth = cardEl ? cardEl.offsetWidth : 130;
    const startHeight = cardEl ? cardEl.offsetHeight : 95;

    let currentW = startWidth;
    let currentH = startHeight;

    function onMouseMove(moveEvent) {
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      // Allow small compact sizes down to 75px width & 65px height
      currentW = Math.max(75, Math.min(500, Math.round(startWidth + deltaX)));
      currentH = Math.max(65, Math.min(450, Math.round(startHeight + deltaY)));

      setResizingState({ roomNo, width: currentW, height: currentH });

      setDimensionsMap((prev) => {
        const nextMap = { ...prev, [roomNo]: { width: currentW, height: currentH } };
        saveRoomLayoutDimensions(nextMap);
        return nextMap;
      });
    }

    function onMouseUp() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setResizingState(null);
      triggerToast(`Room #${roomNo} tile size saved (${currentW}px × ${currentH}px) 📐`);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function handleResetLayout() {
    setCoordsMap({});
    saveRoomLayoutCoords({});
    setDimensionsMap({});
    saveRoomLayoutDimensions({});
    triggerToast("Property Plan layout & tile positions reset to grid 🔄");
  }

  return (
    <div className="room-view-container animate-fade-in">
      {/* CLEAN ROOM VIEW HEADER WITH PRINT OPTION */}
      <div className="rv-header-clean" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "10px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "18px" }}>🏨</span>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>Property Room View</h3>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "7px 16px",
            background: "#475569",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 800,
            cursor: "pointer",
            transition: "all 0.15s ease",
            boxShadow: "0 2px 4px rgba(15,23,42,0.1)",
          }}
          title="Print Room View Layout"
        >
          <span>🖨️</span> Print Room View
        </button>
      </div>

      {/* FREEFORM 2D BLUEPRINT CANVAS BOARD */}
      {filteredRooms.length === 0 ? (
        <div className="rv-empty-state">No rooms match your filter criteria.</div>
      ) : (
        <div className="rv-canvas-board" ref={canvasRef}>
          {filteredRooms.map((room, idx) => {
            const hkStatus = (room.housekeeping || "clean").toLowerCase();
            const occ = occupancyMap[room.no] || { occupied: false, blocked: false };

            let cardThemeCls = "theme-vacant-clean";
            let statusBadgeText = "Clean";

            let badgeCustomColors = null;
            if (occ.blocked) {
              cardThemeCls = "theme-ooo";
              statusBadgeText = "Blocked";
              badgeCustomColors = getBookingStatusColors(occ.booking || "blocked", statusColors);
            } else if (occ.occupied) {
              if (occ.checkoutToday) {
                statusBadgeText = "Out Today";
                badgeCustomColors = getBookingStatusColors(occ.booking || "checked-out", statusColors);
              } else if (occ.isConfirmed) {
                cardThemeCls = "theme-confirmed";
                statusBadgeText = "Confirmed";
                badgeCustomColors = getBookingStatusColors(occ.booking || "confirmed", statusColors);
              } else {
                cardThemeCls = "theme-occupied";
                statusBadgeText = "Occupied";
                badgeCustomColors = getBookingStatusColors(occ.booking || "checked-in", statusColors);
              }
            } else if (hkStatus === "dirty") {
              cardThemeCls = "theme-dirty";
              statusBadgeText = "Dirty";
            }

            // Calculate freeform (X, Y) coordinates (or compute default grid offset if unpositioned)
            const customCoord = coordsMap[room.no];
            const defaultX = 20 + (idx % 6) * 145;
            const defaultY = 20 + Math.floor(idx / 6) * 110;

            const posX = customCoord?.x !== undefined ? customCoord.x : defaultX;
            const posY = customCoord?.y !== undefined ? customCoord.y : defaultY;

            // Calculate custom dimensions (or default to 130px x 95px)
            const customDim = dimensionsMap[room.no];
            const cardWidth = customDim?.width ? customDim.width : 130;
            const cardHeight = customDim?.height ? customDim.height : 95;

            const isDragging = activeDraggingRoomNo === room.no;
            const isCurrentlyResizing = resizingState?.roomNo === room.no;

            const cardStyle = {
              left: `${posX}px`,
              top: `${posY}px`,
              width: `${cardWidth}px`,
              height: `${cardHeight}px`,
              borderColor: badgeCustomColors ? badgeCustomColors.bg : undefined,
              borderWidth: badgeCustomColors ? "2px" : undefined,
              background: badgeCustomColors ? `linear-gradient(180deg, #ffffff 0%, ${badgeCustomColors.bg}15 100%)` : undefined,
            };

            return (
              <div
                key={room.no}
                style={cardStyle}
                className={`rv-card freeform-tile ${cardThemeCls} ${isDragging ? "is-moving" : ""} ${isCurrentlyResizing ? "resizing" : ""}`}
              >
                {/* RESIZE FEEDBACK BADGE */}
                {isCurrentlyResizing && (
                  <div className="rv-resize-indicator">
                    📐 {resizingState.width}px × {resizingState.height}px
                  </div>
                )}

                {/* CARD TOP HEADER: ROOM #, STATUS PILL & MOVE DRAG HANDLE */}
                <div
                  className="rv-tile-top"
                  onMouseDown={(e) => handleMoveMouseDown(e, room.no, posX, posY)}
                  title="Click & drag anywhere on header to move room on floor plan"
                >
                  <div className="rv-tile-header-left">
                    <span className="rv-tile-room-no">#{room.no}</span>
                    <span
                      className={`rv-tile-status-pill ${cardThemeCls}`}
                      style={badgeCustomColors ? { backgroundColor: badgeCustomColors.bg, color: badgeCustomColors.text } : {}}
                    >
                      {statusBadgeText}
                    </span>
                  </div>

                  <div className="rv-drag-handle" title="Drag to move room anywhere">
                    <Move size={12} />
                  </div>
                </div>

                {/* DISPLAY DETAILS: WHO IS STAYING OR ROOM TYPE */}
                <div className="rv-tile-body">
                  {occ.blocked ? (
                    <div className="rv-tile-blocked" title={`Blocked: ${occ.reason || occ.guest}`}>
                      <AlertTriangle size={11} /> <strong className="rv-truncate">{occ.guest || "Maintenance"}</strong>
                    </div>
                  ) : occ.occupied ? (
                    <div className={`rv-tile-guest ${occ.isConfirmed ? "is-confirmed" : ""}`} title={`Staying: ${occ.guest} (${occ.checkIn} -> ${occ.checkOut})`}>
                      <User size={11} /> <strong className="rv-truncate">{occ.guest}</strong>
                    </div>
                  ) : (
                    <div className="rv-tile-type" title={room.type || "Standard Room"}>
                      <BedDouble size={11} /> <span className="rv-truncate">{room.type || "Standard"}</span>
                    </div>
                  )}
                </div>

                {/* BOTTOM BAR: FLOOR BADGE & CORNER RESIZE HANDLE */}
                <div className="rv-tile-bottom">
                  <span className="rv-tile-floor">F{room.floor || 1}</span>

                  <div
                    className="rv-card-resize-handle"
                    title="Click & drag corner to resize tile"
                    onMouseDown={(e) => {
                      const cardEl = e.currentTarget.closest(".rv-card");
                      handleResizeMouseDown(e, room.no, cardEl);
                    }}
                  >
                    <Scaling size={11} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toast && <div className="rv-toast">{toast}</div>}
    </div>
  );
}
