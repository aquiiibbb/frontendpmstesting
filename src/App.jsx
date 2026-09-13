import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Rooms from "./pages/Rooms";
import Extra from "./pages/extra";
import Staff from "./pages/Staff";
import Gallery from "./pages/Gallery";
import Policies from "./pages/Policies";
import Calendar from "./pages/frontdesk/Calendar";
import Audit from "./pages/frontdesk/audit";
import Masterreport from "./pages/frontdesk/masterreport";
import RateInventoryReport from "./pages/frontdesk/RateInventoryReport";
import NightAuditReportPage from "./pages/frontdesk/NightAuditReport";
import WalkinGuest from "./pages/frontdesk/WalkinGuest";
import Housekeeping from "./pages/Housekeeping";

import NightAudit from "./pages/frontdesk/NightAudit";
import GuestDatabase from "./pages/frontdesk/GuestDatabase";
import MobileCheckIn from "./pages/frontdesk/MobileCheckIn";
import CompanyAccounts from "./pages/CompanyAccounts";
import ConfigurationPanel from "./pages/ConfigurationPanel";
import RateManagement from "./pages/frontdesk/RateManagement";

import ActivityDashboard from "./pages/frontdesk/ActivityDashboard";
import Dashboard from "./pages/Dashboard";
import DailyExpenses from "./pages/operations/DailyExpenses";
import DailySalesPOS from "./pages/operations/DailySalesPOS";
import MiscOperations from "./pages/operations/MiscOperations";

import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import BookingEngine from "./pages/public/BookingEngine";
import PublicGuestCheckIn from "./pages/public/PublicGuestCheckIn";
import { FolioManager } from "./components/Folio/FolioManager";
import SuperAdminLogin from "./pages/superadmin/SuperAdminLogin";
import SuperAdminDashboard from "./pages/superadmin/SuperAdminDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/super-admin/login" element={<SuperAdminLogin />} />
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
        <Route path="/book" element={<BookingEngine />} />
        <Route path="/booking-engine" element={<BookingEngine />} />
        <Route path="/guest-checkin" element={<PublicGuestCheckIn />} />
        <Route path="/guest-checkin/:reservationId" element={<PublicGuestCheckIn />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/front-desk/calendar" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="front-desk/activity" element={<ActivityDashboard />} />
            <Route path="configuration" element={<ConfigurationPanel />} />
            <Route path="settings" element={<ConfigurationPanel />} />
            <Route path="hotel-info" element={<ConfigurationPanel />} />
            <Route path="room-type" element={<ConfigurationPanel />} />
            <Route path="rooms" element={<ConfigurationPanel />} />
            <Route path="tax" element={<ConfigurationPanel />} />
            <Route path="rate-plans" element={<ConfigurationPanel />} />
            <Route path="extra" element={<Extra />} />
            <Route path="staff" element={<Staff />} />
            <Route path="gallery" element={<Gallery />} />
            <Route path="policies" element={<Policies />} />
            <Route path="housekeeping" element={<Housekeeping />} />
            <Route path="rate-management" element={<RateManagement />} />
            <Route path="master-report" element={<Masterreport />} />
            <Route path="company-accounts" element={<CompanyAccounts />} />
            <Route path="night-audit" element={<NightAudit />} />
            
            {/* FRONT DESK ROUTES & ALIASES */}
            <Route path="front-desk/calendar" element={<Calendar />} />
            <Route path="front-desk/rate-management" element={<RateManagement />} />
            <Route path="front-desk/housekeeping" element={<Housekeeping />} />
            <Route path="front-desk/room-availability" element={<Calendar />} />
            <Route path="master-report" element={<Masterreport />} />
            <Route path="rate-inventory-report" element={<Navigate to="/master-report" replace />} />
            <Route path="night-audit-report" element={<Navigate to="/master-report" replace />} />
            <Route path="front-desk/masterreport" element={<Masterreport />} />
            <Route path="front-desk/rate-inventory-report" element={<Navigate to="/master-report" replace />} />
            <Route path="front-desk/night-audit-report" element={<Navigate to="/master-report" replace />} />
            <Route path="front-desk/night-audit" element={<NightAudit />} />         
            <Route path="front-desk/guest-database" element={<GuestDatabase />} />         
            <Route path="front-desk/guest-details" element={<GuestDatabase />} />         
            <Route path="front-desk/company-accounts" element={<CompanyAccounts />} />         
            <Route path="front-desk/payment" element={<CompanyAccounts />} />         
            <Route path="front-desk/digital-key" element={<MobileCheckIn />} />         
            <Route path="folios" element={<FolioManager />} />
            <Route path="folio-operations" element={<FolioManager />} />
            <Route path="front-desk/folios" element={<FolioManager />} />
            <Route path="front-desk/folio-operations" element={<FolioManager />} />
            <Route path="front-desk/walk-in-guest" element={<WalkinGuest />} />
            <Route path="operations/expenses" element={<DailyExpenses />} />
            <Route path="operations/sales-pos" element={<DailySalesPOS />} />
            <Route path="front-desk/expenses" element={<DailyExpenses />} />
            <Route path="front-desk/sales-pos" element={<DailySalesPOS />} />
            <Route path="misc" element={<MiscOperations />} />
            <Route path="operations/misc" element={<MiscOperations />} />
            <Route path="front-desk/misc" element={<MiscOperations />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
