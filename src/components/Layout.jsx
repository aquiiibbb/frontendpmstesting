import { useState, useEffect, useMemo, useRef } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import FolioModal from "./FolioModal";
import NightAuditPromptModal from "./NightAuditPromptModal";
import { getBookings, getRooms } from "../services/api";
import { getBusinessDate, getHotelProfile, getUsers, saveUsers } from "../services/hotelConfig";
import "./Layout.css";
import {
  IconSearch,
  IconMenu,
} from "./Icons";
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Percent,
  BarChart3,
  Users,
  Users2,
  Sparkles,
  Moon,
  Building2,
  Globe,
  Settings,
  KeyRound,
  LogOut,
  ShoppingBag,
  TrendingDown,
  Receipt
} from "lucide-react";

function formatDisplayDate(dateStr) {
  if (!dateStr) return "";
  const cleanStr = dateStr.length === 10 ? dateStr + "T00:00:00" : dateStr;
  const d = new Date(cleanStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  
  let suffix = "th";
  if (day === 1 || day === 21 || day === 31) suffix = "st";
  else if (day === 2 || day === 22) suffix = "nd";
  else if (day === 3 || day === 23) suffix = "rd";

  return `${day}${suffix} ${month}, ${year}`;
}

function highlightMatch(text = "", query = "") {
  if (!query || !text) return text;
  const strText = String(text);
  const strQuery = String(query).toLowerCase();
  const idx = strText.toLowerCase().indexOf(strQuery);
  if (idx === -1) return strText;

  const before = strText.slice(0, idx);
  const match = strText.slice(idx, idx + strQuery.length);
  const after = strText.slice(idx + strQuery.length);

  return (
    <>
      {before}
      <span style={{ color: "#0f172a", background: "#e2e8f0", padding: "0 4px", borderRadius: "4px", fontWeight: 900 }}>{match}</span>
      {after}
    </>
  );
}

function getStatusBg(status = "") {
  const s = String(status).toLowerCase();
  if (s.includes("cancel")) return "#fee2e2";
  if (s.includes("checked-in") || s.includes("checkin")) return "#dcfce7";
  if (s.includes("confirm")) return "#dbeafe";
  if (s.includes("checkout") || s.includes("checked-out")) return "#f3f4f6";
  return "#f1f5f9";
}

function getStatusColor(status = "") {
  const s = String(status).toLowerCase();
  if (s.includes("cancel")) return "#991b1b";
  if (s.includes("checked-in") || s.includes("checkin")) return "#166534";
  if (s.includes("confirm")) return "#1e40af";
  if (s.includes("checkout") || s.includes("checked-out")) return "#374151";
  return "#475569";
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [navDropdownOpen, setNavDropdownOpen] = useState(false);
  const [reportingSubMenuOpen, setReportingSubMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const userObj = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("pms_user") || "{}");
    } catch (e) {
      return {};
    }
  }, []);

  const [allBookings, setAllBookings] = useState([]);
  const [roomsList, setRoomsList] = useState([]);
  const [selectedFolioBooking, setSelectedFolioBooking] = useState(null);

  // Accordion state for Master Categories in Header Dropdown
  const [openMasterCategories, setOpenMasterCategories] = useState({
    frontDesk: true,
    housekeeping: false,
    reportsFinance: false,
    crm: false,
    setup: false,
  });

  const toggleMasterCategory = (catKey) => {
    setOpenMasterCategories((prev) => ({
      ...prev,
      [catKey]: !prev[catKey],
    }));
  };

  const fetchLatestBookings = () => {
    Promise.all([getBookings(), getRooms()])
      .then(([b, r]) => {
        setAllBookings(b || []);
        setRoomsList(r || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchLatestBookings();
    window.addEventListener("pms_bookings_updated", fetchLatestBookings);
    window.addEventListener("pms_rooms_updated", fetchLatestBookings);
    window.addEventListener("storage", fetchLatestBookings);
    return () => {
      window.removeEventListener("pms_bookings_updated", fetchLatestBookings);
      window.removeEventListener("pms_rooms_updated", fetchLatestBookings);
      window.removeEventListener("storage", fetchLatestBookings);
    };
  }, [location.pathname]);

  // Keep open folio modal updated with latest booking state
  useEffect(() => {
    if (selectedFolioBooking && allBookings.length > 0) {
      const updated = allBookings.find((b) => String(b.id) === String(selectedFolioBooking.id));
      if (updated) {
        setSelectedFolioBooking(updated);
      }
    }
  }, [allBookings]);

  const query = searchTerm.trim().toLowerCase();

  const globalSearchResults = useMemo(() => {
    if (!query) return [];
    return allBookings.filter((b) => {
      if (!b || b.isDeleted) return false;
      const st = String(b.status || "").toLowerCase();
      if (st === "cancelled" || st === "deleted" || st === "blocked" || st === "maintenance" || st === "out-of-order" || b.isMaintenance || b.isBlock) return false;

      const guestName = String(b.guest || b.fullName || b.guestName || "").toLowerCase();
      if (guestName.includes("blocked") || guestName.includes("maintenance")) return false;
      const idStr = String(b.id || b.referenceCode || b.resCode || "").toLowerCase();
      const roomStr = String(b.room || b.roomNumber || "").toLowerCase();
      const phoneStr = String(b.phone || "").toLowerCase();
      const emailStr = String(b.email || "").toLowerCase();
      return (
        guestName.includes(query) ||
        idStr.includes(query) ||
        roomStr.includes(query) ||
        phoneStr.includes(query) ||
        emailStr.includes(query)
      );
    });
  }, [allBookings, query]);

  const [businessDate, setBusinessDate] = useState(() => getBusinessDate());
  const [hotelProfile, setHotelProfile] = useState(() => getHotelProfile());
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const userDropdownRef = useRef(null);

  useEffect(() => {
    function updateDate() {
      setBusinessDate(getBusinessDate());
    }
    window.addEventListener("pms_business_date_updated", updateDate);
    return () => window.removeEventListener("pms_business_date_updated", updateDate);
  }, []);

  useEffect(() => {
    function updateProfile() {
      setHotelProfile(getHotelProfile());
    }
    window.addEventListener("pms_hotel_profile_updated", updateProfile);
    window.addEventListener("pms_hotel_info_updated", updateProfile);
    window.addEventListener("pms_rooms_updated", updateProfile);
    window.addEventListener("storage", updateProfile);
    return () => {
      window.removeEventListener("pms_hotel_profile_updated", updateProfile);
      window.removeEventListener("pms_hotel_info_updated", updateProfile);
      window.removeEventListener("pms_rooms_updated", updateProfile);
      window.removeEventListener("storage", updateProfile);
    };
  }, []);

  useEffect(() => {
    function handleDocClick(e) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, []);

  const currentUser = useMemo(() => {
    const name = userObj?.name || "Reception Staff";
    const role = userObj?.role || "Front Desk Admin";
    const initials = userObj?.initials || (name ? name.slice(0, 2).toUpperCase() : "RS");
    return { name, role, initials };
  }, [userObj]);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out of the Hotel PMS session?")) {
      localStorage.removeItem("pms_authenticated");
      localStorage.removeItem("pms_user");
      window.dispatchEvent(new CustomEvent("pms_user_logged_out"));
      navigate("/login", { replace: true });
      window.location.href = "/login";
    }
  };

  const handleResetPasswordSubmit = (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPasswordInput) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (!newPasswordInput || newPasswordInput.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    try {
      const users = getUsers();
      const userIndex = users.findIndex((u) => u.role === currentUser.role || u.username === "admin" || u.username === "priya_frontdesk");
      if (userIndex !== -1) {
        users[userIndex].password = newPasswordInput;
        saveUsers(users);
      }
      setPasswordSuccess("Password updated successfully!");
      setTimeout(() => {
        setShowResetPasswordModal(false);
        setCurrentPasswordInput("");
        setNewPasswordInput("");
        setConfirmPasswordInput("");
        setPasswordSuccess("");
      }, 1500);
    } catch (err) {
      setPasswordError("Failed to update password. Please try again.");
    }
  };

  return (
    <div className="app-shell full-width">
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">

            <div className="nav-dropdown-wrapper" style={{ position: "relative" }}>
              <button
                type="button"
                className="sidebar-toggle-btn"
                onClick={() => setNavDropdownOpen((v) => !v)}
                aria-label="Module menu"
                title="Click to open Module Switcher Dropdown"
              >
                <IconMenu />
              </button>

              {/* CLEAN MODERN LEFT NAVIGATION MENU MATCHING USER SCREENSHOT 1 */}
              {navDropdownOpen && (
                <>
                  <div className="dropdown-overlay" onClick={() => setNavDropdownOpen(false)} />
                  <div className="nav-module-dropdown animate-dropdown">
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                      
                      <NavLink
                        to="/dashboard"
                        className={({ isActive }) => `sidebar-clean-link ${isActive ? "active" : ""}`}
                        onClick={() => setNavDropdownOpen(false)}
                      >
                        <LayoutDashboard size={18} />
                        <span>Dashboard</span>
                      </NavLink>

                      <NavLink
                        to="/front-desk/calendar"
                        className={({ isActive }) => `sidebar-clean-link ${isActive ? "active" : ""}`}
                        onClick={() => setNavDropdownOpen(false)}
                      >
                        <Calendar size={18} />
                        <span>Calendar</span>
                      </NavLink>

                      <NavLink
                        to="/front-desk/activity"
                        className={({ isActive }) => `sidebar-clean-link ${isActive ? "active" : ""}`}
                        onClick={() => setNavDropdownOpen(false)}
                      >
                        <BookOpen size={18} />
                        <span>Reservations</span>
                      </NavLink>

                      <NavLink
                        to="/rate-management"
                        className={({ isActive }) => `sidebar-clean-link ${isActive ? "active" : ""}`}
                        onClick={() => setNavDropdownOpen(false)}
                      >
                        <Percent size={18} />
                        <span>Rates and Availability</span>
                      </NavLink>

                      {/* MASTER FINANCIAL REPORT ONLY */}
                      <NavLink
                        to="/master-report"
                        className={({ isActive }) => `sidebar-clean-link ${isActive || location.pathname.includes("report") ? "active" : ""}`}
                        onClick={() => setNavDropdownOpen(false)}
                      >
                        <BarChart3 size={18} />
                        <span>Master Financial Report</span>
                      </NavLink>

                      <div style={{ height: "1px", background: "#f1f5f9", margin: "6px 0" }} />

                      <NavLink
                        to="/front-desk/guest-database"
                        className={({ isActive }) => `sidebar-clean-link ${isActive ? "active" : ""}`}
                        onClick={() => setNavDropdownOpen(false)}
                      >
                        <Users size={18} />
                        <span>Profiles</span>
                      </NavLink>

                      <button
                        type="button"
                        className="sidebar-clean-link"
                        onClick={() => {
                          setNavDropdownOpen(false);
                          navigate("/front-desk/calendar");
                          setTimeout(() => {
                            window.dispatchEvent(new CustomEvent("pms_open_group_booking"));
                          }, 150);
                        }}
                      >
                        <Users2 size={18} />
                        <span>Groups and Events</span>
                        <span style={{ fontSize: "10px", fontWeight: "700", background: "#e0e7ff", color: "#3730a3", padding: "2px 6px", borderRadius: "4px", marginLeft: "auto" }}>New</span>
                      </button>

                      <NavLink
                        to="/housekeeping"
                        className={({ isActive }) => `sidebar-clean-link ${isActive ? "active" : ""}`}
                        onClick={() => setNavDropdownOpen(false)}
                      >
                        <Sparkles size={18} />
                        <span>Housekeeping</span>
                      </NavLink>

                      <NavLink
                        to="/front-desk/night-audit"
                        className={({ isActive }) => `sidebar-clean-link ${isActive ? "active" : ""}`}
                        onClick={() => setNavDropdownOpen(false)}
                      >
                        <Moon size={18} />
                        <span>Night Audit</span>
                      </NavLink>

                      <NavLink
                        to="/front-desk/company-accounts"
                        className={({ isActive }) => `sidebar-clean-link ${isActive ? "active" : ""}`}
                        onClick={() => setNavDropdownOpen(false)}
                      >
                        <Building2 size={18} />
                        <span>House Accounts</span>
                      </NavLink>

                      <NavLink
                        to="/misc"
                        className={({ isActive }) => `sidebar-clean-link ${isActive ? "active" : ""}`}
                        onClick={() => setNavDropdownOpen(false)}
                      >
                        <Receipt size={18} />
                        <span>Misc</span>
                      </NavLink>

                      <NavLink
                        to="/book"
                        target="_blank"
                        className="sidebar-clean-link"
                        onClick={() => setNavDropdownOpen(false)}
                      >
                        <Globe size={18} />
                        <span>Direct Booking Engine</span>
                      </NavLink>

                      <div style={{ height: "1px", background: "#f1f5f9", margin: "6px 0" }} />

                      <NavLink
                        to="/configuration"
                        className={({ isActive }) => `sidebar-clean-link ${isActive ? "active" : ""}`}
                        onClick={() => setNavDropdownOpen(false)}
                      >
                        <Settings size={18} />
                        <span>Configuration</span>
                      </NavLink>

                      <div style={{ height: "1px", background: "#f1f5f9", margin: "6px 0" }} />

                      <div style={{ padding: "6px 10px", display: "flex", alignItems: "center", gap: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#2563eb", color: "#ffffff", fontWeight: 700, fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {currentUser.initials}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>{currentUser.name}</div>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>{currentUser.role}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="sidebar-clean-link"
                        onClick={() => {
                          setNavDropdownOpen(false);
                          setShowResetPasswordModal(true);
                        }}
                      >
                        <KeyRound size={18} />
                        <span>Reset Password</span>
                      </button>

                      <button
                        type="button"
                        className="sidebar-clean-link sidebar-logout-btn"
                        onClick={() => {
                          setNavDropdownOpen(false);
                          handleLogout();
                        }}
                      >
                        <LogOut size={18} />
                        <span>Logout Session</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* PROPERTY NAME BADGE FROM CONFIGURATION/SETUP */}
            <div
              className="property-badge"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 14px",
                background: "#f8fafc",
                color: "#0f172a",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontWeight: 800,
                fontSize: "13px",
                letterSpacing: "0.2px",
              }}
            >
              <span style={{ fontSize: "14px" }}>🏨</span>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "240px" }}>
                {hotelProfile.name || "Unconfigured Property"}
              </span>
            </div>
          </div>

          <div className="topbar-right">
            <div className="search-box" style={{ position: "relative" }}>
              <IconSearch />
              <input
                type="text"
                className="search-input"
                value={searchTerm}
                onFocus={fetchLatestBookings}
                onChange={(e) => {
                  fetchLatestBookings();
                  setSearchTerm(e.target.value);
                }}
                placeholder="Search reservation, guest, room..."
                aria-label="Search guest or room"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}

              {/* INSTANT GLOBAL SEARCH RESULTS DROPDOWN (WHITE & GREY COMBINATION) */}
              {query.length >= 1 && (
                <div
                  className="global-search-results animate-dropdown"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: "440px",
                    maxHeight: "480px",
                    overflowY: "auto",
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "14px",
                    boxShadow: "0 20px 40px rgba(15, 23, 42, 0.15)",
                    zIndex: 99999,
                    padding: "14px",
                    color: "#0f172a",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingBottom: "10px",
                      marginBottom: "12px",
                      borderBottom: "1px solid #e2e8f0",
                      fontSize: "11.5px",
                      fontWeight: 800,
                      color: "#475569",
                      textTransform: "uppercase",
                      letterSpacing: "0.6px",
                    }}
                  >
                    <span style={{ color: "#0f172a" }}>🔍 MATCHING RESERVATIONS ({globalSearchResults.length})</span>
                    <span style={{ color: "#64748b", textTransform: "none", fontWeight: 700 }}>Click to open folio</span>
                  </div>

                  {globalSearchResults.length === 0 ? (
                    <div style={{ padding: "20px 8px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                      No matching reservations found for "{searchTerm}"
                    </div>
                  ) : (
                    globalSearchResults.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => {
                          setSelectedFolioBooking(b);
                          setSearchTerm("");
                        }}
                        style={{
                          padding: "12px 14px",
                          borderRadius: "10px",
                          marginBottom: "8px",
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        className="search-result-item"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f8fafc";
                          e.currentTarget.style.borderColor = "#cbd5e1";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#ffffff";
                          e.currentTarget.style.borderColor = "#e2e8f0";
                        }}
                      >
                        {/* FIRST LINE: Guest Name + Room Number */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                          <div style={{ fontWeight: 800, fontSize: "14px", color: "#0f172a" }}>
                            👤 {highlightMatch(b.guest || b.fullName, query)}
                          </div>
                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: "12px",
                              background: "#f1f5f9",
                              color: "#0f172a",
                              border: "1px solid #cbd5e1",
                              padding: "3px 10px",
                              borderRadius: "6px",
                            }}
                          >
                            Room {highlightMatch(b.room, query)}
                          </div>
                        </div>

                        {/* SECOND LINE: Res ID + Room Type */}
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "#475569", marginBottom: "6px" }}>
                          <span style={{ fontWeight: "800", color: "#475569" }}>ID: {highlightMatch(b.id || b.referenceCode, query)}</span>
                          <span>•</span>
                          <span>{b.roomType || "Standard Room"}</span>
                        </div>

                        {/* THIRD LINE: Status Badge + Tariff */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 800,
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: getStatusBg(b.status),
                              color: getStatusColor(b.status),
                              textTransform: "uppercase",
                            }}
                          >
                            {b.status || "CONFIRMED"}
                          </span>
                          <span style={{ fontSize: "12px", fontWeight: 800, color: "#334155" }}>
                            ${b.totalAmount || 0} {Number(b.balanceDue || 0) > 0 ? <span style={{ color: "#dc2626" }}>(Due: ${b.balanceDue})</span> : <span style={{ color: "#16a34a" }}>(Paid)</span>}
                          </span>
                        </div>

                        {/* FOURTH LINE: Stay Dates */}
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                          📅 {formatDisplayDate(b.checkIn)} - {formatDisplayDate(b.checkOut)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* TIER 2 ACTION SUB-NAVBAR BAR FOR PAGE CONTROLS */}
        <div className="sub-topbar">
          <div id="calendar-navbar-controls" className="sub-navbar-content" />
        </div>

        <div className="page-content">
          <Outlet context={{ searchTerm, setSearchTerm }} />
        </div>
      </div>

      {/* AUTOMATED NIGHT AUDIT ROLLOVER POP-UP PROMPT */}
      <NightAuditPromptModal />

      {/* INSTANT GUEST FOLIO & BILLING OPERATIONS MODAL OPENED FROM SEARCH */}
      {selectedFolioBooking && (
        <FolioModal
          isOpen={Boolean(selectedFolioBooking)}
          onClose={() => setSelectedFolioBooking(null)}
          booking={selectedFolioBooking}
          room={roomsList.find((r) => r.no === selectedFolioBooking?.room)}
          rooms={roomsList}
        />
      )}
    </div>
  );
}
