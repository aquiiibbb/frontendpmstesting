// 100% Pure Clean Slate Database Initialization
const STORAGE_KEY = "hotelpms_mock_db_v1";

let counter = 1;
export function genId(prefix = "id") {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}

export function nowISO() {
  return new Date().toISOString();
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// 100% Clean Seed Data Structure (Zero mock data, 0 rooms, 0 bookings)
function buildSeed() {
  return {
    roomTypes: [],
    rooms: [],
    bookings: [],
    auditLogs: [],
  };
}

function load() {
  let loaded = null;
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) loaded = JSON.parse(raw);
    }
  } catch {
    // ignore
  }

  if (typeof localStorage !== "undefined") {
    const rawBk = localStorage.getItem("hotelpms_bookings_v1");
    const rawRoomsV0 = localStorage.getItem("hotelpms_room_numbers");
    const rawRoomsV3 = localStorage.getItem("hotelpms_room_numbers_v3");
    const rawRoomsV1 = localStorage.getItem("hotelpms_rooms_list_v1");
    const rawTypesV0 = localStorage.getItem("hotelpms_room_types");
    const rawTypesV3 = localStorage.getItem("hotelpms_room_types_v3");
    const rawTypesV1 = localStorage.getItem("hotelpms_room_types_v1");

    const rawRooms = rawRoomsV3 !== null ? rawRoomsV3 : (rawRoomsV1 !== null ? rawRoomsV1 : rawRoomsV0);
    const rawTypes = rawTypesV3 !== null ? rawTypesV3 : (rawTypesV1 !== null ? rawTypesV1 : rawTypesV0);

    let finalRoomTypes = loaded?.roomTypes;
    let finalRooms = loaded?.rooms;
    let finalBookings = loaded?.bookings;

    if (rawTypes !== null) {
      try { finalRoomTypes = JSON.parse(rawTypes); } catch {}
    }
    if (rawRooms !== null) {
      try { finalRooms = JSON.parse(rawRooms); } catch {}
    }
    if (rawBk !== null) {
      try { finalBookings = JSON.parse(rawBk); } catch {}
    }

    // Deduplicate bookings array by composite key
    if (Array.isArray(finalBookings)) {
      const bMap = new Map();
      finalBookings.forEach((b) => {
        if (!b) return;
        const roomKey = String(b.room || b.roomNo || "").trim();
        const checkIn = String(b.checkIn || "").substring(0, 10).trim();
        const checkOut = String(b.checkOut || "").substring(0, 10).trim();
        const guest = String(b.guest || b.guestName || "").trim().toLowerCase();
        const key = `${roomKey}_${checkIn}_${checkOut}_${guest}`;

        if (!bMap.has(key)) {
          bMap.set(key, b);
        } else {
          const existing = bMap.get(key);
          const isExistingReal = existing._id || (existing.id && !existing.id.startsWith("bk_"));
          const isNewReal = b._id || (b.id && !b.id.startsWith("bk_"));
          if (isNewReal && !isExistingReal) {
            bMap.set(key, b);
          }
        }
      });
      finalBookings = Array.from(bMap.values());
    }

    // Only fallback to seed if user has NEVER opened or configured the system at all (all keys null)
    const isFirstTimeUser = rawTypes === null && rawRooms === null && rawBk === null && !loaded;
    if (isFirstTimeUser) {
      const seed = buildSeed();
      return {
        roomTypes: seed.roomTypes,
        rooms: seed.rooms,
        bookings: seed.bookings,
        auditLogs: [],
      };
    }

    return {
      roomTypes: Array.isArray(finalRoomTypes) ? finalRoomTypes : [],
      rooms: Array.isArray(finalRooms) ? finalRooms : [],
      bookings: Array.isArray(finalBookings) ? finalBookings : [],
      auditLogs: Array.isArray(loaded?.auditLogs) ? loaded.auditLogs : [],
    };
  }

  return { roomTypes: [], rooms: [], bookings: [], auditLogs: [] };
}

const db = load();

