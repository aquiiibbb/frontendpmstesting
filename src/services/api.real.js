const BASE_URL = "http://localhost:4000/api/v1";

function notifyUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pms_bookings_updated"));
    window.dispatchEvent(new CustomEvent("pms_rooms_updated"));
  }
}

// Automatically clear legacy v1 and v2 mock keys from localStorage
export function clearStaleLocalStorageMockCache() {
  if (typeof localStorage === "undefined") return;
  try {
    const keysToRemove = [
      "hotelpms_bookings_v1",
      "hotelpms_mock_db_v1",
      "hotelpms_rooms_list_v1",
      "hotelpms_room_types_v1",
      "hotelpms_room_numbers_v1",
      "hotelpms_bookings_v2",
      "hotelpms_room_types_v2",
      "hotelpms_room_numbers_v2"
    ];
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {}
}

// Clear legacy mock cache on module load
clearStaleLocalStorageMockCache();

async function request(path, { method = "GET", body, params } = {}) {
  let url = `${BASE_URL}${path}`;
  if (params) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    if (query) url += `?${query}`;
  }

  const controller = new AbortController();
  const isTestEnv = typeof process !== "undefined" && (process.env.NODE_ENV === "test" || process.env.VITEST);
  const timeoutId = setTimeout(() => controller.abort(), isTestEnv ? 3000 : 5000);

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      try {
        const data = await res.json();
        if (data?.message) message = data.message;
      } catch {}
      throw new Error(message);
    }

    if (res.status === 204) return null;
    return res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// Property Profile
export const getPropertyProfile = async () => {
  try {
    const res = await request("/property");
    return res?.data || res;
  } catch (e) {
    return {};
  }
};

export const updatePropertyProfile = async (data) => {
  try {
    const res = await request("/property", { method: "POST", body: data });
    notifyUpdate();
    return res?.data || res;
  } catch (e) {
    return data;
  }
};

// Rooms & Types
export const getRooms = async (params) => {
  try {
    const res = await request("/rooms", { params });
    return Array.isArray(res) ? res : res?.data || [];
  } catch {
    return [];
  }
};

export const getRoomTypes = async () => {
  try {
    const res = await request("/room-types");
    return Array.isArray(res) ? res : res?.data || [];
  } catch {
    return [];
  }
};

export const saveRoomTypes = async (types) => {
  let res;
  try {
    res = await request("/room-types/sync", { method: "POST", body: { roomTypes: types } });
  } catch {
    res = types;
  }
  notifyUpdate();
  return res;
};

export const saveRoomsList = async (rooms) => {
  let res;
  try {
    res = await request("/rooms/sync", { method: "POST", body: { rooms } });
  } catch {
    res = rooms;
  }
  notifyUpdate();
  return res;
};

export const createRoom = async (data) => {
  const res = await request("/rooms", { method: "POST", body: data });
  notifyUpdate();
  return res;
};

export const updateRoom = async (id, data) => {
  const res = await request(`/rooms/${id}`, { method: "PUT", body: data });
  notifyUpdate();
  return res;
};

export const deleteRoom = async (id) => {
  const res = await request(`/rooms/${id}`, { method: "DELETE" });
  notifyUpdate();
  return res;
};

export const updateRoomHousekeeping = async (roomNo, patch) => {
  try {
    const res = await request(`/rooms/${roomNo}/housekeeping`, { method: "PATCH", body: patch });
    notifyUpdate();
    return res;
  } catch {
    const currentRooms = await getRooms();
    const updated = (currentRooms || []).map((r) => {
      if (String(r.no).trim() === String(roomNo).trim()) {
        return { ...r, ...patch, lastCleaned: new Date().toISOString() };
      }
      return r;
    });
    notifyUpdate();
    return updated.find((r) => String(r.no).trim() === String(roomNo).trim());
  }
};

export const getBookings = async (params) => {
  try {
    const res = await request("/bookings", { params });
    return Array.isArray(res) ? res : res?.data || [];
  } catch {
    return [];
  }
};

export const getBooking = async (id) => {
  return await request(`/bookings/${id}`);
};

export const createBooking = async (bookingData) => {
  const res = await request("/bookings", { method: "POST", body: bookingData });
  notifyUpdate();
  return res;
};

