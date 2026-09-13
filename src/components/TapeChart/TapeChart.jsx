import React, { useState, useRef } from 'react';
import { usePMS } from '../../context/PMSContext';
import CustomDatePicker from '../CustomDatePicker';
import { formatUSD, formatDate, getStatusBadgeClass } from '../../utils/formatters';
import { 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Move, 
  Receipt, 
  CheckCircle, 
  XCircle, 
  ShieldAlert,
  Search,
  Filter,
  Ban,
  Layers,
  Wrench,
  PlusCircle,
  Calendar as CalendarIcon,
  Clock,
  ArrowRight,
  RotateCcw
} from 'lucide-react';

export const TapeChart = ({ onOpenFolio, onOpenNewRes }) => {
  const { 
    rooms, 
    reservations, 
    moveRoom, 
    extendStayDates,
    checkInGuest, 
    checkOutGuest, 
    blockRoom,
    releaseRoomBlock,
    businessDate, 
    showToast 
  } = usePMS();

  const [selectedRes, setSelectedRes] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  // Dynamic Date Navigation State
  const [viewStartDate, setViewStartDate] = useState(businessDate);
  const [viewDaysCount, setViewDaysCount] = useState(7); // 7, 14, or 30 days

  const currentDragRef = useRef(null);

  const [extendModalRes, setExtendModalRes] = useState(null);
  const [extendCheckIn, setExtendCheckIn] = useState('');
  const [extendCheckOut, setExtendCheckOut] = useState('');

  const [blockModalRoom, setBlockModalRoom] = useState(null);
  const [blockReason, setBlockReason] = useState('AC Maintenance & Paint Touchup');
  const [blockStartDate, setBlockStartDate] = useState(businessDate);
  const [blockEndDate, setBlockEndDate] = useState(() => {
    const d = new Date(businessDate);
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });

  // Generate dynamic dates list based on viewStartDate & viewDaysCount
  const baseDate = new Date(viewStartDate + 'T00:00:00');
  const datesList = [];
  for (let i = 0; i < viewDaysCount; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    datesList.push(d.toISOString().split('T')[0]);
  }

  const categories = Array.from(new Set(rooms.map((r) => r.type)));

  const getFilteredRooms = () => {
    let filtered = rooms;
    if (selectedCategoryFilter !== 'ALL') {
      filtered = filtered.filter((r) => r.type === selectedCategoryFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.number.includes(term) ||
          r.type.toLowerCase().includes(term) ||
          reservations.some(
            (res) => res.roomId === r.id && res.guestName.toLowerCase().includes(term)
          )
      );
    }
    return filtered;
  };

  const filteredRooms = getFilteredRooms();

  const groupedRooms = categories.reduce((acc, cat) => {
    const catRooms = filteredRooms.filter((r) => r.type === cat);
    if (catRooms.length > 0) {
      acc[cat] = catRooms;
    }
    return acc;
  }, {});

  // Date Navigation Handlers
  const handleShiftDates = (daysOffset) => {
    const d = new Date(viewStartDate + 'T00:00:00');
    d.setDate(d.getDate() + daysOffset);
    setViewStartDate(d.toISOString().split('T')[0]);
  };

  const handleResetToToday = () => {
    setViewStartDate(businessDate);
  };

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e, resId, mode = 'move') => {
    e.stopPropagation();
    const dragPayload = { resId, mode };
    currentDragRef.current = dragPayload;
    e.dataTransfer.setData('text/plain', JSON.stringify(dragPayload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetRoomId, targetRoomNumber, targetRateUSD, targetDateStr) => {
    e.preventDefault();
    e.stopPropagation();

    let dragPayload = currentDragRef.current;
    if (!dragPayload) {
      try {
        const dataRaw = e.dataTransfer.getData('text/plain');
        if (dataRaw) dragPayload = JSON.parse(dataRaw);
      } catch (err) {}
    }

    if (!dragPayload || !dragPayload.resId) return;
    const { resId, mode } = dragPayload;

    const res = reservations.find((r) => r.id === resId);
    if (!res) return;

    if (mode === 'extend-left') {
      if (targetDateStr > res.checkOut) {
        showToast('Check-In date cannot be after Check-Out date', 'warning');
        return;
      }
      extendStayDates(resId, targetDateStr, res.checkOut);
    } else if (mode === 'extend-right') {
      if (targetDateStr < res.checkIn) {
        showToast('Check-Out date cannot be before Check-Out date', 'warning');
        return;
      }
      extendStayDates(resId, res.checkIn, targetDateStr);
    } else {
      if (res.roomId !== targetRoomId) {
        moveRoom(resId, targetRoomId, targetRoomNumber, targetRateUSD);
      }
    }

    currentDragRef.current = null;
  };

  const handleCellClick = (room, dateStr, existingRes) => {
    if (existingRes) {
      setSelectedRes(existingRes);
    } else {
      if (room.status === 'Out-of-Order') {
        showToast(`Room ${room.number} is currently blocked`, 'warning');
        return;
      }
      if (onOpenNewRes) {
        onOpenNewRes({ roomId: room.id, checkIn: dateStr, nightlyRateUSD: room.rateUSD });
      }
    }
  };

  const handleConfirmBlock = (e) => {
    e.preventDefault();
    if (!blockModalRoom) return;
    if (blockStartDate > blockEndDate) {
      showToast('Start date cannot be after End date', 'warning');
      return;
    }
    blockRoom(blockModalRoom.id, blockReason, blockStartDate, blockEndDate);
    setBlockModalRoom(null);
  };

  const handleConfirmExtendModal = (e) => {
    e.preventDefault();
    if (!extendModalRes) return;
    extendStayDates(extendModalRes.id, extendCheckIn, extendCheckOut);
    setExtendModalRes(null);
  };

  const getStaySpanDays = (res) => {
    const startIndex = datesList.indexOf(res.checkIn);
    const endIndex = datesList.indexOf(res.checkOut);
    if (startIndex !== -1 && endIndex !== -1) {
      return Math.max(1, endIndex - startIndex);
    }
    return 2;
  };

  return (
    <div className="tapechart-view">
      {/* Date Navigation & Filter Controls Toolbar */}
      <div className="tapechart-nav-bar glassmorphism">
        <div className="date-nav-controls">
          <button className="btn btn-sm btn-secondary" onClick={() => handleShiftDates(-viewDaysCount)}>
            <ChevronLeft size={16} /> Prev {viewDaysCount} Days
          </button>
          <button className="btn btn-sm btn-primary" onClick={handleResetToToday}>
            <RotateCcw size={14} /> Reset to Today
          </button>
          <button className="btn btn-sm btn-secondary" onClick={() => handleShiftDates(viewDaysCount)}>
            Next {viewDaysCount} Days <ChevronRight size={16} />
          </button>

          <div className="jump-date-box" style={{ width: "170px" }}>
            <CalendarIcon size={14} className="text-primary" />
            <label>Jump to Date:</label>
            <CustomDatePicker
              value={viewStartDate}
              onChange={(e) => setViewStartDate(e.target.value)}
            />
          </div>

          <div className="days-span-box">
            <label>Timeline View:</label>
            <select value={viewDaysCount} onChange={(e) => setViewDaysCount(Number(e.target.value))}>
              <option value={7}>7 Days View</option>
              <option value={14}>14 Days View</option>
              <option value={30}>30 Days View</option>
            </select>
          </div>
        </div>

        <div className="tapechart-search-row">
          <div className="search-input-wrapper">
            <Search size={16} />
            <input
              type="text"
              placeholder="Filter Room #, Guest Name, or Category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="category-filter-group">
            <Layers size={16} className="text-primary" />
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            >
              <option value="ALL">All Categories ({rooms.length} Rooms)</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat} ({rooms.filter((r) => r.type === cat).length} Rooms)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid Container Grouped Category Wise */}
      <div className="tapechart-container glassmorphism">
        <div className="grid-table">
          {/* Timeline Header Row */}
          <div 
            className="grid-header-row"
            style={{
              gridTemplateColumns: `180px 90px repeat(${datesList.length}, 1fr)`
            }}
          >
            <div className="room-col-header">Room / Category</div>
            <div className="rate-col-header">Rate ($ USD)</div>
            {datesList.map((dateStr) => {
              const isToday = dateStr === businessDate;
              return (
                <div key={dateStr} className={`date-col-header ${isToday ? 'is-today' : ''}`}>
                  <span className="day-name">{new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <span className="date-num">{new Date(dateStr + 'T00:00:00').getDate()} {new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}</span>
                  {isToday && <span className="today-pill">TODAY</span>}
                </div>
              );
            })}
          </div>

          {/* Render Rooms Grouped by Category */}
          {Object.keys(groupedRooms).length > 0 ? (
            Object.entries(groupedRooms).map(([categoryName, categoryRooms]) => (
              <React.Fragment key={categoryName}>
                {/* Category Header Row */}
                <div className="grid-category-row">
                  <div className="category-title">
                    <Layers size={14} className="text-primary" />
                    <strong>{categoryName.toUpperCase()}</strong>
                    <span className="cat-count">({categoryRooms.length} Rooms)</span>
                  </div>
                </div>

                {/* Rooms belonging to this category */}
                {categoryRooms.map((room) => {
                  return (
                    <div 
                      key={room.id} 
                      className="grid-room-row"
                      style={{
                        gridTemplateColumns: `180px 90px repeat(${datesList.length}, 1fr)`
                      }}
                    >
                      <div className="room-cell">
                        <span className="room-number">Room {room.number}</span>
                        <div className="room-sub-meta">
                          <span className="room-type-sub">Floor {room.floor}</span>
                          {room.status === 'Out-of-Order' ? (
                            <span className="badge badge-danger">Blocked</span>
                          ) : (
                            <button
                              className="block-room-quick-btn"
                              title="Block Room for Maintenance Date Range"
                              onClick={() => {
                                setBlockModalRoom(room);
                                setBlockStartDate(businessDate);
                              }}
                            >
                              <Ban size={10} /> Block
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="rate-cell">
                        {formatUSD(room.rateUSD)}
                      </div>

                      {/* Date Columns */}
                      {datesList.map((dateStr) => {
                        const res = reservations.find((r) => {
                          if (r.roomId !== room.id) return false;
                          return dateStr >= r.checkIn && dateStr <= r.checkOut;
                        });

                        const isStartDay = res && dateStr === res.checkIn;
                        const spanDays = res ? getStaySpanDays(res) : 1;

                        return (
                          <div
                            key={dateStr}
                            className={`timeline-cell ${!res ? 'interactive-empty-cell' : ''}`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, room.id, room.number, room.rateUSD, dateStr)}
                            onClick={() => handleCellClick(room, dateStr, res)}
                          >
                            {!res && (
                              <div className="cell-hover-plus">
                                <PlusCircle size={14} />
                              </div>
                            )}

                            {res && isStartDay && (
                              <div
                                className={`reservation-bar ${res.status.toLowerCase()}`}
                                draggable={res.status !== 'Blocked'}
                                onDragStart={(e) => handleDragStart(e, res.id, 'move')}
                                onClick={(e) => { e.stopPropagation(); setSelectedRes(res); }}
                                style={{
                                  width: `calc(100% * ${spanDays} + ${(spanDays - 1) * 2}px)`
                                }}
                              >
                                {res.status !== 'Blocked' && (
                                  <div
                                    className="extend-handle left-handle"
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, res.id, 'extend-left')}
                                    title="Drag left/right to change Check-In date"
}
                                    ◄
                                  </div>
                                )}

                                <div className="res-bar-content">
                                  {res.status !== 'Blocked' && <Move size={12} className="drag-handle-icon" />}
                                  <strong className="res-guest-name">{res.guestName}</strong>
                                  <span className="res-code-tag">{res.resCode}</span>
                                  {Boolean(
                                    res.hasDeposit ||
                                    res.depositCollected ||
                                    res.securityDepositCollected ||
                                    (Array.isArray(res.deposits) && res.deposits.some((d) => d.status === "held" || Number(d.amount) > 0)) ||
                                    (Array.isArray(res.securityDeposits) && res.securityDeposits.length > 0) ||
                                    Number(res.depositBalance || res.depositAmount || res.deposit || 0) > 0
                                  ) && (
                                    <span className="gantt-icon-badge deposit" title={`Security Deposit Collected: $${res.depositBalance || res.depositAmount || 200}`}>
                                      🛡️
                                    </span>
                                  )}
                                </div>

                                {res.status !== 'Blocked' && (
                                  <div
                                    className="extend-handle right-handle"
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, res.id, 'extend-right')}
                                    title="Drag right/left to change Check-Out date"
                                  >
                                    ►
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </React.Fragment>
            ))
          ) : (
            <div className="empty-state p-4">
              No rooms match your filter or search criteria.
            </div>
          )}
        </div>
      </div>

      {/* Reservation Quick Actions Modal */}
      {selectedRes && (
        <div className="modal-backdrop" onClick={() => setSelectedRes(null)}>
          <div className="modal-content glassmorphism" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{selectedRes.guestName}</h3>
                <span className="res-code">{selectedRes.resCode} • Room {selectedRes.roomNumber} ({selectedRes.roomType})</span>
              </div>
              <button className="close-btn" onClick={() => setSelectedRes(null)}>×</button>
            </div>

            <div className="modal-body">
              <div className="res-detail-grid">
                <div className="detail-item">
                  <span className="label">Check In</span>
                  <strong>{formatDate(selectedRes.checkIn)}</strong>
                </div>
                <div className="detail-item">
                  <span className="label">Check Out</span>
                  <strong>{formatDate(selectedRes.checkOut)}</strong>
                </div>
                <div className="detail-item">
                  <span className="label">Nightly Rate</span>
                  <strong className="text-emerald">{formatUSD(selectedRes.nightlyRateUSD)}</strong>
                </div>
                <div className="detail-item">
                  <span className="label">Status</span>
                  <span className={`badge ${getStatusBadgeClass(selectedRes.status)}`}>
                    {selectedRes.status}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="label">Guests</span>
                  <strong>{selectedRes.guestsCount} Person(s)</strong>
                </div>
                <div className="detail-item">
                  <span className="label">VIP Level</span>
                  <strong>{selectedRes.vipStatus}</strong>
                </div>
              </div>

              {selectedRes.notes && (
                <div className="notes-box">
                  <strong>Notes:</strong> {selectedRes.notes}
                </div>
              )}
            </div>

            <div className="modal-footer">
              {selectedRes.status !== 'Blocked' && (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setExtendModalRes(selectedRes);
                    setExtendCheckIn(selectedRes.checkIn);
                    setExtendCheckOut(selectedRes.checkOut);
                    setSelectedRes(null);
                  }}
                >
                  <CalendarIcon size={16} /> Extend / Edit Dates
                </button>
              )}

              {selectedRes.status === 'Reserved' && (
                <button
                  className="btn btn-success"
                  onClick={() => {
                    checkInGuest(selectedRes.id);
                    setSelectedRes(null);
                  }}
                >
                  <CheckCircle size={16} /> Check In
                </button>
              )}

              {selectedRes.status === 'Checked-In' && (
                <button
                  className="btn btn-warning"
                  onClick={() => {
                    checkOutGuest(selectedRes.id);
                    setSelectedRes(null);
                  }}
                >
                  <XCircle size={16} /> Check Out
                </button>
              )}

              {selectedRes.status !== 'Blocked' && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    onOpenFolio(selectedRes.id);
                    setSelectedRes(null);
                  }}
                >
                  <Receipt size={16} /> Open Folio ($)
                </button>
              )}

              {selectedRes.status === 'Blocked' && (
                <button
                  className="btn btn-emerald"
                  onClick={() => {
                    releaseRoomBlock(selectedRes.roomId);
                    setSelectedRes(null);
                  }}
                >
                  Release Room Block
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Extend / Edit Dates Modal */}
      {extendModalRes && (
        <div className="modal-backdrop" onClick={() => setExtendModalRes(null)}>
          <div className="modal-content glassmorphism" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><CalendarIcon size={18} className="text-primary" /> Extend / Modify Stay Dates</h3>
              <button className="close-btn" onClick={() => setExtendModalRes(null)}>×</button>
            </div>
            <form onSubmit={handleConfirmExtendModal}>
              <div className="modal-body">
                <p>Modify check-in and check-out dates for <strong>{extendModalRes.guestName}</strong> (Room {extendModalRes.roomNumber}).</p>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>New Check-In Date *</label>
                    <CustomDatePicker
                      value={extendCheckIn}
                      onChange={(e) => setExtendCheckIn(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>New Check-Out Date *</label>
                    <CustomDatePicker
                      value={extendCheckOut}
                      onChange={(e) => setExtendCheckOut(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setExtendModalRes(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Stay Dates</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Block Room Modal */}
      {blockModalRoom && (
        <div className="modal-backdrop" onClick={() => setBlockModalRoom(null)}>
          <div className="modal-content glassmorphism" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Ban size={18} className="text-danger" /> Block Room {blockModalRoom.number}</h3>
              <button className="close-btn" onClick={() => setBlockModalRoom(null)}>×</button>
            </div>
            <form onSubmit={handleConfirmBlock}>
              <div className="modal-body">
                <p>Configure Out-of-Order date range block for Room <strong>{blockModalRoom.number} ({blockModalRoom.type})</strong>.</p>

                <div className="form-group">
                  <label>Reason for Block *</label>
                  <select
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                  >
                    <option value="AC Repair & Maintenance">AC Repair & Maintenance</option>
                    <option value="Paint Touchup & Deep Cleaning">Paint Touchup & Deep Cleaning</option>
                    <option value="Plumbing Inspection">Plumbing Inspection</option>
                    <option value="VIP Owner Hold">VIP Owner Hold</option>
                    <option value="Out of Order - Damaged Furniture">Out of Order - Furniture Damage</option>
                  </select>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Block Start Date (From) *</label>
                    <CustomDatePicker
                      value={blockStartDate}
                      onChange={(e) => setBlockStartDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Block End Date (To) *</label>
                    <CustomDatePicker
                      value={blockEndDate}
                      onChange={(e) => setBlockEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setBlockModalRoom(null)}>Cancel</button>
                <button type="submit" className="btn btn-danger">
                  Confirm Date Range Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
