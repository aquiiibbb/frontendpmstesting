import { useEffect, useMemo, useState } from "react";
import "./wailking.css";
import "./createReservation.css";
import "../../components/folioModal.css";

import AIIDScannerModal from "../../components/AIIDScannerModal";
import AddCompanyModal from "../../components/AddCompanyModal";
import CustomDatePicker from "../../components/CustomDatePicker";
import { getCompanyAccounts } from "../../services/companyAccounts";
import { checkGuestFlag } from "../../services/flaggedGuests";
import { saveCardForGuest } from "../../services/guestCards";
import {
  getRatePlans,
  getTaxRules,
  getDailyRatesMap,
  getActiveTaxPercent,
  generateNextSequence,
  getBusinessDate,
  getHotelAddons,
  getTaxInclusiveSetting,
  getBusinessSources
} from "../../services/hotelConfig";

export const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
  "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
  "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
  "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

export const US_CITIES_BY_STATE = {
  "Alabama": ["Birmingham", "Montgomery", "Mobile", "Huntsville", "Tuscaloosa"],
  "Alaska": ["Anchorage", "Fairbanks", "Juneau", "Sitka", "Ketchikan"],
  "Arizona": ["Phoenix", "Tucson", "Mesa", "Chandler", "Scottsdale", "Glendale", "Tempe"],
  "Arkansas": ["Little Rock", "Fort Smith", "Fayetteville", "Springdale", "Jonesboro"],
  "California": ["Los Angeles", "San Diego", "San Jose", "San Francisco", "Fresno", "Sacramento", "Long Beach", "Oakland", "Bakersfield", "Anaheim"],
  "Colorado": ["Denver", "Colorado Springs", "Aurora", "Fort Collins", "Lakewood", "Thornton", "Arvada"],
  "Connecticut": ["Bridgeport", "Stamford", "New Haven", "Hartford", "Waterbury", "Norwalk"],
  "Delaware": ["Wilmington", "Dover", "Newark", "Middletown", "Smyrna"],
  "Florida": ["Jacksonville", "Miami", "Tampa", "Orlando", "St. Petersburg", "Hialeah", "Port St. Lucie", "Cape Coral", "Tallahassee"],
  "Georgia": ["Atlanta", "Augusta", "Columbus", "Macon", "Savannah", "Athens", "Sandy Springs"],
  "Hawaii": ["Honolulu", "Hilo", "Kailua", "Kapolei", "Kaneohe"],
  "Idaho": ["Boise", "Meridian", "Nampa", "Idaho Falls", "Caldwell", "Pocatello"],
  "Illinois": ["Chicago", "Aurora", "Joliet", "Naperville", "Rockford", "Elgin", "Springfield"],
  "Indiana": ["Indianapolis", "Fort Wayne", "Evansville", "South Bend", "Carmel", "Fishers"],
  "Iowa": ["Des Moines", "Cedar Rapids", "Davenport", "Sioux City", "Iowa City"],
  "Kansas": ["Wichita", "Overland Park", "Kansas City", "Olathe", "Topeka"],
  "Kentucky": ["Louisville", "Lexington", "Bowling Green", "Owensboro", "Covington"],
  "Louisiana": ["New Orleans", "Baton Rouge", "Shreveport", "Metairie", "Lafayette"],
  "Maine": ["Portland", "Lewiston", "Bangor", "South Portland", "Auburn"],
  "Maryland": ["Baltimore", "Columbia", "Germantown", "Silver Spring", "Waldorf", "Annapolis"],
  "Massachusetts": ["Boston", "Worcester", "Springfield", "Cambridge", "Lowell", "Brockton"],
  "Michigan": ["Detroit", "Grand Rapids", "Warren", "Sterling Heights", "Lansing", "Ann Arbor"],
  "Minnesota": ["Minneapolis", "St. Paul", "Rochester", "Duluth", "Bloomington", "Brooklyn Park"],
  "Mississippi": ["Jackson", "Gulfport", "Southaven", "Biloxi", "Hattiesburg"],
  "Missouri": ["Kansas City", "St. Louis", "Springfield", "Columbia", "Independence"],
  "Montana": ["Billings", "Missoula", "Great Falls", "Bozeman", "Butte"],
  "Nebraska": ["Omaha", "Lincoln", "Bellevue", "Grand Island", "Kearney"],
  "Nevada": ["Las Vegas", "Henderson", "Reno", "North Las Vegas", "Sparks"],
  "New Hampshire": ["Manchester", "Nashua", "Concord", "Dover", "Rochester"],
  "New Jersey": ["Newark", "Jersey City", "Paterson", "Elizabeth", "Lakewood", "Edison"],
  "New Mexico": ["Albuquerque", "Las Cruces", "Rio Rancho", "Santa Fe", "Roswell"],
  "New York": ["New York City", "Buffalo", "Rochester", "Yonkers", "Syracuse", "Albany"],
  "North Carolina": ["Charlotte", "Raleigh", "Greensboro", "Durham", "Winston-Salem", "Fayetteville"],
  "North Dakota": ["Fargo", "Bismarck", "Grand Forks", "Minot", "West Fargo"],
  "Ohio": ["Columbus", "Cleveland", "Cincinnati", "Toledo", "Akron", "Dayton"],
  "Oklahoma": ["Oklahoma City", "Tulsa", "Norman", "Broken Arrow", "Lawton"],
  "Oregon": ["Portland", "Salem", "Eugene", "Gresham", "Hillsboro", "Bend"],
  "Pennsylvania": ["Philadelphia", "Pittsburgh", "Allentown", "Reading", "Erie", "Scranton"],
  "Rhode Island": ["Providence", "Cranston", "Warwick", "Pawtucket", "East Providence"],
  "South Carolina": ["Charleston", "Columbia", "North Charleston", "Mount Pleasant", "Rock Hill", "Greenville"],
  "South Dakota": ["Sioux Falls", "Rapid City", "Aberdeen", "Brookings", "Watertown"],
  "Tennessee": ["Nashville", "Memphis", "Knoxville", "Chattanooga", "Clarksville", "Murfreesboro"],
  "Texas": ["Houston", "San Antonio", "Dallas", "Austin", "Fort Worth", "El Paso", "Arlington", "Corpus Christi", "Plano", "Lubbock"],
  "Utah": ["Salt Lake City", "West Valley City", "Provo", "West Jordan", "Orem", "Sandy"],
  "Vermont": ["Burlington", "South Burlington", "Rutland", "Barre", "Montpelier"],
  "Virginia": ["Virginia Beach", "Chesapeake", "Norfolk", "Richmond", "Newport News", "Alexandria"],
  "Washington": ["Seattle", "Spokane", "Tacoma", "Vancouver", "Bellevue", "Kent"],
  "West Virginia": ["Charleston", "Huntington", "Morgantown", "Parkersburg", "Wheeling"],
  "Wisconsin": ["Milwaukee", "Madison", "Green Bay", "Kenosha", "Racine", "Appleton"],
  "Wyoming": ["Cheyenne", "Casper", "Gillette", "Laramie", "Rock Springs"]
};

export const COUNTRY_CODES = [
  { code: "+1", country: "US/CA" },
  { code: "+91", country: "IN" },
  { code: "+44", country: "UK" },
  { code: "+61", country: "AU" },
  { code: "+49", country: "DE" },
  { code: "+33", country: "FR" },
  { code: "+81", country: "JP" },
  { code: "+86", country: "CN" },
  { code: "+971", country: "UAE" }
];

function todayISO() {
  return getBusinessDate();
}

function parseISOToLocalDate(isoStr) {
  if (!isoStr) return new Date();
  const str = String(isoStr).trim();
  const parts = str.substring(0, 10).split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d, 0, 0, 0, 0);
    }
  }
  return new Date(str);
}

function formatDateToISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addOneDay(iso) {
  const d = parseISOToLocalDate(iso);
  d.setDate(d.getDate() + 1);
  return formatDateToISO(d);
}

function nightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 1;
  const start = parseISOToLocalDate(checkIn);
  const end = parseISOToLocalDate(checkOut);
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 1;
}

const GUEST_COLORS = ["#3D6FD6", "#2E9E6D", "#C47A1F", "#8A4FD6", "#CF4444"];

