"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  BookOpen,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Plus,
  Radio,
  User,
  Users,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";

const navigationItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/sessions",
    label: "Sessions",
    icon: BookOpen,
  },
  {
    href: "/buddies",
    label: "Buddies",
    icon: Users,
  },
] as const;

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const { profile, loading } = useProfile();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const profileInitial =
      profile?.name?.trim().charAt(0).toUpperCase() || "S";

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!profile?.id) {
      setPendingRequests(0);
      setIsLive(false);
      return;
    }

    let active = true;

    async function loadNavbarState() {
      const [requestsResult, liveResult] = await Promise.all([
        supabase
            .from("friendships")
            .select("requester_id", {
              count: "exact",
              head: true,
            })
            .eq("receiver_id", profile!.id)
            .eq("status", "pending"),

        supabase
            .from("live_study_status")
            .select("id")
            .eq("user_id", profile!.id)
            .maybeSingle(),
      ]);

      if (!active) {
        return;
      }

      if (requestsResult.error) {
        console.error(
            "Unable to load pending buddy requests:",
            requestsResult.error
        );
      } else {
        setPendingRequests(requestsResult.count ?? 0);
      }

      if (liveResult.error) {
        console.error(
            "Unable to load live study status:",
            liveResult.error
        );
      } else {
        setIsLive(Boolean(liveResult.data));
      }
    }

    function refreshBuddyRequests() {
      void loadNavbarState();
    }

    function refreshLiveStatus() {
      void loadNavbarState();
    }

    void loadNavbarState();

    window.addEventListener(
        "buddy-requests-changed",
        refreshBuddyRequests
    );

    window.addEventListener(
        "live-status-changed",
        refreshLiveStatus
    );

    return () => {
      active = false;

      window.removeEventListener(
          "buddy-requests-changed",
          refreshBuddyRequests
      );

      window.removeEventListener(
          "live-status-changed",
          refreshLiveStatus
      );
    };
  }, [profile?.id]);

  function isRouteActive(href: string) {
    if (href === "/dashboard") {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  async function signOut() {
    if (signingOut) {
      return;
    }

    setSigningOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setMobileOpen(false);
      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("Unable to sign out:", error);
      setSigningOut(false);
    }
  }

  return (
      <>
        <style>{navbarStyles}</style>

        <header className="nb-header">
          <nav className="nb-nav" aria-label="Main navigation">
            <Link
                href={profile ? "/dashboard" : "/"}
                className="nb-brand"
                aria-label="StudyGrouprr home"
            >
            <span className="nb-brand-icon" aria-hidden="true">
              <BookOpen size={18} strokeWidth={2.4} />
            </span>

              <span className="nb-brand-name">StudyGrouprr</span>
            </Link>

            {profile && (
                <div className="nb-desktop-links">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const activeRoute = isRouteActive(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={[
                              "nb-link",
                              activeRoute ? "nb-link--active" : "",
                            ]
                                .filter(Boolean)
                                .join(" ")}
                            aria-current={activeRoute ? "page" : undefined}
                        >
                          <Icon size={15} />

                          <span>{item.label}</span>

                          {item.href === "/buddies" &&
                              pendingRequests > 0 && (
                                  <span
                                      className="nb-notification"
                                      aria-label={`${pendingRequests} pending buddy ${
                                          pendingRequests === 1
                                              ? "request"
                                              : "requests"
                                      }`}
                                  >
                          {pendingRequests > 9
                              ? "9+"
                              : pendingRequests}
                        </span>
                              )}
                        </Link>
                    );
                  })}
                </div>
            )}

            <div className="nb-desktop-actions">
              {profile ? (
                  <>
                    <Link
                        href="/live"
                        className={[
                          "nb-live-button",
                          isLive ? "nb-live-button--active" : "",
                        ]
                            .filter(Boolean)
                            .join(" ")}
                    >
                  <span
                      className={[
                        "nb-live-dot",
                        isLive ? "nb-live-dot--active" : "",
                      ]
                          .filter(Boolean)
                          .join(" ")}
                      aria-hidden="true"
                  />

                      {isLive ? "You’re live" : "Go live"}
                    </Link>

                    <Link
                        href="/create-session"
                        className="nb-create-button"
                    >
                      <Plus size={16} strokeWidth={2.5} />
                      Create
                    </Link>

                    <Link
                        href="/profile"
                        className={[
                          "nb-profile-link",
                          isRouteActive("/profile")
                              ? "nb-profile-link--active"
                              : "",
                        ]
                            .filter(Boolean)
                            .join(" ")}
                        aria-label="Open profile"
                    >
                      {profile.avatar_url ? (
                          <img
                              src={profile.avatar_url}
                              alt=""
                              className="nb-avatar"
                              referrerPolicy="no-referrer"
                          />
                      ) : (
                          <span className="nb-avatar-fallback">
                      {profileInitial}
                    </span>
                      )}
                    </Link>

                    <button
                        type="button"
                        onClick={() => void signOut()}
                        className="nb-logout-button"
                        disabled={signingOut}
                        aria-label="Sign out"
                        title="Sign out"
                    >
                      <LogOut size={17} />
                    </button>
                  </>
              ) : (
                  !loading && (
                      <Link href="/login" className="nb-login-button">
                        Sign in
                        <LogIn size={16} />
                      </Link>
                  )
              )}
            </div>

            <button
                type="button"
                className="nb-menu-button"
                onClick={() => setMobileOpen((current) => !current)}
                aria-expanded={mobileOpen}
                aria-controls="study-grouprr-mobile-menu"
                aria-label={
                  mobileOpen
                      ? "Close navigation menu"
                      : "Open navigation menu"
                }
            >
              {mobileOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </nav>

          {mobileOpen && (
              <div
                  id="study-grouprr-mobile-menu"
                  className="nb-mobile-menu"
              >
                {profile ? (
                    <>
                      <div className="nb-mobile-profile">
                        <div className="nb-mobile-avatar-wrap">
                          {profile.avatar_url ? (
                              <img
                                  src={profile.avatar_url}
                                  alt=""
                                  className="nb-mobile-avatar"
                                  referrerPolicy="no-referrer"
                              />
                          ) : (
                              <span className="nb-mobile-avatar-fallback">
                        {profileInitial}
                      </span>
                          )}
                        </div>

                        <div className="nb-mobile-profile-copy">
                          <p className="nb-mobile-name">
                            {profile.name || "Student"}
                          </p>

                          <p className="nb-mobile-university">
                            {profile.university || "StudyGrouprr"}
                          </p>
                        </div>

                        <Link
                            href="/profile"
                            className="nb-mobile-profile-link"
                            aria-label="Open profile"
                        >
                          <User size={17} />
                        </Link>
                      </div>

                      <div className="nb-mobile-divider" />

                      <div className="nb-mobile-links">
                        {navigationItems.map((item) => {
                          const Icon = item.icon;
                          const activeRoute = isRouteActive(item.href);

                          return (
                              <Link
                                  key={item.href}
                                  href={item.href}
                                  className={[
                                    "nb-mobile-link",
                                    activeRoute
                                        ? "nb-mobile-link--active"
                                        : "",
                                  ]
                                      .filter(Boolean)
                                      .join(" ")}
                                  aria-current={
                                    activeRoute ? "page" : undefined
                                  }
                              >
                                <Icon size={17} />

                                <span>{item.label}</span>

                                {item.href === "/buddies" &&
                                    pendingRequests > 0 && (
                                        <span className="nb-mobile-notification">
                              {pendingRequests > 9
                                  ? "9+"
                                  : pendingRequests}
                            </span>
                                    )}
                              </Link>
                          );
                        })}
                      </div>

                      <div className="nb-mobile-divider" />

                      <div className="nb-mobile-actions">
                        <Link
                            href="/live"
                            className={[
                              "nb-mobile-action",
                              "nb-mobile-action--live",
                              isLive
                                  ? "nb-mobile-action--live-active"
                                  : "",
                            ]
                                .filter(Boolean)
                                .join(" ")}
                        >
                          <Radio size={17} />

                          {isLive ? "You’re live" : "Go live"}
                        </Link>

                        <Link
                            href="/create-session"
                            className="nb-mobile-action nb-mobile-action--create"
                        >
                          <Plus size={17} strokeWidth={2.5} />
                          Create session
                        </Link>

                        <button
                            type="button"
                            onClick={() => void signOut()}
                            className="nb-mobile-logout"
                            disabled={signingOut}
                        >
                          <LogOut size={17} />

                          {signingOut
                              ? "Signing out…"
                              : "Sign out"}
                        </button>
                      </div>
                    </>
                ) : (
                    !loading && (
                        <div className="nb-mobile-guest">
                          <p>Find classmates and study together.</p>

                          <Link
                              href="/login"
                              className="nb-mobile-action nb-mobile-action--create"
                          >
                            Sign in
                            <LogIn size={17} />
                          </Link>
                        </div>
                    )
                )}
              </div>
          )}
        </header>
      </>
  );
}

