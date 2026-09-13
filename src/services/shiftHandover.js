// Shift Handover & Cash Register Drawer Service

const ACTIVE_SHIFT_KEY = "pms_active_shift";
const PAST_SHIFTS_KEY = "pms_past_shift_handovers";

const DEFAULT_SHIFT = {
  id: "shift-init-101",
  shiftName: "Morning Shift (07:00 - 15:00)",
  staffName: "Rohit Sharma",
  staffRole: "Front Desk Manager",
  startTime: new Date().toISOString(),
  openingFloat: 200, // starting cash in drawer
  status: "active",
};

const INITIAL_PAST_SHIFTS = [
  {
    id: "shift-past-099",
    shiftName: "Night Shift (23:00 - 07:00)",
    staffName: "Ankit Verma",
    staffRole: "Night Auditor",
    startTime: new Date(Date.now() - 3600000 * 16).toISOString(),
    endTime: new Date(Date.now() - 3600000 * 8).toISOString(),
    openingFloat: 200,
    cashCollected: 450,
    cardCollected: 1200,
    onlineCollected: 650,
    cityLedgerCollected: 300,
    expectedCash: 650, // 200 + 450
    actualCashCounted: 650,
    variance: 0,
    varianceStatus: "Balanced",
    handoverNotes: "Smooth night audit. All room keys accounted for. VIP Room 204 arriving at 10:00 AM.",
    closedBy: "Ankit Verma",
  },
];

export function getActiveShift() {
  try {
    const saved = localStorage.getItem(ACTIVE_SHIFT_KEY);
    if (!saved) {
      localStorage.setItem(ACTIVE_SHIFT_KEY, JSON.stringify(DEFAULT_SHIFT));
      return DEFAULT_SHIFT;
    }
    return JSON.parse(saved);
  } catch (err) {
    return DEFAULT_SHIFT;
  }
}

export function saveActiveShift(shiftData) {
  try {
    localStorage.setItem(ACTIVE_SHIFT_KEY, JSON.stringify(shiftData));
  } catch (err) {
    console.error("Failed to save active shift", err);
  }
}

export function getPastShiftHandovers() {
  try {
    const saved = localStorage.getItem(PAST_SHIFTS_KEY);
    if (!saved) {
      localStorage.setItem(PAST_SHIFTS_KEY, JSON.stringify(INITIAL_PAST_SHIFTS));
      return INITIAL_PAST_SHIFTS;
    }
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) return parsed;
  } catch (err) {
    return INITIAL_PAST_SHIFTS;
  }
  return INITIAL_PAST_SHIFTS;
}

export function closeShiftAndHandover(closeRecord, nextShiftInfo) {
  try {
    const past = getPastShiftHandovers();
    const updatedPast = [closeRecord, ...past];
    localStorage.setItem(PAST_SHIFTS_KEY, JSON.stringify(updatedPast));

    // Start next shift
    const nextShift = {
      id: `shift-${Date.now()}`,
      shiftName: nextShiftInfo.nextShiftName || "Evening Shift (15:00 - 23:00)",
      staffName: nextShiftInfo.nextStaffName || "Priya Singh",
      staffRole: "Front Desk Executive",
      startTime: new Date().toISOString(),
      openingFloat: Number(closeRecord.actualCashCounted || 200),
      status: "active",
    };

    saveActiveShift(nextShift);
    return { pastHandovers: updatedPast, activeShift: nextShift };
  } catch (err) {
    console.error("Error closing shift", err);
    throw err;
  }
}
