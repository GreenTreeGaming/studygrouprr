"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/useProfile";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import {
  Plus,
  Radio,
  LayoutDashboard,
  BookOpen,
  Users,
  X,
  Menu,
  User,
} from "lucide-react";

export default function Navbar() {
  const { profile, loading } = useProfile();
  const router = useRouter();

  const navRef = useRef<HTMLElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);

  useEffect(() => {
    if (!profile) return;

    loadPendingRequests();

    const refreshRequests = () => {
      loadPendingRequests();
    };

    window.addEventListener(
        "buddy-requests-changed",
        refreshRequests
    );

    return () => {
      window.removeEventListener(
          "buddy-requests-changed",
          refreshRequests
      );
    };
  }, [profile]);

  async function loadPendingRequests() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { count } = await supabase
        .from("friendships")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("receiver_id", user.id)
        .eq("status", "pending");

    setPendingRequests(count || 0);
  }

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".nav-item", {
        opacity: 0,
        y: -12,
        duration: 0.6,
        stagger: 0.07,
        ease: "power3.out",
      });
    }, navRef);

    return () => ctx.revert();
  }, []);

  const [isLive, setIsLive] = useState(false);
  useEffect(() => {
    if (!profile) return;

    checkLiveStatus();

    const handleLiveStatusChange = () => {
      checkLiveStatus();
    };

    window.addEventListener(
      "live-status-changed",
      handleLiveStatusChange
    );

    return () => {
      window.removeEventListener(
        "live-status-changed",
        handleLiveStatusChange
      );
    };
  }, [profile]);

  async function checkLiveStatus() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("live_study_status")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error(error);
      return;
    }

    setIsLive(!!data);
  }

  useEffect(() => {
    if (!mobileMenuRef.current) return;
    if (mobileOpen) {
      gsap.fromTo(
        mobileMenuRef.current,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.25, ease: "power3.out" }
      );
    }
  }, [mobileOpen]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <style>{navStyles}</style>
      <header ref={navRef} className="nb-header">
        <nav className="nb-nav">

          {/* Logo */}
          <Link
            href={profile ? "/dashboard" : "/"}
            className="nav-item nb-logo"
          >
            Study<span className="nb-logo-accent">Grouprr</span>
          </Link>

          {/* Desktop center links */}
          {profile && (
            <div className="nb-links">
              <Link href="/dashboard" className="nav-item nb-link">
                <LayoutDashboard size={15} />
                Dashboard
              </Link>

              <Link href="/sessions" className="nav-item nb-link">
                <BookOpen size={15} />
                Sessions
              </Link>

              <Link href="/buddies" className="nav-item nb-link nb-link-buddies">
                <Users size={15} />

                <span className="nb-buddies-label">
    Buddies

                  {pendingRequests > 0 && (
                      <span className="nb-notification">
        {pendingRequests}
      </span>
                  )}
  </span>
              </Link>
            </div>
          )}

          {/* Desktop right */}
          <div className="nb-right">
            {profile ? (
              <>
                <Link href="/live" className="nav-item nb-btn-live">
                  {isLive ? "You Are Live" : "Go Live"}
                </Link>

                <Link href="/create-session" className="nav-item nb-btn-create">
                  <Plus size={16} strokeWidth={2.5} />
                  Create
                </Link>

                <Link href="/profile" className="nav-item nb-avatar-wrap">
                  <img
                    src={profile.avatar_url}
                    alt={profile.name}
                    className="nb-avatar"
                  />
                </Link>

                <button onClick={signOut} className="nav-item nb-logout">
                  Logout
                </button>
              </>
            ) : (
              !loading && (
                <Link href="/login" className="nav-item nb-btn-create">
                  Login
                </Link>
              )
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="nb-hamburger md-hide"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>

        {/* Mobile menu */}
        {mobileOpen && (
          <div ref={mobileMenuRef} className="nb-mobile">
            {profile ? (
              <>
                <div className="nb-mobile-user">
                  <img src={profile.avatar_url} alt={profile.name} className="nb-mobile-avatar" />
                  <div>
                    <p className="nb-mobile-name">{profile.name}</p>
                  </div>
                </div>

                <div className="nb-mobile-divider" />

                <Link href="/dashboard" className="nb-mobile-link" onClick={() => setMobileOpen(false)}>
                  <LayoutDashboard size={16} />
                  Dashboard
                </Link>
                <Link href="/sessions" className="nb-mobile-link" onClick={() => setMobileOpen(false)}>
                  <BookOpen size={16} />
                  Sessions
                </Link>
                <Link
                    href="/buddies"
                    className="nb-mobile-link"
                >
                  <Users size={16} />
                  Study Buddies

                  {pendingRequests > 0 && (
                      <span className="nb-notification">
      {pendingRequests}
    </span>
                  )}
                </Link>
                <Link
                  href="/profile"
                  className="nb-mobile-link"
                  onClick={() => setMobileOpen(false)}
                >
                  <User size={16} />
                  Profile
                </Link>

                <div className="nb-mobile-divider" />

                <Link
                  href="/live"
                  className="nb-mobile-btn nb-mobile-btn--live"
                  onClick={() => setMobileOpen(false)}
                >
                  {isLive && <span className="nb-live-dot" />}
                  {isLive ? "You Are Live" : "Go Live"}
                </Link>
                <Link href="/create-session" className="nb-mobile-btn nb-mobile-btn--create" onClick={() => setMobileOpen(false)}>
                  <Plus size={16} strokeWidth={2.5} />
                  Create Session
                </Link>

                <button onClick={signOut} className="nb-mobile-logout">
                  Logout
                </button>
              </>
            ) : (
              !loading && (
                <Link href="/login" className="nb-mobile-btn nb-mobile-btn--create">
                  Login
                </Link>
              )
            )}
          </div>
        )}
      </header>
    </>
  );
}

