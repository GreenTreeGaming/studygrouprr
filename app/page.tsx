"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { gsap } from "gsap";

import {
  Users,
  BookOpen,
  GraduationCap,
  Radio,
  MapPin,
  Clock,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUser(user);

      await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        name: user.user_metadata.full_name,
        avatar_url: user.user_metadata.avatar_url,
      });

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profile?.onboarding_complete) {
        router.push("/onboarding");
        return;
      }

      router.push("/dashboard");
    }

    loadUser().finally(() => {
      setLoading(false);
    });
  }, [router]);

  useEffect(() => {
    if (loading || user) return;

    const ctx = gsap.context(() => {
      gsap.from(".hp-item", {
        opacity: 0,
        y: 24,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
      });

      gsap.from(".hp-floating-card", {
        opacity: 0,
        y: 30,
        duration: 0.8,
        stagger: 0.15,
        delay: 0.2,
        ease: "power3.out",
      });

      gsap.to(".hp-floating-card", {
        y: -10,
        duration: 2.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.25,
      });

      gsap.from(".hp-section", {
        opacity: 0,
        y: 24,
        duration: 0.7,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: undefined,
      });
    });

    return () => ctx.revert();
  }, [loading, user]);

  if (loading) {
    return (
      <>
        <style>{homeStyles}</style>
        <main className="hp-loading-screen">
          <div className="hp-loading-spinner" />
          <p className="hp-loading-text">Loading…</p>
        </main>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <style>{homeStyles}</style>
        <main className="hp-root">
          {/* Hero */}
          <header className="hp-hero-bar">
            <div className="hp-hero-inner">
              <div className="hp-hero-left">
                <h1 className="hp-item hp-hero-title">
                  Find classmates.
                  <br />
                  Study together.
                </h1>
                <p className="hp-item hp-hero-subtitle">
                  Discover classmates at your university who are studying the
                  same course, hosting study sessions, or studying live right
                  now.
                </p>

                <div className="hp-item hp-hero-actions">
                  <Link href="/login" className="hp-cta">
                    Get started <ArrowRight size={18} />
                  </Link>
                  <div className="hp-cta-note">
                    Find people studying your course today.
                  </div>
                </div>

                <div className="hp-item hp-stat-row">
                  <div className="hp-stat">
                    <Users size={18} className="hp-stat-icon" />
                    <div>
                      <p className="hp-stat-value">Live</p>
                      <p className="hp-stat-label">Students studying</p>
                    </div>
                  </div>
                  <div className="hp-stat">
                    <BookOpen size={18} className="hp-stat-icon" />
                    <div>
                      <p className="hp-stat-value">Course</p>
                      <p className="hp-stat-label">Communities</p>
                    </div>
                  </div>
                  <div className="hp-stat">
                    <GraduationCap size={18} className="hp-stat-icon" />
                    <div>
                      <p className="hp-stat-value">Campus</p>
                      <p className="hp-stat-label">Discovery</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating preview cards */}
              <div className="hp-hero-right">
                <div className="hp-floating-card">
                  <div className="hp-floating-header hp-floating-header--green">
                    <Radio size={16} />
                    <span>Students live right now</span>
                  </div>

                  <div className="hp-floating-list">
                    <div className="hp-floating-row">
                      <div className="hp-floating-row-left">
                        <p className="hp-floating-name">Sarah</p>
                        <p className="hp-floating-sub">
                          <MapPin size={11} /> Memorial Library
                        </p>
                      </div>
                      <span className="hp-tag">CS400</span>
                    </div>
                    <div className="hp-floating-row">
                      <div className="hp-floating-row-left">
                        <p className="hp-floating-name">Alex</p>
                        <p className="hp-floating-sub">
                          <MapPin size={11} /> College Library
                        </p>
                      </div>
                      <span className="hp-tag">MATH340</span>
                    </div>
                  </div>
                </div>

                <div className="hp-floating-card">
                  <div className="hp-floating-header hp-floating-header--violet">
                    <BookOpen size={16} />
                    <span>Active study sessions</span>
                  </div>

                  <div className="hp-floating-list">
                    <div className="hp-floating-row">
                      <div className="hp-floating-row-left">
                        <p className="hp-floating-name">CS400 Midterm Review</p>
                        <p className="hp-floating-sub">
                          <MapPin size={11} /> Union South
                        </p>
                      </div>
                      <span className="hp-count">3 students</span>
                    </div>
                    <div className="hp-floating-row">
                      <div className="hp-floating-row-left">
                        <p className="hp-floating-name">MATH340 HW Help</p>
                        <p className="hp-floating-sub">
                          <MapPin size={11} /> Engineering Hall
                        </p>
                      </div>
                      <span className="hp-count">5 students</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="hp-page-body">
            {/* How it works */}
            <section className="hp-section">
              <h2 className="hp-section-title">How StudyGrouprr works</h2>

              <div className="hp-feature-grid">
                <div className="hp-feature-card">
                  <div className="hp-feature-icon hp-feature-icon--violet">
                    <BookOpen size={20} />
                  </div>
                  <h3 className="hp-feature-title">Find your course</h3>
                  <p className="hp-feature-text">
                    Browse course communities and see every active study
                    session for your classes.
                  </p>
                </div>

                <div className="hp-feature-card">
                  <div className="hp-feature-icon hp-feature-icon--green">
                    <Radio size={20} />
                  </div>
                  <h3 className="hp-feature-title">See who's live</h3>
                  <p className="hp-feature-text">
                    Discover students studying right now and find them
                    instantly.
                  </p>
                </div>

                <div className="hp-feature-card">
                  <div className="hp-feature-icon hp-feature-icon--sky">
                    <Users size={20} />
                  </div>
                  <h3 className="hp-feature-title">Meet in person</h3>
                  <p className="hp-feature-text">
                    Join sessions, meet classmates, and build real study
                    groups.
                  </p>
                </div>
              </div>
            </section>

            {/* Built for finals */}
            <section className="hp-section hp-card hp-finals-card">
              <h2 className="hp-section-title">Built for finals week</h2>

              <div className="hp-finals-grid">
                <div className="hp-finals-item">
                  <Clock size={20} className="hp-finals-icon hp-finals-icon--amber" />
                  <h3 className="hp-finals-title">Starting soon alerts</h3>
                  <p className="hp-finals-text">
                    Quickly spot sessions that are about to begin.
                  </p>
                </div>

                <div className="hp-finals-item">
                  <MapPin size={20} className="hp-finals-icon hp-finals-icon--red" />
                  <h3 className="hp-finals-title">Exact locations</h3>
                  <p className="hp-finals-text">
                    Students can share detailed locations and identification
                    notes.
                  </p>
                </div>

                <div className="hp-finals-item">
                  <GraduationCap size={20} className="hp-finals-icon hp-finals-icon--violet" />
                  <h3 className="hp-finals-title">University-specific</h3>
                  <p className="hp-finals-text">
                    Only see activity from students at your own university.
                  </p>
                </div>
              </div>
            </section>

            {/* Closing CTA */}
            <section className="hp-section hp-closing">
              <h2 className="hp-closing-title">Stop texting everyone.</h2>
              <p className="hp-closing-text">
                Open StudyGrouprr and instantly see who is studying your
                course right now.
              </p>
              <Link href="/login" className="hp-cta hp-cta--center">
                Get started <ArrowRight size={18} />
              </Link>
            </section>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <style>{homeStyles}</style>
      <main className="hp-loading-screen">
        <div className="hp-loading-spinner" />
        <p className="hp-loading-text">Redirecting…</p>
      </main>
    </>
  );
}

