"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  BookOpen,
  ChevronRight,
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

const appNavigationItems = [
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

const homeNavigationItems = [
  {
    href: "#how-it-works",
    label: "How it works",
  },
  {
    href: "#campus-activity",
    label: "Campus activity",
  },
  {
    href: "#why-it-exists",
    label: "Why it exists",
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

  const isHomePage = pathname === "/";
  const isLoginPage = pathname === "/login";
  const isPublicPage = isHomePage || isLoginPage;

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

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
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

    function refreshNavbarState() {
      void loadNavbarState();
    }

    void loadNavbarState();

    window.addEventListener(
        "buddy-requests-changed",
        refreshNavbarState
    );
    window.addEventListener(
        "live-status-changed",
        refreshNavbarState
    );

    return () => {
      active = false;

      window.removeEventListener(
          "buddy-requests-changed",
          refreshNavbarState
      );
      window.removeEventListener(
          "live-status-changed",
          refreshNavbarState
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

        <header
            className={[
              "nb3-header",
              isPublicPage ? "nb3-header--public" : "",
            ]
                .filter(Boolean)
                .join(" ")}
        >
          <nav className="nb3-nav" aria-label="Main navigation">
            <Link
                href={profile ? "/dashboard" : "/"}
                className="nb3-brand"
                aria-label="StudyGrouprr home"
            >
            <span className="nb3-brand-icon" aria-hidden="true">
              <BookOpen size={18} strokeWidth={2.35} />
            </span>

              <span className="nb3-brand-copy">
              <span className="nb3-brand-name">StudyGrouprr</span>
            </span>
            </Link>

            {isHomePage && !profile ? (
                <div className="nb3-desktop-links nb3-desktop-links--public">
                  {homeNavigationItems.map((item) => (
                      <a
                          key={item.href}
                          href={item.href}
                          className="nb3-public-link"
                      >
                        {item.label}
                      </a>
                  ))}
                </div>
            ) : profile ? (
                <div className="nb3-desktop-links">
                  {appNavigationItems.map((item) => {
                    const Icon = item.icon;
                    const activeRoute = isRouteActive(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={[
                              "nb3-link",
                              activeRoute ? "nb3-link--active" : "",
                            ]
                                .filter(Boolean)
                                .join(" ")}
                            aria-current={activeRoute ? "page" : undefined}
                        >
                          <Icon size={15} strokeWidth={2.15} />
                          <span>{item.label}</span>

                          {item.href === "/buddies" &&
                              pendingRequests > 0 && (
                                  <span
                                      className="nb3-notification"
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
            ) : (
                <div className="nb3-desktop-spacer" />
            )}

            <div className="nb3-desktop-actions">
              {profile ? (
                  <>
                    <Link
                        href="/live"
                        className={[
                          "nb3-live-button",
                          isLive ? "nb3-live-button--active" : "",
                        ]
                            .filter(Boolean)
                            .join(" ")}
                    >
                  <span
                      className={[
                        "nb3-live-dot",
                        isLive ? "nb3-live-dot--active" : "",
                      ]
                          .filter(Boolean)
                          .join(" ")}
                      aria-hidden="true"
                  />

                      {isLive ? "You’re live" : "Go live"}
                    </Link>

                    <Link
                        href="/create-session"
                        className="nb3-create-button"
                    >
                      <Plus size={16} strokeWidth={2.5} />
                      Create session
                    </Link>

                    <Link
                        href="/profile"
                        className={[
                          "nb3-profile-link",
                          isRouteActive("/profile")
                              ? "nb3-profile-link--active"
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
                              className="nb3-avatar"
                              referrerPolicy="no-referrer"
                          />
                      ) : (
                          <span className="nb3-avatar-fallback">
                      {profileInitial}
                    </span>
                      )}

                      <span className="nb3-profile-indicator" />
                    </Link>

                    <button
                        type="button"
                        onClick={() => void signOut()}
                        className="nb3-logout-button"
                        disabled={signingOut}
                        aria-label="Sign out"
                        title="Sign out"
                    >
                      <LogOut size={17} />
                    </button>
                  </>
              ) : (
                  !loading && (
                      <Link href="/login" className="nb3-login-button">
                        <span>{isLoginPage ? "Back to sign in" : "Sign in"}</span>
                        <LogIn size={16} />
                      </Link>
                  )
              )}
            </div>

            <button
                type="button"
                className="nb3-menu-button"
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
              <>
                <button
                    type="button"
                    className="nb3-mobile-backdrop"
                    aria-label="Close navigation menu"
                    onClick={() => setMobileOpen(false)}
                />

                <div
                    id="study-grouprr-mobile-menu"
                    className="nb3-mobile-menu"
                >
                  {profile ? (
                      <>
                        <div className="nb3-mobile-profile">
                          <div className="nb3-mobile-avatar-wrap">
                            {profile.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt=""
                                    className="nb3-mobile-avatar"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <span className="nb3-mobile-avatar-fallback">
                          {profileInitial}
                        </span>
                            )}
                          </div>

                          <div className="nb3-mobile-profile-copy">
                            <p className="nb3-mobile-name">
                              {profile.name || "Student"}
                            </p>

                            <p className="nb3-mobile-university">
                              {profile.university || "Your campus"}
                            </p>
                          </div>

                          <Link
                              href="/profile"
                              className="nb3-mobile-profile-link"
                              aria-label="Open profile"
                          >
                            <User size={17} />
                          </Link>
                        </div>

                        <div className="nb3-mobile-section">
                          <p className="nb3-mobile-section-label">
                            Your StudyGrouprr
                          </p>

                          <div className="nb3-mobile-links">
                            {appNavigationItems.map((item) => {
                              const Icon = item.icon;
                              const activeRoute = isRouteActive(item.href);

                              return (
                                  <Link
                                      key={item.href}
                                      href={item.href}
                                      className={[
                                        "nb3-mobile-link",
                                        activeRoute
                                            ? "nb3-mobile-link--active"
                                            : "",
                                      ]
                                          .filter(Boolean)
                                          .join(" ")}
                                      aria-current={
                                        activeRoute ? "page" : undefined
                                      }
                                  >
                            <span className="nb3-mobile-link-icon">
                              <Icon size={17} />
                            </span>

                                    <span>{item.label}</span>

                                    {item.href === "/buddies" &&
                                    pendingRequests > 0 ? (
                                        <span className="nb3-mobile-notification">
                                {pendingRequests > 9
                                    ? "9+"
                                    : pendingRequests}
                              </span>
                                    ) : (
                                        <ChevronRight
                                            size={16}
                                            className="nb3-mobile-chevron"
                                        />
                                    )}
                                  </Link>
                              );
                            })}
                          </div>
                        </div>

                        <div className="nb3-mobile-actions">
                          <Link
                              href="/live"
                              className={[
                                "nb3-mobile-action",
                                "nb3-mobile-action--live",
                                isLive
                                    ? "nb3-mobile-action--live-active"
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
                              className="nb3-mobile-action nb3-mobile-action--create"
                          >
                            <Plus size={17} strokeWidth={2.5} />
                            Create session
                          </Link>

                          <button
                              type="button"
                              onClick={() => void signOut()}
                              className="nb3-mobile-logout"
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
                          <>
                            {isHomePage && (
                                <div className="nb3-mobile-section">
                                  <p className="nb3-mobile-section-label">
                                    Explore
                                  </p>

                                  <div className="nb3-mobile-links">
                                    {homeNavigationItems.map((item) => (
                                        <a
                                            key={item.href}
                                            href={item.href}
                                            className="nb3-mobile-link"
                                        >
                                          <span>{item.label}</span>
                                          <ChevronRight
                                              size={16}
                                              className="nb3-mobile-chevron"
                                          />
                                        </a>
                                    ))}
                                  </div>
                                </div>
                            )}

                            <div className="nb3-mobile-guest">
                              <div>
                                <p className="nb3-mobile-guest-title">
                                  Find your people on campus.
                                </p>

                                <p className="nb3-mobile-guest-copy">
                                  See who is studying your course and join
                                  them in person.
                                </p>
                              </div>

                              <Link
                                  href="/login"
                                  className="nb3-mobile-action nb3-mobile-action--create"
                              >
                                Sign in with your university account
                                <LogIn size={17} />
                              </Link>
                            </div>
                          </>
                      )
                  )}
                </div>
              </>
          )}
        </header>
      </>
  );
}

const navbarStyles = `
  .nb3-header {
    --nb3-indigo: #1b1b3a;
    --nb3-indigo-soft: #29294f;
    --nb3-violet: #7c3aed;
    --nb3-violet-dark: #6d28d9;
    --nb3-violet-soft: #f1edff;
    --nb3-green: #16a76a;
    --nb3-green-soft: #eafaf2;
    --nb3-red: #e5484d;
    --nb3-red-soft: #fff0f0;
    --nb3-text: #1b1b3a;
    --nb3-muted: #6d6b7d;
    --nb3-faint: #9693a5;
    --nb3-border: #e5e2ec;
    --nb3-surface: #fffdfa;
    --nb3-shell: rgba(250, 249, 252, 0.92);

    position: sticky;
    top: 0;
    z-index: 80;
    width: 100%;
    border-bottom: 1px solid rgba(229, 226, 236, 0.92);
    background: var(--nb3-shell);
    box-shadow: 0 1px 0 rgba(27, 27, 58, 0.02);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
  }

  .nb3-header *,
  .nb3-header *::before,
  .nb3-header *::after {
    box-sizing: border-box;
  }

  .nb3-header--public {
    background: rgba(250, 249, 252, 0.95);
  }

  .nb3-nav {
    display: flex;
    width: min(1240px, calc(100% - 48px));
    min-height: 72px;
    margin: 0 auto;
    align-items: center;
    gap: 22px;
  }

  .nb3-brand {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 11px;
    color: var(--nb3-text);
    text-decoration: none;
  }

  .nb3-brand-icon {
    display: grid;
    width: 38px;
    height: 38px;
    place-items: center;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 12px;
    background: var(--nb3-indigo);
    color: white;
    box-shadow:
      0 7px 18px rgba(27, 27, 58, 0.13),
      inset 0 1px 0 rgba(255, 255, 255, 0.12);
  }

  .nb3-brand-copy {
    display: grid;
    gap: 1px;
  }

  .nb3-brand-name {
    font-size: 15px;
    font-weight: 780;
    letter-spacing: -0.03em;
    line-height: 1.1;
  }

  .nb3-brand-status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: var(--nb3-faint);
    font-family: var(--font-mono), monospace;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.12em;
    line-height: 1;
    text-transform: uppercase;
  }

  .nb3-brand-status > span {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--nb3-green);
    box-shadow: 0 0 0 3px rgba(22, 167, 106, 0.1);
  }

  .nb3-desktop-links {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px;
    border: 1px solid rgba(229, 226, 236, 0.9);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.64);
  }

  .nb3-desktop-links--public {
    margin-left: auto;
  }

  .nb3-desktop-spacer {
    flex: 1;
  }

  .nb3-link,
  .nb3-public-link {
    position: relative;
    display: inline-flex;
    min-height: 38px;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 0 13px;
    border-radius: 10px;
    color: var(--nb3-muted);
    font-size: 12px;
    font-weight: 650;
    text-decoration: none;
    white-space: nowrap;
    transition:
      background 160ms ease,
      color 160ms ease,
      box-shadow 160ms ease,
      transform 160ms ease;
  }

  .nb3-link:hover,
  .nb3-public-link:hover {
    background: rgba(255, 255, 255, 0.94);
    color: var(--nb3-indigo);
    box-shadow: 0 5px 14px rgba(27, 27, 58, 0.06);
  }

  .nb3-link--active {
    background: var(--nb3-indigo);
    color: white;
    box-shadow: 0 6px 15px rgba(27, 27, 58, 0.16);
  }

  .nb3-link--active:hover {
    background: var(--nb3-indigo-soft);
    color: white;
  }

  .nb3-notification,
  .nb3-mobile-notification {
    display: inline-flex;
    min-width: 18px;
    height: 18px;
    align-items: center;
    justify-content: center;
    padding: 0 5px;
    border-radius: 999px;
    background: var(--nb3-red);
    color: white;
    font-size: 9px;
    font-weight: 800;
    line-height: 1;
  }

  .nb3-desktop-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }

  .nb3-live-button,
  .nb3-create-button,
  .nb3-login-button {
    display: inline-flex;
    min-height: 42px;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 720;
    text-decoration: none;
    white-space: nowrap;
    transition:
      background 160ms ease,
      border-color 160ms ease,
      color 160ms ease,
      transform 160ms ease,
      box-shadow 160ms ease;
  }

  .nb3-live-button {
    padding: 0 13px;
    border: 1px solid #ccefdc;
    background: rgba(234, 250, 242, 0.78);
    color: #087747;
  }

  .nb3-live-button:hover,
  .nb3-live-button--active {
    border-color: #a6dfbf;
    background: var(--nb3-green-soft);
  }

  .nb3-live-dot {
    width: 7px;
    height: 7px;
    border: 1.5px solid var(--nb3-green);
    border-radius: 50%;
    background: transparent;
  }

  .nb3-live-dot--active {
    background: var(--nb3-green);
    box-shadow: 0 0 0 4px rgba(22, 167, 106, 0.11);
  }

  .nb3-create-button {
    padding: 0 15px;
    background: var(--nb3-violet);
    color: white;
    box-shadow: 0 8px 20px rgba(124, 58, 237, 0.19);
  }

  .nb3-create-button:hover {
    transform: translateY(-1px);
    background: var(--nb3-violet-dark);
    box-shadow: 0 11px 25px rgba(124, 58, 237, 0.24);
  }

  .nb3-login-button {
    padding: 0 15px;
    border: 1px solid var(--nb3-indigo);
    background: var(--nb3-indigo);
    color: white;
    box-shadow: 0 8px 20px rgba(27, 27, 58, 0.16);
  }

  .nb3-login-button:hover {
    transform: translateY(-1px);
    background: var(--nb3-indigo-soft);
    box-shadow: 0 11px 24px rgba(27, 27, 58, 0.2);
  }

  .nb3-profile-link {
    position: relative;
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    overflow: visible;
    border: 1px solid var(--nb3-border);
    border-radius: 13px;
    background: white;
    text-decoration: none;
    transition:
      border-color 160ms ease,
      box-shadow 160ms ease,
      transform 160ms ease;
  }

  .nb3-profile-link:hover,
  .nb3-profile-link--active {
    transform: translateY(-1px);
    border-color: #c9baf8;
    box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.08);
  }

  .nb3-avatar,
  .nb3-avatar-fallback {
    width: 100%;
    height: 100%;
    border-radius: 12px;
  }

  .nb3-avatar {
    display: block;
    object-fit: cover;
  }

  .nb3-avatar-fallback {
    display: grid;
    place-items: center;
    background:
      linear-gradient(145deg, #f0eaff, #ddd2ff);
    color: var(--nb3-violet-dark);
    font-size: 13px;
    font-weight: 800;
  }

  .nb3-profile-indicator {
    position: absolute;
    right: -2px;
    bottom: -2px;
    width: 10px;
    height: 10px;
    border: 2px solid var(--nb3-surface);
    border-radius: 50%;
    background: var(--nb3-green);
  }

  .nb3-logout-button {
    display: grid;
    width: 40px;
    height: 40px;
    place-items: center;
    border: 1px solid transparent;
    border-radius: 11px;
    background: transparent;
    color: var(--nb3-faint);
    cursor: pointer;
    transition:
      background 150ms ease,
      border-color 150ms ease,
      color 150ms ease;
  }

  .nb3-logout-button:hover {
    border-color: #ffd1d1;
    background: var(--nb3-red-soft);
    color: var(--nb3-red);
  }

  .nb3-logout-button:disabled,
  .nb3-mobile-logout:disabled {
    cursor: wait;
    opacity: 0.55;
  }

  .nb3-menu-button {
    display: none;
    width: 42px;
    height: 42px;
    margin-left: auto;
    place-items: center;
    border: 1px solid var(--nb3-border);
    border-radius: 12px;
    background: white;
    color: var(--nb3-indigo);
    cursor: pointer;
    box-shadow: 0 5px 14px rgba(27, 27, 58, 0.06);
  }

  .nb3-mobile-backdrop {
    position: fixed;
    inset: 0;
    z-index: -1;
    border: 0;
    background: rgba(20, 20, 38, 0.38);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
  }

  .nb3-mobile-menu {
    width: min(520px, calc(100% - 24px));
    margin: 0 auto 12px;
    padding: 16px;
    border: 1px solid var(--nb3-border);
    border-radius: 20px;
    background: rgba(255, 253, 250, 0.99);
    box-shadow: 0 24px 70px rgba(27, 27, 58, 0.2);
    animation: nb3-menu-enter 180ms ease-out both;
  }

  .nb3-mobile-profile {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 4px;
  }

  .nb3-mobile-avatar-wrap {
    width: 46px;
    height: 46px;
    flex: 0 0 auto;
    overflow: hidden;
    border: 1px solid var(--nb3-border);
    border-radius: 14px;
  }

  .nb3-mobile-avatar,
  .nb3-mobile-avatar-fallback {
    width: 100%;
    height: 100%;
  }

  .nb3-mobile-avatar {
    display: block;
    object-fit: cover;
  }

  .nb3-mobile-avatar-fallback {
    display: grid;
    place-items: center;
    background: linear-gradient(145deg, #f0eaff, #ddd2ff);
    color: var(--nb3-violet-dark);
    font-size: 14px;
    font-weight: 800;
  }

  .nb3-mobile-profile-copy {
    min-width: 0;
    flex: 1;
  }

  .nb3-mobile-name {
    overflow: hidden;
    margin: 0;
    color: var(--nb3-indigo);
    font-size: 14px;
    font-weight: 760;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .nb3-mobile-university {
    overflow: hidden;
    margin: 3px 0 0;
    color: var(--nb3-faint);
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .nb3-mobile-profile-link {
    display: grid;
    width: 38px;
    height: 38px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 11px;
    background: var(--nb3-violet-soft);
    color: var(--nb3-violet);
  }

  .nb3-mobile-section {
    margin-top: 16px;
    padding-top: 15px;
    border-top: 1px solid var(--nb3-border);
  }

  .nb3-mobile-section-label {
    margin: 0 0 8px;
    padding: 0 4px;
    color: var(--nb3-faint);
    font-family: var(--font-mono), monospace;
    font-size: 9px;
    font-weight: 750;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .nb3-mobile-links {
    display: grid;
    gap: 5px;
  }

  .nb3-mobile-link {
    display: flex;
    min-height: 48px;
    align-items: center;
    gap: 11px;
    padding: 0 12px;
    border-radius: 12px;
    color: var(--nb3-muted);
    font-size: 13px;
    font-weight: 650;
    text-decoration: none;
    transition:
      background 150ms ease,
      color 150ms ease;
  }

  .nb3-mobile-link > span:nth-child(2),
  .nb3-mobile-link > span:first-child:last-of-type {
    flex: 1;
  }

  .nb3-mobile-link:hover,
  .nb3-mobile-link--active {
    background: var(--nb3-violet-soft);
    color: var(--nb3-violet-dark);
  }

  .nb3-mobile-link-icon {
    display: grid;
    width: 30px;
    height: 30px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 9px;
    background: white;
    box-shadow: inset 0 0 0 1px var(--nb3-border);
  }

  .nb3-mobile-chevron {
    margin-left: auto;
    color: var(--nb3-faint);
  }

  .nb3-mobile-actions {
    display: grid;
    grid-template-columns: 1fr 1.25fr;
    gap: 8px;
    margin-top: 16px;
    padding-top: 15px;
    border-top: 1px solid var(--nb3-border);
  }

  .nb3-mobile-action,
  .nb3-mobile-logout {
    display: flex;
    min-height: 48px;
    width: 100%;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 720;
    text-decoration: none;
  }

  .nb3-mobile-action--live {
    border: 1px solid #bce8d0;
    background: var(--nb3-green-soft);
    color: #087747;
  }

  .nb3-mobile-action--live-active {
    box-shadow: inset 3px 0 0 var(--nb3-green);
  }

  .nb3-mobile-action--create {
    border: 1px solid var(--nb3-violet);
    background: var(--nb3-violet);
    color: white;
    box-shadow: 0 8px 20px rgba(124, 58, 237, 0.16);
  }

  .nb3-mobile-logout {
    grid-column: 1 / -1;
    border: 1px solid #ffd1d1;
    background: white;
    color: var(--nb3-red);
    cursor: pointer;
  }

  .nb3-mobile-guest {
    display: grid;
    gap: 16px;
    margin-top: 16px;
    padding: 17px;
    border-radius: 16px;
    background:
      linear-gradient(
        145deg,
        rgba(241, 237, 255, 0.9),
        rgba(255, 255, 255, 0.96)
      );
    box-shadow: inset 0 0 0 1px rgba(124, 58, 237, 0.09);
  }

  .nb3-mobile-guest-title {
    margin: 0;
    color: var(--nb3-indigo);
    font-size: 16px;
    font-weight: 780;
    letter-spacing: -0.025em;
  }

  .nb3-mobile-guest-copy {
    margin: 5px 0 0;
    color: var(--nb3-muted);
    font-size: 12px;
    line-height: 1.55;
  }

  .nb3-brand:focus-visible,
  .nb3-link:focus-visible,
  .nb3-public-link:focus-visible,
  .nb3-live-button:focus-visible,
  .nb3-create-button:focus-visible,
  .nb3-login-button:focus-visible,
  .nb3-profile-link:focus-visible,
  .nb3-logout-button:focus-visible,
  .nb3-menu-button:focus-visible,
  .nb3-mobile-link:focus-visible,
  .nb3-mobile-action:focus-visible,
  .nb3-mobile-logout:focus-visible {
    outline: 3px solid rgba(124, 58, 237, 0.22);
    outline-offset: 2px;
  }

  @keyframes nb3-menu-enter {
    from {
      opacity: 0;
      transform: translateY(-8px) scale(0.985);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (max-width: 980px) {
    .nb3-desktop-links,
    .nb3-desktop-actions {
      display: none;
    }

    .nb3-menu-button {
      display: grid;
    }
  }

  @media (max-width: 620px) {
    .nb3-nav {
      width: calc(100% - 28px);
      min-height: 66px;
    }

    .nb3-brand-icon {
      width: 35px;
      height: 35px;
      border-radius: 11px;
    }

    .nb3-brand-name {
      font-size: 14px;
    }

    .nb3-brand-status {
      font-size: 7px;
    }

    .nb3-mobile-actions {
      grid-template-columns: 1fr;
    }

    .nb3-mobile-logout {
      grid-column: auto;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .nb3-mobile-menu {
      animation: none;
    }

    .nb3-link,
    .nb3-public-link,
    .nb3-live-button,
    .nb3-create-button,
    .nb3-login-button,
    .nb3-profile-link,
    .nb3-logout-button,
    .nb3-mobile-link {
      transition: none;
    }

    .nb3-create-button:hover,
    .nb3-login-button:hover,
    .nb3-profile-link:hover,
    .nb3-profile-link--active {
      transform: none;
    }
  }
`;
