import React, { useState, useEffect } from 'react';
import { usePMS } from '../../context/PMSContext';
import CustomDatePicker from '../CustomDatePicker';
import { formatUSD, calculateTaxes } from '../../utils/formatters';
import { 
  User, 
  Mail, 
  Phone, 
  FileText, 
  Bed, 
  Calendar, 
  Users, 
  Crown, 
  CheckSquare,
  Sparkles,
  Zap,
  ScanLine,
  Tag,
  Receipt,
  MapPin,
  Percent,
  DollarSign,
  X
} from 'lucide-react';

export const NewReservationModal = ({ isOpen, onClose, initialData, onOpenBlockModal }) => {
  const { rooms, reservations, taxRules, addReservation, businessDate, showToast } = usePMS();

  const categories = Array.from(new Set(rooms.map((r) => r.type)));

  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isScanning, setIsScanning] = useState(false);

  // Discount State
  const [discountType, setDiscountType] = useState('flat'); // 'flat' ($) or 'percent' (%)
  const [discountValue, setDiscountValue] = useState(0);

  const [formData, setFormData] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    guestAddress: '',
    idType: 'Driver License',
    idNumber: '',
    roomId: '',
    roomNumber: '',
    roomType: '',
    checkIn: businessDate,
    checkOut: '',
    guestsCount: 1,
    nightlyRateUSD: 150,
    isTaxExempt: false,
    vipStatus: 'Standard',
    status: 'Reserved',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      const defaultCheckOut = new Date(businessDate);
      defaultCheckOut.setDate(defaultCheckOut.getDate() + 2);
      const defaultCheckOutStr = defaultCheckOut.toISOString().split('T')[0];

      const defaultRoom = rooms.find((r) => r.status === 'Vacant') || rooms[0];

      const initialCat = initialData?.roomType || 'ALL';
      setSelectedCategory(initialCat);

      setFormData({
        guestName: initialData?.guestName || '',
        guestEmail: initialData?.guestEmail || '',
        guestPhone: initialData?.guestPhone || '',
        guestAddress: initialData?.guestAddress || '',
        idType: initialData?.idType || 'Driver License',
        idNumber: initialData?.idNumber || '',
        roomId: initialData?.roomId || defaultRoom?.id || '',
        roomNumber: initialData?.roomNumber || defaultRoom?.number || '',
        roomType: initialData?.roomType || defaultRoom?.type || '',
        checkIn: initialData?.checkIn || businessDate,
        checkOut: initialData?.checkOut || defaultCheckOutStr,
        guestsCount: initialData?.guestsCount || 1,
        nightlyRateUSD: initialData?.nightlyRateUSD || defaultRoom?.rateUSD || 150,
        isTaxExempt: initialData?.isTaxExempt || false,
        vipStatus: initialData?.vipStatus || 'Standard',
        status: initialData?.status || 'Reserved',
        notes: initialData?.notes || ''
      });

      setDiscountValue(0);
      setDiscountType('flat');
    }
  }, [isOpen, initialData, businessDate, rooms]);

  if (!isOpen) return null;

  // Collision Check for Room Availability by Selected Dates
  const isRoomAvailableForDates = (room) => {
    if (room.status === 'Out-of-Order') return false;
    if (!formData.checkIn || !formData.checkOut) return true;

    const hasCollision = reservations.some((res) => {
      if (res.roomId !== room.id || res.status === 'Checked-Out' || res.status === 'Cancelled') return false;
      return formData.checkIn < res.checkOut && res.checkIn < formData.checkOut;
    });

    return !hasCollision;
  };

  const availableRooms = rooms.filter(isRoomAvailableForDates);

  const categoryFilteredRooms = selectedCategory === 'ALL'
    ? availableRooms
    : availableRooms.filter((r) => r.type === selectedCategory);

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    const catRooms = cat === 'ALL' ? availableRooms : availableRooms.filter((r) => r.type === cat);
    if (catRooms.length > 0) {
      const firstRoom = catRooms[0];
      setFormData((prev) => ({
        ...prev,
        roomId: firstRoom.id,
        roomNumber: firstRoom.number,
        roomType: firstRoom.type,
        nightlyRateUSD: firstRoom.rateUSD
      }));
    }
  };

  const handleRoomChange = (roomId) => {
    const room = rooms.find((r) => r.id === roomId);
    if (room) {
      setFormData((prev) => ({
        ...prev,
        roomId: room.id,
        roomNumber: room.number,
        roomType: room.type,
        nightlyRateUSD: room.rateUSD
      }));
    }
  };

  const handleQuickNights = (numNights) => {
    if (!formData.checkIn) return;
    const d = new Date(formData.checkIn + 'T00:00:00');
    d.setDate(d.getDate() + numNights);
    setFormData((prev) => ({
      ...prev,
      checkOut: d.toISOString().split('T')[0]
    }));
  };

  const handleAutoFillIDScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const sampleGuests = [
        {
          name: 'Sophia Martinez',
          email: 'sophia.m@example.com',
          phone: '+1 (555) 382-9102',
          address: '742 Evergreen Terrace, Springfield, OR',
          idType: 'Driver License',
          idNum: 'DL-8910482'
        },
        {
          name: 'Marcus Brody',
          email: 'm.brody@archeo.org',
          phone: '+1 (555) 741-2049',
          address: '1088 Ocean Drive, Miami Beach, FL',
          idType: 'Passport',
          idNum: 'P-9481023'
        },
        {
          name: 'Elena Rostova',
          email: 'elena.rostova@techcorp.io',
          phone: '+1 (555) 839-1029',
          address: '450 Sutter St, San Francisco, CA',
          idType: 'Driver License',
          idNum: 'DL-7739102'
        }
      ];

      const picked = sampleGuests[Math.floor(Math.random() * sampleGuests.length)];
      setFormData((prev) => ({
        ...prev,
        guestName: picked.name,
        guestEmail: picked.email,
        guestPhone: picked.phone,
        guestAddress: picked.address,
        idType: picked.idType,
        idNumber: picked.idNum
      }));

      setIsScanning(false);
      showToast(`ID Scanned! Auto-filled profile for ${picked.name}`);
    }, 500);
  };

  const calculateNights = () => {
    if (!formData.checkIn || !formData.checkOut) return 1;
    const d1 = new Date(formData.checkIn + 'T00:00:00');
    const d2 = new Date(formData.checkOut + 'T00:00:00');
    const diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff);
  };

  const nightsCount = calculateNights();
  const grossRoomRent = (formData.nightlyRateUSD || 0) * nightsCount;

  let discountAmountUSD = 0;
  if (discountType === 'percent') {
    discountAmountUSD = (grossRoomRent * (parseFloat(discountValue) || 0)) / 100;
  } else {
    discountAmountUSD = parseFloat(discountValue) || 0;
  }
  discountAmountUSD = Math.min(grossRoomRent, Math.max(0, discountAmountUSD));

  const netSubtotalUSD = grossRoomRent - discountAmountUSD;
  const { totalTax, breakdown } = calculateTaxes(netSubtotalUSD, taxRules, formData.isTaxExempt);
  const grandTotalUSD = netSubtotalUSD + totalTax;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.guestName.trim()) return;

    addReservation({
      ...formData,
      discountUSD: discountAmountUSD,
      totalAmountUSD: grandTotalUSD
    });
    onClose();
  };

  return (
    <div className="modal-backdrop full-screen-backdrop" onClick={onClose}>
      <div className="modal-content modal-fullscreen glassmorphism" onClick={(e) => e.stopPropagation()}>
        <div className="fullscreen-modal-header">
          <div className="modal-title-box">
            <h2>Create New Guest Reservation</h2>
            <span className="modal-subtitle-tag">Full Screen Direct Booking ($ USD)</span>
          </div>

          {/* Quick Stay Presets Bar */}
          <div className="quick-presets-bar">
            <span className="preset-label"><Zap size={14} className="text-amber" /> Quick Stay:</span>
            <div className="preset-chips">
              <button type="button" className="preset-btn" onClick={() => handleQuickNights(1)}>1 Night</button>
              <button type="button" className="preset-btn" onClick={() => handleQuickNights(2)}>2 Nights</button>
              <button type="button" className="preset-btn" onClick={() => handleQuickNights(3)}>3 Nights</button>
              <button type="button" className="preset-btn" onClick={() => handleQuickNights(7)}>1 Week</button>
            </div>
          </div>

          <button className="close-btn" onClick={onClose}><X size={22} /></button>
        </div>

        <form onSubmit={handleSubmit} className="fullscreen-form">
          <div className="fullscreen-grid-body">
            {/* LEFT COLUMN: DATES, ROOM & GUEST INFO */}
            <div className="grid-col-left">
              {/* STEP 1: STAY DATES & AVAILABLE ROOM */}
              <div className="form-section highlight-section">
                <h4 className="section-title"><Calendar size={15} /> 1. Stay Dates & Room Availability</h4>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Check-In Date *</label>
                    <CustomDatePicker
                      value={formData.checkIn}
                      onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Check-Out Date * ({nightsCount} Night{nightsCount > 1 ? 's' : ''})</label>
                    <CustomDatePicker
                      value={formData.checkOut}
                      onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row-3">
                  <div className="form-group">
                    <label>Room Category *</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                    >
                      <option value="ALL">All Categories ({availableRooms.length} Available)</option>
                      {categories.map((cat) => {
                        const count = availableRooms.filter((r) => r.type === cat).length;
                        return (
                          <option key={cat} value={cat}>
                            {cat} ({count} Available)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Available Room Number *</label>
                    <select
                      value={formData.roomId}
                      onChange={(e) => handleRoomChange(e.target.value)}
                      required
                    >
                      {categoryFilteredRooms.length > 0 ? (
                        categoryFilteredRooms.map((room) => (
                          <option key={room.id} value={room.id}>
                            Room {room.number} — {formatUSD(room.rateUSD)}/nt [Available]
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No Available Rooms</option>
                      )}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Guests Count</label>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={formData.guestsCount}
                      onChange={(e) => setFormData({ ...formData, guestsCount: parseInt(e.target.value, 10) })}
                    />
                  </div>
                </div>
              </div>

              {/* STEP 2: GUEST PROFILE & AUTO SCAN */}
              <div className="form-section">
                <div className="section-title-with-action">
                  <h4 className="section-title"><User size={15} /> 2. Guest Profile & ID Details</h4>
                  <button
                    type="button"
                    className="btn btn-sm btn-accent scan-autofill-btn"
                    onClick={handleAutoFillIDScan}
                    disabled={isScanning}
                  >
                    <ScanLine size={14} /> {isScanning ? 'Scanning...' : 'Scan ID (Auto-Fill)'}
                  </button>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Guest Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Eleanor Vance"
                      value={formData.guestName}
                      onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Guest Email Address</label>
                    <input
                      type="email"
                      placeholder="guest@example.com"
                      value={formData.guestEmail}
                      onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={formData.guestPhone}
                      onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Address</label>
                    <input
                      type="text"
                      placeholder="Street, City, State/Country"
                      value={formData.guestAddress}
                      onChange={(e) => setFormData({ ...formData, guestAddress: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>ID Document Type</label>
                    <select
                      value={formData.idType}
                      onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
                    >
                      <option value="Driver License">Driver License</option>
                      <option value="Passport">Passport</option>
                      <option value="National ID">National ID</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>ID Number</label>
                    <input
                      type="text"
                      placeholder="DL-984210"
                      value={formData.idNumber}
                      onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: BILLING, TAX, DISCOUNT & ACTIONS */}
            <div className="grid-col-right">
              {/* STEP 3: DISCOUNT & OPTIONS */}
              <div className="form-section billing-breakdown-section">
                <h4 className="section-title"><Receipt size={15} /> 3. Rent Breakdown, Taxes & Discount ($ USD)</h4>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Discount Type & Value</label>
                    <div className="discount-input-group">
                      <select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value)}
                      >
                        <option value="flat">Flat ($ USD)</option>
                        <option value="percent">Percentage (%)</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group checkbox-card">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.isTaxExempt}
                        onChange={(e) => setFormData({ ...formData, isTaxExempt: e.target.checked })}
                      />
                      <div>
                        <strong>Tax Exempt Status</strong>
                        <span>Diplomatic / Government Exemption</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Live Billing Summary */}
                <div className="live-billing-summary glassmorphism">
                  <div className="billing-row">
                    <span>Base Room Rent ({nightsCount} Night{nightsCount > 1 ? 's' : ''} @ {formatUSD(formData.nightlyRateUSD)}/nt):</span>
                    <strong>{formatUSD(grossRoomRent)}</strong>
                  </div>

                  {discountAmountUSD > 0 && (
                    <div className="billing-row discount-line">
                      <span>Applied Discount ({discountType === 'percent' ? `${discountValue}%` : '$' + discountValue}):</span>
                      <strong className="text-danger">-{formatUSD(discountAmountUSD)}</strong>
                    </div>
                  )}

                  <div className="billing-row">
                    <span>Taxes ({breakdown.map((t) => t.name).join(', ')}):</span>
                    <strong>+{formatUSD(totalTax)}</strong>
                  </div>

                  <div className="billing-row grand-total-row">
                    <span>Grand Total Payable ($ USD):</span>
                    <strong className="grand-total-price">{formatUSD(grandTotalUSD)}</strong>
                  </div>
                </div>

                <div className="form-group">
                  <label>Guest Special Notes & Preferences</label>
                  <textarea
                    rows="2"
                    placeholder="e.g. High floor, extra pillows, early check-in requested..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              {/* FOOTER ACTIONS RIGHT INSIDE FULLSCREEN GRID */}
              <div className="fullscreen-actions">
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-large-submit">
                  Confirm & Book Reservation ({formatUSD(grandTotalUSD)})
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
