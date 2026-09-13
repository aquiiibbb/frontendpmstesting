import React from 'react';
import { usePMS } from '../../context/PMSContext';
import { formatUSD, getStatusBadgeClass } from '../../utils/formatters';
import {
  TrendingUp,
  BedDouble,
  DollarSign,
  UserCheck,
  LogOut,
  Sparkles,
  Wrench,
  Calendar,
  ScanLine,
  Moon,
  ChevronRight
} from 'lucide-react';

export const Dashboard = ({ onNavigate }) => {
  const { rooms, reservations, folios, businessDate } = usePMS();

  // Metric calculations
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.status === 'Occupied').length;
  const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : '0.0';

  const arrivalsToday = reservations.filter(
    (r) => r.checkIn === businessDate && r.status === 'Reserved'
  );
  const departuresToday = reservations.filter(
    (r) => r.checkOut === businessDate && r.status === 'Checked-In'
  );
  const inHouseGuests = reservations.filter((r) => r.status === 'Checked-In');

  // Calculate estimated total revenue from folios today
  let roomRev = 0;
  let taxRev = 0;
  let incidentalRev = 0;

  Object.values(folios).forEach((f) => {
    (f.folioA || []).forEach((chg) => {
      if (chg.category === 'Room Rate') roomRev += chg.amountUSD;
      else if (chg.category === 'Tax') taxRev += chg.amountUSD;
      else incidentalRev += chg.amountUSD;
    });
    (f.folioB || []).forEach((chg) => {
      incidentalRev += chg.amountUSD;
    });
  });

  const totalRevenue = roomRev + taxRev + incidentalRev;
  const adr = occupiedRooms > 0 ? roomRev / occupiedRooms : 0;
  const revpar = totalRooms > 0 ? roomRev / totalRooms : 0;

  // Housekeeping counts
  const cleanRooms = rooms.filter((r) => r.housekeeping === 'Clean' || r.housekeeping === 'Inspected').length;
  const dirtyRooms = rooms.filter((r) => r.housekeeping === 'Dirty').length;
  const oooRooms = rooms.filter((r) => r.status === 'Out-of-Order').length;

  return (
    <div className="dashboard-view">
      <div className="dashboard-header">
        <div>
          <h2>Property Executive Dashboard</h2>
        </div>
        <div className="system-status-chip">
          <span className="live-dot" /> Live System Synchronized
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="kpi-grid">
        <div className="kpi-card glassmorphism">
          <div className="kpi-icon-wrapper bg-blue">
            <BedDouble size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">OCCUPANCY RATE</span>
            <div className="kpi-value">{occupancyRate}%</div>
            <span className="kpi-subtext">{occupiedRooms} of {totalRooms} Rooms Occupied</span>
          </div>
        </div>

        <div className="kpi-card glassmorphism">
          <div className="kpi-icon-wrapper bg-emerald">
            <DollarSign size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">TOTAL REVENUE TODAY</span>
            <div className="kpi-value text-emerald">{formatUSD(totalRevenue)}</div>
            <span className="kpi-subtext">Room: {formatUSD(roomRev)} | Tax: {formatUSD(taxRev)}</span>
          </div>
        </div>

        <div className="kpi-card glassmorphism">
          <div className="kpi-icon-wrapper bg-purple">
            <TrendingUp size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">ADR / REVPAR ($ USD)</span>
            <div className="kpi-value">{formatUSD(adr)}</div>
            <span className="kpi-subtext">RevPAR: {formatUSD(revpar)}</span>
          </div>
        </div>

        <div className="kpi-card glassmorphism">
          <div className="kpi-icon-wrapper bg-amber">
            <UserCheck size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">ARRIVALS / IN-HOUSE</span>
            <div className="kpi-value">{arrivalsToday.length} / {inHouseGuests.length}</div>
            <span className="kpi-subtext">{departuresToday.length} Departures Pending Today</span>
          </div>
        </div>
      </div>

      {/* Operational Quick Actions & Housekeeping Bar */}
      <div className="dashboard-row">
        <div className="card glassmorphism flex-2">
          <div className="card-header">
            <h3>Operations & Quick Navigation</h3>
          </div>
          <div className="action-button-grid">
            <button className="action-tile" onClick={() => onNavigate('tapechart')}>
              <Calendar size={28} className="tile-icon text-blue" />
              <div className="tile-info">
                <strong>Tape Chart Calendar</strong>
                <span>Drag & drop room reservations</span>
              </div>
              <ChevronRight size={18} />
            </button>

            <button className="action-tile" onClick={() => onNavigate('frontdesk')}>
              <UserCheck size={28} className="tile-icon text-emerald" />
              <div className="tile-info">
                <strong>Frontdesk Operations</strong>
                <span>Check-in, Check-out & Room Moves</span>
              </div>
              <ChevronRight size={18} />
            </button>

            <button className="action-tile" onClick={() => onNavigate('idscan')}>
              <ScanLine size={28} className="tile-icon text-purple" />
              <div className="tile-info">
                <strong>ID Scanner Simulator</strong>
                <span>Passport & DL photo extraction</span>
              </div>
              <ChevronRight size={18} />
            </button>

            <button className="action-tile" onClick={() => onNavigate('nightaudit')}>
              <Moon size={28} className="tile-icon text-amber" />
              <div className="tile-info">
                <strong>Run Night Audit</strong>
                <span>Automated room posting & rollover</span>
              </div>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="card glassmorphism flex-1">
          <div className="card-header">
            <h3>Housekeeping Status</h3>
          </div>
          <div className="housekeeping-breakdown">
            <div className="hk-item">
              <div className="hk-label">
                <Sparkles size={18} className="text-emerald" />
                <span>Clean & Inspected</span>
              </div>
              <strong className="hk-count text-emerald">{cleanRooms}</strong>
            </div>
            <div className="hk-bar-wrapper">
              <div className="hk-progress bg-emerald" style={{ width: `${(cleanRooms / totalRooms) * 100}%` }} />
            </div>

            <div className="hk-item">
              <div className="hk-label">
                <Wrench size={18} className="text-amber" />
                <span>Dirty / Touch-up Needed</span>
              </div>
              <strong className="hk-count text-amber">{dirtyRooms}</strong>
            </div>
            <div className="hk-bar-wrapper">
              <div className="hk-progress bg-amber" style={{ width: `${(dirtyRooms / totalRooms) * 100}%` }} />
            </div>

            <div className="hk-item">
              <div className="hk-label">
                <LogOut size={18} className="text-danger" />
                <span>Out of Order (OOO)</span>
              </div>
              <strong className="hk-count text-danger">{oooRooms}</strong>
            </div>
            <div className="hk-bar-wrapper">
              <div className="hk-progress bg-danger" style={{ width: `${(oooRooms / totalRooms) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Live Room Status Grid */}
      <div className="card glassmorphism">
        <div className="card-header">
          <h3>Room Inventory Status</h3>
          <span className="badge badge-info">{rooms.length} Total Keys</span>
        </div>
        <div className="room-matrix-grid">
          {rooms.map((room) => {
            const currentRes = reservations.find(
              (r) => r.roomId === room.id && (r.status === 'Checked-In' || r.status === 'Reserved')
            );

            return (
              <div key={room.id} className={`room-status-card ${room.status.toLowerCase()}`}>
                <div className="room-card-top">
                  <span className="room-num">Room {room.number}</span>
                  <span className={`badge ${getStatusBadgeClass(room.status)}`}>
                    {room.status}
                  </span>
                </div>
                <div className="room-type">{room.type}</div>
                <div className="room-rate">{formatUSD(room.rateUSD)} / night</div>

                {currentRes ? (
                  <div className="room-guest-pill">
                    <UserCheck size={12} />
                    <span className="guest-name">{currentRes.guestName}</span>
                  </div>
                ) : (
                  <div className="room-vacant-text">
                    {room.housekeeping}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
