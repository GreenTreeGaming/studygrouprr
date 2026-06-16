"use client";

import { useEffect, useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import majors from "@/data/majors.json";

type Props = {
  value: string;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (value: string) => void;
};

export default function EditableMajor({
  value,
  editing,
  onEdit,
  onCancel,
  onSave,
}: Props) {
  const [search, setSearch] = useState(value);

  const [showSuggestions, setShowSuggestions] =
    useState(false);

  const [results, setResults] =
    useState<typeof majors>([]);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }

    const matches = majors
      .filter((m) =>
        m.major
          .toLowerCase()
          .includes(search.toLowerCase())
      )
      .slice(0, 8);

    setResults(matches);
  }, [search]);

  if (!editing) {
    return (
      <>
        <style>{emStyles}</style>

        <div className="em-row">
          <span className="em-value">
            {value}
          </span>

          <button
            onClick={() => {
              setSearch(value);
              onEdit();
            }}
            className="em-btn em-btn--edit"
          >
            <Pencil size={14} />
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{emStyles}</style>

      <div className="em-wrapper">
        <div className="em-row">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() =>
              setShowSuggestions(true)
            }
            className="em-input"
            autoFocus
          />

          <button
            onClick={() => onSave(search)}
            className="em-btn em-btn--save"
          >
            <Check size={16} />
          </button>

          <button
            onClick={onCancel}
            className="em-btn em-btn--cancel"
          >
            <X size={16} />
          </button>
        </div>

        {showSuggestions &&
          (results.length > 0 ||
            search.trim().length > 0) && (
            <div className="em-dropdown">
              {results.map((m) => (
                <button
                  key={m.major}
                  type="button"
                  onClick={() => {
                    setSearch(m.major);
                    setShowSuggestions(false);
                    onSave(m.major);
                  }}
                  className="em-option"
                >
                  <div className="em-option-title">
                    {m.major}
                  </div>

                  <div className="em-option-subtitle">
                    {m.category}
                  </div>
                </button>
              ))}

              {search.trim().length > 0 &&
                !results.some(
                  (m) =>
                    m.major.toLowerCase() ===
                    search.toLowerCase()
                ) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch(search.trim());
                      setShowSuggestions(false);
                      onSave(search.trim());
                    }}
                    className="em-option em-option--custom"
                  >
                    <div className="em-option-title">
                      Use "{search}"
                    </div>

                    <div className="em-option-subtitle">
                      Custom major
                    </div>
                  </button>
                )}
            </div>
          )}
      </div>
    </>
  );
}

const emStyles = `
  .em-wrapper {
    position: relative;
    z-index: 100;
  }

  .em-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .em-value {
    font-size: 14px;
    font-weight: 600;
    color: #1B1B3A;
  }

  .em-input {
    font-size: 14px;
    border: 1px solid #E4E2F0;
    border-radius: 10px;
    padding: 8px 12px;
    color: #1B1B3A;
    background: #FFFFFF;
    outline: none;
    min-width: 220px;
    transition: border-color 0.15s;
  }

  .em-input:focus {
    border-color: #A78BFA;
  }

  .em-btn {
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
    transition: all 0.15s ease;
    flex-shrink: 0;
  }

  .em-btn--edit {
    border: none;
    background: transparent;
    color: #94A3B8;
  }

  .em-btn--edit:hover {
    background: #EDE9FE;
    color: #7C3AED;
  }

  .em-btn--save:hover {
    background: #ECFDF5;
    border-color: #A7F3D0;
    color: #10B981;
  }

  .em-btn--cancel:hover {
    background: #FEF2F2;
    border-color: #FECACA;
    color: #EF4444;
  }

  .em-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 420px;
    max-height: 260px;
    overflow-y: auto;
    background: white;
    border: 1px solid #E4E2F0;
    border-radius: 16px;
    box-shadow: 0 12px 32px rgba(27,27,58,0.12);
    z-index: 9999;
  }

  .em-option {
    width: 100%;
    text-align: left;
    border: none;
    background: transparent;
    padding: 12px 16px;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .em-option:hover {
    background: #F8FAFC;
  }

  .em-option--custom {
    border-top: 1px solid #E4E2F0;
  }

  .em-option-title {
    font-size: 14px;
    font-weight: 600;
    color: #1B1B3A;
  }

  .em-option-subtitle {
    margin-top: 2px;
    font-size: 12px;
    color: #64748B;
  }
`;