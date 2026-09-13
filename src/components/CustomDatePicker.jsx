import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import CustomCalendarPopover from "./CustomCalendarPopover";
import "./CustomDatePicker.css";

export default function CustomDatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = "Select date",
  className = "",
  style = {},
  disabled = false,
  required = false,
  name = "",
  id = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = 280; // approximate compact calendar popover height
    const popoverWidth = 250;  // compact calendar width

    let top = rect.bottom + 6;
    let left = rect.left;

    // Flip above if popover overflows bottom of viewport
    if (top + popoverHeight > window.innerHeight && rect.top - popoverHeight > 0) {
      top = rect.top - popoverHeight - 6;
    }

    // Keep within horizontal bounds
    if (left + popoverWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - popoverWidth - 12);
    }

    setPos({ top, left });
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  const getTodayISO = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleSelectDate = (newDateStr) => {
    if (min && newDateStr < min) return;
    if (max && newDateStr > max) return;

    if (onChange) {
      const syntheticEvent = {
        target: {
          name: name || "",
          id: id || "",
          value: newDateStr
        }
      };
      onChange(syntheticEvent);
    }
    setIsOpen(false);
  };

  return (
    <div
      className={`custom-datepicker-wrapper ${className}`}
      style={{ display: "inline-block", width: "100%", ...style }}
    >
      <div
        ref={triggerRef}
        onClick={handleToggle}
        className="custom-datepicker-trigger"
        tabIndex={disabled ? -1 : 0}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderRadius: "10px",
          border: isOpen ? "1.5px solid #0284c7" : "1.5px solid #cbd5e1",
          background: disabled ? "#f1f5f9" : "#ffffff",
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: "14px",
          fontWeight: "700",
          color: value ? "#0f172a" : "#94a3b8",
          userSelect: "none",
          boxShadow: isOpen ? "0 0 0 3px rgba(2, 132, 199, 0.15)" : "none",
          transition: "all 0.15s ease",
        }}
      >
        <span>{value || placeholder}</span>
        <span style={{ fontSize: "16px", color: "#0284c7", marginLeft: "8px", display: "flex", alignItems: "center" }}>
          📅
        </span>
      </div>

      {isOpen &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: `${pos.top}px`,
              left: `${pos.left}px`,
              zIndex: 9999999,
            }}
          >
            <CustomCalendarPopover
              selectedDate={value}
              onSelectDate={handleSelectDate}
              onClose={() => setIsOpen(false)}
              todayISO={getTodayISO()}
              minDate={min}
              maxDate={max}
            />
          </div>,
          document.body
        )}
    </div>
  );
}
