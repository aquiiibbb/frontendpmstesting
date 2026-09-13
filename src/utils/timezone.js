// USA Timezone Helper Service for Hotel PMS

const STORAGE_KEY_TZ = "hotelpms_usa_timezone_v1";

export const USA_TIMEZONES = [
  { id: "America/New_York", name: "🇺🇸 EST / EDT (Eastern Time - New York, Miami)", code: "EST" },
  { id: "America/Chicago", name: "🇺🇸 CST / CDT (Central Time - Chicago, Dallas)", code: "CST" },
  { id: "America/Denver", name: "🇺🇸 MST / MDT (Mountain Time - Denver, Phoenix)", code: "MST" },
  { id: "America/Los_Angeles", name: "🇺🇸 PST / PDT (Pacific Time - Los Angeles, SF)", code: "PST" },
];

export function getUSATimeZone() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_TZ);
    return saved || "America/New_York"; // Default to Eastern Time (New York / Miami)
  } catch {
    return "America/New_York";
  }
}

export function setUSATimeZone(tz) {
  try {
    localStorage.setItem(STORAGE_KEY_TZ, tz);
  } catch (err) {
    console.error("Could not save USA timezone", err);
  }
}

// Returns today's date formatted as YYYY-MM-DD in the active USA Timezone
export function getUSATodayISO(tz = getUSATimeZone()) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find((p) => p.type === "year").value;
  const month = parts.find((p) => p.type === "month").value;
  const day = parts.find((p) => p.type === "day").value;
  return `${year}-${month}-${day}`;
}

// Returns current timestamp in USA Timezone format
export function getUSANowISO(tz = getUSATimeZone()) {
  const now = new Date();
  return now.toLocaleString("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

// Formats date or timestamp string in USA format (MM/DD/YYYY, h:mm AM/PM)
export function formatUSADateTime(dateVal, tz = getUSATimeZone()) {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleString("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatUSADate(dateVal, tz = getUSATimeZone()) {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString("en-US", {
    timeZone: tz,
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });
}
