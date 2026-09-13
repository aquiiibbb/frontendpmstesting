const getApiUrl = (path) => {
  const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const baseUrl = isLocal ? "http://localhost:4000/api/v1/superadmin" : "/api/v1/superadmin";
  return `${baseUrl}${path}`;
};

const getHeaders = () => {
  const token = localStorage.getItem("superadmin_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (res) => {
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error(`Server returned ${res.status}. Please ensure backend is running.`);
  }
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
  }
  return data;
};

export const superAdminLoginApi = async (username, password) => {
  const res = await fetch(getApiUrl("/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return handleResponse(res);
};

export const getSuperAdminStatsApi = async () => {
  const res = await fetch(getApiUrl("/stats"), {
    headers: getHeaders(),
  });
  return handleResponse(res);
};

export const getTenantsApi = async () => {
  const res = await fetch(getApiUrl("/tenants"), {
    headers: getHeaders(),
  });
  return handleResponse(res);
};

export const createTenantApi = async (tenantData) => {
  const res = await fetch(getApiUrl("/tenants"), {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(tenantData),
  });
  return handleResponse(res);
};

export const updateTenantApi = async (id, updateData) => {
  const res = await fetch(getApiUrl(`/tenants/${id}`), {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(updateData),
  });
  return handleResponse(res);
};

export const impersonateTenantApi = async (id) => {
  const res = await fetch(getApiUrl(`/impersonate/${id}`), {
    method: "POST",
    headers: getHeaders(),
  });
  return handleResponse(res);
};

export const deleteTenantApi = async (id) => {
  const res = await fetch(getApiUrl(`/tenants/${id}`), {
    method: "DELETE",
    headers: getHeaders(),
  });
  return handleResponse(res);
};
