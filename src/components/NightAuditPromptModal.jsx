import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getBusinessDate, getNightAuditConfig } from "../services/hotelConfig";

const SESSION_STORAGE_DISMISS_KEY = "pms_night_audit_prompt_dismissed_time_v1";

export default function NightAuditPromptModal() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [businessDate, setBusinessDate] = useState(() => getBusinessDate());
  const [auditConfig, setAuditConfig] = useState(() => getNightAuditConfig());

  useEffect(() => {
    function updateDateAndConfig() {
      setBusinessDate(getBusinessDate());
      setAuditConfig(getNightAuditConfig());
    }

    window.addEventListener("pms_business_date_updated", updateDateAndConfig);
    window.addEventListener("pms_night_audit_config_updated", updateDateAndConfig);

    return () => {
      window.removeEventListener("pms_business_date_updated", updateDateAndConfig);
      window.removeEventListener("pms_night_audit_config_updated", updateDateAndConfig);
    };
  }, []);

  useEffect(() => {
    const checkAuditTime = () => {
      if (!auditConfig.autoPrompt) {
        setShowModal(false);
        return;
      }

      // Check if user snoozed or dismissed in this browser session
      try {
        const dismissedUntil = Number(sessionStorage.getItem(SESSION_STORAGE_DISMISS_KEY) || 0);
        if (Date.now() < dismissedUntil) {
          setShowModal(false);
          return;
        }
      } catch {}

      const currentBDate = getBusinessDate();
      if (auditConfig.lastAuditCompletedDate === currentBDate) {
        setShowModal(false);
        return;
      }

      // Check if audit for today is already completed
      const realSystemDate = new Date().toISOString().substring(0, 10);
      if (currentBDate >= realSystemDate || auditConfig?.lastAuditCompletedDate === currentBDate) {
        setShowModal(false);
        return;
      }

      const parts = currentBDate.split("-").map(Number);
      const [bYear, bMonth, bDay] = parts;
      const targetTimeStr = auditConfig.nightAuditTime || "06:00";
      const timeParts = targetTimeStr.split(":").map(Number);
      const tHH = timeParts[0] || 0;
      const tMM = timeParts[1] || 0;

      // Night Audit rollover for business date (e.g. 2026-08-14) is due on the NEXT calendar day (2026-08-15) at target HH:MM
      const rolloverDueTime = new Date(bYear, bMonth - 1, bDay + 1, tHH, tMM, 0, 0);

      const now = new Date();

      if (now.getTime() >= rolloverDueTime.getTime()) {
        setShowModal(true);
      } else {
        setShowModal(false);
      }
    };

    checkAuditTime();
    const interval = setInterval(checkAuditTime, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [auditConfig]);

  if (!showModal) return null;

  const handleGoToAudit = () => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_DISMISS_KEY, String(Date.now() + 60 * 60 * 1000));
    } catch {}
    setShowModal(false);
    navigate("/front-desk/night-audit");
  };

  const handleSnooze = () => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_DISMISS_KEY, String(Date.now() + 15 * 60 * 1000)); // 15 mins snooze
    } catch {}
    setShowModal(false);
  };

  const handleClose = () => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_DISMISS_KEY, String(Date.now() + 30 * 60 * 1000)); // 30 mins snooze
    } catch {}
    setShowModal(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(6px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          maxWidth: "460px",
          width: "100%",
          boxShadow: "0 20px 40px -8px rgba(15, 23, 42, 0.25), 0 0 1px 1px rgba(15, 23, 42, 0.08)",
          border: "1px solid #cbd5e1",
          overflow: "hidden",
        }}
      >
        {/* HEADER SECTION */}
        <div style={{ background: "#ffffff", padding: "20px 22px 16px 22px", borderBottom: "1px solid #f1f5f9", position: "relative" }}>
          <button
            type="button"
            onClick={handleClose}
            style={{
              position: "absolute",
              top: "18px",
              right: "18px",
              background: "#f1f5f9",
              border: "none",
              color: "#64748b",
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
          >
            ✕
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                flexShrink: 0,
              }}
            >
              🌙
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "17.5px", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>
                Night Audit Rollover Required
              </h3>
              <p style={{ margin: "3px 0 0 0", fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
                Scheduled Audit Time ({auditConfig.nightAuditTime}) Reached
              </p>
            </div>
          </div>
        </div>

        {/* BODY SECTION */}
        <div style={{ padding: "20px 22px 22px 22px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "14px 16px", borderRadius: "12px" }}>
            <p style={{ margin: 0, fontSize: "13px", color: "#334155", lineHeight: 1.5, fontWeight: 500 }}>
              The business date for <strong style={{ color: "#0f172a" }}>{businessDate}</strong> needs to be closed. Night Audit will batch-post room charges, update housekeeping statuses, and advance the working PMS date.
            </p>
          </div>

          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "12.5px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#64748b", fontWeight: 600 }}>Current Working Date:</span>
              <strong style={{ color: "#0f172a", fontFamily: "monospace", fontSize: "13px" }}>{businessDate}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#64748b", fontWeight: 600 }}>Configured Audit Time:</span>
              <strong style={{ color: "#0f172a", fontWeight: 800 }}>{auditConfig.nightAuditTime} (24h)</strong>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
            <button
              type="button"
              onClick={handleSnooze}
              style={{
                flex: 1,
                padding: "11px 16px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#0f172a",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              ⏰ Remind in 15 Mins
            </button>
            <button
              type="button"
              onClick={handleGoToAudit}
              style={{
                flex: 1.4,
                padding: "11px 18px",
                borderRadius: "10px",
                border: "1px solid #b0b0b0",
                background: "#d3d3d3",
                color: "#0f172a",
                fontWeight: 800,
                fontSize: "13.5px",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
                transition: "all 0.15s ease",
              }}
            >
              🌙 Perform Night Audit Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
