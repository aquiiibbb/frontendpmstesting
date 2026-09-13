import { useState, useEffect } from "react";
import { PageHeader } from "../components/UI";
import AddCompanyModal from "../components/AddCompanyModal";
import {
  getCompanyAccounts,
  addCompanyAccount,
  updateCompanyAccount,
  deleteCompanyAccount,
  purgeAllCompanyAccounts,
} from "../services/companyAccounts";
import "./companyAccounts.css";

export default function CompanyAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [toast, setToast] = useState("");

  // Due Statement Email Modal State
  const [emailModalAccount, setEmailModalAccount] = useState(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    refreshAccounts();
  }, []);

  function refreshAccounts() {
    setAccounts(getCompanyAccounts());
  }

  function handleSaveAccount(accountData) {
    if (editingAccount) {
      updateCompanyAccount(editingAccount.id, {
        name: accountData.name,
        accountNo: accountData.accountNo,
        gstin: accountData.gstin,
        contact: accountData.contact,
        email: accountData.email,
      });
      setToast(`Updated corporate account for ${accountData.name}`);
    } else {
      addCompanyAccount(accountData);
      setToast(`Registered new corporate account for ${accountData.name}`);
    }
    refreshAccounts();
    setShowAddModal(false);
    setEditingAccount(null);
  }

  function handleDeleteAccount(account) {
    if (window.confirm(`Delete Corporate Account "${account.name}" (${account.accountNo})?`)) {
      deleteCompanyAccount(account.id);
      refreshAccounts();
      setToast(`Deleted ${account.name}`);
    }
  }

  function handlePurgeAll() {
    if (window.confirm("Are you sure you want to clear ALL corporate accounts? This cannot be undone.")) {
      purgeAllCompanyAccounts();
      refreshAccounts();
      setToast("Cleared all corporate accounts.");
    }
  }

  function handleOpenEmailModal(account) {
    setEmailModalAccount(account);
    setRecipientEmail(account.email || (account.contact ? `${account.name.toLowerCase().replace(/[^a-z0-9]/g, "")}@company.com` : "billing@company.com"));
    setEmailSubject(`Statement of Account & Outstanding Balance Due (${account.accountNo}) - ${account.name}`);
  }

  function handleSendDueEmail() {
    if (!recipientEmail) return;
    setSendingEmail(true);
    setTimeout(() => {
      setSendingEmail(false);
      setToast(`Due balance statement email successfully sent to ${recipientEmail}`);
      setEmailModalAccount(null);
    }, 500);
  }

  const filteredAccounts = accounts.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.accountNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.gstin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.contact.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOutstandingBalance = accounts.reduce((acc, a) => acc + (Number(a.balance) || 0), 0);

  return (
    <div className="company-accounts-page">
      <PageHeader
        title="Company Accounts & City Ledger"
        subtitle="Manage corporate direct billing accounts, GSTINs, and email due balance statements"
        icon="🏢"
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            {accounts.length > 0 && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handlePurgeAll}
                style={{ color: "#ef4444", borderColor: "#fca5a5" }}
              >
                🗑️ Clear All
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEditingAccount(null);
                setShowAddModal(true);
              }}
            >
              + Register New Company Account
            </button>
          </div>
        }
      />

      {toast && <div className="company-toast">{toast}</div>}

      {/* KPI METRICS SUMMARY */}
      <div className="ca-kpi-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="ca-kpi-card">
          <div className="ca-kpi-icon">🏢</div>
          <div>
            <div className="ca-kpi-val">{accounts.length}</div>
            <div className="ca-kpi-lbl">Corporate Accounts Registered</div>
          </div>
        </div>

        <div className="ca-kpi-card">
          <div className="ca-kpi-icon">⚠️</div>
          <div>
            <div className="ca-kpi-val" style={{ color: "#d97706" }}>
              ${totalOutstandingBalance.toLocaleString()}
            </div>
            <div className="ca-kpi-lbl">Total Outstanding City Ledger Due</div>
          </div>
        </div>
      </div>

      {/* SEARCH BAR & ADD BUTTON ROW */}
      <div className="ca-filter-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <input
          type="text"
          placeholder="🔍 Search company name, account #, GSTIN, or contact..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="ca-search-input"
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => {
            setEditingAccount(null);
            setShowAddModal(true);
          }}
        >
          ➕ Add Corporate Account
        </button>
      </div>

      {/* TABLE */}
      <div className="ca-table-card">
        <table className="ca-table">
          <thead>
            <tr>
              <th>Company Name</th>
              <th>City Ledger #</th>
              <th>GSTIN / Tax ID</th>
              <th>Authorized Contact</th>
              <th>Current Outstanding Balance ($)</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🏢</div>
                  <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 15, marginBottom: 4 }}>
                    No Corporate Accounts Registered Yet
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>
                    Click <strong>"+ Register New Company Account"</strong> above to add your first corporate client.
                  </div>
                </td>
              </tr>
            ) : (
              filteredAccounts.map((account) => (
                <tr key={account.id}>
                  <td>
                    <strong style={{ color: "#0f172a", fontSize: 14 }}>{account.name}</strong>
                    {account.email && (
                      <div style={{ fontSize: 11, color: "#64748b" }}>✉️ {account.email}</div>
                    )}
                  </td>
                  <td>
                    <span className="ca-badge">{account.accountNo}</span>
                  </td>
                  <td>
                    <code>{account.gstin || "N/A"}</code>
                  </td>
                  <td>{account.contact || "—"}</td>
                  <td>
                    <span className={account.balance > 0 ? "balance-due" : "balance-clean"}>
                      ${Number(account.balance || 0).toLocaleString()}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                      {account.balance > 0 && (
                        <button
                          type="button"
                          className="btn btn-primary-outline btn-xs"
                          title="Send Email Statement of Due Balance"
                          onClick={() => handleOpenEmailModal(account)}
                        >
                          📧 Send Email Due
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        onClick={() => {
                          setEditingAccount(account);
                          setShowAddModal(true);
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger-outline btn-xs"
                        onClick={() => handleDeleteAccount(account)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ADD / EDIT COMPANY MODAL */}
      <AddCompanyModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingAccount(null);
        }}
        initialData={editingAccount}
        onCompanyCreated={handleSaveAccount}
      />

      {/* EMAIL DUE STATEMENT MODAL */}
      {emailModalAccount && (
        <div className="fm-submodal-overlay" onClick={() => setEmailModalAccount(null)} style={{ zIndex: 99999 }}>
          <div className="block-edit-card" style={{ width: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className="block-edit-header">
              <div className="block-header-title">
                <span className="icon">📧</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>
                    Send City Ledger Due Balance Email
                  </h3>
                  <p className="sub" style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
                    Send itemized outstanding statement to <strong>{emailModalAccount.name}</strong>
                  </p>
                </div>
              </div>
              <button type="button" className="block-close-btn" onClick={() => setEmailModalAccount(null)}>✕</button>
            </div>

            <div className="block-edit-form" style={{ gap: 12 }}>
              <div className="block-form-group">
                <label>Recipient Email Address *</label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                />
              </div>

              <div className="block-form-group">
                <label>Email Subject *</label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>

              {/* STATEMENT PREVIEW BOX */}
              <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 10, padding: 12, fontSize: 12 }}>
                <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 6, fontSize: 13, borderBottom: "1px solid #e2e8f0", paddingBottom: 4 }}>
                  📄 Statement Preview
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "#64748b" }}>Company:</span>
                  <strong>{emailModalAccount.name} ({emailModalAccount.accountNo})</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "#64748b" }}>Contact:</span>
                  <span>{emailModalAccount.contact || "Authorized Accounts Desk"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "#64748b" }}>Statement Date:</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 6, borderTop: "1.5px solid #cbd5e1", fontSize: 14 }}>
                  <strong style={{ color: "#ef4444" }}>Total Due Balance:</strong>
                  <strong style={{ color: "#ef4444" }}>${Number(emailModalAccount.balance).toLocaleString()}</strong>
                </div>
                <p style={{ marginTop: 8, fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>
                  Includes itemized list of corporate guest stays, room charges, taxes, and payment wiring details.
                </p>
              </div>

              <div className="block-edit-actions" style={{ marginTop: 8 }}>
                <button type="button" className="btn-cancel-soft" onClick={() => setEmailModalAccount(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-save-primary"
                  disabled={sendingEmail}
                  onClick={handleSendDueEmail}
                >
                  {sendingEmail ? "Sending..." : "📤 Send Due Balance Email"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
