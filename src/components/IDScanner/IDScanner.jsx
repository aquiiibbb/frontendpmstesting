import React, { useState } from 'react';
import { usePMS } from '../../context/PMSContext';
import { 
  ScanLine, 
  Upload, 
  Camera, 
  CheckCircle2, 
  UserPlus, 
  UserCheck, 
  Sparkles, 
  FileText, 
  CreditCard 
} from 'lucide-react';

export const IDScanner = ({ onSelectExtractedGuest }) => {
  const { showToast } = usePMS();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [scanMode, setScanMode] = useState('upload'); // 'upload' | 'camera'

  const sampleScanPresets = [
    {
      id: 'dl-ca',
      label: 'Sample Driver License (California)',
      name: 'Victoria Vance',
      idType: 'Driver License',
      idNumber: 'DL-9081249-CA',
      dob: '1990-05-14',
      expiry: '2029-05-14',
      address: '1420 Market Street, San Francisco, CA 94102',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    },
    {
      id: 'pass-us',
      label: 'Sample US Passport',
      name: 'Dr. Harrison Wells',
      idType: 'Passport',
      idNumber: 'P-981203948',
      dob: '1984-11-22',
      expiry: '2031-11-22',
      address: '500 Central Ave, Seattle, WA 98101',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    }
  ];

  const handleSimulateScan = (preset) => {
    setIsScanning(true);
    setScannedData(null);
    setTimeout(() => {
      setIsScanning(false);
      setScannedData(preset);
      showToast(`ID Scanned & Parsed Successfully for ${preset.name}`);
    }, 1800);
  };

  return (
    <div className="idscanner-view">
      <div className="idscanner-header">
        <div>
          <h2>Frontdesk Guest ID Scanner</h2>
        </div>
      </div>

      <div className="idscanner-container">
        {/* Scanner Control Card */}
        <div className="card glassmorphism scanner-left-panel">
          <div className="card-header">
            <h3>Document Capture Source</h3>
          </div>

          <div className="scan-mode-toggle">
            <button
              className={`mode-btn ${scanMode === 'upload' ? 'active' : ''}`}
              onClick={() => setScanMode('upload')}
            >
              <Upload size={16} /> File Upload / Drop
            </button>
            <button
              className={`mode-btn ${scanMode === 'camera' ? 'active' : ''}`}
              onClick={() => setScanMode('camera')}
            >
              <Camera size={16} /> Live Webcam Scan
            </button>
          </div>

          {scanMode === 'upload' ? (
            <div className="dropzone-area">
              <div className="dropzone-inner">
                <ScanLine size={48} className="dropzone-icon text-blue pulsing" />
                <h4>Drag & Drop Guest ID Document</h4>
                <p>Supports PNG, JPG, PDF (Passports, Driver Licenses, Govt IDs)</p>
                <div className="preset-buttons">
                  <span className="preset-label">Or test with demo preset ID:</span>
                  {sampleScanPresets.map((preset) => (
                    <button
                      key={preset.id}
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleSimulateScan(preset)}
                      disabled={isScanning}
                    >
                      <CreditCard size={14} /> {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="webcam-sim-area">
              <div className="webcam-viewfinder">
                <Camera size={36} className="text-emerald" />
                <span>Webcam Live Feed Active</span>
                <div className="camera-scan-frame" />
              </div>
              <button
                className="btn btn-primary margin-top-12"
                onClick={() => handleSimulateScan(sampleScanPresets[0])}
                disabled={isScanning}
              >
                <Sparkles size={16} /> Capture & Scan ID Frame
              </button>
            </div>
          )}

          {isScanning && (
            <div className="scanning-overlay">
              <div className="laser-beam" />
              <div className="scan-status">
                <Sparkles size={24} className="spinning text-blue" />
                <span>Performing High-Speed OCR Details Parsing...</span>
              </div>
            </div>
          )}
        </div>

        {/* OCR Result Card */}
        <div className="card glassmorphism scanner-right-panel">
          <div className="card-header">
            <h3>Scanned Profile Results</h3>
            {scannedData && <span className="badge badge-success"><CheckCircle2 size={12} /> Verification Verified</span>}
          </div>

          {scannedData ? (
            <div className="ocr-results-wrapper">
              <div className="ocr-photo-row">
                <img src={scannedData.photoUrl} alt="Guest ID Photo" className="guest-id-photo" />
                <div className="guest-scanned-headline">
                  <h4>{scannedData.name}</h4>
                  <span className="id-type-tag">{scannedData.idType}</span>
                </div>
              </div>

              <div className="ocr-details-grid">
                <div className="ocr-field">
                  <span className="label">Full Name</span>
                  <strong>{scannedData.name}</strong>
                </div>

                <div className="ocr-field">
                  <span className="label">ID Document Number</span>
                  <strong>{scannedData.idNumber}</strong>
                </div>

                <div className="ocr-field">
                  <span className="label">Date of Birth</span>
                  <strong>{scannedData.dob}</strong>
                </div>

                <div className="ocr-field">
                  <span className="label">Expiration Date</span>
                  <strong>{scannedData.expiry}</strong>
                </div>

                <div className="ocr-field full-width">
                  <span className="label">Address</span>
                  <strong>{scannedData.address}</strong>
                </div>
              </div>

              <div className="ocr-actions">
                <button
                  className="btn btn-emerald w-100"
                  onClick={() => onSelectExtractedGuest(scannedData)}
                >
                  <UserPlus size={16} /> Auto-fill into New Reservation Form
                </button>
              </div>
            </div>
          ) : (
            <div className="ocr-placeholder">
              <FileText size={48} className="placeholder-icon" />
              <p>No document scanned yet. Upload or capture an ID card to parse guest registration details automatically.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
