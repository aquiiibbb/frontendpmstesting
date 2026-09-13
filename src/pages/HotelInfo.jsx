import { useState } from "react";
import { PageHeader } from "../components/UI";
import { hotelInfo } from "../data/mockData";

export default function HotelInfo() {
  const [form, setForm] = useState(hotelInfo);
  const [saved, setSaved] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
     

      <form className="card card-pad" onSubmit={handleSave}>
        <div className="form-grid">
          <div className="form-field full">
            <label>Hotel Name</label>
            <input value={form.name} onChange={update("name")} />
          </div>
          <div className="form-field full">
            <label>Tagline</label>
            <input value={form.tagline} onChange={update("tagline")} />
          </div>
          <div className="form-field full">
            <label>Address</label>
            <input value={form.address} onChange={update("address")} />
          </div>
          <div className="form-field">
            <label>Phone</label>
            <input value={form.phone} onChange={update("phone")} />
          </div>
          <div className="form-field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={update("email")} />
          </div>
          <div className="form-field">
            <label>Website</label>
            <input value={form.website} onChange={update("website")} />
          </div>
          <div className="form-field">
            <label>GST Number</label>
            <input value={form.gstNumber} onChange={update("gstNumber")} />
          </div>
          <div className="form-field">
            <label>Check-in Time</label>
            <input value={form.checkInTime} onChange={update("checkInTime")} />
          </div>
          <div className="form-field">
            <label>Check-out Time</label>
            <input value={form.checkOutTime} onChange={update("checkOutTime")} />
          </div>
          <div className="form-field">
            <label>Total Rooms</label>
            <input type="number" value={form.totalRooms} onChange={update("totalRooms")} />
          </div>
          <div className="form-field">
            <label>Star Rating</label>
            <select value={form.starRating} onChange={update("starRating")}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n} Star</option>
              ))}
            </select>
          </div>
          <div className="form-field full">
            <label>Description</label>
            <textarea rows={4} value={form.description} onChange={update("description")} />
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-gold">Save Changes</button>
          <button type="button" className="btn btn-outline" onClick={() => setForm(hotelInfo)}>Discard</button>
        </div>
      </form>
    </div>
  );
}
