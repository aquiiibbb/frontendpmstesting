import React, { useState } from 'react';
import { usePMS } from '../../context/PMSContext';
import { formatUSD, formatDate, getStatusBadgeClass } from '../../utils/formatters';
import { 
  UserCheck, 
  LogOut, 
  BedDouble, 
  ArrowRightLeft, 
  Receipt, 
  ScanLine, 
  Printer, 
  PlusCircle, 
  Wrench,
  Search,
  Filter
} from 'lucide-react';

export const FrontDesk = ({ onOpenFolio, onOpenIDScan, onOpenNewRes }) => {
  const { 
    reservations, 
    rooms, 
    checkInGuest, 
    checkOutGuest, 
    moveRoom, 
    updateRoomStatus, 
    businessDate 
  } = usePMS();

  const [activeSubTab, setActiveSubTab] = useState('inhouse');
  const [filterText, setFilterText] = useState('');
  const [moveModalRes, setMoveModalRes] = useState(null);
  const [targetRoomId, setTargetRoomId] = useState('');

  // Filter reservations based on active sub tab
  const getFilteredList = () => {
    let list = reservations;
    if (activeSubTab === 'inhouse') {
      list = reservations.filter((r) => r.status === 'Checked-In');
    } else if (activeSubTab === 'arrivals') {
      list = reservations.filter((r) => r.status === 'Reserved');
    } else if (activeSubTab === 'departures') {
      list = reservations.filter((r) => r.status === 'Checked-In' && r.checkOut === businessDate);
    }

    if (filterText) {
      list = list.filter(
        (r) =>
          r.guestName.toLowerCase().includes(filterText.toLowerCase()) ||
          r.roomNumber.includes(filterText) ||
          r.resCode.toLowerCase().includes(filterText.toLowerCase())
      );
    }
    return list;
  };

  const filteredReservations = getFilteredList();
  const oooRooms = rooms.filter((r) => r.status === 'Out-of-Order');

  const handleConfirmRoomMove = () => {
    if (!moveModalRes || !targetRoomId) return;
    const targetRoom = rooms.find((r) => r.id === targetRoomId);
    if (targetRoom) {
      moveRoom(moveModalRes.id, targetRoom.id, targetRoom.number, targetRoom.rateUSD);
      setMoveModalRes(null);
      setTargetRoomId('');
    }
  };

  return (
    <div className="frontdesk-view">
      <div className="frontdesk-header">
        <div>
          <h2>Frontdesk Operations Center</h2>
        </div>

        <div className="header-action-group">
          <button className="btn btn-primary" onClick={onOpenNewRes}>
            <PlusCircle size={16} /> New Reservation
          </button>
          <button className="btn btn-secondary" onClick={onOpenIDScan}>
            <ScanLine size={16} /> Guest ID Scan
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeSubTab === 'inhouse' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('inhouse')}
        >
          <BedDouble size={16} />
          In-House Guests ({reservations.filter((r) => r.status === 'Checked-In').length})
        </button>
        <button
          className={`tab-btn ${activeSubTab === 'arrivals' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('arrivals')}
        >
          <UserCheck size={16} />
          Arrivals Today ({reservations.filter((r) => r.status === 'Reserved').length})
        </button>
        <button
          className={`tab-btn ${activeSubTab === 'departures' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('departures')}
        >
          <LogOut size={16} />
          Departures ({reservations.filter((r) => r.status === 'Checked-In' && r.checkOut === businessDate).length})
        </button>
        <button
          className={`tab-btn ${activeSubTab === 'ooo' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('ooo')}
        >
          <Wrench size={16} />
          Out of Order / Maintenance ({oooRooms.length})
        </button>
      </div>

      {/* Search Filter Bar */}
      {activeSubTab !== 'ooo' && (
        <div className="filter-bar glassmorphism">
          <div className="search-input-wrapper">
            <Search size={16} />
            <input
              type="text"
              placeholder="Filter by guest name, room number, or reservation code..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Content Table / Cards */}
      {activeSubTab !== 'ooo' ? (
        <div className="card glassmorphism">
          <div className="table-responsive">
            <table className="pms-table">
              <thead>
                <tr>
                  <th>Res Code</th>
                  <th>Guest Name</th>
                  <th>Room # & Type</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Nightly Rate ($)</th>
                  <th>VIP / Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReservations.map((res) => (
                  <tr key={res.id}>
                    <td>
                      <strong className="code-highlight">{res.resCode}</strong>
                    </td>
                    <td>
                      <div className="guest-info-cell">
                        <span className="guest-name-main">{res.guestName}</span>
                        <span className="guest-phone-sub">{res.guestPhone}</span>
                      </div>
                    </td>
                    <td>
                      <span className="room-badge">Room {res.roomNumber}</span>
                      <span className="room-type-text">{res.roomType}</span>
                    </td>
                    <td>{formatDate(res.checkIn)}</td>
                    <td>{formatDate(res.checkOut)}</td>
                    <td className="text-emerald fw-bold">{formatUSD(res.nightlyRateUSD)}</td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(res.status)}`}>
                        {res.status}
                      </span>
                      {res.vipStatus !== 'Standard' && (
                        <span className="badge badge-gold margin-left-4">{res.vipStatus}</span>
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        {res.status === 'Reserved' && (
                          <button
                            className="btn btn-sm btn-success"
                            title="Check-In"
                            onClick={() => checkInGuest(res.id)}
                          >
                            <UserCheck size={14} /> Check In
                          </button>
                        )}

                        {res.status === 'Checked-In' && (
                          <button
                            className="btn btn-sm btn-warning"
                            title="Check-Out"
                            onClick={() => checkOutGuest(res.id)}
                          >
                            <LogOut size={14} /> Check Out
                          </button>
                        )}

                        <button
                          className="btn btn-sm btn-secondary"
                          title="Move Room"
                          onClick={() => setMoveModalRes(res)}
                        >
                          <ArrowRightLeft size={14} /> Move
                        </button>

                        <button
                          className="btn btn-sm btn-primary"
                          title="Open Folio"
                          onClick={() => onOpenFolio(res.id)}
                        >
                          <Receipt size={14} /> Folio ($)
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredReservations.length === 0 && (
                  <tr>
                    <td colSpan={8} className="empty-state">
                      No matching guest reservations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Out of Order Rooms View */
        <div className="card glassmorphism">
          <div className="card-header">
            <h3>Out-of-Order & Maintenance Room Blocks</h3>
          </div>
          <div className="ooo-grid">
            {rooms.map((room) => {
              const isOOO = room.status === 'Out-of-Order';
              return (
                <div key={room.id} className={`ooo-card ${isOOO ? 'active-ooo' : ''}`}>
                  <div className="ooo-top">
                    <span className="room-num">Room {room.number}</span>
                    <span className={`badge ${isOOO ? 'badge-danger' : 'badge-success'}`}>
                      {room.status}
                    </span>
                  </div>
                  <div className="room-type">{room.type} - Floor {room.floor}</div>
                  <div className="housekeeping-status">Housekeeping: {room.housekeeping}</div>

                  <div className="ooo-action-row">
                    {isOOO ? (
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => updateRoomStatus(room.id, 'Vacant', 'Clean')}
                      >
                        Release OOO Block
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => updateRoomStatus(room.id, 'Out-of-Order', 'Maintenance')}
                      >
                        Put Out of Order
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Room Move Modal */}
      {moveModalRes && (
        <div className="modal-backdrop" onClick={() => setMoveModalRes(null)}>
          <div className="modal-content glassmorphism" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Room Move & Reassignment</h3>
              <button className="close-btn" onClick={() => setMoveModalRes(null)}>×</button>
            </div>
            <div className="modal-body">
              <p className="modal-desc">
                Moving guest <strong>{moveModalRes.guestName}</strong> currently in <strong>Room {moveModalRes.roomNumber}</strong>.
              </p>

              <div className="form-group">
                <label>Select Available Target Room</label>
                <select
                  value={targetRoomId}
                  onChange={(e) => setTargetRoomId(e.target.value)}
                >
                  <option value="">-- Choose New Room --</option>
                  {rooms
                    .filter((r) => r.id !== moveModalRes.roomId && r.status !== 'Occupied' && r.status !== 'Out-of-Order')
                    .map((room) => (
                      <option key={room.id} value={room.id}>
                        Room {room.number} ({room.type}) - ${room.rateUSD}/night [{room.housekeeping}]
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setMoveModalRes(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={!targetRoomId}
                onClick={handleConfirmRoomMove}
              >
                Confirm Room Move
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
