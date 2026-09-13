export const STORAGE_KEY_HOTEL_INFO = "hotelpms_hotel_info_v3";
export const STORAGE_KEY_RATE_PLANS = "hotelpms_rate_plans_v3";
export const STORAGE_KEY_ADDONS = "hotelpms_addons_v3";
export const STORAGE_KEY_TAXES = "hotelpms_taxes_v3";
export const STORAGE_KEY_DAILY_RATES = "hotelpms_daily_rates_matrix_v3";
export const STORAGE_KEY_ROOM_TYPES = "hotelpms_room_types_v3";
export const STORAGE_KEY_ROOM_NUMBERS = "hotelpms_room_numbers_v3";
export const STORAGE_KEY_CANCELLATION_POLICIES = "hotelpms_cancellation_policies_v3";
export const STORAGE_KEY_HOTEL_TERMS = "hotelpms_hotel_terms_v3";
export const STORAGE_KEY_BUSINESS_DATE = "hotelpms_working_business_date_v3";
export const STORAGE_KEY_NIGHT_AUDIT_CONFIG = "hotelpms_night_audit_config_v3";
export const STORAGE_KEY_SEQUENCE_CONFIG = "hotelpms_sequence_config_v1";
export const STORAGE_KEY_ROOM_LAYOUT_ORDER = "hotelpms_room_layout_order_v1";
export const STORAGE_KEY_ROOM_LAYOUT_DIMENSIONS = "hotelpms_room_layout_dimensions_v1";
export const STORAGE_KEY_ROOM_LAYOUT_COORDS = "hotelpms_room_layout_coords_v1";
export const STORAGE_KEY_STATUS_COLORS = "hotelpms_status_colors_v1";
export const STORAGE_KEY_TAX_INCLUSIVE = "hotelpms_tax_inclusive_v1";

export const DEFAULT_STATUS_COLORS = {
  confirmed: { bg: "#2563eb", text: "#ffffff" },
  checked_in: { bg: "#16a34a", text: "#ffffff" },
  checked_out: { bg: "#64748b", text: "#ffffff" },
  blocked: { bg: "#dc2626", text: "#ffffff" },
};

if (typeof window !== "undefined") {
  [
    "hotelpms_hotel_info_v1", "hotelpms_rate_plans_v1", "hotelpms_addons_v1", "hotelpms_taxes_v1", "hotelpms_daily_rates_matrix_v1", "hotelpms_room_types_v1", "hotelpms_room_numbers_v1",
    "hotelpms_hotel_info_v2", "hotelpms_rate_plans_v2", "hotelpms_addons_v2", "hotelpms_taxes_v2", "hotelpms_daily_rates_matrix_v2", "hotelpms_room_types_v2", "hotelpms_room_numbers_v2"
  ].forEach((k) => {
    try { localStorage.removeItem(k); } catch {}
  });
}

const DEFAULT_HOTEL_PROFILE = {
  name: "",
  website: "",
  taxId: "",
  totalRooms: "",
  contactName: "",
  currency: "US Dollar ($)",
  phone: "",
  timeZone: "(GMT-7:00) Pacific Time",
  city: "",
  state: "",
  country: "",
  address: "",
  zipcode: "",
  rating: 0,
  logoUrl: "",
};

const DEFAULT_SEED_ROOMS = [];

export function getRoomsList() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ROOM_NUMBERS);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Error reading rooms list:", e);
  }
  return DEFAULT_SEED_ROOMS;
}

export function saveRoomsList(rooms) {
  try {
    const list = Array.isArray(rooms) ? rooms : [];
    const isTestEnv = typeof process !== "undefined" && (process.env.NODE_ENV === "test" || process.env.VITEST);
    if (!isTestEnv && typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY_ROOM_NUMBERS, JSON.stringify(list));
      localStorage.setItem("hotelpms_room_numbers_v3", JSON.stringify(list));
      localStorage.setItem("hotelpms_rooms_list_v1", JSON.stringify(list));
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pms_rooms_updated", { detail: list }));
    }
    if (!isTestEnv) {
      triggerBackendConfigSync();
    }
    return list;
  } catch (e) {
    console.error("Error saving rooms list:", e);
    return [];
  }
}

export function getRoomLayoutOrder() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ROOM_LAYOUT_ORDER);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error("Error reading room layout order:", e);
  }
  return {};
}

export function syncLayoutToBackend() {
  try {
    const coords = getRoomLayoutCoords();
    const dimensions = getRoomLayoutDimensions();
    const order = getRoomLayoutOrder();
    fetch("http://localhost:4000/api/v1/config/layout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomLayoutCoords: coords, roomLayoutDimensions: dimensions, roomLayoutOrder: order }),
    }).catch(() => {});
  } catch {}
}

