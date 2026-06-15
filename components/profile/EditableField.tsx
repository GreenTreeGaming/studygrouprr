"use client";

import { Pencil, Check, X } from "lucide-react";

type Props = {
  label: string;
  value: string;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onChange: (value: string) => void;
};

export default function EditableField({
  value,
  editing,
  onEdit,
  onCancel,
  onSave,
  onChange,
}: Props) {
  if (editing) {
    return (
      <>
        <style>{efStyles}</style>
        <div className="ef-row">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="ef-input"
            autoFocus
          />
          <button onClick={onSave} className="ef-btn ef-btn--save" aria-label="Save">
            <Check size={16} />
          </button>
          <button onClick={onCancel} className="ef-btn ef-btn--cancel" aria-label="Cancel">
            <X size={16} />
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{efStyles}</style>
      <div className="ef-row">
        <span className="ef-value">{value}</span>
        <button onClick={onEdit} className="ef-btn ef-btn--edit" aria-label="Edit">
          <Pencil size={14} />
        </button>
      </div>
    </>
  );
}

const efStyles = `
  .ef-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ef-value {
    font-size: 14px;
    font-weight: 600;
    color: #1B1B3A;
  }
  .ef-input {
    font-size: 14px;
    border: 1px solid #E4E2F0;
    border-radius: 10px;
    padding: 8px 12px;
    color: #1B1B3A;
    background: #FFFFFF;
    outline: none;
    transition: border-color 0.15s;
    min-width: 180px;
  }
  .ef-input:focus {
    border-color: #A78BFA;
  }
  .ef-btn {
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
  .ef-btn--edit {
    border: none;
    background: transparent;
    color: #94A3B8;
  }
  .ef-btn--edit:hover {
    background: #EDE9FE;
    color: #7C3AED;
  }
  .ef-btn--save:hover {
    background: #ECFDF5;
    border-color: #A7F3D0;
    color: #10B981;
  }
  .ef-btn--cancel:hover {
    background: #FEF2F2;
    border-color: #FECACA;
    color: #EF4444;
  }
`;