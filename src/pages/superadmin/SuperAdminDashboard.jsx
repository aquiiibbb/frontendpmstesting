import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getSuperAdminStatsApi,
  getTenantsApi,
  createTenantApi,
  updateTenantApi,
  impersonateTenantApi,
  deleteTenantApi,
} from "../../services/superAdminService";
import {
  Building2,
  Users,
  DollarSign,
  BedDouble,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldAlert,
  LogOut,
  Edit,
  CheckCircle,
  Clock,
  AlertTriangle,
  X,
} from "lucide-react";

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    trialingTenants: 0,
    suspendedTenants: 0,
    totalRoomsCount: 0,
    mrr: 0,
  });

  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const navigate = useNavigate();

  // MODALS
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(null); // tenant object

  // FORM STATES
  const [createForm, setCreateForm] = useState({
    name: "",
    ownerName: "",
    ownerEmail: "",
    phone: "",
    currency: "$",
    plan: "Pro",
    maxRooms: "50",
    password: "",
  });

  const [editForm, setEditForm] = useState({
    status: "active",
    plan: "Pro",
    maxRooms: "50",
    notes: "",
  });

  const [createdCredentials, setCreatedCredentials] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, tenantsData] = await Promise.all([
        getSuperAdminStatsApi(),
        getTenantsApi(),
      ]);
      setStats(statsData);
      setTenants(tenantsData);
    } catch (err) {
      if (err.message.includes("Login")) {
        navigate("/super-admin/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("superadmin_token");
    localStorage.removeItem("superadmin_user");
    navigate("/super-admin/login");
  };

  const handleCreateTenantSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await createTenantApi(createForm);
      setCreatedCredentials(res.adminCredentials);
      setShowCreateModal(false);
      loadDashboardData();
      alert(`Hotel Account "${res.tenant.name}" created successfully!`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEditTenantSubmit = async (e) => {
    e.preventDefault();
    if (!showEditModal) return;
    try {
      await updateTenantApi(showEditModal._id, editForm);
      setShowEditModal(null);
      loadDashboardData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleImpersonate = async (tenantId) => {
    try {
      const res = await impersonateTenantApi(tenantId);
      localStorage.setItem("pms_token", res.token);
      localStorage.setItem("pms_tenant_id", res.tenantId);
      localStorage.setItem("pms_authenticated", "true");
      localStorage.setItem("pms_user", JSON.stringify(res.user));
      window.location.href = "/front-desk/calendar";
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeactivate = async (tenant) => {
    if (window.confirm(`Deactivate account for "${tenant.name}"?`)) {
      try {
        await deleteTenantApi(tenant._id);
        loadDashboardData();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tenantId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        padding: "28px 36px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#0f172a",
      }}
    >
      {/* 1. TOP SUPER ADMIN HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          borderBottom: "2px solid #e2e8f0",
          paddingBottom: "16px",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "24px",
              fontWeight: "800",
              color: "#0f172a",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            🌐 Super Admin Management Hub
          </h1>
          <p style={{ margin: "4px 0 0 0", fontSize: "13.5px", color: "#64748b" }}>
            Global Multi-Tenant Hotel Management, Subscriptions &amp; Billing Control Center
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            onClick={loadDashboardData}
            style={{
              background: "#ffffff",
              color: "#0f172a",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: "700",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={15} /> Refresh
          </button>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: "#ffffff",
              color: "#991b1b",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: "700",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            }}
          >
            <LogOut size={15} /> Logout
          </button>
        </div>
      </div>

      {/* 2. GLOBAL METRIC CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "18px 20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
              Total Hotels
            </span>
            <Building2 size={20} color="#0f172a" />
          </div>
          <div style={{ fontSize: "28px", fontWeight: "900", color: "#0f172a", marginTop: "8px" }}>
            {stats.totalTenants}
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
            {stats.activeTenants} Active • {stats.trialingTenants} Trialing
          </div>
        </div>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "18px 20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
              Active Subscriptions
            </span>
            <CheckCircle size={20} color="#166534" />
          </div>
          <div style={{ fontSize: "28px", fontWeight: "900", color: "#0f172a", marginTop: "8px" }}>
            {stats.activeTenants}
          </div>
          <div style={{ fontSize: "12px", color: "#166534", marginTop: "4px", fontWeight: "700" }}>
            100% Billing Verified
          </div>
        </div>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "18px 20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
              Monthly Recurring Rev (MRR)
            </span>
            <DollarSign size={20} color="#0f172a" />
          </div>
          <div style={{ fontSize: "28px", fontWeight: "900", color: "#0f172a", marginTop: "8px" }}>
            ${stats.mrr}
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
            Estimated SaaS Revenue
          </div>
        </div>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "18px 20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
              Managed Room Capacity
            </span>
            <BedDouble size={20} color="#0f172a" />
          </div>
          <div style={{ fontSize: "28px", fontWeight: "900", color: "#0f172a", marginTop: "8px" }}>
            {stats.totalRoomsCount} Rooms
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
            Across all properties
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR CONTROLS */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          gap: "16px",
          flexWrap: "wrap",
          background: "#f8fafc",
          padding: "14px 18px",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
        }}
      >
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <Search
              size={15}
              color="#64748b"
              style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="text"
              placeholder="Search hotel name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                height: "38px",
                paddingLeft: "36px",
                paddingRight: "14px",
                borderRadius: "8px",
                border: "1.5px solid #cbd5e1",
                fontSize: "13px",
                fontWeight: "600",
                width: "260px",
                outline: "none",
              }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              height: "38px",
              padding: "0 14px",
              borderRadius: "8px",
              border: "1.5px solid #cbd5e1",
              fontSize: "13px",
              fontWeight: "700",
              color: "#0f172a",
              background: "#ffffff",
              outline: "none",
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="suspended">Suspended</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => {
            setCreateForm({
              name: "",
              ownerName: "",
              ownerEmail: "",
              phone: "",
              currency: "$",
              plan: "Pro",
              maxRooms: "50",
              password: "",
            });
            setShowCreateModal(true);
          }}
          style={{
            background: "#d3d3d3",
            color: "#0f172a",
            border: "1px solid #b0b0b0",
            borderRadius: "8px",
            padding: "9px 18px",
            fontSize: "13.5px",
            fontWeight: "800",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
          }}
        >
          <Plus size={16} /> Generate New Hotel Account
        </button>
      </div>

      {/* 4. HOTELS DIRECTORY TABLE */}
      <div style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "12px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", borderBottom: "1.5px solid #cbd5e1" }}>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>
                Hotel Property
              </th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "800", color: "#0f172a" }}>
                Owner &amp; Contact Email
              </th>
              <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: "800", color: "#0f172a" }}>
                Plan Tier
              </th>
              <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: "800", color: "#0f172a" }}>
                Max Capacity
              </th>
              <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: "800", color: "#0f172a" }}>
                Status
              </th>
              <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: "800", color: "#0f172a" }}>
                Actions &amp; Control
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTenants.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
                  No hotel accounts found matching your filters.
                </td>
              </tr>
            ) : (
              filteredTenants.map((tenant) => (
                <tr
                  key={tenant._id}
                  style={{
                    borderBottom: "1px solid #e2e8f0",
                    background: "#ffffff",
                    transition: "background 0.15s ease",
                  }}
                >
                  <td style={{ padding: "14px 16px", fontWeight: "800", color: "#0f172a" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Building2 size={16} color="#64748b" />
                      <div>
                        {tenant.name}
                        <span style={{ fontSize: "11px", color: "#64748b", display: "block", fontWeight: "600" }}>
                          ID: {tenant.tenantId}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px", color: "#0f172a", fontWeight: "600" }}>
                    {tenant.ownerName}
                    <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>
                      {tenant.ownerEmail}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: "800", color: "#0f172a" }}>
                    {tenant.plan} ({tenant.currency})
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: "700", color: "#0f172a" }}>
                    {tenant.maxRooms} Rooms
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "center" }}>
                    <span
                      style={{
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "800",
                        textTransform: "capitalize",
                        background:
                          tenant.status === "active"
                            ? "#dcfce7"
                            : tenant.status === "trialing"
                            ? "#f1f5f9"
                            : "#fef2f2",
                        color:
                          tenant.status === "active"
                            ? "#166534"
                            : tenant.status === "trialing"
                            ? "#475569"
                            : "#991b1b",
                        border:
                          tenant.status === "active"
                            ? "1px solid #bbf7d0"
                            : tenant.status === "trialing"
                            ? "1px solid #cbd5e1"
                            : "1px solid #fecaca",
                      }}
                    >
                      {tenant.status}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "center" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setShowEditModal(tenant);
                          setEditForm({
                            status: tenant.status,
                            plan: tenant.plan,
                            maxRooms: String(tenant.maxRooms || 50),
                            notes: tenant.notes || "",
                          });
                        }}
                        style={{
                          background: "#ffffff",
                          color: "#0f172a",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          padding: "6px 10px",
                          fontSize: "12px",
                          fontWeight: "700",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Edit size={13} /> Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleImpersonate(tenant._id)}
                        style={{
                          background: "#f1f5f9",
                          color: "#0f172a",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          padding: "6px 10px",
                          fontSize: "12px",
                          fontWeight: "800",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <ExternalLink size={13} /> Login as Hotel
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE HOTEL ACCOUNT MODAL */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "20px",
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              width: "100%",
              maxWidth: "520px",
              borderRadius: "16px",
              border: "1px solid #cbd5e1",
              boxShadow: "0 20px 45px rgba(0,0,0,0.15)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "18px 24px 14px 24px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>
                ⚡ Generate New Hotel Account
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  width: "32px",
                  height: "32px",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTenantSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: "800", color: "#0f172a", textTransform: "uppercase" }}>
                  Hotel Property Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Grand Ocean Resort & Spa"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  required
                  style={{ width: "100%", height: "40px", padding: "0 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13.5px", fontWeight: "700", marginTop: "4px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "800", color: "#0f172a", textTransform: "uppercase" }}>
                    Owner Name
                  </label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={createForm.ownerName}
                    onChange={(e) => setCreateForm({ ...createForm, ownerName: e.target.value })}
                    style={{ width: "100%", height: "40px", padding: "0 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13.5px", fontWeight: "700", marginTop: "4px", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "800", color: "#0f172a", textTransform: "uppercase" }}>
                    Owner Email *
                  </label>
                  <input
                    type="email"
                    placeholder="admin@grandocean.com"
                    value={createForm.ownerEmail}
                    onChange={(e) => setCreateForm({ ...createForm, ownerEmail: e.target.value })}
                    required
                    style={{ width: "100%", height: "40px", padding: "0 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13.5px", fontWeight: "700", marginTop: "4px", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "800", color: "#0f172a", textTransform: "uppercase" }}>
                    Plan Tier
                  </label>
                  <select
                    value={createForm.plan}
                    onChange={(e) => setCreateForm({ ...createForm, plan: e.target.value })}
                    style={{ width: "100%", height: "40px", padding: "0 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13.5px", fontWeight: "700", marginTop: "4px", background: "#ffffff" }}
                  >
                    <option value="Starter">Starter ($49/mo)</option>
                    <option value="Pro">Pro ($99/mo)</option>
                    <option value="Enterprise">Enterprise ($199/mo)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "800", color: "#0f172a", textTransform: "uppercase" }}>
                    Currency Symbol
                  </label>
                  <select
                    value={createForm.currency}
                    onChange={(e) => setCreateForm({ ...createForm, currency: e.target.value })}
                    style={{ width: "100%", height: "40px", padding: "0 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13.5px", fontWeight: "700", marginTop: "4px", background: "#ffffff" }}
                  >
                    <option value="$">USD ($)</option>
                    <option value="₹">INR (₹)</option>
                    <option value="€">EUR (€)</option>
                    <option value="£">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: "800", color: "#0f172a", textTransform: "uppercase" }}>
                  Initial Password
                </label>
                <input
                  type="text"
                  placeholder="hotel123"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  style={{ width: "100%", height: "40px", padding: "0 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13.5px", fontWeight: "700", marginTop: "4px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#ffffff", fontWeight: "700", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: "10px 22px", borderRadius: "8px", border: "1px solid #b0b0b0", background: "#d3d3d3", color: "#0f172a", fontWeight: "800", cursor: "pointer" }}
                >
                  Generate Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TENANT SUBSCRIPTION MODAL */}
      {showEditModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "20px",
          }}
          onClick={() => setShowEditModal(null)}
        >
          <div
            style={{
              background: "#ffffff",
              width: "100%",
              maxWidth: "460px",
              borderRadius: "16px",
              border: "1px solid #cbd5e1",
              boxShadow: "0 20px 45px rgba(0,0,0,0.15)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "18px 24px 14px 24px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>
                💳 Subscription Control: {showEditModal.name}
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(null)}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  width: "32px",
                  height: "32px",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditTenantSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: "800", color: "#0f172a", textTransform: "uppercase" }}>
                  Account Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  style={{ width: "100%", height: "40px", padding: "0 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13.5px", fontWeight: "700", marginTop: "4px", background: "#ffffff" }}
                >
                  <option value="active">Active (Full Access)</option>
                  <option value="trialing">Trialing (Free Period)</option>
                  <option value="suspended">Suspended (Overdue)</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: "800", color: "#0f172a", textTransform: "uppercase" }}>
                  Plan Tier
                </label>
                <select
                  value={editForm.plan}
                  onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                  style={{ width: "100%", height: "40px", padding: "0 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13.5px", fontWeight: "700", marginTop: "4px", background: "#ffffff" }}
                >
                  <option value="Starter">Starter ($49/mo)</option>
                  <option value="Pro">Pro ($99/mo)</option>
                  <option value="Enterprise">Enterprise ($199/mo)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: "800", color: "#0f172a", textTransform: "uppercase" }}>
                  Max Room Limit
                </label>
                <input
                  type="number"
                  value={editForm.maxRooms}
                  onChange={(e) => setEditForm({ ...editForm, maxRooms: e.target.value })}
                  style={{ width: "100%", height: "40px", padding: "0 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "13.5px", fontWeight: "700", marginTop: "4px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => handleDeactivate(showEditModal)}
                  style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", fontWeight: "700", cursor: "pointer", fontSize: "12.5px" }}
                >
                  Deactivate Account
                </button>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(null)}
                    style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#ffffff", fontWeight: "700", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #b0b0b0", background: "#d3d3d3", color: "#0f172a", fontWeight: "800", cursor: "pointer" }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
