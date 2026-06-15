"use client";

import LoginButton from "@/components/LoginButton";
import { useEffect } from "react";
import { gsap } from "gsap";

import { Radio, BookOpen, Shield, MapPin, GraduationCap } from "lucide-react";

export default function LoginPage() {
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".lp-hero-item", {
        opacity: 0,
        y: 20,
        duration: 0.7,
        stagger: 0.1,
        ease: "power3.out",
      });

      gsap.from(".lp-floating-card", {
        opacity: 0,
        y: 24,
        duration: 0.7,
        stagger: 0.12,
        delay: 0.15,
        ease: "power3.out",
      });

      gsap.to(".lp-floating-card", {
        y: -8,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.2,
      });

      gsap.from(".lp-card", {
        opacity: 0,
        y: 24,
        scale: 0.97,
        duration: 0.8,
        delay: 0.1,
        ease: "power3.out",
      });

      gsap.from(".lp-card-item", {
        opacity: 0,
        y: 14,
        duration: 0.6,
        stagger: 0.08,
        delay: 0.3,
        ease: "power3.out",
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <>
      <style>{loginStyles}</style>
      <main className="lp-root">
        <div className="lp-grid">
          {/* Left: product preview */}
          <div className="lp-left">
            <div>
              <h1 className="lp-hero-item lp-title">
                See who's studying
                <br />
                your class right now.
              </h1>
              <p className="lp-hero-item lp-subtitle">
                Discover live students, study sessions, and course communities
                at your university.
              </p>
            </div>

            <div className="lp-floating-card">
              <div className="lp-floating-header lp-floating-header--green">
                <Radio size={16} />
                <span>Students live right now</span>
              </div>

              <div className="lp-floating-list">
                <div className="lp-floating-row">
                  <div>
                    <p className="lp-floating-name">CS400</p>
                    <p className="lp-floating-sub">
                      <MapPin size={11} /> Memorial Library
                    </p>
                  </div>
                </div>
                <div className="lp-floating-row">
                  <div>
                    <p className="lp-floating-name">MATH340</p>
                    <p className="lp-floating-sub">
                      <MapPin size={11} /> Engineering Hall
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lp-floating-card">
              <div className="lp-floating-header lp-floating-header--violet">
                <BookOpen size={16} />
                <span>What you'll find</span>
              </div>

              <ul className="lp-feature-list">
                <li>Live students studying now</li>
                <li>Active study sessions</li>
                <li>Course communities</li>
                <li>University-only discovery</li>
              </ul>
            </div>
          </div>

          {/* Right: login card */}
          <div className="lp-right">
            <div className="lp-card">
              <div className="lp-card-item lp-card-header">
                <p className="lp-card-eyebrow">Welcome to</p>
                <h2 className="lp-card-title">StudyGrouprr</h2>
                <p className="lp-card-subtitle">
                  Sign in to discover students studying your courses and join
                  real-world study sessions.
                </p>
              </div>

              <div className="lp-card-item lp-button-wrap">

                <LoginButton />

              </div>

              <div className="lp-card-item lp-student-notice">

                <GraduationCap size={16} />

                <span>

    StudyGrouprr is currently available only to students

    with a university email address.

  </span>

              </div>

              <div className="lp-card-item lp-privacy-box">
                <Shield size={16} className="lp-privacy-icon" />
                <div>
                  <p className="lp-privacy-title">Privacy &amp; safety</p>
                  <p className="lp-privacy-text">
                    Your Google account information is never sold or shared.
                    StudyGrouprr only shows your profile to students at your
                    university, and only when you choose to participate.
                  </p>
                </div>
              </div>

              <p className="lp-card-item lp-footnote">
                <GraduationCap size={12} className="lp-footnote-icon" />
                Built for university students. Your data is never sold.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

const loginStyles = `
  .lp-root * { box-sizing: border-box; }
  .lp-root {
    --indigo:      #1B1B3A;
    --violet:      #7C3AED;
    --violet-lt:   #EDE9FE;
    --violet-mid:  #A78BFA;
    --green:       #10B981;
    --green-lt:    #ECFDF5;
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
    background: var(--indigo);
    background-image:
      radial-gradient(circle at 15% 20%, rgba(124,58,237,0.35), transparent 40%),
      radial-gradient(circle at 85% 80%, rgba(56,189,248,0.18), transparent 45%);
  }

  .lp-grid {
    width: 100%;
    max-width: 1100px;
    display: grid;
    grid-template-columns: 1.1fr 1fr;
    gap: 48px;
    align-items: center;
  }

  /* Left side */
  .lp-left {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .lp-eyebrow {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--violet-mid);
    margin: 0 0 12px;
  }
  .lp-title {
    font-size: 44px;
    font-weight: 700;
    color: #fff;
    line-height: 1.1;
    margin: 0 0 14px;
  }
  .lp-subtitle {
    font-size: 15px;
    color: rgba(255,255,255,0.6);
    line-height: 1.5;
    margin: 0;
    max-width: 420px;
  }

  .lp-floating-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 20px;
    box-shadow: 0 8px 32px rgba(27,27,58,0.12);
  }
  .lp-floating-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 14px;
  }
  .lp-student-notice {
  display: flex;
  align-items: center;
  gap: 8px;

  background: #ede9fe;
  border: 1px solid #c4b5fd;

  border-radius: 14px;
  padding: 12px 14px;

  margin-bottom: 18px;

  color: var(--violet);
  font-size: 13px;
  font-weight: 500;
}
  .lp-floating-header--green { color: var(--green); }
  .lp-floating-header--violet { color: var(--violet); }

  .lp-floating-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .lp-floating-row {
    background: var(--bg);
    border-radius: 14px;
    padding: 12px 14px;
  }
  .lp-floating-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    margin: 0;
  }
  .lp-floating-sub {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--faint);
    margin: 4px 0 0;
  }

  .lp-feature-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 13px;
    color: var(--muted);
  }
  .lp-feature-list li {
    background: var(--bg);
    border-radius: 10px;
    padding: 8px 12px;
  }

  /* Right side / login card */
  .lp-right {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .lp-card {
    width: 100%;
    max-width: 420px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 36px 32px;
    box-shadow: 0 8px 32px rgba(27,27,58,0.12);
  }
  .lp-card-header {
    text-align: center;
    margin-bottom: 24px;
  }
  .lp-card-eyebrow {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--violet);
    margin: 0 0 6px;
  }
  .lp-card-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--text);
    margin: 0 0 10px;
  }
  .lp-card-subtitle {
    font-size: 14px;
    color: var(--muted);
    line-height: 1.5;
    margin: 0;
  }

  .lp-button-wrap {
    display: flex;
    justify-content: center;
    margin-bottom: 24px;
  }

  .lp-privacy-box {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: var(--green-lt);
    border: 1px solid #A7F3D0;
    border-radius: 14px;
    padding: 14px;
    margin-bottom: 20px;
  }
  .lp-privacy-icon {
    color: var(--green);
    flex-shrink: 0;
    margin-top: 2px;
  }
  .lp-privacy-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--text);
    margin: 0 0 4px;
  }
  .lp-privacy-text {
    font-size: 12px;
    color: var(--muted);
    line-height: 1.5;
    margin: 0;
  }

  .lp-footnote {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    text-align: center;
    font-size: 12px;
    color: var(--faint);
    margin: 0;
  }
  .lp-footnote-icon { color: var(--violet-mid); flex-shrink: 0; }

  @media (max-width: 860px) {
    .lp-grid { grid-template-columns: 1fr; gap: 32px; }
    .lp-left { display: none; }
    .lp-title { font-size: 32px; }
  }

  @media (max-width: 520px) {
    .lp-card { padding: 28px 20px; }
  }
`;