const navbarStyles = `
  .nb-header {
    --nb-indigo: #1b1b3a;
    --nb-violet: #7c3aed;
    --nb-violet-dark: #6d28d9;
    --nb-violet-light: #f5f3ff;
    --nb-green: #10b981;
    --nb-green-light: #ecfdf5;
    --nb-red: #ef4444;
    --nb-red-light: #fef2f2;
    --nb-border: #e7e5ef;
    --nb-border-strong: #d9d6e7;
    --nb-text: #1b1b3a;
    --nb-muted: #64748b;
    --nb-faint: #94a3b8;
    --nb-surface: #ffffff;

    position: sticky;
    top: 0;
    z-index: 50;
    width: 100%;
    border-bottom: 1px solid rgba(231, 229, 239, 0.85);
    background: rgba(248, 247, 252, 0.9);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
  }

  .nb-header *,
  .nb-header *::before,
  .nb-header *::after {
    box-sizing: border-box;
  }

  .nb-nav {
    display: flex;
    width: min(1160px, calc(100% - 40px));
    min-height: 68px;
    margin: 0 auto;
    align-items: center;
    gap: 18px;
  }

  .nb-brand {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 10px;
    color: var(--nb-indigo);
    text-decoration: none;
  }

  .nb-brand-icon {
    display: grid;
    width: 34px;
    height: 34px;
    place-items: center;
    border-radius: 11px;
    background: var(--nb-indigo);
    color: white;
    box-shadow: 0 6px 16px rgba(27, 27, 58, 0.12);
  }

  .nb-brand-name {
    font-size: 16px;
    font-weight: 760;
    letter-spacing: -0.025em;
  }

  .nb-desktop-links {
    display: flex;
    align-items: center;
    gap: 3px;
    margin-left: 14px;
  }

  .nb-link {
    position: relative;
    display: inline-flex;
    min-height: 38px;
    align-items: center;
    gap: 7px;
    padding: 0 11px;
    border-radius: 10px;
    color: var(--nb-muted);
    font-size: 13px;
    font-weight: 580;
    text-decoration: none;
    transition:
      background 150ms ease,
      color 150ms ease;
  }

  .nb-link:hover {
    background: rgba(255, 255, 255, 0.8);
    color: var(--nb-indigo);
  }

  .nb-link--active {
    background: var(--nb-violet-light);
    color: var(--nb-violet);
  }

  .nb-link--active:hover {
    background: #ede9fe;
    color: var(--nb-violet-dark);
  }

  .nb-notification,
  .nb-mobile-notification {
    display: inline-flex;
    min-width: 17px;
    height: 17px;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    border-radius: 999px;
    background: var(--nb-red);
    color: white;
    font-size: 9px;
    font-weight: 750;
    line-height: 1;
  }

  .nb-desktop-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }

  .nb-live-button,
  .nb-create-button,
  .nb-login-button {
    display: inline-flex;
    min-height: 38px;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 680;
    text-decoration: none;
    transition:
      background 150ms ease,
      border-color 150ms ease,
      color 150ms ease,
      transform 150ms ease,
      box-shadow 150ms ease;
  }

  .nb-live-button {
    gap: 7px;
    padding: 0 12px;
    border: 1px solid #d1fae5;
    background: rgba(236, 253, 245, 0.72);
    color: #047857;
  }

  .nb-live-button:hover,
  .nb-live-button--active {
    border-color: #a7f3d0;
    background: var(--nb-green-light);
  }

  .nb-live-dot {
    width: 7px;
    height: 7px;
    border: 1.5px solid #059669;
    border-radius: 50%;
    background: transparent;
  }

  .nb-live-dot--active {
    border-color: var(--nb-green);
    background: var(--nb-green);
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
  }

  .nb-create-button,
  .nb-login-button {
    gap: 7px;
    padding: 0 14px;
    background: var(--nb-violet);
    color: white;
    box-shadow: 0 7px 18px rgba(124, 58, 237, 0.17);
  }

  .nb-create-button:hover,
  .nb-login-button:hover {
    transform: translateY(-1px);
    background: var(--nb-violet-dark);
    box-shadow: 0 10px 23px rgba(124, 58, 237, 0.22);
  }

  .nb-profile-link {
    display: grid;
    width: 38px;
    height: 38px;
    place-items: center;
    overflow: hidden;
    border: 1px solid var(--nb-border);
    border-radius: 12px;
    background: var(--nb-surface);
    text-decoration: none;
    transition:
      border-color 150ms ease,
      box-shadow 150ms ease;
  }

  .nb-profile-link:hover,
  .nb-profile-link--active {
    border-color: #c4b5fd;
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.08);
  }

  .nb-avatar,
  .nb-avatar-fallback {
    width: 100%;
    height: 100%;
  }

  .nb-avatar {
    display: block;
    object-fit: cover;
  }

  .nb-avatar-fallback {
    display: grid;
    place-items: center;
    background: var(--nb-violet-light);
    color: var(--nb-violet);
    font-size: 13px;
    font-weight: 750;
  }

  .nb-logout-button {
    display: grid;
    width: 36px;
    height: 36px;
    place-items: center;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: var(--nb-faint);
    cursor: pointer;
    transition:
      background 150ms ease,
      color 150ms ease;
  }

  .nb-logout-button:hover {
    background: var(--nb-red-light);
    color: var(--nb-red);
  }

  .nb-logout-button:disabled,
  .nb-mobile-logout:disabled {
    cursor: wait;
    opacity: 0.55;
  }

  .nb-menu-button {
    display: none;
    width: 40px;
    height: 40px;
    margin-left: auto;
    place-items: center;
    border: 1px solid var(--nb-border);
    border-radius: 11px;
    background: var(--nb-surface);
    color: var(--nb-indigo);
    cursor: pointer;
  }

  .nb-mobile-menu {
    width: min(1160px, calc(100% - 32px));
    margin: 0 auto 12px;
    padding: 16px;
    border: 1px solid var(--nb-border);
    border-radius: 17px;
    background: rgba(255, 255, 255, 0.98);
    box-shadow: 0 20px 50px rgba(27, 27, 58, 0.12);
    animation: nb-menu-enter 180ms ease-out both;
  }

  .nb-mobile-profile {
    display: flex;
    align-items: center;
    gap: 11px;
  }

  .nb-mobile-avatar-wrap {
    width: 42px;
    height: 42px;
    flex: 0 0 auto;
    overflow: hidden;
    border: 1px solid var(--nb-border);
    border-radius: 13px;
  }

  .nb-mobile-avatar,
  .nb-mobile-avatar-fallback {
    width: 100%;
    height: 100%;
  }

  .nb-mobile-avatar {
    display: block;
    object-fit: cover;
  }

  .nb-mobile-avatar-fallback {
    display: grid;
    place-items: center;
    background: var(--nb-violet-light);
    color: var(--nb-violet);
    font-size: 14px;
    font-weight: 750;
  }

  .nb-mobile-profile-copy {
    min-width: 0;
    flex: 1;
  }

  .nb-mobile-name {
    overflow: hidden;
    margin: 0;
    color: var(--nb-indigo);
    font-size: 14px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .nb-mobile-university {
    overflow: hidden;
    margin: 3px 0 0;
    color: var(--nb-faint);
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .nb-mobile-profile-link {
    display: grid;
    width: 36px;
    height: 36px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 10px;
    background: var(--nb-violet-light);
    color: var(--nb-violet);
  }

  .nb-mobile-divider {
    height: 1px;
    margin: 14px 0;
    background: var(--nb-border);
  }

  .nb-mobile-links,
  .nb-mobile-actions {
    display: grid;
    gap: 5px;
  }

  .nb-mobile-link {
    display: flex;
    min-height: 43px;
    align-items: center;
    gap: 10px;
    padding: 0 12px;
    border-radius: 11px;
    color: var(--nb-muted);
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
  }

  .nb-mobile-link span:nth-child(2) {
    flex: 1;
  }

  .nb-mobile-link:hover,
  .nb-mobile-link--active {
    background: var(--nb-violet-light);
    color: var(--nb-violet);
  }

  .nb-mobile-action,
  .nb-mobile-logout {
    display: flex;
    min-height: 45px;
    width: 100%;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 11px;
    font-size: 13px;
    font-weight: 680;
    text-decoration: none;
  }

  .nb-mobile-action--live {
    border: 1px solid #a7f3d0;
    background: var(--nb-green-light);
    color: #047857;
  }

  .nb-mobile-action--live-active {
    box-shadow: inset 3px 0 0 var(--nb-green);
  }

  .nb-mobile-action--create {
    border: 1px solid var(--nb-violet);
    background: var(--nb-violet);
    color: white;
  }

  .nb-mobile-logout {
    margin-top: 4px;
    border: 1px solid #fecaca;
    background: white;
    color: var(--nb-red);
    cursor: pointer;
  }

  .nb-mobile-guest {
    display: grid;
    gap: 14px;
    text-align: center;
  }

  .nb-mobile-guest p {
    margin: 0;
    color: var(--nb-muted);
    font-size: 13px;
  }

  .nb-link:focus-visible,
  .nb-brand:focus-visible,
  .nb-live-button:focus-visible,
  .nb-create-button:focus-visible,
  .nb-login-button:focus-visible,
  .nb-profile-link:focus-visible,
  .nb-logout-button:focus-visible,
  .nb-menu-button:focus-visible,
  .nb-mobile-link:focus-visible,
  .nb-mobile-action:focus-visible,
  .nb-mobile-logout:focus-visible {
    outline: 3px solid rgba(124, 58, 237, 0.22);
    outline-offset: 2px;
  }

  @keyframes nb-menu-enter {
    from {
      opacity: 0;
      transform: translateY(-6px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 860px) {
    .nb-desktop-links,
    .nb-desktop-actions {
      display: none;
    }

    .nb-menu-button {
      display: grid;
    }
  }

  @media (max-width: 520px) {
    .nb-nav {
      width: calc(100% - 28px);
      min-height: 64px;
    }

    .nb-brand-name {
      font-size: 15px;
    }

    .nb-brand-icon {
      width: 32px;
      height: 32px;
      border-radius: 10px;
    }

    .nb-mobile-menu {
      width: calc(100% - 24px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .nb-mobile-menu {
      animation: none;
    }

    .nb-link,
    .nb-live-button,
    .nb-create-button,
    .nb-login-button,
    .nb-profile-link,
    .nb-logout-button {
      transition: none;
    }

    .nb-create-button:hover,
    .nb-login-button:hover {
      transform: none;
    }
  }
`;