const navStyles = `
  /* ── Tokens (match dashboard) ── */
  .nb-header {
    --indigo:     #1B1B3A;
    --violet:     #7C3AED;
    --violet-lt:  #EDE9FE;
    --violet-mid: #A78BFA;
    --green:      #10B981;
    --red:        #EF4444;
    --border:     #E4E2F0;
    --text:       #1B1B3A;
    --muted:      #64748B;
    --surface:    #FFFFFF;

    position: sticky;
    top: 0;
    z-index: 50;
    padding: 12px 16px;
  }

  /* ── Nav bar ── */
  .nb-nav {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255,255,255,0.82);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 10px 16px;
    box-shadow: 0 4px 24px rgba(27,27,58,0.08);
  }

  /* ── Logo ── */
  .nb-logo {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: var(--indigo);
    text-decoration: none;
    flex-shrink: 0;
  }
  .nb-logo-accent { color: var(--violet); }

  /* ── Center links ── */
  .nb-links {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-left: 16px;
    flex: 1;
  }
  .nb-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 500;
    color: var(--muted);
    text-decoration: none;
    padding: 7px 12px;
    border-radius: 10px;
    transition: color 0.15s, background 0.15s;
  }
  .nb-link:hover {
    color: var(--violet);
    background: var(--violet-lt);
  }

  /* ── Right side ── */
  .nb-right {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }

  /* Go Live button */
  .nb-btn-live {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    font-weight: 600;
    color: var(--green);
    background: #ECFDF5;
    border: 1px solid #A7F3D0;
    padding: 7px 14px;
    border-radius: 10px;
    text-decoration: none;
    transition: background 0.15s, border-color 0.15s;
  }
  .nb-btn-live:hover {
    background: #D1FAE5;
    border-color: #6EE7B7;
  }

  /* Live dot */
  .nb-live-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--green);
    position: relative;
    flex-shrink: 0;
  }
  .nb-live-dot::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    background: var(--green);
    opacity: 0.35;
    animation: nb-pulse 1.4s ease-out infinite;
  }
  @keyframes nb-pulse {
    0%   { transform: scale(1); opacity: 0.35; }
    70%  { transform: scale(2.2); opacity: 0; }
    100% { transform: scale(1); opacity: 0; }
  }

  /* Create button */
  .nb-btn-create {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #fff;
    background: var(--violet);
    padding: 7px 14px;
    border-radius: 10px;
    text-decoration: none;
    transition: background 0.15s, transform 0.1s;
  }
  .nb-btn-create:hover {
    background: #6D28D9;
    transform: translateY(-1px);
  }

  /* Avatar */
  .nb-avatar-wrap {
    display: flex;
    align-items: center;
    text-decoration: none;
  }
  .nb-avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 2px solid var(--border);
    object-fit: cover;
    transition: border-color 0.15s, transform 0.15s;
  }
  .nb-avatar-wrap:hover .nb-avatar {
    border-color: var(--violet-mid);
    transform: scale(1.05);
  }

  /* Logout */
  .nb-logout {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    color: var(--muted);
    padding: 7px 10px;
    border-radius: 8px;
    transition: color 0.15s, background 0.15s;
  }
  .nb-logout:hover {
    color: var(--red);
    background: #FEF2F2;
  }

  /* ── Hamburger ── */
  .nb-hamburger {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--indigo);
    padding: 6px;
    border-radius: 8px;
    margin-left: auto;
    display: none;
    transition: background 0.15s;
  }
  .nb-hamburger:hover { background: var(--violet-lt); color: var(--violet); }

  /* ── Mobile menu ── */
  .nb-mobile {
    max-width: 1100px;
    margin: 8px auto 0;
    background: rgba(255,255,255,0.96);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 16px;
    box-shadow: 0 8px 32px rgba(27,27,58,0.1);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .nb-mobile-user {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 4px 4px 12px;
  }
  .nb-mobile-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid var(--border);
    object-fit: cover;
  }
  .nb-mobile-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--indigo);
    margin: 0;
  }

  .nb-mobile-divider {
    height: 1px;
    background: var(--border);
    margin: 8px 0;
  }

  .nb-mobile-link {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    font-weight: 500;
    color: var(--muted);
    text-decoration: none;
    padding: 10px 12px;
    border-radius: 10px;
    transition: color 0.15s, background 0.15s;
  }
  .nb-mobile-link:hover {
    color: var(--violet);
    background: var(--violet-lt);
  }
  .nb-mobile-link-icon { font-size: 16px; }

  .nb-mobile-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    padding: 11px;
    border-radius: 12px;
    text-decoration: none;
    transition: background 0.15s;
    margin-top: 4px;
  }
  .nb-mobile-btn--live {
    color: var(--green);
    background: #ECFDF5;
    border: 1px solid #A7F3D0;
  }
  .nb-mobile-btn--live:hover { background: #D1FAE5; }
  .nb-mobile-btn--create {
    color: #fff;
    background: var(--violet);
  }
  .nb-mobile-btn--create:hover { background: #6D28D9; }

  .nb-mobile-logout {
    background: none;
    border: 1px solid var(--border);
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: var(--red);
    padding: 10px;
    border-radius: 12px;
    margin-top: 4px;
    transition: background 0.15s, border-color 0.15s;
    width: 100%;
  }
  .nb-mobile-logout:hover {
    background: #FEF2F2;
    border-color: #FECACA;
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .nb-links, .nb-right { display: none; }
    .nb-hamburger { display: flex; }
  }

  @media (prefers-reduced-motion: reduce) {
    .nb-live-dot::after { animation: none; }
    .nb-btn-create:hover { transform: none; }
  }
  
  .nb-link-buddies {
  position: relative;
}

.nb-notification {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  min-width: 16px;
  height: 16px;

  padding: 0 4px;

  border-radius: 999px;

  background: #EF4444;
  color: white;

  font-size: 10px;
  font-weight: 700;

  line-height: 1;
}

.nb-buddies-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

@keyframes nb-badge-pulse {
  0%,100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.08);
  }
}
`;