function buildInitialState(initialRoomNo, initialDate, initialCheckOut, initialBooking, rooms = [], roomTypes = []) {
  if (initialBooking) {
    const bookedRoom = (rooms || []).find((r) => r.no === initialBooking.room);
    return {
      fullName: initialBooking.guest || "",
      countryCode: "+1",
      phoneNumber: initialBooking.phone || "",
      email: initialBooking.email || "",
      nationality: initialBooking.nationality || "USA",
      country: initialBooking.country || "USA",
      state: initialBooking.state || "California",
      city: initialBooking.city || "Los Angeles",
      idProofType: initialBooking.idType || "US Driver's License",
      idProofNumber: initialBooking.idNumber || "",
      address: initialBooking.address || "",
      checkInDate: initialBooking.checkIn || todayISO(),
      checkInTime: initialBooking.checkInTime || "14:00",
      checkOutDate: initialBooking.checkOut || addOneDay(initialBooking.checkIn || todayISO()),
      checkOutTime: initialBooking.checkOutTime || "11:00",
      adults: String(initialBooking.adults ?? 2),
      children: String(initialBooking.children ?? 0),
      infants: String(initialBooking.infants ?? 0),
      roomType: initialBooking.roomType || bookedRoom?.type || (roomTypes[0]?.name || ""),
      roomNumber: initialBooking.room || "",
      paymentMethod: initialBooking.paymentMethod || "Card",
      advanceAmount: initialBooking.advanceAmount != null ? String(initialBooking.advanceAmount) : "",
      taxPercent: initialBooking.taxPercent != null ? String(initialBooking.taxPercent) : "12",
      extraCharges: initialBooking.extraCharges != null ? String(initialBooking.extraCharges) : "0",
      notes: initialBooking.notes || "",
      zip: initialBooking.zip || "",
      companyName: initialBooking.companyName || "",
      gstNumber: initialBooking.gstNumber || "",
      cardName: initialBooking.cardName || initialBooking.guest || "",
      cardNumber: initialBooking.cardNumber || "",
      cardExpiry: initialBooking.cardExpiry || "",
      cardCvv: initialBooking.cardCvv || "",
      vehicleMakeModel: initialBooking.vehicleMakeModel || initialBooking.vehicle || "",
      vehiclePlate: initialBooking.vehiclePlate || initialBooking.vehiclePlateNumber || "",
      vehicleColor: initialBooking.vehicleColor || "",
      ratePlan: initialBooking.ratePlan || "Standard Plan",
      source: initialBooking.source || "Walk-In",
      segment: initialBooking.segment || "DIRECT",
      subSegment: initialBooking.subSegment || "WALK-IN",
      discountType: initialBooking.discountType || "USD",
      discountValue: initialBooking.discountValue || "",
      couponCode: initialBooking.couponCode || "",
      remark: initialBooking.remark || "",
    };
  }
  const presetRoom = initialRoomNo ? (rooms || []).find((r) => r.no === initialRoomNo) : null;
  const checkIn = initialDate || todayISO();
  let checkOut = initialCheckOut || addOneDay(checkIn);
  if (checkOut <= checkIn) {
    checkOut = addOneDay(checkIn);
  }
  return {
    fullName: "",
    countryCode: "",
    phoneNumber: "",
    email: "",
    nationality: "USA",
    country: "USA",
    state: "California",
    city: "Los Angeles",
    idProofType: "US Driver's License",
    idProofNumber: "",
    address: "",
    vehicleMakeModel: "",
    vehiclePlate: "",
    vehicleColor: "",
    checkInDate: checkIn,
    checkInTime: "14:00",
    checkOutDate: checkOut,
    checkOutTime: "11:00",
    adults: "2",
    children: "0",
    infants: "0",
    roomType: presetRoom ? presetRoom.type : (roomTypes[0]?.name || ""),
    roomNumber: presetRoom ? presetRoom.no : (initialRoomNo || ""),
    paymentMethod: "Card",
    companyAccountId: "",
    cardName: "",
    cardNumber: "",
    cardExpiry: "",
    cardCvv: "",
    advanceAmount: "",
    taxPercent: String(getActiveTaxPercent() || "12"),
    extraCharges: "0",
    notes: "",
    zip: "",
    companyName: "",
    gstNumber: "",
    ratePlan: getRatePlans()[0]?.name || "Daily Rate",
    source: "Walk-In",
    segment: "DIRECT",
    subSegment: "WALK-IN",
    discountType: "USD",
    discountValue: "",
    couponCode: "",
    remark: "",
  };
}