export function saveRoomLayoutOrder(orderMap) {
  try {
    const data = orderMap && typeof orderMap === "object" ? orderMap : {};
    localStorage.setItem(STORAGE_KEY_ROOM_LAYOUT_ORDER, JSON.stringify(data));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pms_room_layout_updated", { detail: data }));
    }
    syncLayoutToBackend();
    return data;
  } catch (e) {
    console.error("Error saving room layout order:", e);
    return {};
  }
}

export function getRoomLayoutDimensions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ROOM_LAYOUT_DIMENSIONS);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error("Error reading room layout dimensions:", e);
  }
  return {};
}

export function saveRoomLayoutDimensions(dimMap) {
  try {
    const data = dimMap && typeof dimMap === "object" ? dimMap : {};
    localStorage.setItem(STORAGE_KEY_ROOM_LAYOUT_DIMENSIONS, JSON.stringify(data));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pms_room_dimensions_updated", { detail: data }));
    }
    syncLayoutToBackend();
    return data;
  } catch (e) {
    console.error("Error saving room layout dimensions:", e);
    return {};
  }
}

export function getRoomLayoutCoords() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ROOM_LAYOUT_COORDS);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error("Error reading room layout coords:", e);
  }
  return {};
}

export function saveRoomLayoutCoords(coordsMap) {
  try {
    const data = coordsMap && typeof coordsMap === "object" ? coordsMap : {};
    localStorage.setItem(STORAGE_KEY_ROOM_LAYOUT_COORDS, JSON.stringify(data));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pms_room_coords_updated", { detail: data }));
    }
    syncLayoutToBackend();
    return data;
  } catch (e) {
    console.error("Error saving room layout coords:", e);
    return {};
  }
}

export async function triggerBackendConfigSync() {
  const isTestEnv = typeof process !== "undefined" && (process.env.NODE_ENV === "test" || process.env.VITEST);
  if (isTestEnv) return;

  try {
    const rooms = getRoomsList();
    const roomTypes = getRoomTypes();
    const ratePlans = getRatePlans();
    const addons = getHotelAddons();
    const property = getHotelProfile();
    const taxes = getTaxRules();
    const statusColors = getStatusColors();

    let bookings = [];
    try {
      const keys = ["pms_bookings", "hotelpms_bookings_v3", "hotelpms_bookings_v1", "hotelpms_bookings_v2"];
      for (const k of keys) {
        const rawB = localStorage.getItem(k);
        if (rawB) {
          const parsed = JSON.parse(rawB);
          if (Array.isArray(parsed) && parsed.length > 0) {
            bookings = parsed;
            break;
          }
        }
      }
    } catch (e) {}

    // 1. Full Config & Bookings Sync to Backend
    fetch("http://localhost:4000/api/v1/config/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rooms, roomTypes, ratePlans, addons, property, taxes, statusColors, bookings }),
    }).catch(() => {});

    // 2. Direct Property Profile Sync
    if (property) {
      fetch("http://localhost:4000/api/v1/property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(property),
      }).catch(() => {});
    }

    // 3. Direct Room Types Sync
    if (Array.isArray(roomTypes) && roomTypes.length > 0) {
      fetch("http://localhost:4000/api/v1/room-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roomTypes),
      }).catch(() => {});
    }

    // 4. Direct Rooms Sync
    if (Array.isArray(rooms) && rooms.length > 0) {
      fetch("http://localhost:4000/api/v1/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rooms),
      }).catch(() => {});
    }

    // 5. Direct Rate Plans Sync
    if (Array.isArray(ratePlans) && ratePlans.length > 0) {
      fetch("http://localhost:4000/api/v1/rate-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ratePlans),
      }).catch(() => {});
    }

    // 6. Direct Addons Sync
    if (Array.isArray(addons) && addons.length > 0) {
      fetch("http://localhost:4000/api/v1/addons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addons),
      }).catch(() => {});
    }

    // 7. Direct Tax Rules Sync
    if (Array.isArray(taxes) && taxes.length > 0) {
      fetch("http://localhost:4000/api/v1/taxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taxes),
      }).catch(() => {});
    }
  } catch (err) {
    console.error("🔴 [hotelConfig] Live Config Sync Error:", err);
  }
}

