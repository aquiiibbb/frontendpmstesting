import { useState } from "react";
import { PageHeader } from "../components/UI";
import { policies as initialPolicies } from "../data/mockData";
import { IconPlus, IconShield } from "../components/Icons";
import "./policies.css";

export default function Policies() {
  const [policies, setPolicies] = useState(initialPolicies);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  function openForm() {
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setTitle("");
    setBody("");
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!body.trim()) return;
    const newPolicy = {
      id: `p${Date.now()}`,
      title: title.trim() || "Untitled Policy",
      body: body.trim(),
    };
    setPolicies((prev) => [newPolicy, ...prev]);
    closeForm();
  }

  function handleDelete(id) {
    setPolicies((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div>
      <PageHeader
        title="Policies"
        desc="House rules and guest-facing policies for your property"
        action={
          !formOpen && (
            <button className="btn btn-gold" onClick={openForm}>
              <IconPlus /> Add Policy
            </button>
          )
        }
      />

      {formOpen && (
        <form className="card card-pad policy-form fade-in-up" onSubmit={handleSubmit}>
          <div className="form-field full" style={{ marginBottom: 14 }}>
            <label>Policy Title</label>
            <input
              type="text"
              placeholder="e.g. Early Check-in Policy"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-field full">
            <label>Policy Details</label>
            <textarea
              rows={5}
              placeholder="Type the full policy text here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={closeForm}>Cancel</button>
            <button type="submit" className="btn btn-gold">Submit Policy</button>
          </div>
        </form>
      )}

      <div className="policy-grid">
        {policies.map((p) => (
          <div className="card card-pad policy-card" key={p.id}>
            <div className="policy-card-head">
              <div className="policy-icon"><IconShield width={15} height={15} /></div>
              <h3>{p.title}</h3>
              <button className="policy-delete" title="Remove policy" onClick={() => handleDelete(p.id)}>✕</button>
            </div>
            <p className="policy-body">{p.body}</p>
          </div>
        ))}

        {policies.length === 0 && (
          <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
            No policies yet — click "Add Policy" to create one.
          </div>
        )}
      </div>
    </div>
  );
}