export default function WalkinGuest({
  embedded = false,
  initialRoomNo = "",
  initialDate = "",
  initialCheckOut = "",
  initialBooking = null,
  existingBookings = [],
  rooms = [],
  roomTypes = [],
  onSubmit,
  onCancel,
}) {
  const isEditing = Boolean(initialBooking);
  const [formData, setFormData] = useState(() =>
    buildInitialState(initialRoomNo, initialDate, initialCheckOut, initialBooking, rooms, roomTypes)
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [taxExempt, setTaxExempt] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState(initialBooking?.selectedAddons || []);
  const [collectPayment, setCollectPayment] = useState(false);
  const [showDaySplit, setShowDaySplit] = useState(false);
  const [rateTouched, setRateTouched] = useState(false);
  const [rateOverride, setRateOverride] = useState(false);
  const [activeInput, setActiveInput] = useState(null);
  const [totalExTaxInput, setTotalExTaxInput] = useState("");
  const [totalWithTaxInput, setTotalWithTaxInput] = useState("");
  const [showAIScanner, setShowAIScanner] = useState(false);
  const [companyAccounts, setCompanyAccounts] = useState(() => getCompanyAccounts());
  const [showAdditionalGuests, setShowAdditionalGuests] = useState(() => Boolean(initialBooking?.hasAdditionalGuests || (initialBooking?.additionalGuests && initialBooking.additionalGuests.length > 0)));
  const [additionalGuests, setAdditionalGuests] = useState(() => {
    if (initialBooking?.additionalGuests && Array.isArray(initialBooking.additionalGuests) && initialBooking.additionalGuests.length > 0) {
      return initialBooking.additionalGuests;
    }
    return [{ fullName: "", phone: "", idType: "US Driver's License", idNumber: "" }];
  });
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [flaggedAlert, setFlaggedAlert] = useState(null);
  const [overrideFlag, setOverrideFlag] = useState(false);
  const [showGuestSuggestions, setShowGuestSuggestions] = useState(false);

  const [availableRatePlans, setAvailableRatePlans] = useState(() => getRatePlans());
  const [availableTaxRules, setAvailableTaxRules] = useState(() => getTaxRules());
  const [dailyRatesMap, setDailyRatesMap] = useState(() => getDailyRatesMap());
  const [businessSources, setBusinessSources] = useState(() => getBusinessSources());

  useEffect(() => {
    function handleSync() {
      setDailyRatesMap(getDailyRatesMap());
      setAvailableRatePlans(getRatePlans());
      setAvailableTaxRules(getTaxRules());
      setBusinessSources(getBusinessSources());
    }
    window.addEventListener("pms_daily_rates_updated", handleSync);
    window.addEventListener("pms_rate_plans_updated", handleSync);
    window.addEventListener("pms_business_sources_updated", handleSync);
    return () => {
      window.removeEventListener("pms_daily_rates_updated", handleSync);
      window.removeEventListener("pms_rate_plans_updated", handleSync);
      window.removeEventListener("pms_business_sources_updated", handleSync);
    };
  }, []);

  const currentBusinessSource = useMemo(() => {
    return (
      businessSources.find(
        (b) => b.segment.toUpperCase() === (formData.segment || "").toUpperCase()
      ) || businessSources[0]
    );
  }, [businessSources, formData.segment]);

  const availableSubSegments = useMemo(() => {
    return currentBusinessSource?.subSegments || ["WALK-IN"];
  }, [currentBusinessSource]);

  useEffect(() => {
    if (formData.roomNumber && formData.roomNumber !== "Unassigned") {
      const conflict = (existingBookings || []).some(
        (b) =>
          b.room === formData.roomNumber &&
          b.id !== initialBooking?.id &&
          b.status !== "cancelled" &&
          formData.checkInDate < b.checkOut &&
          formData.checkOutDate > b.checkIn
      );
      if (conflict) {
        setFormData((prev) => ({ ...prev, roomNumber: "Unassigned" }));
        setError(`Room ${formData.roomNumber} is unavailable for selected dates. Switched to Unassigned.`);
      }
    }
  }, [formData.roomNumber, formData.checkInDate, formData.checkOutDate, existingBookings, initialBooking]);

  const pastGuestsList = useMemo(() => {
    const list = [];
    const seen = new Set();

    const addGuest = (b) => {
      if (!b) return;
      const name = b.fullName || b.guest || b.name || "";
      if (!name || name.trim().length < 2) return;
      const phone = b.phone || b.phoneNumber || "";
      const key = `${name.trim().toLowerCase()}_${phone.trim()}`;
      if (seen.has(key)) return;
      seen.add(key);

      list.push({
        fullName: name.trim(),
        phone: phone.trim(),
        email: b.email || "",
        address: b.address || "",
        city: b.city || "",
        zipCode: b.zip || b.zipCode || "",
        idType: b.idType || b.idProofType || "US Driver's License",
        idNumber: b.idNumber || b.idProofNumber || "",
        nationality: b.nationality || "USA",
        companyName: b.companyName || "",
        gstNumber: b.gstNumber || ""
      });
    };

    (existingBookings || []).forEach(addGuest);

    try {
      const localB = JSON.parse(localStorage.getItem("pms_bookings") || "[]");
      localB.forEach(addGuest);
      const localP = JSON.parse(localStorage.getItem("pms_guest_profiles") || "[]");
      localP.forEach(addGuest);
    } catch (err) {}

    return list;
  }, [existingBookings]);

  const filteredGuestSuggestions = useMemo(() => {
    const q = (formData.fullName || "").trim().toLowerCase();
    if (!q || q.length < 1) return [];
    return pastGuestsList.filter(
      (g) =>
        g.fullName.toLowerCase().includes(q) ||
        (g.phone && g.phone.includes(q)) ||
        (g.email && g.email.toLowerCase().includes(q))
    );
  }, [formData.fullName, pastGuestsList]);

  const handleSelectPastGuest = (guest) => {
    setFormData((prev) => ({
      ...prev,
      fullName: guest.fullName || "",
      phoneNumber: guest.phone || guest.phoneNumber || "",
      email: guest.email || "",
      address: guest.address || "",
      city: guest.city || "",
      zip: guest.zipCode || guest.zip || "",
      idProofType: guest.idType || "US Driver's License",
      idProofNumber: guest.idNumber || "",
      nationality: guest.nationality || prev.nationality,
      companyName: guest.companyName || prev.companyName,
      gstNumber: guest.gstNumber || prev.gstNumber,
    }));
    setShowGuestSuggestions(false);
  };

  useEffect(() => {
    if (formData.fullName && formData.fullName.length >= 3 && !overrideFlag) {
      const matched = checkGuestFlag(formData.fullName, formData.phoneNumber, formData.email);
      if (matched) {
        setFlaggedAlert(matched);
      } else {
        setFlaggedAlert(null);
      }
    } else if (!formData.fullName) {
      setFlaggedAlert(null);
      setOverrideFlag(false);
    }
  }, [formData.fullName, formData.phoneNumber, formData.email, overrideFlag]);

  const [isComplimentary, setIsComplimentary] = useState(Boolean(initialBooking?.isComplimentary));
  const [perNightRate, setPerNightRate] = useState(() => {
    if (initialBooking?.isComplimentary) return "0";
    if (initialBooking?.ratePerNight != null) return String(initialBooking.ratePerNight);
    const preset = initialRoomNo ? rooms.find((r) => r.no === initialRoomNo) : null;
    const type = roomTypes.find((t) => t.name === (initialBooking?.roomType || preset?.type));
    return type ? String(type.price) : "0";
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setError("");
    setSuccess("");
    if (name === "fullName" || name === "phoneNumber" || name === "email") {
      setOverrideFlag(false);
    }
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "roomType") {
        const stillValid = rooms.some((r) => r.no === prev.roomNumber && r.type === value);
        if (!stillValid) next.roomNumber = "";
      }

      if (name === "ratePlan" || name === "checkInDate") {
        const targetRatePlanName = name === "ratePlan" ? value : next.ratePlan;
        const targetCheckInDate = name === "checkInDate" ? value : next.checkInDate;
        const matchedPlan = availableRatePlans.find((p) => p.name === targetRatePlanName);
        let planNights = Number(matchedPlan?.nights);
        if (!planNights || isNaN(planNights)) {
          const nameLower = (targetRatePlanName || "").toLowerCase();
          if (nameLower.includes("week") || matchedPlan?.code === "WR") planNights = 7;
          else if (nameLower.includes("month") || matchedPlan?.code === "MR") planNights = 30;
          else if (nameLower.includes("weekend")) planNights = 2;
          else planNights = 1;
        }

        const inD = parseISOToLocalDate(targetCheckInDate || todayISO());
        const outD = new Date(inD);
        outD.setDate(outD.getDate() + planNights);

        const yyyy = outD.getFullYear();
        const mm = String(outD.getMonth() + 1).padStart(2, "0");
        const dd = String(outD.getDate()).padStart(2, "0");
        next.checkOutDate = `${yyyy}-${mm}-${dd}`;
      }
      return next;
    });
  };

  const handleReset = () => {
    setFormData(buildInitialState(initialRoomNo, initialDate, initialCheckOut, initialBooking, rooms, roomTypes));
    setError("");
    setSuccess("");
  };

  const roomsOfType = useMemo(() => {
    const list = rooms.filter((r) => r.type === formData.roomType);
    const inDate = formData.checkInDate;
    const outDate = formData.checkOutDate;
    const currentId = initialBooking?.id;

    if (!inDate || !outDate) return list;

    return list.filter((r) => {
      const rNo = String(r.no || r.number || "").trim();
      const hasConflict = (existingBookings || []).some((b) => {
        if (!b || b.id === currentId || b.status === "cancelled") return false;
        const bRoom = String(b.room || b.roomNumber || "").trim();
        if (bRoom !== rNo) return false;
        return b.checkIn < outDate && b.checkOut > inDate;
      });
      return !hasConflict;
    });
  }, [rooms, formData.roomType, formData.checkInDate, formData.checkOutDate, existingBookings, initialBooking]);

  const selectedRoomType = useMemo(
    () => roomTypes.find((t) => t.name === formData.roomType),
    [formData.roomType, roomTypes]
  );

  useEffect(() => {
    if (!rateTouched && selectedRoomType) {
      setPerNightRate(String(selectedRoomType.price));
    }
  }, [formData.roomType, selectedRoomType, rateTouched]);

  const nights = Math.max(1, nightsBetween(formData.checkInDate, formData.checkOutDate));

  const selectedRatePlanObj = availableRatePlans.find(
    (p) => (p.name || "").toLowerCase().trim() === (formData.ratePlan || "").toLowerCase().trim()
  ) || availableRatePlans[0];
  const planNights = Math.max(1, Number(selectedRatePlanObj?.nights) || 1);
  const planAdjustment = Number(
    selectedRatePlanObj?.adjustment !== undefined && selectedRatePlanObj?.adjustment !== ""
      ? selectedRatePlanObj.adjustment
      : selectedRatePlanObj?.price !== undefined
      ? selectedRatePlanObj.price
      : selectedRatePlanObj?.rate || 100
  );
  const perNightAdjustment = planAdjustment / planNights;

  function getMatrixPrice(roomType, ratePlanName, ratePlanObj, dateStr) {
    if (!roomType || !dateStr) return null;
    const k1 = `${roomType}_${ratePlanName}_${dateStr}`;
    if (dailyRatesMap[k1]?.price !== undefined) return Number(dailyRatesMap[k1].price);

    if (ratePlanObj?.name) {
      const k2 = `${roomType}_${ratePlanObj.name}_${dateStr}`;
      if (dailyRatesMap[k2]?.price !== undefined) return Number(dailyRatesMap[k2].price);
    }
    if (ratePlanObj?.code) {
      const k3 = `${roomType}_${ratePlanObj.code}_${dateStr}`;
      if (dailyRatesMap[k3]?.price !== undefined) return Number(dailyRatesMap[k3].price);
    }

    const keys = Object.keys(dailyRatesMap);
    const targetRpLow = (ratePlanName || "").toLowerCase();

    const matchedKey = keys.find((k) => {
      const parts = k.split("_");
      if (parts.length < 3) return false;
      const [rt, rp, dt] = parts;
      if (rt !== roomType || dt !== dateStr) return false;

      const rpLow = rp.toLowerCase();
      if (targetRpLow.includes("standard") && (rpLow.includes("standard") || rpLow.includes("sta") || rpLow.includes("ep"))) return true;
      if (targetRpLow.includes("week") && rpLow.includes("week")) return true;
      if (targetRpLow.includes("month") && rpLow.includes("month")) return true;
      return rpLow === targetRpLow;
    });

    if (matchedKey && dailyRatesMap[matchedKey]?.price !== undefined) {
      return Number(dailyRatesMap[matchedKey].price);
    }

    return null;
  }

  const stayDailyRates = useMemo(() => {
    if (isComplimentary) return Array(nights).fill(0);

    const rates = [];
    const start = parseISOToLocalDate(formData.checkInDate || todayISO());
    const defaultFallbackRate = perNightAdjustment > 0 ? perNightAdjustment : Math.max(0, Number(selectedRoomType?.price || 0));

    const defaultAdults = Math.max(Number(selectedRoomType?.maxAdults || 0), Number(selectedRoomType?.defaultAdults || 0), 1);
    const adultsCount = Number(formData.adults) || 1;
    const extraAdultsCount = Math.max(0, adultsCount - defaultAdults);
    const extraAdultRate = Number(selectedRoomType?.extraPersonRate || selectedRoomType?.extraAdultPrice || selectedRoomType?.extraAdultRate || 0);
    const extraAdultChargePerNight = extraAdultsCount * extraAdultRate;

    for (let i = 0; i < nights; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const matrixPrice = getMatrixPrice(formData.roomType, formData.ratePlan, selectedRatePlanObj, dateStr);

      let baseNightPrice = defaultFallbackRate;
      if ((rateOverride || rateTouched) && perNightRate !== "" && perNightRate !== null && !isNaN(Number(perNightRate))) {
        baseNightPrice = Number(perNightRate);
      } else if (matrixPrice !== null && matrixPrice !== undefined) {
        baseNightPrice = matrixPrice;
      } else if (perNightRate) {
        baseNightPrice = Number(perNightRate);
      }
      rates.push(baseNightPrice + extraAdultChargePerNight);
    }
    return rates;
  }, [formData.checkInDate, formData.roomType, formData.ratePlan, formData.adults, nights, isComplimentary, perNightAdjustment, selectedRoomType, selectedRatePlanObj, dailyRatesMap, rateTouched, rateOverride, perNightRate]);

  const rawSubtotal = useMemo(() => {
    if (isComplimentary) return 0;
    const sum = stayDailyRates.reduce((acc, r) => acc + r, 0);
    return Math.round(sum * 100) / 100;
  }, [stayDailyRates, isComplimentary]);

  const discountNum = Number(formData.discountValue) || 0;
  const discountAmount = useMemo(() => {
    if (isComplimentary || discountNum <= 0) return 0;
    if (formData.discountType === "PERCENT") {
      return Math.round(((rawSubtotal * discountNum) / 100) * 100) / 100;
    }
    return Math.round(Math.min(rawSubtotal, discountNum) * 100) / 100;
  }, [rawSubtotal, discountNum, formData.discountType, isComplimentary]);

  const maxOccupancyVal = useMemo(() => {
    if (!selectedRoomType) return 6;
    const occ = Number(selectedRoomType.maxOccupancy || selectedRoomType.occupancy || selectedRoomType.maxAdults || 6);
    return Math.max(1, occ);
  }, [selectedRoomType]);

  const adultOptionsCount = maxOccupancyVal;

  const childrenOptionsCount = useMemo(() => {
    const adultsCount = Number(formData.adults) || 1;
    const remainingCap = Math.max(0, maxOccupancyVal - adultsCount);
    if (!selectedRoomType) return remainingCap;
    const maxChildConfig = selectedRoomType.maxChildren !== undefined ? Number(selectedRoomType.maxChildren) : 4;
    return Math.min(maxChildConfig, remainingCap);
  }, [selectedRoomType, maxOccupancyVal, formData.adults]);

  const infantsOptionsCount = useMemo(() => {
    const adultsCount = Number(formData.adults) || 1;
    const childrenCount = Number(formData.children) || 0;
    const remainingCap = Math.max(0, maxOccupancyVal - (adultsCount + childrenCount));
    if (!selectedRoomType) return remainingCap;
    const maxInfantConfig = selectedRoomType.maxInfants !== undefined ? Number(selectedRoomType.maxInfants) : 3;
    return Math.min(maxInfantConfig, remainingCap);
  }, [selectedRoomType, maxOccupancyVal, formData.adults, formData.children]);

  // Auto-clamp selected adults, children, and infants when room type or adult/child counts change
  useEffect(() => {
    const curAdults = Number(formData.adults) || 1;
    const curChildren = Number(formData.children) || 0;
    const curInfants = Number(formData.infants) || 0;

    let nextAdults = curAdults;
    let nextChildren = curChildren;
    let nextInfants = curInfants;

    if (curAdults > adultOptionsCount) nextAdults = adultOptionsCount;
    if (curChildren > childrenOptionsCount) nextChildren = childrenOptionsCount;
    if (curInfants > infantsOptionsCount) nextInfants = infantsOptionsCount;

    if (nextAdults !== curAdults || nextChildren !== curChildren || nextInfants !== curInfants) {
      setFormData((prev) => ({
        ...prev,
        adults: String(nextAdults),
        children: String(nextChildren),
        infants: String(nextInfants),
      }));
    }
  }, [adultOptionsCount, childrenOptionsCount, infantsOptionsCount, formData.adults, formData.children, formData.infants]);

  const netSubtotal = Math.max(0, Math.round((rawSubtotal - discountAmount) * 100) / 100);

  const grossRatePerNight = useMemo(() => {
    if (nights <= 0 || isComplimentary) return 0;
    return Math.round((rawSubtotal / nights) * 100) / 100;
  }, [rawSubtotal, nights, isComplimentary]);

  const ratePerNight = grossRatePerNight;

  const calculatedTaxDetails = useMemo(() => {
    if (taxExempt || isComplimentary) return { taxAmount: 0, pctRate: 0 };
    const activeRules = availableTaxRules.filter((r) => r.status === "Active" || r.status === "active");
    if (activeRules.length === 0) return { taxAmount: 0, pctRate: 0 };

    let totalPct = 0;
    let sumTaxes = 0;

    activeRules.forEach((rule) => {
      if (rule.taxType === "fixed") {
        const fixedVal = Number(rule.fixedAmount || rule.amount || 0);
        const isPerStay = rule.fixedCalculation === "per_stay";
        sumTaxes += isPerStay ? fixedVal : (fixedVal * nights);
      } else {
        const pct = Number(rule.percent !== undefined ? rule.percent : rule.percentage !== undefined ? rule.percentage : 0);
        totalPct += pct;
        sumTaxes += (netSubtotal * pct / 100);
      }
    });

    return {
      taxAmount: Math.round(sumTaxes * 100) / 100,
      pctRate: Math.round(totalPct * 100) / 100
    };
  }, [availableTaxRules, taxExempt, isComplimentary, netSubtotal, nights]);

  const activeTaxRate = calculatedTaxDetails.pctRate;
  const isTaxInclusiveMode = typeof getTaxInclusiveSetting === "function" ? getTaxInclusiveSetting() : false;

  const addonsTotalCost = useMemo(() => {
    return (selectedAddons || []).reduce((acc, addon) => {
      const price = Number(addon.price || addon.amount || 0);
      return acc + (addon.pricingType === 'per_night' ? price * nights : price);
    }, 0);
  }, [selectedAddons, nights]);

  const extraChargesValue = (Number(formData.extraCharges) || 0) + addonsTotalCost;

  let taxAmount = 0;
  let totalAmount = 0;

  if (isComplimentary || taxExempt) {
    taxAmount = 0;
    totalAmount = Math.round((netSubtotal + extraChargesValue) * 100) / 100;
  } else {
    taxAmount = calculatedTaxDetails.taxAmount;
    totalAmount = Math.round((netSubtotal + taxAmount + extraChargesValue) * 100) / 100;
  }
  const advanceValue = collectPayment ? (Number(formData.advanceAmount) || totalAmount) : (Number(formData.advanceAmount) || 0);
  const balanceDue = Math.max(Math.round((totalAmount - advanceValue) * 100) / 100, 0);
  const paymentStatus = advanceValue <= 0 ? "Pending" : advanceValue >= totalAmount ? "Paid" : "Partial";

  useEffect(() => {
    if (collectPayment && !formData.advanceAmount) {
      setFormData((prev) => ({ ...prev, advanceAmount: String(totalAmount) }));
    }
  }, [collectPayment, totalAmount, formData.advanceAmount]);

  const handleSubmit = async (e, overrideStatus) => {
    if (e) e.preventDefault();
    setError("");
    setSuccess("");

    try {
      if (!formData.fullName.trim()) {
        const msg = "Customer Full Name is required.";
        setError(msg);
        if (typeof window !== "undefined") window.alert(msg);
        return;
      }
      if (formData.checkOutDate <= formData.checkInDate) {
        const msg = "Check-out date must be after check-in date.";
        setError(msg);
        if (typeof window !== "undefined") window.alert(msg);
        return;
      }

      if (formData.roomNumber && formData.roomNumber !== "Unassigned") {
        const normTarget = String(formData.roomNumber || "").replace(/^Room\s+/i, "").trim().toLowerCase();
        const conflict = existingBookings.some((b) => {
          const normB = String(b.room || "").replace(/^Room\s+/i, "").trim().toLowerCase();
          return (
            normB === normTarget &&
            b.id !== initialBooking?.id &&
            b.status !== "cancelled" &&
            formData.checkInDate < b.checkOut &&
            formData.checkOutDate > b.checkIn
          );
        });
        if (conflict) {
          const msg = `Room ${formData.roomNumber} is already booked for an overlapping date range.`;
          setError(msg);
          if (typeof window !== "undefined") window.alert(msg);
          return;
        }
      }

      const today = todayISO();
      const isPast = formData.checkOutDate <= today;
      const isToday = formData.checkInDate === today || (formData.checkInDate <= today && formData.checkOutDate > today);

      const finalStatus =
        overrideStatus ||
        (initialBooking?.status
          ? initialBooking.status
          : isPast
          ? "checked-out"
          : isToday
          ? "checked-in"
          : "confirmed");

      const fullPhone = formData.phoneNumber.trim();

      const bookingRecord = {
        id: initialBooking?.id || generateNextSequence("booking"),
        status: finalStatus,
        guest: formData.fullName.trim(),
        phone: fullPhone,
        email: formData.email.trim(),
        idType: formData.idProofType,
        idNumber: formData.idProofNumber.trim(),
        address: formData.address.trim(),
        room: formData.roomNumber || "Unassigned",
        roomType: formData.roomType,
        checkIn: formData.checkInDate,
        checkInTime: formData.checkInTime,
        checkOut: formData.checkOutDate,
        checkOutTime: formData.checkOutTime,
        adults: Number(formData.adults),
        children: Number(formData.children),
        infants: Number(formData.infants),
        isComplimentary: Boolean(isComplimentary),
        ratePerNight: grossRatePerNight,
        grossRatePerNight,
        baseRatePerNight: grossRatePerNight,
        nights,
        subtotal: rawSubtotal,
        netSubtotal,
        taxPercent: activeTaxRate,
        taxAmount,
        extraCharges: extraChargesValue,
        totalAmount,
        advanceAmount: advanceValue,
        advancePaymentDate: today,
        bookingDate: today,
        createdAt: new Date().toISOString(),
        payments: [],
        balanceDue,
        paymentMethod: formData.paymentMethod,
        paymentStatus,
        notes: formData.notes.trim(),
        city: formData.city.trim(),
        zip: formData.zip.trim(),
        companyName: formData.companyName.trim(),
        gstNumber: formData.gstNumber.trim(),
        ratePlan: formData.ratePlan,
        segment: formData.segment,
        subSegment: formData.subSegment,
        discountType: formData.discountType,
        discountValue: formData.discountValue,
        discountAmount,
        couponCode: formData.couponCode,
        vehicleMakeModel: (formData.vehicleMakeModel || "").trim(),
        vehiclePlate: (formData.vehiclePlate || "").trim(),
        vehicleColor: (formData.vehicleColor || "").trim(),
        hasAdditionalGuests: Boolean(showAdditionalGuests),
        additionalGuests: showAdditionalGuests ? additionalGuests.filter((g) => g.fullName.trim()) : [],
        remark: formData.remark.trim(),
        color: initialBooking?.color || GUEST_COLORS[Math.floor(Math.random() * GUEST_COLORS.length)],
        source: initialBooking?.source || "Walk-In",
        extras: (selectedAddons || []).map((ad, idx) => ({
          id: ad.id || `ext_${idx + 1}_${Date.now()}`,
          name: ad.name || ad.label || ad.title || `Addon #${idx + 1}`,
          label: ad.name || ad.label || ad.title || `Addon #${idx + 1}`,
          price: Number(ad.price || ad.amount || 0),
          amount: Number(ad.price || ad.amount || 0),
          amountUSD: Number(ad.price || ad.amount || 0),
          category: 'Addon / Extra Charge',
          billingType: ad.billingType || ad.pricingType || 'Per Night',
          pricingType: ad.pricingType || ad.billingType || 'per_night',
          taxPercent: ad.taxPercent !== undefined ? ad.taxPercent : 0,
          taxable: ad.taxable !== undefined ? ad.taxable : (ad.taxPercent && Number(ad.taxPercent) > 0),
          taxApplicable: ad.taxApplicable !== undefined ? ad.taxApplicable : (ad.taxPercent && Number(ad.taxPercent) > 0)
        })),
        addons: selectedAddons || [],
        cardName: formData.cardName || formData.fullName.trim(),
        cardNumber: formData.cardNumber || "",
        cardExpiry: formData.cardExpiry || "",
        cardCvv: formData.cardCvv || "",
      };

      if (formData.cardNumber || formData.cardName || ["Card", "CREDIT CARD", "DEBIT CARD", "OFFLINE CARD PAYMENT"].includes(formData.paymentMethod?.toUpperCase())) {
        saveCardForGuest({
          guestName: formData.fullName.trim(),
          cardName: formData.cardName || formData.fullName.trim(),
          cardNumber: formData.cardNumber || "4532891024811152",
          cardExpiry: formData.cardExpiry || "10/29",
        });
      }

      if (onSubmit) {
        await onSubmit(bookingRecord);
        return;
      }

      setSuccess(
        isEditing
          ? `Booking updated for ${bookingRecord.guest} in Room ${bookingRecord.room}.`
          : `Booking confirmed for ${bookingRecord.guest} in Room ${bookingRecord.room}.`
      );
      if (!isEditing) setFormData(buildInitialState(undefined, undefined, undefined, rooms, roomTypes));
    } catch (err) {
      console.error("Booking submit error:", err);
      const msg = err?.message || "An unexpected error occurred during submission.";
      setError(msg);
      if (typeof window !== "undefined") window.alert(msg);
    }
  };

  return (
    <div className={embedded ? "walkin-container walkin-embedded" : "walkin-container"}>
      <AIIDScannerModal
        isOpen={showAIScanner}
        onClose={() => setShowAIScanner(false)}
        onScanComplete={(scanned) => {
          setFormData((prev) => ({
            ...prev,
            fullName: scanned.fullName || prev.fullName,
            email: scanned.email || prev.email,
            phoneNumber: scanned.phoneNumber || prev.phoneNumber,
            address: scanned.address || prev.address,
            city: scanned.city || prev.city,
            zip: scanned.zip || prev.zip,
            idProofType: scanned.type || prev.idProofType,
            idProofNumber: scanned.idProofNumber || prev.idProofNumber,
          }));
        }}
      />

      {!embedded && (
        <header className="walkin-header" style={{ marginBottom: 16 }}>
          <div className="logo-section">
            <div className="key-logo">
              <span className="key-icon">🔑</span>
              <span className="brand-inn">Inn</span>
              <span className="brand-out">Out</span>
            </div>
          </div>
          <div className="header-title">
            <div className="title-top">
              <span className="walk-icon">🚶</span>
              <h1>{isEditing ? "Edit Guest Booking" : "Create Reservation & Walk-In"}</h1>
            </div>
            <p className="subtitle">{isEditing ? "Update guest stay details" : "Single-step guest booking & instant check-in"}</p>
          </div>
        </header>
      )}

      {flaggedAlert && (
        <div style={{
          background: "#fef2f2",
          border: "2px solid #ef4444",
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 16,
          boxShadow: "0 4px 14px rgba(239,68,68,0.2)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>🚨</span>
              <strong style={{ color: "#b91c1c", fontSize: 14, fontWeight: 900 }}>
                FLAGGED GUEST DETECTED
              </strong>
            </div>
            <span className="badge" style={{ background: "#b91c1c", color: "#ffffff", fontWeight: 900, fontSize: 11, padding: "3px 10px", borderRadius: 8 }}>
              ⚠️ {flaggedAlert.category?.toUpperCase() || "FLAGGED"}
            </span>
          </div>
          <div style={{ fontSize: 13, color: "#7f1d1d", fontWeight: 700, marginBottom: 8 }}>
            Matching Profile: <strong>{flaggedAlert.guestName}</strong> — "{flaggedAlert.reason || "High priority system alert."}"
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn-lg-grey"
              onClick={() => {
                setFormData((prev) => ({ ...prev, fullName: "", phoneNumber: "", email: "" }));
                setFlaggedAlert(null);
              }}
              style={{ background: "#fee2e2", color: "#991b1b", borderColor: "#fca5a5" }}
            >
              Clear Guest Info
            </button>
            <button
              type="button"
              className="btn-lg-grey"
              onClick={() => {
                setOverrideFlag(true);
                setFlaggedAlert(null);
              }}
              style={{ background: "#fff7ed", color: "#c2410c", borderColor: "#fdba74" }}
            >
              Override &amp; Proceed
            </button>
          </div>
        </div>
      )}

      {error && <p className="walkin-message walkin-error" style={{ marginBottom: 16 }}>{error}</p>}
      {success && <p className="walkin-message walkin-success" style={{ marginBottom: 16 }}>{success}</p>}

      <form onSubmit={handleSubmit} className="walkin-form">
        {/* 2-COLUMN SIDE-BY-SIDE LAYOUT */}
        <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 14, alignItems: "start" }}>
          
          {/* LEFT COLUMN: STAY DETAILS & GUEST DETAILS */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            
            {/* CARD 1: 📅 STAY DETAILS */}
            <div className="form-card" style={{ background: "#ffffff", border: "1.5px solid #cbd5e1", borderRadius: 14, padding: embedded ? "12px 14px" : "16px 18px", boxShadow: "0 4px 18px rgba(15,23,42,0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingBottom: 6, borderBottom: "1.5px solid #f1f5f9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="card-icon-badge">📅</div>
                  <h2 className="cr-section-title" style={{ fontSize: 13.5, margin: 0 }}>
                    1. Stay Details
                  </h2>
                </div>
              </div>

              {/* Row 1: Dates & Times (5 columns) */}
              <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.5fr 1.15fr 0.75fr 0.75fr", gap: 8, marginBottom: 8 }}>
                <div className="form-group">
                  <label>CHECK-IN DATE *</label>
                  <CustomDatePicker name="checkInDate" value={formData.checkInDate} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>NIGHTS *</label>
                  <input
                    type="number"
                    min="1"
                    value={nights}
                    onChange={(e) => {
                      const val = Math.max(1, Number(e.target.value) || 1);
                      const inD = parseISOToLocalDate(formData.checkInDate || todayISO());
                      const outD = new Date(inD);
                      outD.setDate(outD.getDate() + val);
                      const yyyy = outD.getFullYear();
                      const mm = String(outD.getMonth() + 1).padStart(2, "0");
                      const dd = String(outD.getDate()).padStart(2, "0");
                      setFormData((prev) => ({ ...prev, checkOutDate: `${yyyy}-${mm}-${dd}` }));
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>CHECK-OUT DATE *</label>
                  <CustomDatePicker name="checkOutDate" value={formData.checkOutDate} onChange={handleChange} minDate={formData.checkInDate} required />
                </div>
                <div className="form-group">
                  <label>CHECK-IN TIME</label>
                  <select name="checkInTime" value={formData.checkInTime} onChange={handleChange}>
                    <option value="10:00">🕒 10:00 AM</option>
                    <option value="12:00">🕒 12:00 PM</option>
                    <option value="14:00">🕒 02:00 PM</option>
                    <option value="16:00">🕒 04:00 PM</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>CHECK-OUT TIME</label>
                  <select name="checkOutTime" value={formData.checkOutTime} onChange={handleChange}>
                    <option value="09:00">🕒 09:00 AM</option>
                    <option value="11:00">🕒 11:00 AM</option>
                    <option value="13:00">🕒 01:00 PM</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Occupancy & Room Selection (4 columns) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
                  <div className="form-group">
                    <label>ADULTS *</label>
                    <select name="adults" value={formData.adults} onChange={handleChange} required>
                      {Array.from({ length: adultOptionsCount }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n} Adult{n > 1 ? "s" : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>CHILDREN</label>
                    <select name="children" value={formData.children} onChange={handleChange}>
                      {Array.from({ length: childrenOptionsCount + 1 }, (_, i) => i).map((n) => (
                        <option key={n} value={n}>{n} Child{n === 1 ? "" : "ren"}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>INFANTS</label>
                    <select name="infants" value={formData.infants} onChange={handleChange}>
                      {Array.from({ length: infantsOptionsCount + 1 }, (_, i) => i).map((n) => (
                        <option key={n} value={n}>{n} Infant{n === 1 ? "" : "s"}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>ROOM TYPE *</label>
                  <select name="roomType" value={formData.roomType} onChange={handleChange} required>
                    {roomTypes.map((t) => (
                      <option key={t.id || t.name} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label>ROOM SELECTION</label>
                  <select name="roomNumber" value={formData.roomNumber} onChange={handleChange}>
                    <option value="">Unassigned</option>
                    {roomsOfType.map((r) => (
                      <option key={r.no} value={r.no}>
                        Room {r.no}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Rate Plan & Business Sources (4 columns) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                <div className="form-group">
                  <label>RATE PLAN</label>
                  <select name="ratePlan" value={formData.ratePlan} onChange={handleChange}>
                    {availableRatePlans.map((p) => (
                      <option key={p.id || p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>MARKET SEGMENT</label>
                  <select
                    name="segment"
                    value={formData.segment}
                    onChange={(e) => {
                      const newSeg = e.target.value;
                      const matched = businessSources.find((b) => b.segment === newSeg);
                      setFormData((prev) => ({
                        ...prev,
                        segment: newSeg,
                        subSegment: matched?.subSegments?.[0] || ""
                      }));
                    }}
                  >
                    {businessSources.map((b) => (
                      <option key={b.id || b.segment} value={b.segment}>{b.segment}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label>SUB-SEGMENT</label>
                  <select name="subSegment" value={formData.subSegment} onChange={handleChange}>
                    {availableSubSegments.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* CARD 2: 👤 GUEST DETAILS */}
            <div className="form-card" style={{ background: "#ffffff", border: "1.5px solid #cbd5e1", borderRadius: 14, padding: embedded ? "12px 14px" : "16px 18px", boxShadow: "0 4px 18px rgba(15,23,42,0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 6, borderBottom: "1.5px solid #f1f5f9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="card-icon-badge">👤</div>
                  <h2 className="cr-section-title" style={{ fontSize: 13.5, margin: 0 }}>
                    2. Guest Details
                  </h2>
                </div>
                <button
                  type="button"
                  className="btn-lg-grey"
                  onClick={() => setShowAIScanner(true)}
                  style={{ height: 28, padding: "0 10px", fontSize: 11 }}
                >
                  🤖 AI Scan ID Document
                </button>
              </div>

              {/* Row 1: Contact & Address Info (4 UNIFIED EQUAL COLUMNS) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div className="form-group" style={{ position: "relative" }}>
                  <label>FULL NAME *</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={(e) => {
                      handleChange(e);
                      setShowGuestSuggestions(true);
                    }}
                    onFocus={() => setShowGuestSuggestions(true)}
                    placeholder="Full name"
                    className={error && !formData.fullName.trim() ? "cr-invalid" : ""}
                    autoComplete="off"
                    required
                  />
                  {error && !formData.fullName.trim() && (
                    <span className="cr-field-error">{error}</span>
                  )}

                  {showGuestSuggestions && filteredGuestSuggestions.length > 0 && (
                    <div className="cr-past-guest-dropdown">
                      <div className="cr-past-guest-header">
                        <span>👥 Returning Guests ({filteredGuestSuggestions.length})</span>
                        <button type="button" className="cr-past-guest-close" onClick={() => setShowGuestSuggestions(false)}>✕</button>
                      </div>
                      {filteredGuestSuggestions.map((g, idx) => (
                        <div key={idx} className="cr-past-guest-item" onClick={() => handleSelectPastGuest(g)}>
                          <div className="cr-pg-name">
                            <span>👤 {g.fullName}</span>
                            <span className="cr-pg-badge">⚡ Autofill</span>
                          </div>
                          <div className="cr-pg-sub">
                            {g.phone && <span>📞 {g.phone}</span>}
                            {g.email && <span>✉️ {g.email}</span>}
                            {g.city && <span>📍 {g.city}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>PHONE NUMBER</label>
                  <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="Mobile phone number" />
                </div>

                <div className="form-group">
                  <label>EMAIL ADDRESS</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="email@domain.com" />
                </div>

                <div className="form-group">
                  <label>STREET ADDRESS</label>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Street Address" />
                </div>
              </div>

              {/* Row 2: Location & ID Details (4 UNIFIED EQUAL COLUMNS) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                <div className="form-group">
                  <label>STATE</label>
                  <select
                    name="state"
                    value={formData.state || "California"}
                    onChange={(e) => {
                      const newSt = e.target.value;
                      const cities = US_CITIES_BY_STATE[newSt] || ["Los Angeles"];
                      setFormData((prev) => ({
                        ...prev,
                        state: newSt,
                        city: cities[0] || ""
                      }));
                    }}
                  >
                    {US_STATES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 6 }}>
                  <div className="form-group">
                    <label>CITY</label>
                    <select name="city" value={formData.city} onChange={handleChange}>
                      {(US_CITIES_BY_STATE[formData.state || "California"] || ["Los Angeles"]).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>ZIP</label>
                    <input type="text" name="zip" value={formData.zip} onChange={handleChange} placeholder="Zip" />
                  </div>
                </div>
                <div className="form-group">
                  <label>SELECT ID TYPE</label>
                  <select name="idProofType" value={formData.idProofType} onChange={handleChange}>
                    <option value="US Driver's License">US Driver's License</option>
                    <option value="US Passport">US Passport</option>
                    <option value="US State ID">US State ID Card</option>
                    <option value="Foreign Passport">Foreign Passport</option>
                    <option value="US Military ID">US Military ID</option>
                    <option value="Green Card">Green Card / Permanent Resident</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>GOVT ID NUMBER</label>
                  <input type="text" name="idProofNumber" value={formData.idProofNumber} onChange={handleChange} placeholder="Govt ID Number" />
                </div>
              </div>

              {/* Row 3: Vehicle Info (4 UNIFIED EQUAL COLUMNS) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label>VEHICLE MAKE / MODEL</label>
                  <input type="text" name="vehicleMakeModel" value={formData.vehicleMakeModel || ""} onChange={handleChange} placeholder="e.g. Toyota Camry" />
                </div>
                <div className="form-group">
                  <label>VEHICLE LICENSE PLATE / TAG #</label>
                  <input type="text" name="vehiclePlate" value={formData.vehiclePlate || ""} onChange={handleChange} placeholder="e.g. 7XYZ890" />
                </div>
                <div className="form-group">
                  <label>VEHICLE COLOR</label>
                  <input type="text" name="vehicleColor" value={formData.vehicleColor || ""} onChange={handleChange} placeholder="e.g. Silver" />
                </div>
              </div>
            </div>

            {/* CARD 6: 👥 ADDITIONAL GUEST DETAILS (4 UNIFIED EQUAL COLUMNS) */}
            <div className="form-card" style={{ background: "#ffffff", border: "1.5px solid #cbd5e1", borderRadius: 14, padding: embedded ? "12px 14px" : "16px 18px", boxShadow: "0 4px 18px rgba(15,23,42,0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showAdditionalGuests ? 10 : 0, paddingBottom: showAdditionalGuests ? 6 : 0, borderBottom: showAdditionalGuests ? "1.5px solid #f1f5f9" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="card-icon-badge">👥</div>
                  <h2 className="cr-section-title" style={{ fontSize: 13.5, margin: 0 }}>
                    6. Additional Guest Details
                  </h2>
                </div>

                <div className="cr-toggle-row">
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#0f172a" }}>ADD ADDITIONAL GUEST(S):</span>
                  <button
                    type="button"
                    className={`cr-toggle ${showAdditionalGuests ? "on" : ""}`}
                    onClick={() => setShowAdditionalGuests((v) => !v)}
                  >
                    <span className="cr-toggle-knob" />
                  </button>
                </div>
              </div>

              {showAdditionalGuests && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                  {additionalGuests.map((g, idx) => (
                    <div key={idx} style={{ background: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: 10, padding: "8px 10px", position: "relative" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 800, color: "#0f172a" }}>Accompanying Guest #{idx + 1}</span>
                        {additionalGuests.length > 1 && (
                          <button
                            type="button"
                            className="btn-lg-grey"
                            onClick={() => setAdditionalGuests((prev) => prev.filter((_, i) => i !== idx))}
                            style={{ height: 22, padding: "0 6px", fontSize: 10, background: "#fee2e2", borderColor: "#fca5a5", color: "#991b1b" }}
                          >
                            ✕ Remove
                          </button>
                        )}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                        <div className="form-group">
                          <label>FULL NAME</label>
                          <input
                            type="text"
                            value={g.fullName || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAdditionalGuests((prev) => prev.map((item, i) => i === idx ? { ...item, fullName: val } : item));
                            }}
                            placeholder="Full name"
                          />
                        </div>
                        <div className="form-group">
                          <label>PHONE NUMBER</label>
                          <input
                            type="tel"
                            value={g.phone || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAdditionalGuests((prev) => prev.map((item, i) => i === idx ? { ...item, phone: val } : item));
                            }}
                            placeholder="Phone"
                          />
                        </div>
                        <div className="form-group">
                          <label>ID TYPE</label>
                          <select
                            value={g.idType || "US Driver's License"}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAdditionalGuests((prev) => prev.map((item, i) => i === idx ? { ...item, idType: val } : item));
                            }}
                          >
                            <option value="US Driver's License">US Driver's License</option>
                            <option value="US Passport">US Passport</option>
                            <option value="US State ID">US State ID Card</option>
                            <option value="Foreign Passport">Foreign Passport</option>
                            <option value="US Military ID">US Military ID</option>
                            <option value="Green Card">Green Card / Permanent Resident</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>GOVT ID NUMBER</label>
                          <input
                            type="text"
                            value={g.idNumber || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAdditionalGuests((prev) => prev.map((item, i) => i === idx ? { ...item, idNumber: val } : item));
                            }}
                            placeholder="Govt ID #"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn-lg-grey"
                    onClick={() => setAdditionalGuests((prev) => [...prev, { fullName: "", phone: "", idType: "US Driver's License", idNumber: "" }])}
                    style={{ height: 26, padding: "0 10px", fontSize: 10.5, fontWeight: 700, alignSelf: "flex-start" }}
                  >
                    + Add Another Guest
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: CHARGES, PRICE DETAILS, PAYMENT & SUMMARY */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            
            {/* CARD 3: 🏷️ CHARGES & DISCOUNTS */}
            <div className="form-card" style={{ background: "#ffffff", border: "1.5px solid #cbd5e1", borderRadius: 14, padding: embedded ? "12px 14px" : "16px 18px", boxShadow: "0 4px 18px rgba(15,23,42,0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 6, borderBottom: "1.5px solid #f1f5f9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="card-icon-badge">🏷️</div>
                  <h2 className="cr-section-title" style={{ fontSize: 13.5, margin: 0 }}>
                    3. Charges, Addons &amp; Discounts
                  </h2>
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 800, color: "#0f172a", cursor: "pointer", margin: 0 }}>
                    <span>TAX EXEMPT:</span>
                    <input
                      type="checkbox"
                      checked={taxExempt}
                      onChange={(e) => setTaxExempt(e.target.checked)}
                      style={{ width: 15, height: 15, accentColor: "#0f172a", cursor: "pointer" }}
                    />
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 800, color: "#0f172a", cursor: "pointer", margin: 0 }}>
                    <span>COMPLIMENTARY:</span>
                    <input
                      type="checkbox"
                      checked={isComplimentary}
                      onChange={(e) => setIsComplimentary(e.target.checked)}
                      style={{ width: 15, height: 15, accentColor: "#0f172a", cursor: "pointer" }}
                    />
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ background: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: 10, padding: "8px 10px" }}>
                  <div style={{ fontWeight: 800, fontSize: 11.5, color: "#0f172a", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                    🧩 Hotel Add-ons &amp; Packages
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {getHotelAddons().map((addon) => {
                      const isSelected = selectedAddons.some((a) => (a.id || a.name) === (addon.id || addon.name));
                      return (
                        <div
                          key={addon.id || addon.name}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedAddons((prev) => prev.filter((a) => (a.id || a.name) !== (addon.id || addon.name)));
                            } else {
                              setSelectedAddons((prev) => [...prev, addon]);
                            }
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 8px",
                            borderRadius: 6,
                            border: `1.5px solid ${isSelected ? "#0f172a" : "#cbd5e1"}`,
                            background: isSelected ? "#e2e8f0" : "#ffffff",
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ width: 14, height: 14, accentColor: "#0f172a", cursor: "pointer", margin: 0 }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: 10.5, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {addon.name}
                            </div>
                            <div style={{ fontSize: 9.5, color: "#475569", fontWeight: 700 }}>
                              +${addon.price} ({addon.pricingType === "per_night" ? "night" : "stay"})
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ background: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: 10, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontWeight: 800, fontSize: 11.5, color: "#0f172a", display: "flex", alignItems: "center", gap: 5 }}>
                    🎟️ Coupon &amp; Tariff Discounts
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1.45fr 0.95fr 1.1fr", gap: 8 }}>
                    <div className="form-group">
                      <label>DISCOUNT TYPE</label>
                      <select name="discountType" value={formData.discountType} onChange={handleChange}>
                        <option value="USD">💵 Flat Discount ($ USD)</option>
                        <option value="PERCENT">🏷️ Percentage Discount (%)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>DISCOUNT VALUE</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        name="discountValue"
                        value={formData.discountValue}
                        onChange={handleChange}
                        placeholder={formData.discountType === "PERCENT" ? "e.g. 10%" : "e.g. 25.00"}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label>COUPON CODE</label>
                      <div style={{ display: "flex", gap: 4 }}>
                        <input
                          type="text"
                          name="couponCode"
                          value={formData.couponCode}
                          onChange={handleChange}
                          placeholder="Code"
                        />
                        <button
                          type="button"
                          className="btn-lg-grey"
                          onClick={() => {
                            if (formData.couponCode.toUpperCase() === "WELCOME10") {
                              setFormData((prev) => ({ ...prev, discountType: "PERCENT", discountValue: "10" }));
                              setSuccess("Coupon WELCOME10 Applied: 10% Discount!");
                            } else if (formData.couponCode.trim()) {
                              setFormData((prev) => ({ ...prev, discountType: "USD", discountValue: "15" }));
                              setSuccess(`Coupon ${formData.couponCode} Applied: $15 Discount!`);
                            }
                          }}
                          style={{ height: 32, padding: "0 10px", fontSize: 11 }}
                        >
                          APPLY
                        </button>
                        {formData.discountValue && (
                          <button
                            type="button"
                            className="btn-lg-grey"
                            onClick={() => setFormData((prev) => ({ ...prev, discountValue: "", couponCode: "" }))}
                            style={{ height: 32, padding: "0 8px", fontSize: 11, background: "#fee2e2", borderColor: "#fca5a5", color: "#991b1b" }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 4: 🧾 PRICE DETAILS */}
            <div className="form-card" style={{ background: "#ffffff", border: "1.5px solid #cbd5e1", borderRadius: 14, padding: embedded ? "12px 14px" : "16px 18px", boxShadow: "0 4px 18px rgba(15,23,42,0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 6, borderBottom: "1.5px solid #f1f5f9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="card-icon-badge">🧾</div>
                  <h2 className="cr-section-title" style={{ fontSize: 13.5, margin: 0 }}>
                    4. Price Details
                  </h2>
                </div>
                
                <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 800, color: "#0f172a", cursor: "pointer", margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={rateOverride}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setRateOverride(isChecked);
                      setRateTouched(isChecked);
                      if (isChecked) {
                        setPerNightRate(String(ratePerNight || selectedRoomType?.price || 0));
                      }
                    }}
                    style={{ width: 15, height: 15, accentColor: "#0f172a" }}
                  />
                  <span>OVERRIDE DAILY TARIFF</span>
                </label>
              </div>

              {/* All 4 Price Fields in 1 Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 6 }}>
                <div className="form-group">
                  <label>PER NIGHT ($ EX. TAX)</label>
                  <input
                    type="text"
                    value={
                      activeInput === "perNight"
                        ? perNightRate
                        : rateOverride || rateTouched
                        ? Number(perNightRate || 0).toFixed(2)
                        : Number(ratePerNight || 0).toFixed(2)
                    }
                    onFocus={() => setActiveInput("perNight")}
                    onChange={(e) => {
                      setRateTouched(true);
                      setRateOverride(true);
                      setPerNightRate(e.target.value);
                    }}
                    onBlur={() => {
                      setActiveInput(null);
                      if (perNightRate !== "" && !isNaN(Number(perNightRate))) {
                        setPerNightRate(String(Number(perNightRate).toFixed(2)));
                      }
                    }}
                    readOnly={!rateOverride}
                    placeholder="0.00"
                    style={{
                      fontWeight: 800,
                      background: rateOverride ? "#ffffff" : "#f8fafc",
                      cursor: rateOverride ? "text" : "not-allowed",
                      border: rateOverride ? "1.5px solid #0f172a" : "1px solid #cbd5e1"
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>TOTAL EX. TAX ($)</label>
                  <input 
                    type="text" 
                    value={
                      activeInput === "totalExTax"
                        ? totalExTaxInput
                        : rateOverride || rateTouched
                        ? (Number(perNightRate || ratePerNight) * nights).toFixed(2)
                        : Number(netSubtotal).toFixed(2)
                    } 
                    onFocus={() => {
                      setActiveInput("totalExTax");
                      const cur = (rateOverride || rateTouched)
                        ? (Number(perNightRate || ratePerNight) * nights).toFixed(2)
                        : Number(netSubtotal).toFixed(2);
                      setTotalExTaxInput(cur);
                    }}
                    onChange={(e) => {
                      const rawVal = e.target.value;
                      setTotalExTaxInput(rawVal);
                      setRateTouched(true);
                      setRateOverride(true);
                      const val = Number(rawVal);
                      if (!isNaN(val) && nights > 0) {
                        setPerNightRate(String(val / nights));
                      } else if (rawVal === "") {
                        setPerNightRate("0");
                      }
                    }}
                    onBlur={() => {
                      setActiveInput(null);
                      if (perNightRate !== "" && !isNaN(Number(perNightRate))) {
                        setPerNightRate(String(Number(perNightRate).toFixed(2)));
                      }
                    }}
                    readOnly={!rateOverride} 
                    placeholder="0.00"
                    style={{ 
                      fontWeight: 800,
                      background: rateOverride ? "#ffffff" : "#f8fafc",
                      cursor: rateOverride ? "text" : "not-allowed",
                      border: rateOverride ? "1.5px solid #0f172a" : "1px solid #cbd5e1"
                    }} 
                  />
                </div>

                <div className="form-group">
                  <label>TOTAL TAX ($)</label>
                  <input type="text" value={Number(taxAmount).toFixed(2)} readOnly style={{ fontWeight: 800, color: "#e11d48", background: "#f8fafc", cursor: "not-allowed" }} />
                </div>

                <div className="form-group">
                  <label>TOTAL WITH TAX ($)</label>
                  <input 
                    type="text" 
                    value={
                      activeInput === "totalWithTax"
                        ? totalWithTaxInput
                        : Number(totalAmount).toFixed(2)
                    } 
                    onFocus={() => {
                      setActiveInput("totalWithTax");
                      setTotalWithTaxInput(Number(totalAmount).toFixed(2));
                    }}
                    onChange={(e) => {
                      const rawVal = e.target.value;
                      setTotalWithTaxInput(rawVal);
                      setRateTouched(true);
                      setRateOverride(true);
                      const val = Number(rawVal);
                      if (!isNaN(val) && nights > 0) {
                        const taxPct = calculatedTaxDetails?.pctRate || 0;
                        const exTaxTotal = taxPct > 0 ? val / (1 + taxPct / 100) : val;
                        setPerNightRate(String(exTaxTotal / nights));
                      } else if (rawVal === "") {
                        setPerNightRate("0");
                      }
                    }}
                    onBlur={() => {
                      setActiveInput(null);
                      if (perNightRate !== "" && !isNaN(Number(perNightRate))) {
                        setPerNightRate(String(Number(perNightRate).toFixed(2)));
                      }
                    }}
                    readOnly={!rateOverride}
                    placeholder="0.00"
                    style={{ 
                      fontWeight: 900, 
                      color: "#0f172a", 
                      fontSize: 13.5,
                      background: rateOverride ? "#ffffff" : "#f8fafc",
                      cursor: rateOverride ? "text" : "not-allowed",
                      border: rateOverride ? "1.5px solid #0f172a" : "1px solid #cbd5e1"
                    }} 
                  />
                </div>
              </div>

              <button type="button" className="cr-more-link" onClick={() => setShowDaySplit((v) => !v)} style={{ fontSize: 11, fontWeight: 800, marginTop: 2 }}>
                {showDaySplit ? "▲ Hide day wise split of room prices" : "▼ View day wise split of room prices"}
              </button>

              {showDaySplit && (
                <div className="cr-day-split" style={{ marginTop: 8, background: "#f8fafc", padding: 10, borderRadius: 8, border: "1.5px solid #cbd5e1" }}>
                  {Array.from({ length: nights }).map((_, i) => {
                    const d = new Date(formData.checkInDate);
                    d.setDate(d.getDate() + i);
                    const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                    const nightRate = stayDailyRates[i] || perNightRate || 0;
                    return (
                      <div className="cr-day-split-row" key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, padding: "3px 0", borderBottom: "1px dashed #cbd5e1" }}>
                        <span style={{ fontWeight: 700, color: "#475569" }}>Night {i + 1} ({label})</span>
                        <strong style={{ color: "#0f172a" }}>${Number(nightRate).toFixed(2)}</strong>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* CARD 5: 💳 PAYMENT COLLECTION & SUMMARY */}
            <div className="form-card" style={{ background: "#ffffff", border: "1.5px solid #cbd5e1", borderRadius: 14, padding: embedded ? "12px 14px" : "16px 18px", boxShadow: "0 4px 18px rgba(15,23,42,0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 6, borderBottom: "1.5px solid #f1f5f9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="card-icon-badge">💳</div>
                  <h2 className="cr-section-title" style={{ fontSize: 13.5, margin: 0 }}>
                    5. Payment Collection &amp; Summary
                  </h2>
                </div>

                <div className="cr-toggle-row">
                  <span>PROCESS PAYMENT IMMEDIATELY:</span>
                  <button
                    type="button"
                    className={`cr-toggle ${collectPayment ? "on" : ""}`}
                    onClick={() => setCollectPayment((v) => !v)}
                  >
                    <span className="cr-toggle-knob" />
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: collectPayment ? "1fr 1fr 1fr" : "1fr", gap: 8, marginBottom: collectPayment ? 8 : 0 }}>
                {collectPayment && (
                  <>
                    <div className="form-group">
                      <label>PAYMENT METHOD *</label>
                      <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange}>
                        <option value="Card">💳 CREDIT / DEBIT CARD</option>
                        <option value="Cash">💵 CASH</option>
                        <option value="City Ledger">🏢 POST TO COMPANY / CITY LEDGER</option>
                        <option value="Offline Card">💳 OFFLINE CARD PAYMENT</option>
                        <option value="Cheque">📑 CHEQUE</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>ADVANCE DEPOSIT ($)</label>
                      <input
                        type="number"
                        name="advanceAmount"
                        value={formData.advanceAmount}
                        onChange={handleChange}
                        placeholder={`Total $${totalAmount}`}
                      />
                    </div>
                    <div className="form-group">
                      <label>REMARK / NOTES</label>
                      <input type="text" name="remark" value={formData.remark} onChange={handleChange} placeholder="Payment notes" />
                    </div>
                  </>
                )}
              </div>

              {collectPayment && ["City Ledger", "POST TO COMPANY / CITY LEDGER"].includes(formData.paymentMethod) && (
                <div style={{ background: "#f1f5f9", padding: 10, borderRadius: 8, border: "1.5px solid #cbd5e1", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <label style={{ fontSize: 10.5, fontWeight: 800, color: "#334155", textTransform: "uppercase", margin: 0 }}>
                      Select Corporate Company Account *
                    </label>
                    <button
                      type="button"
                      className="btn-lg-grey"
                      onClick={() => setShowAddCompanyModal(true)}
                      style={{ height: 26, padding: "0 8px", fontSize: 10.5 }}
                    >
                      + Add Company Account
                    </button>
                  </div>
                  <select
                    name="companyAccountId"
                    value={formData.companyAccountId}
                    onChange={handleChange}
                    style={{ height: 32, borderRadius: 6, border: "1.5px solid #cbd5e1", background: "#ffffff", padding: "0 8px", fontSize: 12, width: "100%" }}
                    required
                  >
                    <option value="">-- Select Company / City Ledger Account --</option>
                    {companyAccounts.map((c) => (
                      <option key={c.id} value={c.id}>
                        🏢 {c.name} (Acct #{c.accountNo}) · Credit Limit: ${Number(c.creditLimit).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {collectPayment && ["Card", "CARD", "Offline Card", "OFFLINE CARD PAYMENT"].includes(formData.paymentMethod) && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 8, background: "#f8fafc", padding: 10, borderRadius: 8, border: "1.5px solid #cbd5e1" }}>
                  <div className="form-group">
                    <label>CARDHOLDER NAME *</label>
                    <input type="text" name="cardName" value={formData.cardName} onChange={handleChange} placeholder="Name on card" required />
                  </div>
                  <div className="form-group">
                    <label>CARD NUMBER *</label>
                    <input type="text" name="cardNumber" maxLength="19" value={formData.cardNumber} onChange={handleChange} placeholder="•••• •••• •••• ••••" required />
                  </div>
                  <div className="form-group">
                    <label>EXPIRY (MM/YY) *</label>
                    <input type="text" name="cardExpiry" maxLength="5" value={formData.cardExpiry} onChange={handleChange} placeholder="MM/YY" required />
                  </div>
                  <div className="form-group">
                    <label>CVV *</label>
                    <input type="password" name="cardCvv" maxLength="4" value={formData.cardCvv} onChange={handleChange} placeholder="•••" required />
                  </div>
                </div>
              )}

              {/* PRICE SUMMARY BOX */}
              <div className="cr-summary-card" style={{ background: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#475569" }}>
                  <span>Room Tariff ({nights} Night{nights > 1 ? "s" : ""}):</span>
                  <strong style={{ color: "#0f172a" }}>${rawSubtotal.toFixed(2)}</strong>
                </div>
                {discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#16a34a" }}>
                    <span>Discount:</span>
                    <strong>-${discountAmount.toFixed(2)}</strong>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#e11d48" }}>
                  <span>Taxes &amp; Fees ({activeTaxRate}%):</span>
                  <strong>${taxAmount.toFixed(2)}</strong>
                </div>
                {extraChargesValue > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#475569" }}>
                    <span>Addons &amp; Extras:</span>
                    <strong style={{ color: "#0f172a" }}>${extraChargesValue.toFixed(2)}</strong>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14.5, fontWeight: 900, color: "#0f172a", paddingTop: 6, borderTop: "1.5px solid #cbd5e1" }}>
                  <span>TOTAL ESTIMATED CHARGES:</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* ACTION FOOTER: ONLY CHECK-IN AND BOOK BUTTONS */}
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 10, paddingTop: 8, borderTop: "1.5px solid #f1f5f9" }}>
                {formData.checkOutDate <= todayISO() ? (
                  <button
                    type="button"
                    className="btn-lg-grey cr-submit-primary"
                    onClick={(e) => handleSubmit(e, "checked-out")}
                    style={{ minWidth: 110, height: 36, fontSize: 12.5, fontWeight: 800 }}
                  >
                    🔑 Check-In
                  </button>
                ) : formData.checkInDate < todayISO() && formData.checkOutDate > todayISO() ? (
                  <button
                    type="button"
                    className="btn-lg-grey cr-submit-primary"
                    onClick={(e) => handleSubmit(e, "checked-in")}
                    style={{ minWidth: 110, height: 36, fontSize: 12.5, fontWeight: 800 }}
                  >
                    🔑 Check-In
                  </button>
                ) : formData.checkInDate === todayISO() ? (
                  <>
                    <button
                      type="button"
                      className="btn-lg-grey cr-submit-primary"
                      onClick={(e) => handleSubmit(e, "checked-in")}
                      style={{ minWidth: 110, height: 36, fontSize: 12.5, fontWeight: 800 }}
                    >
                      🔑 Check-In
                    </button>
                    <button
                      type="button"
                      className="btn-lg-grey"
                      onClick={(e) => handleSubmit(e, "confirmed")}
                      style={{ minWidth: 110, height: 36, fontSize: 12.5, fontWeight: 800 }}
                    >
                      📅 Book
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn-lg-grey cr-submit-primary"
                    onClick={(e) => handleSubmit(e, "confirmed")}
                    style={{ minWidth: 110, height: 36, fontSize: 12.5, fontWeight: 800 }}
                  >
                    📅 Book
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>

      <AddCompanyModal
        isOpen={showAddCompanyModal}
        onClose={() => setShowAddCompanyModal(false)}
        onCompanyCreated={(newCompany) => {
          setCompanyAccounts(getCompanyAccounts());
          setFormData((prev) => ({ ...prev, companyAccountId: newCompany.id, paymentMethod: "City Ledger" }));
        }}
      />
    </div>
  );
}