// Auto-Sync Atlas Cloud to Browser Local Storage on App Launch
export const autoSyncAtlasToLocalStorage = async () => {
  if (typeof window === "undefined") return;
  try {
    const [pRes, syncRes] = await Promise.all([
      fetch("http://localhost:4000/api/v1/property").then((r) => r.json()).catch(() => null),
      fetch("http://localhost:4000/api/v1/config/sync").then((r) => r.json()).catch(() => null),
    ]);

    if (pRes?.data && pRes.data.name) {
      localStorage.setItem(STORAGE_KEY_HOTEL_INFO, JSON.stringify(pRes.data));
    }

    if (syncRes?.success) {
      const { property, roomTypes, rooms, ratePlans, addons, taxes, statusColors } = syncRes;
      if (property && (property.name || property.propertyName)) {
        localStorage.setItem(STORAGE_KEY_HOTEL_INFO, JSON.stringify(property));
      }
      if (Array.isArray(roomTypes) && roomTypes.length > 0) {
        localStorage.setItem(STORAGE_KEY_ROOM_TYPES, JSON.stringify(roomTypes));
      }
      if (Array.isArray(rooms) && rooms.length > 0) {
        localStorage.setItem(STORAGE_KEY_ROOM_NUMBERS, JSON.stringify(rooms));
      }
      if (Array.isArray(ratePlans) && ratePlans.length > 0) {
        localStorage.setItem(STORAGE_KEY_RATE_PLANS, JSON.stringify(ratePlans));
      }
      if (Array.isArray(addons) && addons.length > 0) {
        localStorage.setItem(STORAGE_KEY_ADDONS, JSON.stringify(addons));
      }
      if (Array.isArray(taxes) && taxes.length > 0) {
        localStorage.setItem(STORAGE_KEY_TAXES, JSON.stringify(taxes));
      }
      if (statusColors) {
        localStorage.setItem(STORAGE_KEY_STATUS_COLORS, JSON.stringify(statusColors));
      }
      window.dispatchEvent(new CustomEvent("pms_rooms_updated"));
      window.dispatchEvent(new CustomEvent("pms_room_types_updated"));
      window.dispatchEvent(new CustomEvent("pms_hotel_info_updated"));
      window.dispatchEvent(new CustomEvent("pms_hotel_profile_updated"));
    }
  } catch (e) {
    console.error("Error auto-syncing Atlas to LocalStorage:", e);
  }
};

// Run auto-sync immediately if window is available
if (typeof window !== "undefined") {
  setTimeout(() => {
    autoSyncAtlasToLocalStorage().catch(() => {});
  }, 300);
}

const DEFAULT_ROOM_TYPES = [];

export function getRoomTypes() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ROOM_TYPES);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Error reading room types:", e);
  }
  return DEFAULT_ROOM_TYPES;
}

export function getHotelProfile() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_HOTEL_INFO);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        return {
          name: parsed.name ?? "",
          website: parsed.website ?? "",
          taxId: parsed.taxId ?? "",
          totalRooms: parsed.totalRooms ?? "",
          contactName: parsed.contactName ?? "",
          currency: parsed.currency || "US Dollar ($)",
          phone: parsed.phone ?? "",
          timeZone: parsed.timeZone || "(GMT-7:00) Pacific Time",
          city: parsed.city ?? "",
          state: parsed.state ?? "",
          country: parsed.country ?? "",
          address: parsed.address ?? "",
          zipcode: parsed.zipcode ?? "",
          rating: Number(parsed.rating) || 0,
          logoUrl: parsed.logoUrl ?? "",
        };
      }
    }
  } catch (e) {
    console.error("Error reading hotel profile:", e);
  }
  return DEFAULT_HOTEL_PROFILE;
}

function normalizeStatusItem(val, defaultObj) {
  if (!val) return { ...defaultObj };
  if (typeof val === "string") return { bg: val, text: "#ffffff" };
  return {
    bg: val.bg || defaultObj.bg,
    text: val.text || defaultObj.text,
  };
}

export function getStatusColors() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_STATUS_COLORS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        return {
          confirmed: normalizeStatusItem(parsed.confirmed, DEFAULT_STATUS_COLORS.confirmed),
          checked_in: normalizeStatusItem(parsed.checked_in, DEFAULT_STATUS_COLORS.checked_in),
          checked_out: normalizeStatusItem(parsed.checked_out, DEFAULT_STATUS_COLORS.checked_out),
          blocked: normalizeStatusItem(parsed.blocked, DEFAULT_STATUS_COLORS.blocked),
        };
      }
    }
  } catch (e) {
    console.error("Error reading status colors:", e);
  }
  return {
    confirmed: { ...DEFAULT_STATUS_COLORS.confirmed },
    checked_in: { ...DEFAULT_STATUS_COLORS.checked_in },
    checked_out: { ...DEFAULT_STATUS_COLORS.checked_out },
    blocked: { ...DEFAULT_STATUS_COLORS.blocked },
  };
}

export function saveStatusColors(colors) {
  try {
    const data = {
      confirmed: normalizeStatusItem(colors?.confirmed, DEFAULT_STATUS_COLORS.confirmed),
      checked_in: normalizeStatusItem(colors?.checked_in, DEFAULT_STATUS_COLORS.checked_in),
      checked_out: normalizeStatusItem(colors?.checked_out, DEFAULT_STATUS_COLORS.checked_out),
      blocked: normalizeStatusItem(colors?.blocked, DEFAULT_STATUS_COLORS.blocked),
    };
    localStorage.setItem(STORAGE_KEY_STATUS_COLORS, JSON.stringify(data));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pms_status_colors_updated", { detail: data }));
    }
    triggerBackendConfigSync();
    return data;
  } catch (e) {
    console.error("Error saving status colors:", e);
    return getStatusColors();
  }
}

