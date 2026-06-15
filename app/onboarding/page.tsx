"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { supabase } from "@/lib/supabase";
import { ArrowRight, ChevronDown, GraduationCap, BookOpen, Calendar } from "lucide-react";
import universities from "@/data/universities.json";
import majors from "@/data/majors.json";

export default function OnboardingPage() {
  const [university, setUniversity] = useState("");
  const [major, setMajor] = useState("");
  const [year, setYear] = useState("");
  const [showUniversitySuggestions, setShowUniversitySuggestions] = useState(false);
  const [showMajorSuggestions, setShowMajorSuggestions] = useState(false);
  const [showYearOptions, setShowYearOptions] = useState(false);

  useEffect(() => {
    async function checkOnboarding() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", user.id)
        .single();

      if (profile?.onboarding_complete) {
        window.location.href = "/dashboard";
      }
    }

    checkOnboarding();
  }, []);

  const [filteredUniversities, setFilteredUniversities] = useState<typeof universities>([]);
  const [filteredMajors, setFilteredMajors] = useState<typeof majors>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".onboard-card", {
        opacity: 0,
        scale: 0.96,
        y: 12,
        duration: 0.7,
        ease: "power3.out",
      });

      gsap.from(".onboard-item", {
        opacity: 0,
        y: 16,
        duration: 0.6,
        stagger: 0.08,
        delay: 0.15,
        ease: "power3.out",
      });
    });

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setShowUniversitySuggestions(false);
        setShowMajorSuggestions(false);
        setShowYearOptions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const YEARS = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate"];

  const exactMajorMatch = majors.find((m) => m.major === major);
  const isCustomMajor = major.trim().length > 0 && !exactMajorMatch;

  async function completeOnboarding() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const validUniversity = universities.some((school) => school.name === university);
    const customMajor = major.trim();

    if (!exactMajorMatch && !/^[a-zA-Z\s&\-()]+$/.test(customMajor)) {
      alert("Please enter a valid major.");
      return;
    }

    if (customMajor.length < 3) {
      alert("Major must be at least 3 characters.");
      return;
    }

    if (customMajor.length > 100) {
      alert("Major is too long.");
      return;
    }

    if (!validUniversity) {
      alert("Please select a university from the list.");
      return;
    }

    await supabase
      .from("profiles")
      .update({
        university,
        major,
        major_is_custom: isCustomMajor,
        year,
        onboarding_complete: true,
      })
      .eq("id", user.id);

    window.location.href = "/dashboard";
  }

  useEffect(() => {
    if (!university.trim()) {
      setFilteredUniversities([]);
      return;
    }
    const matches = universities
      .filter((school) => school.name.toLowerCase().includes(university.toLowerCase()))
      .slice(0, 8);
    setFilteredUniversities(matches);
  }, [university]);

  useEffect(() => {
    if (!major.trim()) {
      setFilteredMajors([]);
      return;
    }
    const matches = majors
      .filter((m) => m.major.toLowerCase().includes(major.toLowerCase()))
      .slice(0, 8);
    setFilteredMajors(matches);
  }, [major]);

  const canContinue = university.trim().length > 0 && major.trim().length >= 3 && year.length > 0;

  return (
    <>
      <style>{onboardStyles}</style>
      <main className="ob-root">
        <div ref={cardRef} className="onboard-card ob-card">
          <div className="ob-header">
            <p className="onboard-item ob-eyebrow">Welcome to</p>
            <h1 className="onboard-item ob-title">StudyGrouprr</h1>
            <p className="onboard-item ob-subtitle">
              Tell us a little about yourself so we can help you find study partners.
            </p>
          </div>

          <div ref={formRef} className="ob-form">
            {/* University */}
            <div className="onboard-item ob-field">
              <label className="ob-label">
                <GraduationCap size={14} className="ob-label-icon" />
                University
              </label>
              <div className="ob-input-wrap">
                <input
                  placeholder="Search for your university…"
                  value={university}
                  onChange={(e) => {
                    setUniversity(e.target.value);
                    setShowUniversitySuggestions(true);
                    setShowMajorSuggestions(false);
                    setShowYearOptions(false);
                  }}
                  onFocus={() => {
                    setShowUniversitySuggestions(true);
                    setShowMajorSuggestions(false);
                    setShowYearOptions(false);
                  }}
                  className="ob-input"
                />

                {showUniversitySuggestions && filteredUniversities.length > 0 && (
                  <div className="ob-dropdown">
                    {filteredUniversities.map((school) => (
                      <button
                        key={school.name}
                        type="button"
                        onClick={() => {
                          setUniversity(school.name);
                          setShowUniversitySuggestions(false);
                        }}
                        className="ob-option"
                      >
                        {school.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="ob-university-hint">
                Your university determines which students, study sessions, and live study groups you can see. Make sure you select the correct school.
              </p>
            </div>

            {/* Major */}
            <div className="onboard-item ob-field">
              <label className="ob-label">
                <BookOpen size={14} className="ob-label-icon" />
                Major
              </label>
              <div className="ob-input-wrap">
                <input
                  placeholder="Search for your major…"
                  value={major}
                  onChange={(e) => {
                    setMajor(e.target.value);
                    setShowMajorSuggestions(true);
                    setShowUniversitySuggestions(false);
                    setShowYearOptions(false);
                  }}
                  onFocus={() => {
                    setShowMajorSuggestions(true);
                    setShowUniversitySuggestions(false);
                    setShowYearOptions(false);
                  }}
                  className="ob-input"
                />

                {showMajorSuggestions && (filteredMajors.length > 0 || major.trim().length > 0) && (
                  <div className="ob-dropdown">
                    {filteredMajors.map((m) => (
                      <button
                        key={m.major}
                        type="button"
                        onClick={() => {
                          setMajor(m.major);
                          setShowMajorSuggestions(false);
                        }}
                        className="ob-option"
                      >
                        <div className="ob-option-title">{m.major}</div>
                        <div className="ob-option-sub">{m.category}</div>
                      </button>
                    ))}

                    {major.trim().length > 0 &&
                      !filteredMajors.some((m) => m.major.toLowerCase() === major.toLowerCase()) && (
                        <button
                          type="button"
                          onClick={() => {
                            setMajor(major.trim());
                            setShowMajorSuggestions(false);
                          }}
                          className="ob-option ob-option--custom"
                        >
                          <div className="ob-option-title">Use "{major}"</div>
                          <div className="ob-option-sub">Custom major — not in our list</div>
                        </button>
                      )}
                  </div>
                )}
              </div>
            </div>

            {/* Year */}
            <div className="onboard-item ob-field">
              <label className="ob-label">
                <Calendar size={14} className="ob-label-icon" />
                Year
              </label>
              <div className="ob-input-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setShowYearOptions(!showYearOptions);
                    setShowUniversitySuggestions(false);
                    setShowMajorSuggestions(false);
                  }}
                  className="ob-select"
                >
                  <span className={year ? "" : "ob-placeholder"}>
                    {year || "Select your year"}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`ob-chevron ${showYearOptions ? "ob-chevron--open" : ""}`}
                  />
                </button>

                {showYearOptions && (
                  <div className="ob-dropdown">
                    {YEARS.map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => {
                          setYear(y);
                          setShowYearOptions(false);
                        }}
                        className={`ob-option ${y === year ? "ob-option--active" : ""}`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={completeOnboarding}
              className="ob-submit"
              disabled={!canContinue}
            >
              Continue <ArrowRight size={18} />
            </button>

            <p className="onboard-item ob-footnote">
              You can always change this later from your profile page.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}

const onboardStyles = `
  .ob-root * { box-sizing: border-box; }
  .ob-root {
    --indigo:      #1B1B3A;
    --violet:      #7C3AED;
    --violet-lt:   #EDE9FE;
    --violet-mid:  #A78BFA;
    --green:       #10B981;
    --red:         #EF4444;
    --red-lt:      #FEF2F2;
    --bg:          #F5F4FB;
    --surface:     #FFFFFF;
    --border:      #E4E2F0;
    --text:        #1B1B3A;
    --muted:       #64748B;
    --faint:       #94A3B8;

    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    overflow-y: auto;
    background: var(--indigo);
    background-image:
      radial-gradient(circle at 15% 20%, rgba(124,58,237,0.35), transparent 40%),
      radial-gradient(circle at 85% 80%, rgba(56,189,248,0.18), transparent 45%);
  }

  .ob-card {
    width: 100%;
    max-width: 480px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 36px 32px;
    box-shadow: 0 8px 32px rgba(27, 27, 58, 0.12);
    display: flex;
    flex-direction: column;
  }

  .ob-header {
    text-align: center;
    margin-bottom: 28px;
  }
  .ob-eyebrow {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--violet);
    margin: 0 0 6px;
  }
  .ob-title {
    font-size: 32px;
    font-weight: 700;
    color: var(--text);
    margin: 0 0 10px;
    line-height: 1.1;
  }
  .ob-subtitle {
    font-size: 14px;
    color: var(--muted);
    margin: 0;
    line-height: 1.5;
  }

  .ob-form {
    display: flex;
    flex-direction: column;
    gap: 18px;
    width: 100%;
  }

  .ob-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
    .ob-university-hint {
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--muted);
}
  .ob-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .ob-label-icon { color: var(--violet-mid); }

  .ob-input-wrap {
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .ob-input {
    width: 100%;
    font-size: 14px;
    color: var(--text);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px 14px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .ob-input::placeholder { color: var(--faint); }
  .ob-input:focus {
    border-color: var(--violet-mid);
    box-shadow: 0 0 0 3px var(--violet-lt);
  }

  .ob-select {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 14px;
    color: var(--text);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px 14px;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .ob-select:hover { border-color: var(--violet-mid); }
  .ob-placeholder { color: var(--faint); }
  .ob-chevron {
    color: var(--faint);
    transition: transform 0.15s;
    flex-shrink: 0;
  }
  .ob-chevron--open { transform: rotate(180deg); }

  .ob-dropdown {
    position: static;
    width: 100%;
    margin-top: 8px;
    max-height: 180px;
    overflow-y: auto;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    box-shadow: 0 8px 32px rgba(27, 27, 58, 0.12);
  }
  .ob-option {
    display: block;
    width: 100%;
    padding: 10px 14px;
    text-align: left;
    font-size: 14px;
    color: var(--text);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: background 0.1s;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ob-option:hover { background: var(--violet-lt); }
  .ob-option--custom { border-top: 1px solid var(--border); }
  .ob-option--active {
    background: var(--violet-lt);
    color: var(--violet);
    font-weight: 600;
  }
  .ob-option-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }
  .ob-option-sub {
    font-size: 12px;
    color: var(--faint);
    margin-top: 2px;
  }

  .ob-submit {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: var(--violet);
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    padding: 13px 22px;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s, opacity 0.15s;
    margin-top: 4px;
    min-height: 48px;
    visibility: visible;
    opacity: 1;
  }
  .ob-submit:hover:not(:disabled) {
    background: #6D28D9;
    transform: translateY(-1px);
  }
  .ob-submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .ob-submit:disabled {
    background: var(--violet);
    opacity: 0.65;
  }

  .ob-footnote {
    text-align: center;
    font-size: 13px;
    color: var(--muted);
    margin: 0;
    margin-top: 8px;
  }

  @media (prefers-reduced-motion: reduce) {
    .ob-submit:hover:not(:disabled) { transform: none; }
  }

  @media (max-width: 520px) {
    .ob-card { padding: 28px 20px; }
    .ob-title { font-size: 26px; }
  }
`;