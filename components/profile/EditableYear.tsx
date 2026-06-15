"use client";

import { useState } from "react";
import { Pencil, Check, X, ChevronDown } from "lucide-react";

type Props = {
  value: string;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (value: string) => void;
};

const YEARS = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate"];

export default function EditableYear({
  value,
  editing,
  onEdit,
  onCancel,
  onSave,
}: Props) {
  const [open, setOpen] = useState(false);

  if (!editing) {
    return (
      <>
        <style>{eyStyles}</style>
        <div className="ey-row">
          <span className="ey-value">{value || "Not set"}</span>
          <button onClick={onEdit} className="ey-btn ey-btn--edit" aria-label="Edit">
            <Pencil size={14} />
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{eyStyles}</style>
      <div className="ey-wrap">
        <div className="ey-row">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="ey-select"
          >
            <span>{value || "Select year"}</span>
            <ChevronDown size={14} className={`ey-chevron ${open ? "ey-chevron--open" : ""}`} />
          </button>

          <button onClick={onCancel} className="ey-btn ey-btn--cancel" aria-label="Cancel">
            <X size={16} />
          </button>
        </div>

        {open && (
          <div className="ey-dropdown">
            {YEARS.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSave(year);
                }}
                className={`ey-option ${year === value ? "ey-option--active" : ""}`}
              >
                {year}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

const eyStyles = `
  .ey-wrap {
    position: relative;
    z-index: 999;
    min-width: 200px;
  }
  .ey-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ey-value {
    font-size: 14px;
    font-weight: 600;
    color: #1B1B3A;
  }
  .ey-select {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 14px;
    color: #1B1B3A;
    border: 1px solid #E4E2F0;
    border-radius: 10px;
    padding: 8px 12px;
    background: #FFFFFF;
    cursor: pointer;
    min-width: 180px;
    transition: border-color 0.15s;
  }
  .ey-select:hover {
    border-color: #A78BFA;
  }
  .ey-chevron {
    color: #94A3B8;
    transition: transform 0.15s;
    flex-shrink: 0;
  }
  .ey-chevron--open {
    transform: rotate(180deg);
  }
  .ey-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 8px;
    border: 1px solid #E4E2F0;
    background: #FFFFFF;
    color: #64748B;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
    flex-shrink: 0;
  }
  .ey-btn--edit {
    border: none;
    background: transparent;
    color: #94A3B8;
  }
  .ey-btn--edit:hover {
    background: #EDE9FE;
    color: #7C3AED;
  }
  .ey-btn--cancel:hover {
    background: #FEF2F2;
    border-color: #FECACA;
    color: #EF4444;
  }
  .ey-dropdown {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    z-index: 9999;
    width: 200px;
    overflow: hidden;
    border-radius: 14px;
    border: 1px solid #E4E2F0;
    background: #FFFFFF;
    box-shadow: 0 8px 32px rgba(27, 27, 58, 0.12);
  }
  .ey-option {
    display: block;
    width: 100%;
    padding: 10px 14px;
    text-align: left;
    font-size: 14px;
    color: #1B1B3A;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: background 0.1s;
  }
  .ey-option:hover {
    background: #EDE9FE;
  }
  .ey-option--active {
    color: #7C3AED;
    font-weight: 600;
    background: #EDE9FE;
  }
`;