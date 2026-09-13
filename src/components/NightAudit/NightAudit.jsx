import React, { useState } from 'react';
import { usePMS } from '../../context/PMSContext';
import { formatUSD, formatDate } from '../../utils/formatters';
import { 
  Moon, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Calendar, 
  Play, 
  ShieldCheck, 
  Clock, 
  FileCheck 
} from 'lucide-react';

export const NightAudit = () => {
  const { 
    businessDate, 
    reservations, 
    rooms, 
    auditLogs, 
    runNightAudit, 
    taxRules 
  } = usePMS();

  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedAudit, setCompletedAudit] = useState(null);

  // Check pending items for step 1
  const pendingArrivals = reservations.filter(
    (r) => r.checkIn === businessDate && r.status === 'Reserved'
  );
  const pendingDepartures = reservations.filter(
    (r) => r.checkOut === businessDate && r.status === 'Checked-In'
  );
  const checkedInCount = reservations.filter((r) => r.status === 'Checked-In').length;

  const handleExecuteAudit = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const result = runNightAudit('Night Audit Manager (System)');
      setIsProcessing(false);
      setCompletedAudit(result);
      setCurrentStep(4);
    }, 2000);
  };

  return (
    <div className="nightaudit-view">
      <div className="nightaudit-header">
        <div>
          <h2>Night Audit & End-of-Day Wizard</h2>
        </div>
        <div className="current-date-chip">
          <Moon size={16} className="text-amber" />
          <span>Active Business Date: <strong>{formatDate(businessDate)}</strong></span>
        </div>
      </div>

      {/* Step Wizard Container */}
      <div className="card glassmorphism wizard-card">
        <div className="wizard-stepper">
          <div className={`step-item ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
            <div className="step-num">1</div>
            <span className="step-title">Reconcile Statuses</span>
          </div>
          <div className="step-line" />
          <div className={`step-item ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
            <div className="step-num">2</div>
            <span className="step-title">Room & Tax Posting ($)</span>
          </div>
          <div className="step-line" />
          <div className={`step-item ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
            <div className="step-num">3</div>
            <span className="step-title">Date Rollover</span>
          </div>
          <div className="step-line" />
          <div className={`step-item ${currentStep >= 4 ? 'active' : ''}`}>
            <div className="step-num">4</div>
            <span className="step-title">Audit Lock & Summary</span>
          </div>
        </div>

        {/* Step 1 Content */}
        {currentStep === 1 && (
          <div className="wizard-step-content">
            <h3>Step 1: Check Open Arrivals & Departures</h3>
            <p>Verify that all arrivals have checked in and departures have checked out for {businessDate}.</p>

            <div className="reconcile-status-grid">
              <div className="recon-box">
                <span className="recon-label">Pending Arrivals</span>
                <div className={`recon-value ${pendingArrivals.length > 0 ? 'text-amber' : 'text-emerald'}`}>
                  {pendingArrivals.length}
                </div>
                <p>{pendingArrivals.length === 0 ? 'All expected guests checked in' : 'Requires frontdesk resolution'}</p>
              </div>

              <div className="recon-box">
                <span className="recon-label">Pending Departures</span>
                <div className={`recon-value ${pendingDepartures.length > 0 ? 'text-amber' : 'text-emerald'}`}>
                  {pendingDepartures.length}
                </div>
                <p>{pendingDepartures.length === 0 ? 'All scheduled departures completed' : 'Unresolved departure folios'}</p>
              </div>

              <div className="recon-box">
                <span className="recon-label">Active Checked-In Rooms</span>
                <div className="recon-value text-blue">{checkedInCount}</div>
                <p>Eligible for automated room & tax posting</p>
              </div>
            </div>

            <div className="wizard-step-footer">
              <button className="btn btn-primary" onClick={() => setCurrentStep(2)}>
                Proceed to Room & Tax Posting <Play size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2 Content */}
        {currentStep === 2 && (
          <div className="wizard-step-content">
            <h3>Step 2: Automated Room Rate & Tax Batch Posting ($ USD)</h3>
            <p>The system will post nightly room charges and tax line items to all {checkedInCount} active folios.</p>

            <div className="posting-preview-box">
              <h4>Posting Calculation Preview for Date: {businessDate}</h4>
              <ul className="posting-preview-list">
                <li>
                  <span>Active Checked-In Guests:</span>
                  <strong>{checkedInCount} Folios</strong>
                </li>
                <li>
                  <span>Configured Tax Rules Applied:</span>
                  <strong>{taxRules.filter(t => t.enabled).map(t => t.name).join(', ')}</strong>
                </li>
                <li>
                  <span>Currency Format:</span>
                  <strong>US Dollars ($ USD)</strong>
                </li>
              </ul>
            </div>

            <div className="wizard-step-footer">
              <button className="btn btn-secondary" onClick={() => setCurrentStep(1)}>Back</button>
              <button className="btn btn-primary" onClick={() => setCurrentStep(3)}>
                Proceed to Business Date Rollover <Play size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3 Content */}
        {currentStep === 3 && (
          <div className="wizard-step-content">
            <h3>Step 3: Execute Night Audit & Business Date Rollover</h3>
            <p>Clicking Execute will post all room charges, generate audit logs, and advance system business date.</p>

            {!isProcessing ? (
              <div className="execute-confirm-box">
                <ShieldCheck size={48} className="text-emerald pulsing" />
                <h4>Ready for Execution</h4>
                <p>Ensure all cash registers and daily cashier drops are closed before executing.</p>

                <div className="wizard-step-footer">
                  <button className="btn btn-secondary" onClick={() => setCurrentStep(2)}>Back</button>
                  <button className="btn btn-emerald btn-lg" onClick={handleExecuteAudit}>
                    <Moon size={18} /> Run Automated Audit Now
                  </button>
                </div>
              </div>
            ) : (
              <div className="processing-audit">
                <Clock size={48} className="text-blue spinning" />
                <h4>Processing Night Audit Batch...</h4>
                <p>Posting Room Rates, Taxes, & Advancing System Date...</p>
              </div>
            )}
          </div>
        )}

        {/* Step 4 Content: Completed */}
        {currentStep === 4 && completedAudit && (
          <div className="wizard-step-content">
            <div className="success-banner">
              <CheckCircle2 size={48} className="text-emerald" />
              <div>
                <h3>Night Audit Completed Successfully!</h3>
                <p>Business Date Rolled to: <strong>{formatDate(businessDate)}</strong></p>
              </div>
            </div>

            <div className="audit-result-cards">
              <div className="res-stat-card">
                <span>Rooms Occupied</span>
                <strong>{completedAudit.totalRoomsOccupied} Rooms ({completedAudit.occupancyPercent}%)</strong>
              </div>

              <div className="res-stat-card">
                <span>Total Room Revenue ($)</span>
                <strong className="text-emerald">{formatUSD(completedAudit.totalRoomRevenueUSD)}</strong>
              </div>

              <div className="res-stat-card">
                <span>Total Taxes Collected ($)</span>
                <strong className="text-blue">{formatUSD(completedAudit.totalTaxCollectedUSD)}</strong>
              </div>

              <div className="res-stat-card">
                <span>ADR / RevPAR ($ USD)</span>
                <strong>{formatUSD(completedAudit.adrUSD)} / {formatUSD(completedAudit.revparUSD)}</strong>
              </div>
            </div>

            <div className="wizard-step-footer">
              <button className="btn btn-primary" onClick={() => setCurrentStep(1)}>
                <FileCheck size={16} /> Return to Audit Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Historical Audit Trail Ledger */}
      <div className="card glassmorphism margin-top-24">
        <div className="card-header">
          <h3>Historical Night Audit Log Ledger</h3>
        </div>
        <div className="table-responsive">
          <table className="pms-table">
            <thead>
              <tr>
                <th>Audit Date</th>
                <th>Executed At</th>
                <th>Auditor</th>
                <th>Rooms Occupied</th>
                <th>Occupancy %</th>
                <th>Room Revenue ($ USD)</th>
                <th>Taxes Collected ($ USD)</th>
                <th>ADR ($ USD)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td><strong>{formatDate(log.auditDate)}</strong></td>
                  <td>{log.completedAt}</td>
                  <td>{log.auditor}</td>
                  <td>{log.totalRoomsOccupied} Rooms</td>
                  <td>{log.occupancyPercent}%</td>
                  <td className="text-emerald fw-bold">{formatUSD(log.totalRoomRevenueUSD)}</td>
                  <td className="text-blue fw-bold">{formatUSD(log.totalTaxCollectedUSD)}</td>
                  <td>{formatUSD(log.adrUSD)}</td>
                  <td>
                    <span className="badge badge-success">{log.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