export const createGroupBooking = async (groupPayload) => {
  const res = await request("/bookings", { method: "POST", body: groupPayload });
  notifyUpdate();
  return res;
};

export const updateBooking = async (id, patch) => {
  const res = await request(`/bookings/${id}`, { method: "PATCH", body: patch });
  notifyUpdate();
  return res;
};

export const moveBooking = async (id, payload) => {
  const res = await request(`/bookings/${id}`, { method: "PATCH", body: payload });
  notifyUpdate();
  return res;
};

export const cancelBooking = async (id, reason) => {
  const res = await request(`/bookings/${id}/cancel`, { method: "POST", body: { reason } });
  notifyUpdate();
  return res;
};

export const splitStayBooking = async (id, splitData) => {
  const res = await request(`/bookings/${id}/split`, { method: "POST", body: splitData });
  notifyUpdate();
  return res;
};

export const transferBalance = async (payload) => {
  const res = await request("/bookings/transfer-balance", { method: "POST", body: payload });
  notifyUpdate();
  return res;
};

export const addPayment = async (id, paymentData) => {
  const res = await request(`/bookings/${id}/payments`, { method: "POST", body: paymentData });
  notifyUpdate();
  return res;
};

export const postFolioPayment = addPayment;

export const addDeposit = async (id, depositData) => {
  const res = await request(`/bookings/${id}/deposits`, { method: "POST", body: depositData });
  notifyUpdate();
  return res;
};

export const applyDepositToFolio = async (id, depositIdOrPayload, maybePayload) => {
  const depositId = typeof depositIdOrPayload === "object" ? (depositIdOrPayload.id || depositIdOrPayload.depositId || "dep") : depositIdOrPayload;
  const bodyData = typeof depositIdOrPayload === "object" ? depositIdOrPayload : (maybePayload || {});
  const res = await request(`/bookings/${id}/deposits/${depositId}/apply`, { method: "POST", body: bodyData });
  notifyUpdate();
  return res;
};

export const updateDeposit = async (id, depositId, patch) => {
  const res = await request(`/bookings/${id}/deposits/${depositId}`, { method: "PATCH", body: patch });
  notifyUpdate();
  return res;
};

export const deleteDeposit = async (id, depositId) => {
  const res = await request(`/bookings/${id}/deposits/${depositId}`, { method: "DELETE" });
  notifyUpdate();
  return res;
};

export const refundDeposit = async (id, depositIdOrPayload, maybeAmount) => {
  const depositId = typeof depositIdOrPayload === "object" ? (depositIdOrPayload.id || depositIdOrPayload.depositId || "dep") : depositIdOrPayload;
  const bodyData = typeof depositIdOrPayload === "object" ? depositIdOrPayload : { amount: maybeAmount };
  const res = await request(`/bookings/${id}/deposits/${depositId}/refund`, { method: "POST", body: bodyData });
  notifyUpdate();
  return res;
};

export const deleteBooking = async (id) => {
  const res = await request(`/bookings/${id}`, { method: "DELETE" });
  notifyUpdate();
  return res;
};

export const importBatchBookings = async (bookingsList) => {
  if (!Array.isArray(bookingsList) || bookingsList.length === 0) {
    throw new Error("No bookings provided for import");
  }
  const res = await request("/bookings/batch-import", { method: "POST", body: JSON.stringify(bookingsList) });
  notifyUpdate();
  return res;
};

export const resetAllData = async () => {
  try {
    await request("/reset-all", { method: "POST" });
  } catch {}
  clearStaleLocalStorageMockCache();
  notifyUpdate();
};

export default {
  getPropertyProfile,
  updatePropertyProfile,
  getRooms,
  getRoomTypes,
  saveRoomTypes,
  saveRoomsList,
  createRoom,
  updateRoom,
  deleteRoom,
  updateRoomHousekeeping,
  getBookings,
  getBooking,
  createBooking,
  createGroupBooking,
  updateBooking,
  moveBooking,
  cancelBooking,
  splitStayBooking,
  transferBalance,
  addPayment,
  postFolioPayment,
  addDeposit,
  applyDepositToFolio,
  updateDeposit,
  deleteDeposit,
  refundDeposit,
  deleteBooking,
  resetAllData,
  clearStaleLocalStorageMockCache
};
