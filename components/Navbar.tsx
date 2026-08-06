"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
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

import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

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

type HomeSectionHref =
    (typeof homeNavigationItems)[number]["href"];

type HomeIndicator = {
  left: number;
  width: number;
  visible: boolean;
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading } = useProfile();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [activeHomeSection, setActiveHomeSection] =
      useState<HomeSectionHref>("#how-it-works");

  const [homeIndicator, setHomeIndicator] =
      useState<HomeIndicator>({
        left: 0,
        width: 0,
        visible: false,
      });

  const [scrollProgress, setScrollProgress] = useState(0);

  const homeLinksRef = useRef<HTMLDivElement | null>(null);

  const homeLinkRefs = useRef<
      Partial<Record<HomeSectionHref, HTMLAnchorElement | null>>
  >({});

  const isHomePage = pathname === "/";
  const isLoginPage = pathname === "/login";
  const profileInitial =
      profile?.name?.trim().charAt(0).toUpperCase() || "S";

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
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
            .eq("receiver_id", profile.id)
            .eq("status", "pending"),

        supabase
            .from("live_study_status")
            .select("id")
            .eq("user_id", profile.id)
            .maybeSingle(),
      ]);

      if (!active) {
        return;
      }

      if (requestsResult.error) {
        console.error(
            "Unable to load pending buddy requests:",
            requestsResult.error,
        );
      } else {
        setPendingRequests(requestsResult.count ?? 0);
      }

      if (liveResult.error) {
        console.error(
            "Unable to load live study status:",
            liveResult.error,
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
        refreshNavbarState,
    );
    window.addEventListener(
        "live-status-changed",
        refreshNavbarState,
    );

    return () => {
      active = false;

      window.removeEventListener(
          "buddy-requests-changed",
          refreshNavbarState,
      );
      window.removeEventListener(
          "live-status-changed",
          refreshNavbarState,
      );
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!isHomePage || profile) {
      setScrollProgress(0);
      setHomeIndicator({
        left: 0,
        width: 0,
        visible: false,
      });

      return;
    }

    let animationFrame = 0;

    function updateHomepageNavigation() {
      animationFrame = 0;

      const documentElement = document.documentElement;
      const scrollableHeight =
          documentElement.scrollHeight - window.innerHeight;

      const nextProgress =
          scrollableHeight > 0
              ? Math.min(
                  1,
                  Math.max(0, window.scrollY / scrollableHeight),
              )
              : 0;

      setScrollProgress(nextProgress);

      const navbar =
          document.querySelector<HTMLElement>(".sg-nav-header");

      const navbarBottom =
          navbar?.getBoundingClientRect().bottom ?? 0;

      const activationLine = navbarBottom + 150;

      let nextActiveSection: HomeSectionHref =
          "#how-it-works";

      for (const item of homeNavigationItems) {
        const section = document.querySelector<HTMLElement>(
            item.href,
        );

        if (!section) {
          continue;
        }

        const sectionRect = section.getBoundingClientRect();

        if (sectionRect.top <= activationLine) {
          nextActiveSection = item.href;
        }
      }

      setActiveHomeSection((current) =>
          current === nextActiveSection
              ? current
              : nextActiveSection,
      );

      const activeLink =
          homeLinkRefs.current[nextActiveSection];

      const linksContainer = homeLinksRef.current;

      if (!activeLink || !linksContainer) {
        setHomeIndicator({
          left: 0,
          width: 0,
          visible: false,
        });

        return;
      }

      setHomeIndicator({
        left: activeLink.offsetLeft,
        width: activeLink.offsetWidth,
        visible: true,
      });
    }

    function requestHomepageNavigationUpdate() {
      if (animationFrame) {
        return;
      }

      animationFrame = window.requestAnimationFrame(
          updateHomepageNavigation,
      );
    }

    updateHomepageNavigation();

    window.addEventListener(
        "scroll",
        requestHomepageNavigationUpdate,
        { passive: true },
    );

    window.addEventListener(
        "resize",
        requestHomepageNavigationUpdate,
    );

    return () => {
      window.removeEventListener(
          "scroll",
          requestHomepageNavigationUpdate,
      );

      window.removeEventListener(
          "resize",
          requestHomepageNavigationUpdate,
      );

      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [isHomePage, profile]);

  function isRouteActive(href: string) {
    if (href === "/dashboard") {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function handleHomeNavigation(
      event: MouseEvent<HTMLAnchorElement>,
      href: HomeSectionHref,
  ) {
    const section = document.querySelector<HTMLElement>(href);

    if (!section) {
      return;
    }

    event.preventDefault();
    setActiveHomeSection(href);

    const navbar =
        document.querySelector<HTMLElement>(".sg-nav-header");

    const navbarHeight = navbar?.offsetHeight ?? 72;

    const targetTop =
        section.getBoundingClientRect().top +
        window.scrollY -
        navbarHeight -
        22;

    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth",
    });

    window.history.replaceState(null, "", href);
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

        <header className="sg-nav-header">
          <nav className="sg-nav-shell" aria-label="Main navigation">
            <Link
                href={profile ? "/dashboard" : "/"}
                className="sg-nav-brand"
                aria-label="StudyGrouprr home"
            >
            <span className="sg-nav-brand-mark" aria-hidden="true">
  <Image
      src="/navbar-logo.png"
      alt=""
      width={40}
      height={40}
      priority
      className="sg-nav-brand-logo"
  />
</span>

              <span className="sg-nav-brand-copy">
              <span className="sg-nav-brand-name">
  <span className="sg-nav-brand-name-primary">Study</span>
  <span className="sg-nav-brand-name-accent">Grouprr</span>
</span>
            </span>
            </Link>

            {isHomePage && !profile ? (
                <div
                    ref={homeLinksRef}
                    className="sg-nav-public-links"
                >
    <span
        className={[
          "sg-nav-public-indicator",
          homeIndicator.visible
              ? "sg-nav-public-indicator--visible"
              : "",
        ]
            .filter(Boolean)
            .join(" ")}
        style={
          {
            "--sg-indicator-left": `${homeIndicator.left}px`,
            "--sg-indicator-width": `${homeIndicator.width}px`,
          } as CSSProperties
        }
        aria-hidden="true"
    />

                  {homeNavigationItems.map((item) => {
                    const active =
                        activeHomeSection === item.href;

                    return (
                        <a
                            key={item.href}
                            ref={(element) => {
                              homeLinkRefs.current[item.href] = element;
                            }}
                            href={item.href}
                            className={[
                              "sg-nav-public-link",
                              active
                                  ? "sg-nav-public-link--active"
                                  : "",
                            ]
                                .filter(Boolean)
                                .join(" ")}
                            aria-current={active ? "location" : undefined}
                            onClick={(event) =>
                                handleHomeNavigation(event, item.href)
                            }
                        >
                          {item.label}
                        </a>
                    );
                  })}
                </div>
            ) : profile ? (
                <div className="sg-nav-app-links">
                  {appNavigationItems.map((item) => {
                    const Icon = item.icon;
                    const active = isRouteActive(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={[
                              "sg-nav-app-link",
                              active ? "sg-nav-app-link--active" : "",
                            ]
                                .filter(Boolean)
                                .join(" ")}
                            aria-current={active ? "page" : undefined}
                        >
                          <Icon size={15} strokeWidth={2.2} />
                          <span>{item.label}</span>

                          {item.href === "/buddies" &&
                              pendingRequests > 0 && (
                                  <span
                                      className="sg-nav-notification"
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
                <div className="sg-nav-flex-spacer" />
            )}

            <div className="sg-nav-actions">
              {profile ? (
                  <>
                    <Link
                        href="/live"
                        className={[
                          "sg-nav-live-button",
                          isLive ? "sg-nav-live-button--active" : "",
                        ]
                            .filter(Boolean)
                            .join(" ")}
                    >
                  <span
                      className={[
                        "sg-nav-live-dot",
                        isLive ? "sg-nav-live-dot--active" : "",
                      ]
                          .filter(Boolean)
                          .join(" ")}
                      aria-hidden="true"
                  />
                      {isLive ? "You’re live" : "Go live"}
                    </Link>

                    <Link
                        href="/create-session"
                        className="sg-nav-create-button"
                    >
                      <Plus size={16} strokeWidth={2.55} />
                      <span>Create session</span>
                    </Link>

                    <Link
                        href="/profile"
                        className={[
                          "sg-nav-profile",
                          isRouteActive("/profile")
                              ? "sg-nav-profile--active"
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
                              className="sg-nav-avatar"
                              referrerPolicy="no-referrer"
                          />
                      ) : (
                          <span className="sg-nav-avatar-fallback">
                      {profileInitial}
                    </span>
                      )}

                      <span className="sg-nav-profile-status" />
                    </Link>

                    <button
                        type="button"
                        className="sg-nav-signout"
                        onClick={() => void signOut()}
                        disabled={signingOut}
                        aria-label="Sign out"
                        title="Sign out"
                    >
                      <LogOut size={17} />
                    </button>
                  </>
              ) : (
                  !loading && (
                      <Link href="/login" className="sg-nav-signin">
                        <span>{isLoginPage ? "Sign in" : "Sign in"}</span>
                        <LogIn size={16} />
                      </Link>
                  )
              )}
            </div>

            <button
                type="button"
                className="sg-nav-menu-button"
                onClick={() => setMobileOpen((current) => !current)}
                aria-expanded={mobileOpen}
                aria-controls="studygrouprr-mobile-navigation"
                aria-label={
                  mobileOpen
                      ? "Close navigation menu"
                      : "Open navigation menu"
                }
            >
              {mobileOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </nav>

          {isHomePage && !profile && (
              <div
                  className="sg-nav-scroll-progress"
                  aria-hidden="true"
              >
    <span
        style={{
          transform: `scaleX(${scrollProgress})`,
        }}
    />
              </div>
          )}

          {mobileOpen && (
              <>
                <button
                    type="button"
                    className="sg-nav-mobile-backdrop"
                    aria-label="Close navigation menu"
                    onClick={() => setMobileOpen(false)}
                />

                <div
                    id="studygrouprr-mobile-navigation"
                    className="sg-nav-mobile-panel"
                >
                  {profile ? (
                      <>
                        <div className="sg-nav-mobile-profile">
                          <div className="sg-nav-mobile-avatar-wrap">
                            {profile.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt=""
                                    className="sg-nav-mobile-avatar"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <span className="sg-nav-mobile-avatar-fallback">
                          {profileInitial}
                        </span>
                            )}
                          </div>

                          <div className="sg-nav-mobile-profile-copy">
                            <strong>{profile.name || "Student"}</strong>
                            <span>{profile.university || "Your campus"}</span>
                          </div>

                          <Link
                              href="/profile"
                              className="sg-nav-mobile-profile-link"
                              aria-label="Open profile"
                          >
                            <User size={17} />
                          </Link>
                        </div>

                        <div className="sg-nav-mobile-section">
                          <p className="sg-nav-mobile-label">
                            Your StudyGrouprr
                          </p>

                          <div className="sg-nav-mobile-links">
                            {appNavigationItems.map((item) => {
                              const Icon = item.icon;
                              const active = isRouteActive(item.href);

                              return (
                                  <Link
                                      key={item.href}
                                      href={item.href}
                                      className={[
                                        "sg-nav-mobile-link",
                                        active
                                            ? "sg-nav-mobile-link--active"
                                            : "",
                                      ]
                                          .filter(Boolean)
                                          .join(" ")}
                                      aria-current={
                                        active ? "page" : undefined
                                      }
                                  >
                            <span className="sg-nav-mobile-link-icon">
                              <Icon size={17} />
                            </span>

                                    <span>{item.label}</span>

                                    {item.href === "/buddies" &&
                                    pendingRequests > 0 ? (
                                        <span className="sg-nav-notification">
                                {pendingRequests > 9
                                    ? "9+"
                                    : pendingRequests}
                              </span>
                                    ) : (
                                        <ChevronRight
                                            size={16}
                                            className="sg-nav-mobile-chevron"
                                        />
                                    )}
                                  </Link>
                              );
                            })}
                          </div>
                        </div>

                        <div className="sg-nav-mobile-actions">
                          <Link
                              href="/live"
                              className={[
                                "sg-nav-mobile-action",
                                "sg-nav-mobile-action--live",
                                isLive
                                    ? "sg-nav-mobile-action--live-active"
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
                              className="sg-nav-mobile-action sg-nav-mobile-action--create"
                          >
                            <Plus size={17} strokeWidth={2.5} />
                            Create session
                          </Link>

                          <button
                              type="button"
                              className="sg-nav-mobile-signout"
                              onClick={() => void signOut()}
                              disabled={signingOut}
                          >
                            <LogOut size={17} />
                            {signingOut ? "Signing out…" : "Sign out"}
                          </button>
                        </div>
                      </>
                  ) : (
                      <>
                        {isHomePage && (
                            <div className="sg-nav-mobile-section">
                              <p className="sg-nav-mobile-label">
                                Explore StudyGrouprr
                              </p>

                              <div className="sg-nav-mobile-links">
                                {homeNavigationItems.map((item) => (
                                    <a
                                        key={item.href}
                                        href={item.href}
                                        className="sg-nav-mobile-link"
                                    >
                                      <span>{item.label}</span>
                                      <ChevronRight
                                          size={16}
                                          className="sg-nav-mobile-chevron"
                                      />
                                    </a>
                                ))}
                              </div>
                            </div>
                        )}

                        <div className="sg-nav-mobile-guest">
                    <span className="sg-nav-mobile-guest-kicker">
                      Find your people
                    </span>
                          <strong>
                            See who is studying your course on campus.
                          </strong>
                          <p>
                            Join live students or upcoming sessions without
                            starting another group chat.
                          </p>

                          <Link
                              href="/login"
                              className="sg-nav-mobile-action sg-nav-mobile-action--create"
                          >
                            Sign in with your university account
                            <LogIn size={17} />
                          </Link>
                        </div>
                      </>
                  )}
                </div>
              </>
          )}
        </header>
      </>
  );
}

const navbarStyles = `
  .sg-nav-header {
    --sg-nav-indigo: #1b1b3a;
    --sg-nav-indigo-soft: #2a2a50;
    --sg-nav-violet: #7c3aed;
    --sg-nav-violet-dark: #6d28d9;
    --sg-nav-violet-soft: #f1edff;
    --sg-nav-green: #18a968;
    --sg-nav-green-soft: #e9f9f1;
    --sg-nav-red: #e5484d;
    --sg-nav-red-soft: #fff0f0;
    --sg-nav-text: #1b1b3a;
    --sg-nav-muted: #6d6b7d;
    --sg-nav-faint: #9794a5;
    --sg-nav-border: #e5e2ec;
    --sg-nav-surface: #fffdfa;
    --sg-nav-shell: rgba(250, 249, 252, 0.94);

    position: sticky;
    top: 0;
    z-index: 80;
    width: 100%;
    border-bottom: 1px solid rgba(229, 226, 236, 0.9);
    background: var(--sg-nav-shell);
    box-shadow:
      0 1px 0 rgba(27, 27, 58, 0.02),
      0 8px 28px rgba(27, 27, 58, 0.035);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
  }

  .sg-nav-header *,
  .sg-nav-header *::before,
  .sg-nav-header *::after {
    box-sizing: border-box;
  }
  
 .sg-nav-scroll-progress {
  position: absolute;
  right: 0;
  bottom: -5px;
  left: 0;
  z-index: 6;
  height: 5px;
  overflow: hidden;
  background: rgba(124, 58, 237, 0.14);
  pointer-events: none;
}

.sg-nav-scroll-progress span {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 0 999px 999px 0;
  background: linear-gradient(
    90deg,
    #6d28d9 0%,
    #7c3aed 45%,
    #8b5cf6 100%
  );
  box-shadow:
    0 2px 8px rgba(124, 58, 237, 0.45),
    0 0 14px rgba(124, 58, 237, 0.28);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 80ms linear;
}

  .sg-nav-shell {
    display: flex;
    width: min(1240px, calc(100% - 48px));
    min-height: 72px;
    margin: 0 auto;
    align-items: center;
    gap: 22px;
  }

.sg-nav-brand {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  color: var(--sg-nav-text);
  text-decoration: none;
  transition:
    opacity 150ms ease,
    transform 150ms ease;
}

.sg-nav-brand:hover {
  transform: translateY(-1px);
}

.sg-nav-brand:hover .sg-nav-brand-name-accent {
  color: var(--sg-nav-violet-dark);
}

.sg-nav-brand-mark {
  display: grid;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  place-items: center;
}

.sg-nav-brand-logo {
  display: block;
  width: 40px;
  height: 40px;
  max-width: 100%;
  object-fit: contain;
}

  .sg-nav-brand-copy {
    display: grid;
    gap: 3px;
  }

.sg-nav-brand-name {
  display: inline-flex;
  align-items: baseline;
  font-size: 16px;
  font-weight: 780;
  letter-spacing: -0.045em;
  line-height: 1;
  white-space: nowrap;
}

.sg-nav-brand-name-primary {
  color: var(--sg-nav-indigo);
}

.sg-nav-brand-name-accent {
  color: var(--sg-nav-violet);
}

  .sg-nav-brand-subtitle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--sg-nav-faint);
    font-family: var(--font-mono), monospace;
    font-size: 7.5px;
    font-weight: 700;
    letter-spacing: 0.12em;
    line-height: 1;
    text-transform: uppercase;
  }

  .sg-nav-brand-subtitle > span {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--sg-nav-green);
    box-shadow: 0 0 0 3px rgba(24, 169, 104, 0.1);
  }

  .sg-nav-public-links,
.sg-nav-app-links {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 18px;
  padding: 4px;
  border: 1px solid rgba(229, 226, 236, 0.86);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.65);
}

.sg-nav-public-links {
  position: relative;
  isolation: isolate;
}

.sg-nav-public-indicator {
  position: absolute;
  z-index: 0;
  top: 4px;
  bottom: 4px;
  left: 0;
  width: var(--sg-indicator-width, 0);
  border: 1px solid rgba(124, 58, 237, 0.14);
  border-radius: 10px;
  background: var(--sg-nav-violet-soft);
  box-shadow:
    0 4px 12px rgba(124, 58, 237, 0.08),
    inset 0 0 0 1px rgba(255, 255, 255, 0.45);
  opacity: 0;
  transform:
    translateX(var(--sg-indicator-left, 0))
    scale(0.94);
  transform-origin: center;
  transition:
    width 320ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 160ms ease;
  pointer-events: none;
}

.sg-nav-public-indicator--visible {
  opacity: 1;
  transform:
    translateX(var(--sg-indicator-left, 0))
    scale(1);
}

  .sg-nav-public-link,
  .sg-nav-app-link {
    display: inline-flex;
    min-height: 36px;
    align-items: center;
    position: relative;
z-index: 1;
    justify-content: center;
    gap: 7px;
    padding: 0 13px;
    border-radius: 10px;
    color: var(--sg-nav-muted);
    font-size: 12px;
    font-weight: 650;
    text-decoration: none;
    transition:
      background 150ms ease,
      color 150ms ease,
      box-shadow 150ms ease,
      transform 150ms ease;
  }
  
  .sg-nav-public-link--active {
  color: var(--sg-nav-violet);
}

.sg-nav-public-link--active:hover {
  background: transparent;
  color: var(--sg-nav-violet-dark);
  box-shadow: none;
  transform: none;
}

 .sg-nav-public-link:hover {
  color: var(--sg-nav-violet-dark);
}

.sg-nav-app-link:hover {
  background: white;
  color: var(--sg-nav-indigo);
  box-shadow: 0 4px 12px rgba(27, 27, 58, 0.06);
  transform: translateY(-1px);
}

  .sg-nav-app-link--active {
    background: var(--sg-nav-indigo);
    color: white;
    box-shadow: 0 6px 14px rgba(27, 27, 58, 0.14);
  }

  .sg-nav-app-link--active:hover {
    background: var(--sg-nav-indigo-soft);
    color: white;
  }

  .sg-nav-flex-spacer {
    flex: 1;
  }

  .sg-nav-notification {
    display: inline-flex;
    min-width: 18px;
    height: 18px;
    align-items: center;
    justify-content: center;
    padding: 0 5px;
    border-radius: 999px;
    background: var(--sg-nav-red);
    color: white;
    font-size: 9px;
    font-weight: 800;
    line-height: 1;
  }

  .sg-nav-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }

  .sg-nav-live-button,
  .sg-nav-create-button,
  .sg-nav-signin {
    display: inline-flex;
    min-height: 40px;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 11px;
    font-size: 12px;
    font-weight: 720;
    text-decoration: none;
    transition:
      background 150ms ease,
      border-color 150ms ease,
      color 150ms ease,
      box-shadow 150ms ease,
      transform 150ms ease;
  }

  .sg-nav-live-button {
    padding: 0 13px;
    border: 1px solid #cceedd;
    background: var(--sg-nav-green-soft);
    color: #087a4a;
  }

  .sg-nav-live-button:hover,
  .sg-nav-live-button--active {
    border-color: #a9e4c7;
    background: #e1f7ec;
    transform: translateY(-1px);
  }

  .sg-nav-live-dot {
    width: 7px;
    height: 7px;
    border: 1.5px solid currentColor;
    border-radius: 50%;
    background: transparent;
  }

  .sg-nav-live-dot--active {
    border-color: var(--sg-nav-green);
    background: var(--sg-nav-green);
    box-shadow: 0 0 0 4px rgba(24, 169, 104, 0.1);
  }

  .sg-nav-create-button,
  .sg-nav-signin {
    padding: 0 15px;
    background: var(--sg-nav-violet);
    color: white;
    box-shadow: 0 8px 18px rgba(124, 58, 237, 0.18);
  }

  .sg-nav-create-button:hover,
  .sg-nav-signin:hover {
    background: var(--sg-nav-violet-dark);
    box-shadow: 0 11px 24px rgba(124, 58, 237, 0.24);
    transform: translateY(-1px);
  }

  .sg-nav-profile {
    position: relative;
    display: grid;
    width: 40px;
    height: 40px;
    place-items: center;
    overflow: visible;
    border: 1px solid var(--sg-nav-border);
    border-radius: 12px;
    background: white;
    text-decoration: none;
    box-shadow: 0 4px 12px rgba(27, 27, 58, 0.05);
    transition:
      border-color 150ms ease,
      box-shadow 150ms ease,
      transform 150ms ease;
  }

  .sg-nav-profile:hover,
  .sg-nav-profile--active {
    border-color: #c4b5fd;
    box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.08);
    transform: translateY(-1px);
  }

  .sg-nav-avatar,
  .sg-nav-avatar-fallback {
    width: 100%;
    height: 100%;
    border-radius: 11px;
  }

  .sg-nav-avatar {
    display: block;
    object-fit: cover;
  }

  .sg-nav-avatar-fallback {
    display: grid;
    place-items: center;
    background: var(--sg-nav-violet-soft);
    color: var(--sg-nav-violet);
    font-size: 13px;
    font-weight: 800;
  }

  .sg-nav-profile-status {
    position: absolute;
    right: -2px;
    bottom: -2px;
    width: 10px;
    height: 10px;
    border: 2px solid white;
    border-radius: 50%;
    background: var(--sg-nav-green);
  }

  .sg-nav-signout {
    display: grid;
    width: 38px;
    height: 38px;
    place-items: center;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--sg-nav-faint);
    cursor: pointer;
    transition:
      background 150ms ease,
      color 150ms ease;
  }

  .sg-nav-signout:hover {
    background: var(--sg-nav-red-soft);
    color: var(--sg-nav-red);
  }

  .sg-nav-signout:disabled,
  .sg-nav-mobile-signout:disabled {
    cursor: wait;
    opacity: 0.55;
  }

  .sg-nav-menu-button {
    display: none;
    width: 42px;
    height: 42px;
    margin-left: auto;
    place-items: center;
    border: 1px solid var(--sg-nav-border);
    border-radius: 12px;
    background: white;
    color: var(--sg-nav-indigo);
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(27, 27, 58, 0.05);
  }

  .sg-nav-mobile-backdrop {
    position: fixed;
    inset: 0;
    z-index: 78;
    border: 0;
    background: rgba(20, 20, 38, 0.34);
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
  }

  .sg-nav-mobile-panel {
    position: fixed;
    top: 82px;
    right: 16px;
    left: 16px;
    z-index: 79;
    max-height: calc(100dvh - 98px);
    overflow-y: auto;
    padding: 18px;
    border: 1px solid var(--sg-nav-border);
    border-radius: 20px;
    background: rgba(255, 253, 250, 0.99);
    box-shadow: 0 24px 70px rgba(27, 27, 58, 0.18);
    animation: sg-nav-mobile-enter 180ms ease-out both;
  }

  .sg-nav-mobile-profile {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 2px 2px 16px;
    border-bottom: 1px solid var(--sg-nav-border);
  }

  .sg-nav-mobile-avatar-wrap {
    width: 46px;
    height: 46px;
    flex: 0 0 auto;
    overflow: hidden;
    border: 1px solid var(--sg-nav-border);
    border-radius: 14px;
  }

  .sg-nav-mobile-avatar,
  .sg-nav-mobile-avatar-fallback {
    width: 100%;
    height: 100%;
  }

  .sg-nav-mobile-avatar {
    display: block;
    object-fit: cover;
  }

  .sg-nav-mobile-avatar-fallback {
    display: grid;
    place-items: center;
    background: var(--sg-nav-violet-soft);
    color: var(--sg-nav-violet);
    font-weight: 800;
  }

  .sg-nav-mobile-profile-copy {
    min-width: 0;
    display: grid;
    flex: 1;
    gap: 3px;
  }

  .sg-nav-mobile-profile-copy strong,
  .sg-nav-mobile-profile-copy span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sg-nav-mobile-profile-copy strong {
    color: var(--sg-nav-indigo);
    font-size: 14px;
  }

  .sg-nav-mobile-profile-copy span {
    color: var(--sg-nav-faint);
    font-size: 11px;
  }

  .sg-nav-mobile-profile-link {
    display: grid;
    width: 38px;
    height: 38px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 11px;
    background: var(--sg-nav-violet-soft);
    color: var(--sg-nav-violet);
  }

  .sg-nav-mobile-section {
    margin-top: 16px;
  }

  .sg-nav-mobile-label {
    margin: 0 0 8px;
    color: var(--sg-nav-faint);
    font-family: var(--font-mono), monospace;
    font-size: 9px;
    font-weight: 750;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .sg-nav-mobile-links {
    display: grid;
    gap: 6px;
  }

  .sg-nav-mobile-link {
    display: flex;
    min-height: 48px;
    align-items: center;
    gap: 11px;
    padding: 0 13px;
    border-radius: 12px;
    color: var(--sg-nav-muted);
    font-size: 13px;
    font-weight: 650;
    text-decoration: none;
    transition:
      background 150ms ease,
      color 150ms ease;
  }

  .sg-nav-mobile-link:hover,
  .sg-nav-mobile-link--active {
    background: var(--sg-nav-violet-soft);
    color: var(--sg-nav-violet);
  }

  .sg-nav-mobile-link-icon {
    display: grid;
    width: 32px;
    height: 32px;
    place-items: center;
    border-radius: 9px;
    background: rgba(124, 58, 237, 0.08);
  }

  .sg-nav-mobile-link > span:nth-child(2) {
    flex: 1;
  }

  .sg-nav-mobile-chevron {
    margin-left: auto;
    color: var(--sg-nav-faint);
  }

  .sg-nav-mobile-actions {
    display: grid;
    grid-template-columns: 1fr 1.2fr;
    gap: 8px;
    margin-top: 18px;
    padding-top: 16px;
    border-top: 1px solid var(--sg-nav-border);
  }

  .sg-nav-mobile-action,
  .sg-nav-mobile-signout {
    display: inline-flex;
    min-height: 48px;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 720;
    text-decoration: none;
  }

  .sg-nav-mobile-action--live {
    border: 1px solid #cceedd;
    background: var(--sg-nav-green-soft);
    color: #087a4a;
  }

  .sg-nav-mobile-action--live-active {
    box-shadow: inset 3px 0 0 var(--sg-nav-green);
  }

  .sg-nav-mobile-action--create {
    background: var(--sg-nav-violet);
    color: white;
  }

  .sg-nav-mobile-signout {
    grid-column: 1 / -1;
    border: 1px solid #ffd3d3;
    background: white;
    color: var(--sg-nav-red);
    cursor: pointer;
  }

  .sg-nav-mobile-guest {
    display: grid;
    gap: 10px;
    margin-top: 16px;
    padding: 18px;
    border-radius: 16px;
    background:
      linear-gradient(
        135deg,
        rgba(124, 58, 237, 0.08),
        rgba(56, 189, 248, 0.05)
      ),
      white;
  }

  .sg-nav-mobile-guest-kicker {
    color: var(--sg-nav-violet);
    font-family: var(--font-mono), monospace;
    font-size: 9px;
    font-weight: 750;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .sg-nav-mobile-guest strong {
    color: var(--sg-nav-indigo);
    font-size: 18px;
    letter-spacing: -0.03em;
  }

  .sg-nav-mobile-guest p {
    margin: 0;
    color: var(--sg-nav-muted);
    font-size: 13px;
    line-height: 1.6;
  }

  .sg-nav-brand:focus-visible,
  .sg-nav-public-link:focus-visible,
  .sg-nav-app-link:focus-visible,
  .sg-nav-live-button:focus-visible,
  .sg-nav-create-button:focus-visible,
  .sg-nav-signin:focus-visible,
  .sg-nav-profile:focus-visible,
  .sg-nav-signout:focus-visible,
  .sg-nav-menu-button:focus-visible,
  .sg-nav-mobile-link:focus-visible,
  .sg-nav-mobile-action:focus-visible,
  .sg-nav-mobile-signout:focus-visible {
    outline: 3px solid rgba(124, 58, 237, 0.22);
    outline-offset: 2px;
  }

  @keyframes sg-nav-mobile-enter {
    from {
      opacity: 0;
      transform: translateY(-8px) scale(0.985);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (max-width: 960px) {
    .sg-nav-public-links,
    .sg-nav-app-links,
    .sg-nav-actions {
      display: none;
    }

    .sg-nav-menu-button {
      display: grid;
    }
  }

  @media (max-width: 560px) {
    .sg-nav-shell {
      width: calc(100% - 28px);
      min-height: 66px;
    }

.sg-nav-brand-mark {
  width: 35px;
  height: 35px;
  flex-basis: 35px;
}

.sg-nav-brand-logo {
  width: 35px;
  height: 35px;
}

.sg-nav-brand-name {
  font-size: 15px;
}
    .sg-nav-brand-subtitle {
      font-size: 7px;
    }

    .sg-nav-mobile-panel {
      top: 74px;
      max-height: calc(100dvh - 88px);
    }

    .sg-nav-mobile-actions {
      grid-template-columns: 1fr;
    }

    .sg-nav-mobile-signout {
      grid-column: auto;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sg-nav-mobile-panel {
      animation: none;
    }
    
    .sg-nav-public-indicator,
.sg-nav-scroll-progress span {
  transition: none;
}

    .sg-nav-public-link,
    .sg-nav-app-link,
    .sg-nav-live-button,
    .sg-nav-create-button,
    .sg-nav-signin,
    .sg-nav-profile,
    .sg-nav-signout,
    .sg-nav-mobile-link {
      transition: none;
    }

    .sg-nav-public-link:hover,
    .sg-nav-app-link:hover,
    .sg-nav-live-button:hover,
    .sg-nav-create-button:hover,
    .sg-nav-signin:hover,
    .sg-nav-profile:hover {
      transform: none;
    }
  }
`;