const homeStyles = `
  .hp-root * { box-sizing: border-box; }
  .hp-root, .hp-loading-screen {
    --indigo:      #1B1B3A;
    --violet:      #7C3AED;
    --violet-lt:   #EDE9FE;
    --violet-mid:  #A78BFA;
    --green:       #10B981;
    --green-lt:    #ECFDF5;
    --amber:       #F59E0B;
    --amber-lt:    #FEF3C7;
    --red:         #EF4444;
    --red-lt:      #FEF2F2;
    --sky:         #38BDF8;
    --bg:          #F5F4FB;
    --surface:     #FFFFFF;
    --border:      #E4E2F0;
    --text:        #1B1B3A;
    --muted:       #64748B;
    --faint:       #94A3B8;
  }
  .hp-root { background: var(--bg); min-height: 100vh; color: var(--text); }

  /* Loading */
  .hp-loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 16px;
    background: var(--bg);
  }
  .hp-loading-spinner {
    width: 36px; height: 36px;
    border: 3px solid var(--border);
    border-top-color: var(--violet);
    border-radius: 50%;
    animation: hp-spin 0.7s linear infinite;
  }
  .hp-loading-text { font-size: 14px; color: var(--muted); }
  @keyframes hp-spin { to { transform: rotate(360deg); } }

  /* Hero */
  .hp-hero-bar {
    background: var(--indigo);
    padding: 56px 24px 64px;
  }
  .hp-hero-inner {
    max-width: 1100px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1.1fr 1fr;
    gap: 48px;
    align-items: center;
  }
  .hp-hero-eyebrow {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--violet-mid);
    margin: 0 0 12px;
  }
  .hp-hero-title {
    font-size: 48px;
    font-weight: 700;
    color: #fff;
    margin: 0 0 16px;
    line-height: 1.1;
  }
  .hp-hero-subtitle {
    font-size: 16px;
    color: rgba(255,255,255,0.6);
    line-height: 1.5;
    margin: 0 0 28px;
    max-width: 460px;
  }

  .hp-hero-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    margin-bottom: 40px;
  }
  .hp-cta {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--violet);
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    padding: 13px 24px;
    border-radius: 12px;
    text-decoration: none;
    transition: background 0.15s, transform 0.1s;
  }
  .hp-cta:hover { background: #6D28D9; transform: translateY(-1px); }
  .hp-cta-note {
    font-size: 13px;
    color: rgba(255,255,255,0.55);
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 100px;
    padding: 10px 16px;
  }

  .hp-stat-row {
    display: grid;
    grid-template-columns: repeat(3, auto);
    gap: 28px;
  }
  .hp-stat {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }
  .hp-stat-icon { color: var(--violet-mid); margin-top: 2px; flex-shrink: 0; }
  .hp-stat-value {
    font-size: 18px;
    font-weight: 700;
    color: #fff;
    margin: 0;
    line-height: 1.2;
  }
  .hp-stat-label {
    font-size: 12px;
    color: rgba(255,255,255,0.5);
    margin: 2px 0 0;
  }

  /* Floating cards */
  .hp-hero-right {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .hp-floating-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 20px;
    box-shadow: 0 8px 32px rgba(27,27,58,0.12);
  }
  .hp-floating-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 14px;
  }
  .hp-floating-header--green { color: var(--green); }
  .hp-floating-header--violet { color: var(--violet); }

  .hp-floating-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .hp-floating-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: var(--bg);
    border-radius: 14px;
    padding: 12px 14px;
  }
  .hp-floating-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    margin: 0;
  }
  .hp-floating-sub {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--faint);
    margin: 4px 0 0;
  }
  .hp-tag {
    background: var(--violet-lt);
    color: var(--violet);
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 100px;
    flex-shrink: 0;
  }
  .hp-count {
    font-size: 12px;
    font-weight: 600;
    color: var(--violet);
    flex-shrink: 0;
  }

  /* Page body */
  .hp-page-body {
    max-width: 1100px;
    margin: 0 auto;
    padding: 64px 24px;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }
  .hp-section-title {
    font-size: 28px;
    font-weight: 700;
    text-align: center;
    margin: 0 0 28px;
  }

  /* Feature grid */
  .hp-feature-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
  .hp-feature-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 4px 24px rgba(27,27,58,0.08);
  }
  .hp-feature-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px; height: 40px;
    border-radius: 12px;
    margin-bottom: 14px;
  }
  .hp-feature-icon--violet { background: var(--violet-lt); color: var(--violet); }
  .hp-feature-icon--green { background: var(--green-lt); color: var(--green); }
  .hp-feature-icon--sky { background: #E0F2FE; color: #0284C7; }
  .hp-feature-title { font-size: 18px; font-weight: 700; margin: 0 0 8px; }
  .hp-feature-text { font-size: 14px; color: var(--muted); line-height: 1.5; margin: 0; }

  /* Finals card */
  .hp-finals-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 32px 24px;
    box-shadow: 0 4px 24px rgba(27,27,58,0.08);
  }
  .hp-finals-card .hp-section-title { text-align: left; margin-bottom: 24px; }
  .hp-finals-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
  .hp-finals-icon { margin-bottom: 10px; }
  .hp-finals-icon--amber { color: var(--amber); }
  .hp-finals-icon--red { color: var(--red); }
  .hp-finals-icon--violet { color: var(--violet); }
  .hp-finals-title { font-size: 15px; font-weight: 700; margin: 0 0 6px; }
  .hp-finals-text { font-size: 14px; color: var(--muted); line-height: 1.5; margin: 0; }

  /* Closing */
  .hp-closing {
    text-align: center;
    padding: 32px 0 16px;
  }
  .hp-closing-title { font-size: 32px; font-weight: 700; margin: 0 0 12px; }
  .hp-closing-text {
    font-size: 16px;
    color: var(--muted);
    margin: 0 0 24px;
  }
  .hp-cta--center { margin: 0 auto; }

  /* Responsive */
  @media (max-width: 860px) {
    .hp-hero-inner { grid-template-columns: 1fr; gap: 32px; }
    .hp-hero-title { font-size: 36px; }
    .hp-feature-grid, .hp-finals-grid { grid-template-columns: 1fr; }
    .hp-stat-row { grid-template-columns: repeat(3, 1fr); gap: 16px; }
  }
  @media (max-width: 520px) {
    .hp-hero-bar { padding: 40px 16px 48px; }
    .hp-page-body { padding: 40px 16px; }
    .hp-hero-title { font-size: 30px; }
    .hp-stat-row { grid-template-columns: 1fr; gap: 12px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .hp-cta:hover { transform: none; }
  }
`;