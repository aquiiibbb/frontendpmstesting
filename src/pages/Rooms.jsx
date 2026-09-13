import { useState, useEffect, useCallback } from "react";
import { PageHeader, StatusBadge } from "../components/UI";
import { getRooms } from "../services/api";
import "./Rooms.css";

const statusColor = {
  available: "#2e9e6d",
  occupied: "#cf4444",
  cleaning: "#c47a1f",
  maintenance: "#8b93a6",
};

export default function Rooms() {
  const [filter, setFilter] = useState("all");
  const [roomsList, setRoomsList] = useState([]);

  const loadData = useCallback(async () => {
    try {
      const data = await getRooms();
      setRoomsList(data || []);
    } catch {
      setRoomsList([]);
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

  const filtered = filter === "all" ? roomsList : roomsList.filter((r) => (r.status || "").toLowerCase() === filter);

  return (
    <div>
      <div className="tabs">
        {["all", "available", "occupied", "cleaning", "maintenance"].map((f) => (
          <button key={f} className={`tab-btn ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
            {f === "all" ? "All Rooms" : f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 16px", color: "#64748b" }}>
          No rooms configured. Add room numbers in Configuration → Manage Rooms!
        </div>
      ) : (
        <div className="room-grid">
          {filtered.map((r) => (
            <div key={r.no || r.id} className="room-tile" style={{ borderTop: `3px solid ${statusColor[(r.status || "available").toLowerCase()] || "#2e9e6d"}` }}>
              <div className="room-no">Room {r.no}</div>
              <div className="room-type">{r.type} · Floor {r.floor || 1}</div>
              <StatusBadge status={r.status || "available"} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