export function saveHotelProfile(profile) {
  try {
    const data = profile && typeof profile === "object" ? profile : DEFAULT_HOTEL_PROFILE;
    localStorage.setItem(STORAGE_KEY_HOTEL_INFO, JSON.stringify(data));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pms_hotel_profile_updated", { detail: data }));
    }
    triggerBackendConfigSync();
    return data;
  } catch (e) {
    console.error("Error saving hotel profile:", e);
    return DEFAULT_HOTEL_PROFILE;
  }
}

const DEFAULT_RATE_PLANS = [];

export function getRatePlans() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_RATE_PLANS);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map((p) => {
          let n = Number(p.nights);
          if (!n || isNaN(n)) {
            const nameLower = (p.name || "").toLowerCase();
            const codeLower = (p.code || "").toLowerCase();
            if (nameLower.includes("week") || codeLower === "wr") n = 7;
            else if (nameLower.includes("month") || codeLower === "mr") n = 30;
            else if (nameLower.includes("weekend")) n = 2;
            else n = 1;
          }
          const rateVal = Number(p.adjustment !== undefined && p.adjustment !== "" ? p.adjustment : p.price !== undefined ? p.price : p.rate || 100);
          return {
            ...p,
            nights: n,
            adjustment: String(rateVal),
            rate: rateVal,
            price: rateVal,
          };
        });
      }
    }
  } catch (e) {
    console.error("Error reading rate plans:", e);
  }
  return [];
}

export function saveRatePlans(plans) {
  try {
    const list = Array.isArray(plans) ? plans : [];
    localStorage.setItem(STORAGE_KEY_RATE_PLANS, JSON.stringify(list));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pms_rate_plans_updated", { detail: list }));
    }
    triggerBackendConfigSync();
    return list;
  } catch (e) {
    console.error("Error saving rate plans:", e);
    return [];
  }
}

export const STORAGE_KEY_RESERVATION_SOURCES = "hotelpms_reservation_sources_v3";

const DEFAULT_ADDONS = [];

const DEFAULT_RESERVATION_SOURCES = [
  "Walk-In",
  "Direct Phone",
  "Hotel Website",
  "Booking.com",
  "Expedia",
  "Agoda",
  "Corporate / Travel Agent",
  "Referral",
  "Other"
];

export function getHotelAddons() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ADDONS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Error reading hotel addons:", e);
  }
  return DEFAULT_ADDONS;
}

export function saveHotelAddons(addons) {
  try {
    const list = Array.isArray(addons) ? addons : [];
    localStorage.setItem(STORAGE_KEY_ADDONS, JSON.stringify(list));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pms_addons_updated", { detail: list }));
    }
    triggerBackendConfigSync();
    return list;
  } catch (e) {
    console.error("Error saving hotel addons:", e);
    return [];
  }
}

export function getReservationSources() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_RESERVATION_SOURCES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Error reading reservation sources:", e);
  }
  return DEFAULT_RESERVATION_SOURCES;
}

export function saveReservationSources(sources) {
  try {
    localStorage.setItem(STORAGE_KEY_RESERVATION_SOURCES, JSON.stringify(sources));
    window.dispatchEvent(new CustomEvent("pms_reservation_sources_updated"));
    return true;
  } catch (e) {
    console.error("Error saving reservation sources:", e);
    return false;
  }
}

export const STORAGE_KEY_BUSINESS_SOURCES = "hotelpms_business_sources_v1";

export const DEFAULT_BUSINESS_SOURCES = [
  {
    id: "src_direct",
    segment: "DIRECT",
    subSegments: ["WALK-IN", "PHONE INQUIRY", "WEBSITE", "REPEAT GUEST"]
  },
  {
    id: "src_ota",
    segment: "OTA",
    subSegments: ["EXPEDIA", "BOOKING.COM", "AGODA", "AIRBNB", "MAKE MY TRIP"]
  },
  {
    id: "src_corporate",
    segment: "CORPORATE",
    subSegments: ["COMPANY DIRECT", "CONTRACTED RATE", "EVENT / DELEGATE"]
  },
  {
    id: "src_travel_agent",
    segment: "TRAVEL AGENT",
    subSegments: ["LOCAL AGENT", "WHOLESALER", "TOUR OPERATOR"]
  }
];

export function getBusinessSources() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_BUSINESS_SOURCES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Error reading business sources:", e);
  }
  return DEFAULT_BUSINESS_SOURCES;
}

export function saveBusinessSources(sources) {
  try {
    const list = Array.isArray(sources) ? sources : [];
    localStorage.setItem(STORAGE_KEY_BUSINESS_SOURCES, JSON.stringify(list));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pms_business_sources_updated", { detail: list }));
    }
    triggerBackendConfigSync();
    return list;
  } catch (e) {
    console.error("Error saving business sources:", e);
    return [];
  }
}

