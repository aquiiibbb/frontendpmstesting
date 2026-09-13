import React, { useState, useEffect } from 'react';
import { usePMS } from '../context/PMSContext';
import { getHotelProfile } from '../services/hotelConfig';
import { 
  Building2, 
  Search, 
  PlusCircle, 
  X,
  PanelLeftClose,
  PanelLeftOpen,
  UserCheck
} from 'lucide-react';

export const Navbar = ({ 
  isSidebarOpen, 
  onToggleSidebar, 
  onOpenNewRes, 
  onSelectSearchResult 
}) => {
  const { reservations } = usePMS();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [hotelProfile, setHotelProfile] = useState(() => getHotelProfile());

  useEffect(() => {
    const handleProfileUpdate = () => {
      setHotelProfile(getHotelProfile());
    };
    window.addEventListener("pms_hotel_profile_updated", handleProfileUpdate);
    window.addEventListener("pms_hotel_info_updated", handleProfileUpdate);
    window.addEventListener("pms_rooms_updated", handleProfileUpdate);
    window.addEventListener("storage", handleProfileUpdate);
    return () => {
      window.removeEventListener("pms_hotel_profile_updated", handleProfileUpdate);
      window.removeEventListener("pms_hotel_info_updated", handleProfileUpdate);
      window.removeEventListener("pms_rooms_updated", handleProfileUpdate);
      window.removeEventListener("storage", handleProfileUpdate);
    };
  }, []);

  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (term.trim().length > 0) {
      const filtered = reservations.filter(
        (r) =>
          r && r.status !== 'cancelled' && r.status !== 'deleted' && !r.isDeleted &&
          (String(r.guestName || r.guest || '').toLowerCase().includes(term.toLowerCase()) ||
          String(r.roomNumber || r.room || '').includes(term) ||
          String(r.resCode || r.id || '').toLowerCase().includes(term.toLowerCase()) ||
          (r.idNumber && String(r.idNumber).toLowerCase().includes(term.toLowerCase())))
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectResult = (res) => {
    if (onSelectSearchResult) {
      onSelectSearchResult(res);
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  return (
    <header className="pms-navbar">
      <div className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Left Sidebar Menu Toggle Button */}
        <button 
          className="sidebar-toggle-btn"
          onClick={onToggleSidebar}
          title={isSidebarOpen ? "Hide Left Menu" : "Show Left Menu"}
        >
          {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
        </button>

        <div className="brand-title">
          <h1 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>
            {hotelProfile.name || "Hotel PMS"}
          </h1>
        </div>
      </div>

      {/* Global Interactive Search Bar */}
      <div className="navbar-search">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search Guest Name, Room #, or Booking ID (GV-8941)..."
            value={searchTerm}
            onChange={handleSearch}
          />
          {searchTerm && (
            <button className="clear-search-btn" onClick={() => { setSearchTerm(''); setSearchResults([]); }}>
              <X size={14} />
            </button>
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="search-dropdown">
            {searchResults.map((res) => (
              <div
                key={res.id}
                className="search-result-item"
                onClick={() => handleSelectResult(res)}
              >
                <div className="res-info">
                  <span className="guest-name">{res.guestName}</span>
                  <span className="res-code">{res.resCode}</span>
                </div>
                <div className="res-meta">
                  <span className="room-tag">Room {res.roomNumber}</span>
                  <span className={`badge ${res.status.toLowerCase()}`}>
                    {res.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="navbar-actions">
        <button className="btn btn-primary" onClick={onOpenNewRes}>
          <PlusCircle size={16} />
          <span>New Reservation</span>
        </button>
      </div>
    </header>
  );
};
