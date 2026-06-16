"use client";

import { useEffect, useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import universities from "@/data/universities.json";

type Props = {
  value: string;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (value: string) => void;
};

export default function EditableUniversity({
  value,
  editing,
  onEdit,
  onCancel,
  onSave,
}: Props) {
  const [search, setSearch] = useState(value);
  const [results, setResults] = useState<typeof universities>([]);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    const matches = universities
      .filter((u) => u.name.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 8);
    setResults(matches);
  }, [search]);

  if (!editing) {
    return (
      <>
        <style>{euStyles}</style>
        <div className="eu-row">
          <span className="eu-value">{value || "Not set"}</span>
          <button onClick={onEdit} className="eu-btn eu-btn--edit" aria-label="Edit">
            <Pencil size={14} />
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{euStyles}</style>

      <div className="eu-wrap">
        <div className="eu-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="eu-input"
            placeholder="Search universities…"
            autoFocus
          />

          <button
            onClick={() => onSave(search)}
            className="eu-btn eu-btn--save"
            aria-label="Save"
          >
            <Check size={16} />
          </button>

          <button
            onClick={onCancel}
            className="eu-btn eu-btn--cancel"
            aria-label="Cancel"
          >
            <X size={16} />
          </button>
        </div>

        {results.length > 0 && search.trim() && (
          <div className="eu-dropdown">
            {results.map((u) => (
              <button
                key={u.name}
                type="button"
                onClick={() => {
                  setSearch(u.name);
                  onSave(u.name);
                }}
                className="eu-option"
              >
                {u.name}
              </button>
            ))}
          </div>
        )}

        <div className="eu-warning">
          <strong>Warning:</strong> Changing your university will change which
          students, study sessions, live study groups, and study buddies you can
          discover. Only change this if you actually attend a different school.
        </div>
      </div>
    </>
  );
}

const euStyles = `
  .eu-wrap {
    min-width: 220px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .eu-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .eu-value {
    font-size: 14px;
    font-weight: 600;
    color: #1B1B3A;
  }

  .eu-input {
    flex: 1;
    font-size: 14px;
    border: 1px solid #E4E2F0;
    border-radius: 10px;
    padding: 8px 12px;
    color: #1B1B3A;
    background: #FFFFFF;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    min-width: 220px;
  }

  .eu-input:focus {
    border-color: #A78BFA;
    box-shadow: 0 0 0 3px #EDE9FE;
  }

  .eu-btn {
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

  .eu-btn--edit {
    border: none;
    background: transparent;
    color: #94A3B8;
  }

  .eu-btn--edit:hover {
    background: #EDE9FE;
    color: #7C3AED;
  }

  .eu-btn--save:hover {
    background: #ECFDF5;
    border-color: #A7F3D0;
    color: #10B981;
  }

  .eu-btn--cancel:hover {
    background: #FEF2F2;
    border-color: #FECACA;
    color: #EF4444;
  }

  .eu-warning {
    padding: 10px 12px;
    border-radius: 10px;
    background: #FFFBEB;
    border: 1px solid #FDE68A;
    color: #92400E;
    font-size: 12px;
    line-height: 1.5;
  }

  .eu-dropdown {
    width: 100%;
    max-height: 240px;
    overflow-y: auto;
    border-radius: 14px;
    border: 1px solid #E4E2F0;
    background: #FFFFFF;
    box-shadow: 0 8px 32px rgba(27, 27, 58, 0.12);
  }

  .eu-option {
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

  .eu-option:hover {
    background: #EDE9FE;
  }

  .eu-option + .eu-option {
    border-top: 1px solid #F1F5F9;
  }

  @media (max-width: 640px) {
    .eu-row {
      flex-wrap: wrap;
    }

    .eu-input {
      min-width: 100%;
    }
  }
`;