export function getTaxRules() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_TAXES);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Error reading tax rules:", e);
  }
  return [];
}

export function saveTaxRules(rules) {
  try {
    const list = Array.isArray(rules) ? rules : [];
    localStorage.setItem(STORAGE_KEY_TAXES, JSON.stringify(list));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pms_taxes_updated", { detail: list }));
    }
    triggerBackendConfigSync();
    return list;
  } catch (e) {
    console.error("Error saving tax rules:", e);
    return [];
  }
}

export function getActiveTaxPercent() {
  const rules = getTaxRules();
  const active = rules.filter((r) => r.status === "Active" || r.status === "active" || r.active !== false);
  if (active.length === 0) return 0;
  const total = active.reduce((sum, r) => sum + (Number(r.percent || r.taxPercent || r.rate) || 0), 0);
  return Math.round(total * 100) / 100;
}

export function getActiveTaxSummaryText() {
  const rules = getTaxRules();
  const active = rules.filter((r) => r.status === "Active" || r.status === "active" || r.active !== false);
  if (active.length === 0) return "No Active Tax (0%)";
  const names = active.map((r) => {
    if (r.taxType === "fixed") {
      const fixedVal = Number(r.fixedAmount || r.amount || 0).toFixed(2);
      const isPerStay = r.fixedCalculation === "per_stay";
      return `${r.name} ($${fixedVal}/${isPerStay ? "stay" : "night"})`;
    }
    return `${r.name} (${r.percent || r.percentage || 0}%)`;
  }).join(" + ");
  return names;
}

export function getTaxInclusiveSetting() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_TAX_INCLUSIVE);
    if (saved !== null) {
      return saved === "true";
    }
  } catch (e) {
    console.error("Error reading tax inclusive setting:", e);
  }
  return false; // Default: Tax Exclusive
}

export function saveTaxInclusiveSetting(isInclusive) {
  try {
    const val = Boolean(isInclusive);
    localStorage.setItem(STORAGE_KEY_TAX_INCLUSIVE, String(val));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pms_tax_inclusive_updated", { detail: val }));
    }
    triggerBackendConfigSync();
    return val;
  } catch (e) {
    console.error("Error saving tax inclusive setting:", e);
    return false;
  }
}

export function getDailyRatesMap() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_DAILY_RATES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch (e) {
    console.error("Error reading daily rates map:", e);
  }
  return {};
}

export function saveDailyRate(key, rateData) {
  try {
    const map = getDailyRatesMap();
    map[key] = rateData;
    localStorage.setItem(STORAGE_KEY_DAILY_RATES, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent("pms_daily_rates_updated"));
    return true;
  } catch (e) {
    console.error("Error saving daily rate:", e);
    return false;
  }
}

export function bulkUpdateDailyRates({ startDate, endDate, daysOfWeek, roomTypes, ratePlans, adjustmentType, fixedPrice, adjustmentVal, minStay, stopSell }) {
  try {
    const map = getDailyRatesMap();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const dayNum = d.getDay();
      
      if (daysOfWeek && daysOfWeek.length > 0 && !daysOfWeek.includes(dayNum)) {
        continue;
      }

      (roomTypes || []).forEach((rt) => {
        (ratePlans || []).forEach((rp) => {
          const key = `${rt}_${rp}_${dateStr}`;
          const existing = map[key] || {};
          let newPrice = Number(existing.price || 0);

          if (adjustmentType === "fixed" && fixedPrice !== undefined && fixedPrice !== "") {
            newPrice = Number(fixedPrice);
          } else if (adjustmentType === "percent" && adjustmentVal !== undefined && adjustmentVal !== "") {
            const current = newPrice > 0 ? newPrice : 150;
            newPrice = Math.max(0, current + (current * Number(adjustmentVal) / 100));
          } else if (adjustmentType === "flat" && adjustmentVal !== undefined && adjustmentVal !== "") {
            const current = newPrice > 0 ? newPrice : 150;
            newPrice = Math.max(0, current + Number(adjustmentVal));
          }

          map[key] = {
            ...existing,
            price: Math.round(newPrice * 100) / 100,
            minStay: minStay !== undefined && minStay !== "" ? Number(minStay) : (existing.minStay || 1),
            stopSell: stopSell !== undefined ? stopSell : (existing.stopSell || false),
          };
        });
      });
    }

    localStorage.setItem(STORAGE_KEY_DAILY_RATES, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent("pms_daily_rates_updated"));
    return true;
  } catch (e) {
    console.error("Error performing bulk rate update:", e);
    return false;
  }
}

export function getCancellationPolicies() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CANCELLATION_POLICIES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Error reading cancellation policies:", e);
  }
  return [];
}

