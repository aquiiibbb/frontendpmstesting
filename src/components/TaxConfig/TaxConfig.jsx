import React, { useState } from 'react';
import { usePMS } from '../../context/PMSContext';
import { formatUSD, calculateTaxes } from '../../utils/formatters';
import { 
  Percent, 
  PlusCircle, 
  Trash2, 
  CheckCircle2, 
  HelpCircle, 
  Calculator,
  ShieldCheck
} from 'lucide-react';

export const TaxConfig = () => {
  const { taxRules, updateTaxRules, showToast } = usePMS();

  const [rules, setRules] = useState(taxRules);
  const [showAddModal, setShowAddModal] = useState(false);

  // New tax rule form state
  const [name, setName] = useState('');
  const [type, setType] = useState('percent'); // 'percent' | 'flat'
  const [rate, setRate] = useState('');
  const [appliedTo, setAppliedTo] = useState('Room Charges');
  const [exemptable, setExemptable] = useState(true);

  // Calculator test bench state
  const [testAmount, setTestAmount] = useState(250);
  const [isTestExempt, setIsTestExempt] = useState(false);

  const handleToggleRule = (id) => {
    const updated = rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    setRules(updated);
    updateTaxRules(updated);
  };

  const handleAddRule = (e) => {
    e.preventDefault();
    if (!name || !rate) return;
    const newRule = {
      id: `tax-${Date.now()}`,
      name,
      type,
      rate: parseFloat(rate) || 0,
      appliedTo,
      enabled: true,
      exemptable
    };
    const updated = [...rules, newRule];
    setRules(updated);
    updateTaxRules(updated);
    setShowAddModal(false);
    setName('');
    setRate('');
  };

  const handleDeleteRule = (id) => {
    const updated = rules.filter((r) => r.id !== id);
    setRules(updated);
    updateTaxRules(updated);
    showToast('Tax rule deleted');
  };

  // Run test calculation
  const { totalTax, breakdown } = calculateTaxes(parseFloat(testAmount) || 0, rules, isTestExempt);
  const grandTotalTest = (parseFloat(testAmount) || 0) + totalTax;

  return (
    <div className="taxconfig-view">
      <div className="taxconfig-header">
        <div>
          <h2>Tax Configuration & Calculation Engine</h2>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <PlusCircle size={16} /> Add Tax Rule
        </button>
      </div>

      <div className="taxconfig-grid">
        {/* Active Tax Rules Card */}
        <div className="card glassmorphism flex-2">
          <div className="card-header">
            <h3>Configured Tax Rules</h3>
            <span className="badge badge-info">{rules.length} Rules Active</span>
          </div>

          <div className="table-responsive">
            <table className="pms-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Tax Rule Name</th>
                  <th>Tax Type</th>
                  <th>Rate / Amount</th>
                  <th>Applies To</th>
                  <th>Exemptable?</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id}>
                    <td>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={() => handleToggleRule(rule.id)}
                        />
                        <span className="slider round" />
                      </label>
                    </td>
                    <td>
                      <strong>{rule.name}</strong>
                    </td>
                    <td>
                      <span className="category-pill">{rule.type === 'percent' ? 'Percentage %' : 'Flat Fee $'}</span>
                    </td>
                    <td>
                      <strong className="text-emerald">
                        {rule.type === 'percent' ? `${rule.rate}%` : formatUSD(rule.rate)}
                      </strong>
                    </td>
                    <td>{rule.appliedTo}</td>
                    <td>
                      {rule.exemptable ? (
                        <span className="badge badge-success"><ShieldCheck size={12} /> Yes</span>
                      ) : (
                        <span className="badge badge-secondary">No</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-danger-outline"
                        title="Delete Rule"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Tax Engine Test Bench Card */}
        <div className="card glassmorphism flex-1">
          <div className="card-header">
            <h3><Calculator size={18} /> Tax Calculation Test Bench</h3>
          </div>
          <div className="test-bench-body">
            <div className="form-group">
              <label>Sample Base Charge Amount ($ USD)</label>
              <input
                type="number"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
              />
            </div>

            <div className="form-group-checkbox margin-top-12">
              <label>
                <input
                  type="checkbox"
                  checked={isTestExempt}
                  onChange={(e) => setIsTestExempt(e.target.checked)}
                />
                <span>Simulate Diplomatic / Corporate Tax Exemption</span>
              </label>
            </div>

            <div className="test-results-box margin-top-16">
              <h4>Calculation Breakdown ($ USD)</h4>
              <div className="res-row">
                <span>Base Charge:</span>
                <strong>{formatUSD(testAmount)}</strong>
              </div>

              {breakdown.map((b) => (
                <div key={b.id} className="res-row tax-line">
                  <span>{b.name} ({b.type === 'percent' ? `${b.rate}%` : `$${b.rate}`}):</span>
                  <strong className="text-blue">+{formatUSD(b.amount)}</strong>
                </div>
              ))}

              <div className="res-row grand-total margin-top-12">
                <span>Grand Total Quote:</span>
                <strong className="text-emerald">{formatUSD(grandTotalTest)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Tax Rule Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-content glassmorphism" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Tax Rule</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddRule}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Tax Rule Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Resort & Amenity Surcharge"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Tax Type</label>
                  <select value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="percent">Percentage (%)</option>
                    <option value="flat">Flat Amount ($ USD)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>{type === 'percent' ? 'Percentage Rate (%)' : 'Flat Amount ($ USD)'}</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={type === 'percent' ? 'e.g. 7.5' : 'e.g. 20.00'}
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Applies To</label>
                  <select value={appliedTo} onChange={(e) => setAppliedTo(e.target.value)}>
                    <option value="Room Charges">Room Charges Only</option>
                    <option value="All Charges">All Charges (Room + Incidentals)</option>
                    <option value="Per Night Stay">Per Night Stay</option>
                  </select>
                </div>

                <div className="form-group-checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={exemptable}
                      onChange={(e) => setExemptable(e.target.checked)}
                    />
                    <span>Allow Tax Exemption Override for this rule</span>
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Tax Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
