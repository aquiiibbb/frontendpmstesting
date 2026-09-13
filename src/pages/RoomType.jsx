import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "../components/UI";
import { getRoomTypes, saveRoomTypes } from "../services/api";
import { IconPlus } from "../components/Icons";

export default function RoomType() {
  const [types, setTypes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", occupancy: "", totalRooms: "", amenities: "" });

  const loadData = useCallback(async () => {
    try {
      const data = await getRoomTypes();
      setTypes(data || []);
    } catch {
      setTypes([]);
    }
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener("pms_rooms_updated", loadData);
    window.addEventListener("storage", loadData);
    return () => {
      window.removeEventListener("pms_rooms_updated", loadData);
      window.removeEventListener("storage", loadData);
    };
  }, [loadData]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price) return;
    const newType = {
      id: `rt_${Date.now()}`,
      name: form.name,
      basePrice: Number(form.price) || 0,
      price: Number(form.price) || 0,
      totalOccupancy: String(form.occupancy || 2),
      occupancy: Number(form.occupancy) || 2,
      totalRooms: Number(form.totalRooms) || 0,
      amenities: form.amenities.split(",").map((a) => a.trim()).filter(Boolean),
    };
    const updated = [...types, newType];
    setTypes(updated);
    await saveRoomTypes(updated);
    window.dispatchEvent(new CustomEvent("pms_rooms_updated"));
    setForm({ name: "", price: "", occupancy: "", totalRooms: "", amenities: "" });
    setShowForm(false);
  };

  return (
    <div>
      <PageHeader
        title=""
        desc=""
        action={
          <button className="btn btn-gold" onClick={() => setShowForm((v) => !v)}>
            <IconPlus /> Add Room Type
          </button>
        }
      />

      {showForm && (
        <form className="card card-pad" style={{ marginBottom: 18 }} onSubmit={handleAdd}>
          <div className="form-grid">
            <div className="form-field">
              <label>Type Name</label>
              <input placeholder="e.g. Deluxe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-field">
              <label>Price / Night ($)</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="form-field">
              <label>Max Occupancy</label>
              <input type="number" value={form.occupancy} onChange={(e) => setForm({ ...form, occupancy: e.target.value })} />
            </div>
            <div className="form-field">
              <label>Total Rooms in Category</label>
              <input type="number" value={form.totalRooms} onChange={(e) => setForm({ ...form, totalRooms: e.target.value })} />
            </div>
            <div className="form-field full">
              <label>Amenities (comma separated)</label>
              <input placeholder="AC, TV, WiFi" value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Add Type</button>
            <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="card">
        <div className="table-wrap">
          {types.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 16px", color: "#64748b" }}>
              No room types configured. Click "+ Add Room Type" or configure in Setup & Configuration!
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Price / Night</th>
                  <th>Max Occupancy</th>
                  <th>Total Rooms</th>
                  <th>Amenities</th>
                </tr>
              </thead>
              <tbody>
                {types.map((t) => (
                  <tr key={t.id || t.name}>
                    <td style={{ fontWeight: 600 }}>{t.name}</td>
                    <td>${Number(t.basePrice || t.price || 0).toLocaleString("en-US")}</td>
                    <td>{t.totalOccupancy || t.occupancy || 2} guests</td>
                    <td>{t.totalRooms || 0} rooms</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {(t.amenities || []).map((a) => (
                          <span key={a} className="badge badge-neutral">{a}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