export function saveCancellationPolicies(policies) {
  try {
    localStorage.setItem(STORAGE_KEY_CANCELLATION_POLICIES, JSON.stringify(policies));
    window.dispatchEvent(new CustomEvent("pms_cancellation_policies_updated"));
  } catch (e) {
    console.error("Error saving cancellation policies:", e);
  }
}

export function getHotelTerms() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_HOTEL_TERMS);
    if (saved !== null) return saved;
  } catch (e) {
    console.error("Error reading hotel terms:", e);
  }
  return "";
}

export function saveHotelTerms(terms) {
  try {
    localStorage.setItem(STORAGE_KEY_HOTEL_TERMS, terms);
    window.dispatchEvent(new CustomEvent("pms_terms_updated"));
  } catch (e) {
    console.error("Error saving hotel terms:", e);
  }
}

export function getBusinessDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const today = `${yyyy}-${mm}-${dd}`;

  const yesterday = new Date(d);
  yesterday.setDate(yesterday.getDate() - 1);
  const yyyyPrev = yesterday.getFullYear();
  const mmPrev = String(yesterday.getMonth() + 1).padStart(2, "0");
  const ddPrev = String(yesterday.getDate()).padStart(2, "0");
  const yesterdayISO = `${yyyyPrev}-${mmPrev}-${ddPrev}`;

  try {
    const cfg = getNightAuditConfig();
    const cutoffTimeStr = cfg.nightAuditTime || "06:00";
    const [cutoffHour, cutoffMin] = (cutoffTimeStr || "06:00").split(":").map(Number);

    const currentHour = d.getHours();
    const currentMin = d.getMinutes();
    const isBeforeCutoff = currentHour < (cutoffHour || 6) || (currentHour === cutoffHour && currentMin < (cutoffMin || 0));

    if (isBeforeCutoff) {
      localStorage.setItem(STORAGE_KEY_BUSINESS_DATE, yesterdayISO);
      return yesterdayISO;
    }

    const saved = localStorage.getItem(STORAGE_KEY_BUSINESS_DATE);
    if (saved && saved.length === 10) {
      if (saved > today) {
        localStorage.setItem(STORAGE_KEY_BUSINESS_DATE, today);
        return today;
      }
      return saved;
    }
  } catch (e) {
    console.error("Error reading business date:", e);
  }

  try {
    localStorage.setItem(STORAGE_KEY_BUSINESS_DATE, today);
  } catch {}
  return today;
}

export function advanceBusinessDate() {
  try {
    const current = getBusinessDate();
    const d = new Date(`${current}T00:00:00`);
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const nextDate = `${yyyy}-${mm}-${dd}`;

    localStorage.setItem(STORAGE_KEY_BUSINESS_DATE, nextDate);

    const cfg = getNightAuditConfig();
    cfg.lastAuditCompletedDate = current;
    localStorage.setItem(STORAGE_KEY_NIGHT_AUDIT_CONFIG, JSON.stringify(cfg));

    window.dispatchEvent(new CustomEvent("pms_business_date_updated"));
    return nextDate;
  } catch (e) {
    console.error("Error advancing business date:", e);
    return getBusinessDate();
  }
}

export function getNightAuditConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_NIGHT_AUDIT_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        return {
          nightAuditTime: parsed.nightAuditTime || "06:00",
          autoPrompt: parsed.autoPrompt !== undefined ? Boolean(parsed.autoPrompt) : true,
          lastAuditCompletedDate: parsed.lastAuditCompletedDate || "",
        };
      }
    }
  } catch (e) {
    console.error("Error reading night audit config:", e);
  }
  return {
    nightAuditTime: "06:00",
    autoPrompt: true,
    lastAuditCompletedDate: "",
  };
}

export function saveNightAuditConfig(cfg) {
  try {
    const current = getNightAuditConfig();
    const updated = { ...current, ...cfg };
    localStorage.setItem(STORAGE_KEY_NIGHT_AUDIT_CONFIG, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("pms_night_audit_config_updated"));
    return updated;
  } catch (e) {
    console.error("Error saving night audit config:", e);
    return null;
  }
}

export const DEFAULT_SEQUENCE_CONFIG = {
  booking: { prefix: "BK-", suffix: "", nextNumber: 1001, padding: 5 },
  group: { prefix: "GRP-", suffix: "", nextNumber: 3001, padding: 5 },
  invoice: { prefix: "INV-", suffix: "", nextNumber: 5001, padding: 5 },
  receipt: { prefix: "RCT-", suffix: "", nextNumber: 2001, padding: 5 },
  grc: { prefix: "GRC-", suffix: "", nextNumber: 101, padding: 5 },
  misc: { prefix: "MSC-", suffix: "", nextNumber: 1001, padding: 5 },
};

