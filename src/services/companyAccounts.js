// Shared Corporate / City Ledger Accounts Service (100% Clean Slate - Zero Dummy Data)

const STORAGE_KEY = "hotelpms_company_accounts_v1";

export function getCompanyAccounts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

export function addCompanyAccount(companyData) {
  const accounts = getCompanyAccounts();
  const newAccount = {
    id: `ca_${Date.now()}`,
    name: companyData.name || "Corporate Account",
    accountNo: companyData.accountNo || `CL-${Math.floor(1000 + Math.random() * 9000)}`,
    gstin: companyData.gstin || "",
    balance: Number(companyData.balance || 0),
    contact: companyData.contact || "",
    email: companyData.email || "",
  };
  const updated = [...accounts, newAccount];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newAccount;
}

export function updateCompanyAccount(id, patchData) {
  const accounts = getCompanyAccounts();
  const updated = accounts.map((a) => (a.id === id ? { ...a, ...patchData } : a));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteCompanyAccount(id) {
  const accounts = getCompanyAccounts();
  const filtered = accounts.filter((a) => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return filtered;
}

export function purgeAllCompanyAccounts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  return [];
}