export function syncFromLocalStorage() {
  if (typeof localStorage === "undefined") return;
  try {
    const rawBk = localStorage.getItem("hotelpms_bookings_v1");
    if (rawBk !== null) {
      const bkList = JSON.parse(rawBk);
      if (Array.isArray(bkList)) db.bookings = bkList;
    } else {
      db.bookings = [];
    }

    const rawLogs = localStorage.getItem("hotelpms_audit_logs_v1");
    if (rawLogs !== null) {
      const logList = JSON.parse(rawLogs);
      db.auditLogs = Array.isArray(logList) ? logList : [];
    }

    const rawRoomsV0 = localStorage.getItem("hotelpms_room_numbers");
    const rawRoomsV3 = localStorage.getItem("hotelpms_room_numbers_v3");
    const rawRoomsV1 = localStorage.getItem("hotelpms_rooms_list_v1");
    const rawRooms = rawRoomsV3 !== null ? rawRoomsV3 : (rawRoomsV1 !== null ? rawRoomsV1 : rawRoomsV0);
    if (rawRooms !== null) {
      const rList = JSON.parse(rawRooms);
      if (Array.isArray(rList)) db.rooms = rList;
    }

    const rawTypesV0 = localStorage.getItem("hotelpms_room_types");
    const rawTypesV3 = localStorage.getItem("hotelpms_room_types_v3");
    const rawTypesV1 = localStorage.getItem("hotelpms_room_types_v1");
    const rawTypes = rawTypesV3 !== null ? rawTypesV3 : (rawTypesV1 !== null ? rawTypesV1 : rawTypesV0);
    if (rawTypes !== null) {
      const tList = JSON.parse(rawTypes);
      if (Array.isArray(tList)) db.roomTypes = tList;
    }
  } catch (e) {
    console.error("Error syncing from localStorage:", e);
  }
}

export function persist() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    localStorage.setItem("hotelpms_bookings_v1", JSON.stringify(db.bookings || []));
    localStorage.setItem("hotelpms_room_numbers", JSON.stringify(db.rooms || []));
    localStorage.setItem("hotelpms_room_numbers_v3", JSON.stringify(db.rooms || []));
    localStorage.setItem("hotelpms_rooms_list_v1", JSON.stringify(db.rooms || []));
    localStorage.setItem("hotelpms_room_types", JSON.stringify(db.roomTypes || []));
    localStorage.setItem("hotelpms_room_types_v3", JSON.stringify(db.roomTypes || []));
    localStorage.setItem("hotelpms_room_types_v1", JSON.stringify(db.roomTypes || []));
    localStorage.setItem("hotelpms_audit_logs_v1", JSON.stringify(db.auditLogs || []));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pms_bookings_updated"));
      window.dispatchEvent(new CustomEvent("pms_rooms_updated"));
    }

    // Real-time Background Sync to Node.js Backend & MongoDB Atlas
    fetch("http://localhost:4000/api/v1/config/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rooms: db.rooms, ratePlans: db.ratePlans, bookings: db.bookings }),
    }).catch(() => {});
  } catch (e) {
    console.error("Error persisting to localStorage:", e);
  }
}

export function resetAllData() {
  db.roomTypes = [];
  db.rooms = [];
  db.bookings = [];
  db.auditLogs = [];
  try {
    localStorage.clear();
    localStorage.setItem("hotelpms_bookings_v1", "[]");
    localStorage.setItem("hotelpms_rooms_list_v1", "[]");
    localStorage.setItem("hotelpms_room_numbers_v3", "[]");
    localStorage.setItem("hotelpms_room_types_v1", "[]");
    localStorage.setItem("hotelpms_room_types_v3", "[]");
    localStorage.setItem("hotelpms_taxes_v3", "[]");
    localStorage.setItem("hotelpms_rate_plans_v3", "[]");
    localStorage.setItem("hotelpms_addons_v3", "[]");
    localStorage.setItem("hotelpms_audit_logs_v1", "[]");
    localStorage.setItem("hotelpms_flagged_guests_v1", "[]");
    localStorage.setItem("hotelpms_saved_cards_v1", "[]");
    localStorage.setItem("pms_past_shift_handovers", "[]");
    localStorage.setItem("hotelpms_hotel_info_v3", JSON.stringify({ name: "", website: "", taxId: "", totalRooms: "", contactName: "", currency: "US Dollar ($)", phone: "", timeZone: "", city: "", state: "", country: "", address: "", zipcode: "", rating: 0 }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ roomTypes: [], rooms: [], bookings: [], auditLogs: [] }));
    persist();

    fetch("http://localhost:4000/api/reset-all", { method: "POST" }).catch(() => {});
  } catch {
    // ignore
  }
}

if (typeof window !== "undefined") {
  window.__resetHotelPMSMockData = resetAllData;
}

export default db;