export function getSequenceConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SEQUENCE_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        return {
          booking: { ...DEFAULT_SEQUENCE_CONFIG.booking, ...(parsed.booking || {}) },
          group: { ...DEFAULT_SEQUENCE_CONFIG.group, ...(parsed.group || {}) },
          invoice: { ...DEFAULT_SEQUENCE_CONFIG.invoice, ...(parsed.invoice || {}) },
          receipt: { ...DEFAULT_SEQUENCE_CONFIG.receipt, ...(parsed.receipt || {}) },
          grc: { ...DEFAULT_SEQUENCE_CONFIG.grc, ...(parsed.grc || {}) },
          misc: { ...DEFAULT_SEQUENCE_CONFIG.misc, ...(parsed.misc || {}) },
        };
      }
    }
  } catch (e) {
    console.error("Error reading sequence config:", e);
  }
  return DEFAULT_SEQUENCE_CONFIG;
}

export function saveSequenceConfig(cfg) {
  try {
    const current = getSequenceConfig();
    const updated = {
      booking: { ...current.booking, ...(cfg.booking || {}) },
      group: { ...current.group, ...(cfg.group || {}) },
      invoice: { ...current.invoice, ...(cfg.invoice || {}) },
      receipt: { ...current.receipt, ...(cfg.receipt || {}) },
      grc: { ...current.grc, ...(cfg.grc || {}) },
      misc: { ...current.misc, ...(cfg.misc || {}) },
    };
    localStorage.setItem(STORAGE_KEY_SEQUENCE_CONFIG, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("pms_sequence_config_updated"));
    return updated;
  } catch (e) {
    console.error("Error saving sequence config:", e);
    return DEFAULT_SEQUENCE_CONFIG;
  }
}

export function formatSequence(prefix = "", nextNum = 1, padding = 5, suffix = "") {
  const numVal = Number(nextNum) || 1;
  const padVal = Math.max(1, Math.min(10, Number(padding) || 1));
  const paddedStr = String(numVal).padStart(padVal, "0");
  return `${prefix || ""}${paddedStr}${suffix || ""}`;
}

export function generateNextSequence(type = "booking", autoIncrement = true) {
  const config = getSequenceConfig();
  const item = config[type] || DEFAULT_SEQUENCE_CONFIG[type] || { prefix: "", suffix: "", nextNumber: 1, padding: 5 };
  const formatted = formatSequence(item.prefix, item.nextNumber, item.padding, item.suffix);

  if (autoIncrement) {
    const updatedNext = (Number(item.nextNumber) || 1) + 1;
    saveSequenceConfig({
      ...config,
      [type]: { ...item, nextNumber: updatedNext },
    });
  }

  return formatted;
}

const STORAGE_KEY_IBE_ROOM_DISPLAY = "hotelpms_ibe_room_displays_v1";

export function getBookingEngineRoomDisplays() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_IBE_ROOM_DISPLAY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch (e) {
    console.error("Error reading booking engine room displays:", e);
  }
  return {};
}

export function saveBookingEngineRoomDisplays(data) {
  try {
    localStorage.setItem(STORAGE_KEY_IBE_ROOM_DISPLAY, JSON.stringify(data || {}));
    window.dispatchEvent(new CustomEvent("pms_ibe_display_updated"));
    return true;
  } catch (e) {
    console.error("Error saving booking engine room displays:", e);
    return false;
  }
}

export const STORAGE_KEY_USERS = "hotelpms_users_v1";

export const DEFAULT_USER_RIGHTS = {
  frontDesk: true,
  rateOverride: false,
  folioPayments: true,
  discountsTaxes: false,
  voidRefund: false,
  housekeeping: true,
  hotelSettings: false,
  manageUsers: false,
  reportsAudit: false,
};

export const ALL_YES_RIGHTS = {
  frontDesk: true,
  rateOverride: true,
  folioPayments: true,
  discountsTaxes: true,
  voidRefund: true,
  housekeeping: true,
  hotelSettings: true,
  manageUsers: true,
  reportsAudit: true,
};

export const USER_RIGHTS_LABELS = [
  { key: "frontDesk", label: "Front Desk & Bookings", desc: "Access reservations, calendar, check-in & check-out" },
  { key: "rateOverride", label: "Override Room Rates", desc: "Modify base prices during walk-in or booking editing" },
  { key: "folioPayments", label: "Folio & Payments", desc: "View folio items, post extra charges & process payments" },
  { key: "discountsTaxes", label: "Discounts & Tax Exemptions", desc: "Apply custom line discounts or tax exempt status" },
  { key: "voidRefund", label: "Void & Refund", desc: "Void line items or issue payment refunds on folios" },
  { key: "housekeeping", label: "Housekeeping", desc: "Manage room statuses (Clean, Dirty, Out of Order)" },
  { key: "hotelSettings", label: "Hotel Settings", desc: "Access room types, tax rules & hotel profile configuration" },
  { key: "manageUsers", label: "Manage Users", desc: "Create, edit, suspend or assign privileges to staff users" },
  { key: "reportsAudit", label: "Reports & Audit Logs", desc: "Access revenue reports, daily night audit & activity logs" },
];

export function getUserRights(user) {
  if (!user) return { ...DEFAULT_USER_RIGHTS };
  if (user.role === "Manager" || user.role === "System Admin" || user.username === "admin") {
    return user.rights ? { ...ALL_YES_RIGHTS, ...user.rights } : { ...ALL_YES_RIGHTS };
  }
  return user.rights ? { ...DEFAULT_USER_RIGHTS, ...user.rights } : { ...DEFAULT_USER_RIGHTS };
}

const DEFAULT_USERS = [
  {
    id: "usr_admin",
    username: "admin",
    password: "admin",
    name: "System Administrator",
    email: "admin@hotelpms.com",
    role: "System Admin",
    status: "Active",
    rights: { ...ALL_YES_RIGHTS }
  }
];

export function getUsers() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_USERS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasAdmin = parsed.some((u) => u.username?.toLowerCase() === "admin");
        return hasAdmin ? parsed : [...DEFAULT_USERS, ...parsed];
      }
    }
  } catch (e) {
    console.error("Error reading PMS users:", e);
  }
  return DEFAULT_USERS;
}

export function saveUsers(usersList) {
  try {
    const list = Array.isArray(usersList) ? usersList : DEFAULT_USERS;
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("pms_users_updated"));
    triggerBackendConfigSync();
    return list;
  } catch (e) {
    console.error("Error saving PMS users:", e);
    return DEFAULT_USERS;
  }
}

export const STORAGE_KEY_YIELD_RULES = "hotelpms_yield_rules_v1";
export const STORAGE_KEY_YIELD_STATUS = "hotelpms_yield_status_v1";

const DEFAULT_YIELD_RULES = [];

export function getYieldManagementStatus() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_YIELD_STATUS);
    if (saved !== null) {
      return saved === "true";
    }
  } catch (e) {
    console.error("Error reading yield status:", e);
  }
  return true;
}

export function setYieldManagementStatus(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY_YIELD_STATUS, String(Boolean(enabled)));
    window.dispatchEvent(new CustomEvent("pms_yield_status_updated", { detail: Boolean(enabled) }));
    return Boolean(enabled);
  } catch (e) {
    console.error("Error saving yield status:", e);
    return true;
  }
}

export function getYieldRules() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_YIELD_RULES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Error reading yield rules:", e);
  }
  return DEFAULT_YIELD_RULES;
}

export function saveYieldRules(rulesList) {
  try {
    const list = Array.isArray(rulesList) ? rulesList : DEFAULT_YIELD_RULES;
    localStorage.setItem(STORAGE_KEY_YIELD_RULES, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("pms_yield_rules_updated"));
    return list;
  } catch (e) {
    console.error("Error saving yield rules:", e);
    return DEFAULT_YIELD_RULES;
  }
}

export function calculateYieldPrice(basePrice, occupancyPercent = 50, roomTypeId = null) {
  const base = Number(basePrice || 100);
  const isEnabled = getYieldManagementStatus();

  if (!isEnabled) {
    return { adjustedPrice: base, ruleApplied: null, adjustmentText: "Base Rate (Yield Disabled)" };
  }

  const rules = getYieldRules();
  const occ = Math.max(0, Math.min(100, Number(occupancyPercent || 0)));

  const matchedRule = rules.find((r) => {
    if (r.status !== "Active") return false;
    if (r.appliesTo && r.appliesTo !== "All" && roomTypeId && r.appliesTo !== roomTypeId) return false;
    const min = Number(r.minOccupancy || 0);
    const max = Number(r.maxOccupancy || 100);
    return occ >= min && occ <= max;
  });

  if (!matchedRule) {
    return { adjustedPrice: base, ruleApplied: null, adjustmentText: "Standard Base Tariff" };
  }

  let finalPrice = base;
  let text = "Standard Rate";
  const val = Number(matchedRule.adjustmentValue || 0);

  if (matchedRule.adjustmentType === "percentage") {
    finalPrice = Math.round(base * (1 + val / 100));
    text = val >= 0 ? `⚡ Surge (+${val}%)` : `🏷️ Discount (${val}%)`;
  } else if (matchedRule.adjustmentType === "fixed") {
    finalPrice = Math.max(1, base + val);
    text = val >= 0 ? `⚡ Surge (+$${val})` : `🏷️ Discount (-$${Math.abs(val)})`;
  } else if (matchedRule.adjustmentType === "flat") {
    finalPrice = Math.max(1, val);
    text = `🎯 Tier Flat Rate ($${val})`;
  }

  return {
    adjustedPrice: finalPrice,
    ruleApplied: matchedRule,
    adjustmentText: text,
  };
}
