"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  MapPin,
  MessageCircle,
  Radio,
  Search,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { isEduEmail } from "@/lib/authRules";

type HomeView = "checking" | "guest" | "redirecting";

type JourneyStep = {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: "violet" | "green" | "sky";
  className: string;
};

const tickerItems = [
  "CS400 Midterm Review",
  "MATH340 Homework Help",
  "Students live at Memorial Library",
  "ECON101 Study Session",
  "Find classmates in your courses",
  "Meet on campus",
] as const;

const journeySteps: JourneyStep[] = [
  {
    number: "01",
    eyebrow: "Discover",
    title: "Open the app and find your course.",
    description:
        "StudyGrouprr organizes activity around the classes you are actually taking, not giant public communities.",
    icon: Search,
    tone: "violet",
    className: "hp-journey-card--one",
  },
  {
    number: "02",
    eyebrow: "Choose",
    title: "See who is live or what starts next.",
    description:
        "Browse students studying right now, upcoming sessions, locations, and the classmates already joining.",
    icon: Radio,
    tone: "green",
    className: "hp-journey-card--two",
  },
  {
    number: "03",
    eyebrow: "Meet",
    title: "Join them and study in person.",
    description:
        "One click turns a vague study plan into a real campus meetup with people from the same course.",
    icon: Users,
    tone: "sky",
    className: "hp-journey-card--three",
  },
];


export default function HomePage() {
  const router = useRouter();

  const rootRef = useRef<HTMLElement>(null);
  const [view, setView] = useState<HomeView>("checking");

  useEffect(() => {
    let cancelled = false;

    async function resolveAuthentication() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError && userError.name !== "AuthSessionMissingError") {
          throw userError;
        }

        if (!user) {
          if (!cancelled) {
            setView("guest");
          }
          return;
        }

        if (!user.email || !isEduEmail(user.email)) {
          await supabase.auth.signOut();

          if (!cancelled) {
            setView("guest");
          }

          return;
        }

        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("onboarding_complete")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (cancelled) {
          return;
        }

        setView("redirecting");

        router.replace(
            profile?.onboarding_complete
                ? "/dashboard"
                : "/onboarding"
        );
      } catch (error) {
        console.error("Unable to resolve authentication:", error);

        if (!cancelled) {
          setView("guest");
        }
      }
    }

    void resolveAuthentication();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (view !== "guest") {
      return;
    }

    const root = rootRef.current;

    if (!root) {
      return;
    }

    const revealElements =
        root.querySelectorAll<HTMLElement>(".hp-reveal");

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) {
      revealElements.forEach((element) => {
        element.classList.add("hp-reveal--visible");
      });

      return;
    }

    const revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }

            entry.target.classList.add(
                "hp-reveal--visible"
            );

            revealObserver.unobserve(entry.target);
          });
        },
        {
          threshold: 0.14,
          rootMargin: "0px 0px -6% 0px",
        }
    );

    revealElements.forEach((element) => {
      revealObserver.observe(element);
    });

    return () => {
      revealObserver.disconnect();
    };
  }, [view]);

  if (view !== "guest") {
    return (
        <>
          <style>{homeStyles}</style>

          <main className="hp-loading" role="status">
            <div className="hp-loading-mark">
              <BookOpen size={21} />
            </div>

            <div className="hp-loading-spinner" />

            <p>
              {view === "redirecting"
                  ? "Opening StudyGrouprr…"
                  : "Loading…"}
            </p>
          </main>
        </>
    );
  }

  return (
      <>
        <style>{homeStyles}</style>

        <main ref={rootRef} className="hp-root">

          <section className="hp-hero">
            <div className="hp-hero-grid">
              <div className="hp-hero-copy">
                <h1 className="hp-hero-title hp-enter hp-enter--two">
                  Your class is
                  <span> already studying.</span>
                  <br />
                  Go find them.
                </h1>

                <p className="hp-hero-description hp-enter hp-enter--three">
                  StudyGrouprr shows you classmates studying
                  the same course, sessions happening nearby,
                  and the people ready to meet right now.
                </p>

                <div className="hp-hero-action-zone hp-enter hp-enter--four">
                  <HeroArrowCluster />

                  <div className="hp-hero-actions">
                    <Link
                        href="/login"
                        className="hp-primary-button"
                    >
                      Find your study group
                      <ArrowRight size={17} />
                    </Link>

                    <a
                        href="#the-journey"
                        className="hp-secondary-link"
                    >
                      Watch how it works
                    </a>
                  </div>
                </div>

                <div className="hp-hero-proof hp-enter hp-enter--five">
                  <div>
                    <CheckCircle2 size={15} />
                    Course-first discovery
                  </div>

                  <div>
                    <CheckCircle2 size={15} />
                    Real campus meetups
                  </div>

                  <div>
                    <CheckCircle2 size={15} />
                    One-click joining
                  </div>
                </div>
              </div>

              <div className="hp-hero-stage hp-enter hp-enter--three">
                <div className="hp-stage-orbit hp-stage-orbit--one" />
                <div className="hp-stage-orbit hp-stage-orbit--two" />

                <div className="hp-stage-label hp-stage-label--top">
                  <Sparkles size={13} />
                  Campus activity
                </div>

                <div className="hp-stage-side-copy">
                  Right now
                </div>

                <CampusBoard />

                <div className="hp-floating-note hp-floating-note--location">
                  <MapPin size={14} />
                  <div>
                    <strong>Memorial Library</strong>
                    <span>2 students live</span>
                  </div>
                </div>

                <div className="hp-floating-note hp-floating-note--course">
                  <BookOpen size={14} />
                  <div>
                    <strong>CS400 Review</strong>
                    <span>Starts at 6:00 PM</span>
                  </div>
                </div>

                <ArrowCallout
                    label="this is happening now"
                    direction="down-left"
                    className="hp-stage-arrow"
                />
              </div>

              <p className="hp-hero-vertical-copy">
                FIND · JOIN · MEET · STUDY
              </p>
            </div>
          </section>

          <CampusTicker />

          <section
              id="the-journey"
              className="hp-journey"
          >
            <div className="hp-journey-grid">
              <div className="hp-journey-intro hp-reveal">
                <p className="hp-section-kicker">
                  The shortest route to a study group
                </p>

                <h2>
                  No servers.
                  <br />
                  No awkward group-chat spam.
                  <br />
                  <span>Just people studying.</span>
                </h2>

                <p className="hp-journey-intro-copy">
                  Every interaction moves toward one outcome:
                  students from the same course meeting in
                  person and getting work done.
                </p>

                <div className="hp-journey-mini-map">
                  <span>Course</span>
                  <ArrowRight size={14} />
                  <span>Session</span>
                  <ArrowRight size={14} />
                  <span>Meetup</span>
                </div>
              </div>

              <div className="hp-journey-cards">
                {journeySteps.map((step) => (
                    <JourneyCard
                        key={step.number}
                        step={step}
                    />
                ))}
              </div>
            </div>
          </section>

          <section className="hp-pulse-section">
            <div className="hp-pulse-heading hp-reveal">
              <div>
                <p className="hp-section-kicker">
                  A living view of campus
                </p>

                <h2>
                  Not a feed.
                  <span> A campus pulse.</span>
                </h2>
              </div>

              <p>
                The useful parts of study coordination,
                arranged around what is happening, where it is
                happening, and who is already there.
              </p>
            </div>

            <div className="hp-bento">
              <article className="hp-map-panel hp-reveal">
                <div className="hp-panel-topline">
                  <div>
                  <span className="hp-panel-kicker">
                    Campus map
                  </span>

                    <h3>Study activity near you</h3>
                  </div>

                  <span className="hp-live-pill">
                  <span />
                  Live
                </span>
                </div>

                <CampusMap />

                <ArrowCallout
                    label="meet here"
                    direction="down-right"
                    className="hp-map-callout"
                />
              </article>

              <article className="hp-live-panel hp-reveal">
                <div className="hp-panel-icon hp-panel-icon--green">
                  <Radio size={18} />
                </div>

                <p className="hp-panel-kicker">
                  Studying now
                </p>

                <h3>Find someone who already started.</h3>

                <div className="hp-live-list">
                  <StudentRow
                      initial="S"
                      name="Sarah"
                      course="CS400"
                      location="Memorial Library"
                      tone="violet"
                  />

                  <StudentRow
                      initial="A"
                      name="Alex"
                      course="MATH340"
                      location="Engineering Hall"
                      tone="green"
                  />

                  <StudentRow
                      initial="M"
                      name="Maya"
                      course="ECON101"
                      location="College Library"
                      tone="sky"
                  />
                </div>

                <div className="hp-live-panel-footer">
                  <span>Updated moments ago</span>
                  <Zap size={14} />
                </div>
              </article>

              <article className="hp-course-panel hp-reveal">
                <div className="hp-course-orbit" />

                <div className="hp-panel-icon hp-panel-icon--violet">
                  <BookOpen size={18} />
                </div>

                <p className="hp-panel-kicker">
                  Your courses
                </p>

                <h3>Every class gets a doorway.</h3>

                <div className="hp-course-cloud">
                <span className="hp-course-chip hp-course-chip--large">
                  CS400
                </span>

                  <span>MATH340</span>
                  <span>ECON101</span>
                  <span>BIO152</span>
                  <span>CHEM104</span>
                </div>
              </article>

              <article className="hp-session-panel hp-reveal">
                <div className="hp-session-time-column">
                  <span>06</span>
                  <small>PM</small>
                </div>

                <div className="hp-session-panel-content">
                  <div className="hp-session-topline">
                    <span>Starting soon</span>

                    <Clock3 size={14} />
                  </div>

                  <h3>CS400 Midterm Review</h3>

                  <p>
                    Dynamic programming, graphs, and practice
                    problems before the exam.
                  </p>

                  <div className="hp-session-meta">
                  <span>
                    <MapPin size={13} />
                    Union South
                  </span>

                    <span>
                    <Users size={13} />
                    5 going
                  </span>
                  </div>
                </div>
              </article>

              <article className="hp-buddy-panel hp-reveal">
                <div className="hp-buddy-avatars">
                <span className="hp-buddy-avatar hp-buddy-avatar--one">
                  A
                </span>

                  <span className="hp-buddy-avatar hp-buddy-avatar--two">
                  J
                </span>

                  <span className="hp-buddy-avatar hp-buddy-avatar--three">
                  M
                </span>

                  <span className="hp-buddy-avatar hp-buddy-avatar--more">
                  +4
                </span>
                </div>

                <div>
                  <p className="hp-panel-kicker">
                    Study buddies
                  </p>

                  <h3>Recognize familiar classmates.</h3>

                  <p>
                    Build a small circle of students you can
                    study with again.
                  </p>
                </div>
              </article>
            </div>
          </section>

          <section className="hp-manifesto">
            <div className="hp-manifesto-stage hp-reveal">
              <p className="hp-manifesto-small">
                THE WHOLE PRODUCT IN ONE LINE
              </p>

              <div className="hp-manifesto-line">
                <span>Create.</span>
                <ArrowRight />
                <span>Discover.</span>
                <ArrowRight />
                <span>Join.</span>
                <ArrowRight />
                <strong>Meet.</strong>
              </div>

              <p className="hp-manifesto-copy">
                Everything else is there to make that final
                step happen more often.
              </p>

              <div className="hp-manifesto-scribble">
                <svg
                    viewBox="0 0 220 54"
                    role="presentation"
                    focusable="false"
                >
                  <path
                      d="M4 27C41 4 71 49 105 26C138 3 166 49 216 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                  />
                </svg>

                <span>successful study meetups</span>
              </div>
            </div>
          </section>

          <section className="hp-final-section">
            <div className="hp-final-stage hp-reveal">
              <div className="hp-final-ring hp-final-ring--one" />
              <div className="hp-final-ring hp-final-ring--two" />
              <div className="hp-final-ring hp-final-ring--three" />

              <div className="hp-final-doodle hp-final-doodle--book">
                <BookOpen size={19} />
              </div>

              <div className="hp-final-doodle hp-final-doodle--calendar">
                <CalendarDays size={19} />
              </div>

              <div className="hp-final-doodle hp-final-doodle--chat">
                <MessageCircle size={19} />
              </div>

              <div className="hp-final-content">
                <p className="hp-section-kicker">
                  Your next session is probably closer than
                  you think
                </p>

                <h2>
                  Stop studying around people.
                  <span> Start studying with them.</span>
                </h2>

                <p>
                  Find the students, course, place, and time
                  that turn today’s plan into an actual meetup.
                </p>

                <div className="hp-final-action-zone">
                  <FinalArrowCluster />

                  <Link
                      href="/login"
                      className="hp-primary-button hp-primary-button--large"
                  >
                    Open StudyGrouprr
                    <ArrowRight size={18} />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>
      </>
  );
}

function CampusTicker() {
  return (
      <section
          className="hp-ticker"
          aria-label="Examples of StudyGrouprr activity"
      >
        <div className="hp-ticker-track">
          {[...tickerItems, ...tickerItems].map(
              (item, index) => (
                  <div
                      key={`${item}-${index}`}
                      className="hp-ticker-item"
                      aria-hidden={
                        index >= tickerItems.length
                            ? true
                            : undefined
                      }
                  >
                    <span className="hp-ticker-dot" />
                    {item}
                  </div>
              )
          )}
        </div>
      </section>
  );
}

function CampusBoard() {
  return (
      <div className="hp-board">
        <div className="hp-board-toolbar">
          <div className="hp-board-window-dots">
            <span />
            <span />
            <span />
          </div>

          <div className="hp-board-campus">
            <GraduationCap size={13} />
            Your campus
          </div>

          <span className="hp-board-live">
          <span />
          Live
        </span>
        </div>

        <div className="hp-board-heading">
          <div>
            <p>Good afternoon</p>
            <h2>Who’s studying?</h2>
          </div>

          <div className="hp-board-avatar">K</div>
        </div>

        <div className="hp-board-search">
          <Search size={15} />
          Search your courses
          <kbd>⌘ K</kbd>
        </div>

        <div className="hp-board-grid">
          <div className="hp-board-live-card">
            <div className="hp-board-section-title">
            <span>
              <Radio size={14} />
              Live now
            </span>

              <small>3 nearby</small>
            </div>

            <StudentRow
                initial="S"
                name="Sarah"
                course="CS400"
                location="Memorial Library"
                tone="violet"
                compact
            />

            <StudentRow
                initial="A"
                name="Alex"
                course="MATH340"
                location="Engineering Hall"
                tone="green"
                compact
            />
          </div>

          <div className="hp-board-session-card">
            <div className="hp-board-session-top">
              <span>Starting soon</span>
              <Clock3 size={13} />
            </div>

            <div className="hp-board-course-icon">
              <BookOpen size={17} />
            </div>

            <h3>CS400 Midterm Review</h3>

            <p>
              Union South · 6:00 PM
            </p>

            <div className="hp-board-attendees">
              <span>S</span>
              <span>A</span>
              <span>M</span>
              <small>+2</small>
            </div>
          </div>
        </div>

        <div className="hp-board-courses">
          <span>Your courses</span>

          <div>
            <button type="button">CS400</button>
            <button type="button">MATH340</button>
            <button type="button">ECON101</button>
          </div>
        </div>
      </div>
  );
}

function JourneyCard({
                       step,
                     }: {
  step: JourneyStep;
}) {
  const Icon = step.icon;

  return (
      <article
          className={[
            "hp-journey-card",
            "hp-reveal",
            step.className,
          ].join(" ")}
      >
        <div className="hp-journey-card-number">
          {step.number}
        </div>

        <div
            className={[
              "hp-journey-card-icon",
              `hp-journey-card-icon--${step.tone}`,
            ].join(" ")}
        >
          <Icon size={20} />
        </div>

        <p>{step.eyebrow}</p>
        <h3>{step.title}</h3>
        <span>{step.description}</span>
      </article>
  );
}

function CampusMap() {
  return (
      <div className="hp-campus-map" aria-hidden="true">
        <svg
            className="hp-campus-map-lines"
            viewBox="0 0 680 360"
            preserveAspectRatio="none"
            role="presentation"
        >
          <path
              d="M-20 90C100 55 175 155 290 130C405 104 440 8 700 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="17"
              strokeLinecap="round"
          />

          <path
              d="M80 390C92 295 185 273 226 219C287 139 224 59 264 -20"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              strokeLinecap="round"
          />

          <path
              d="M408 390C425 300 389 225 475 183C558 142 626 184 700 134"
              fill="none"
              stroke="currentColor"
              strokeWidth="13"
              strokeLinecap="round"
          />

          <path
              d="M-25 275C105 250 170 326 314 285C450 246 520 254 705 320"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              strokeLinecap="round"
          />
        </svg>

        <div className="hp-map-building hp-map-building--one" />
        <div className="hp-map-building hp-map-building--two" />
        <div className="hp-map-building hp-map-building--three" />
        <div className="hp-map-building hp-map-building--four" />

        <div className="hp-map-pin hp-map-pin--one">
        <span className="hp-map-pin-dot hp-map-pin-dot--violet">
          <Radio size={13} />
        </span>

          <div>
            <strong>Memorial Library</strong>
            <small>2 studying now</small>
          </div>
        </div>

        <div className="hp-map-pin hp-map-pin--two">
        <span className="hp-map-pin-dot hp-map-pin-dot--green">
          <Users size={13} />
        </span>

          <div>
            <strong>Union South</strong>
            <small>Session at 6 PM</small>
          </div>
        </div>

        <div className="hp-map-you">
          <span />
          You
        </div>
      </div>
  );
}

type StudentRowProps = {
  initial: string;
  name: string;
  course: string;
  location: string;
  tone: "violet" | "green" | "sky";
  compact?: boolean;
};

function StudentRow({
                      initial,
                      name,
                      course,
                      location,
                      tone,
                      compact = false,
                    }: StudentRowProps) {
  return (
      <div
          className={[
            "hp-student-row",
            compact ? "hp-student-row--compact" : "",
          ]
              .filter(Boolean)
              .join(" ")}
      >
      <span
          className={[
            "hp-student-avatar",
            `hp-student-avatar--${tone}`,
          ].join(" ")}
      >
        {initial}
      </span>

        <div className="hp-student-copy">
          <div>
            <strong>{name}</strong>
            <span>{course}</span>
          </div>

          <p>
            <MapPin size={11} />
            {location}
          </p>
        </div>
      </div>
  );
}

type ArrowDirection =
    | "down"
    | "down-left"
    | "down-right";

function ArrowCallout({
                        label,
                        direction,
                        className = "",
                      }: {
  label: string;
  direction: ArrowDirection;
  className?: string;
}) {
  const paths: Record<
      ArrowDirection,
      {
        viewBox: string;
        line: string;
        head: string;
      }
  > = {
    down: {
      viewBox: "0 0 44 66",
      line: "M22 5C22 22 22 37 22 54",
      head: "M14 45L22 55L30 45",
    },
    "down-left": {
      viewBox: "0 0 82 64",
      line: "M77 7C57 7 42 16 34 29C29 38 25 46 19 55",
      head: "M18 44L19 56L31 51",
    },
    "down-right": {
      viewBox: "0 0 82 64",
      line: "M5 7C25 7 40 16 48 29C53 38 57 46 63 55",
      head: "M51 51L63 56L64 44",
    },
  };

  const path = paths[direction];

  return (
      <div
          className={[
            "hp-arrow-callout",
            `hp-arrow-callout--${direction}`,
            className,
          ]
              .filter(Boolean)
              .join(" ")}
          aria-hidden="true"
      >
        <div className="hp-arrow-callout-motion">
          <span>{label}</span>

          <svg
              viewBox={path.viewBox}
              role="presentation"
              focusable="false"
          >
            <path
                d={path.line}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.15"
                strokeLinecap="round"
            />

            <path
                d={path.head}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.15"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
  );
}

function HeroArrowCluster() {
  return (
      <div className="hp-hero-arrow-cluster" aria-hidden="true">
        <ArrowCallout
            label="your classmates"
            direction="down-right"
            className="hp-hero-arrow hp-hero-arrow--left"
        />

        <ArrowCallout
            label="one click"
            direction="down"
            className="hp-hero-arrow hp-hero-arrow--center"
        />

        <ArrowCallout
            label="go meet"
            direction="down-left"
            className="hp-hero-arrow hp-hero-arrow--right"
        />
      </div>
  );
}

function FinalArrowCluster() {
  return (
      <div className="hp-final-arrow-cluster" aria-hidden="true">
        <ArrowCallout
            label="find"
            direction="down-right"
            className="hp-final-arrow hp-final-arrow--left"
        />

        <ArrowCallout
            label="join"
            direction="down"
            className="hp-final-arrow hp-final-arrow--center"
        />

        <ArrowCallout
            label="study"
            direction="down-left"
            className="hp-final-arrow hp-final-arrow--right"
        />
      </div>
  );
}

const homeStyles = `
  .hp-root,
  .hp-loading {
    --hp-indigo: #1b1b3a;
    --hp-violet: #7c3aed;
    --hp-violet-dark: #6d28d9;
    --hp-violet-light: #f5f3ff;
    --hp-violet-mid: #a78bfa;
    --hp-green: #10b981;
    --hp-green-light: #ecfdf5;
    --hp-sky: #0284c7;
    --hp-sky-light: #e0f2fe;
    --hp-amber: #f59e0b;
    --hp-amber-light: #fef3c7;
    --hp-background: #f8f7fc;
    --hp-surface: #ffffff;
    --hp-surface-soft: #fbfafd;
    --hp-border: #e7e5ef;
    --hp-border-strong: #d9d6e7;
    --hp-text: #1b1b3a;
    --hp-muted: #64748b;
    --hp-faint: #94a3b8;
    --hp-shadow-sm:
      0 12px 34px rgba(27, 27, 58, 0.06);
    --hp-shadow-md:
      0 25px 75px rgba(27, 27, 58, 0.11);
  }

  .hp-root *,
  .hp-root *::before,
  .hp-root *::after,
  .hp-loading * {
    box-sizing: border-box;
  }

  .hp-root {
    position: relative;
    isolation: isolate;
    min-height: 100vh;
    overflow: hidden;
    background:
      linear-gradient(
        180deg,
        #fbfaff 0%,
        #f8f7fc 32%,
        #fbfbfd 66%,
        #f7f6fb 100%
      );
    color: var(--hp-text);
  }

  .hp-root a {
    color: inherit;
  }

  /*
   * Loading
   */
  .hp-loading {
    display: flex;
    min-height: calc(100svh - 140px);
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 13px;
    background: var(--hp-background);
  }

  .hp-loading-mark {
    display: grid;
    width: 48px;
    height: 48px;
    place-items: center;
    border: 1px solid var(--hp-border);
    border-radius: 15px;
    background: white;
    color: var(--hp-violet);
    box-shadow: var(--hp-shadow-sm);
  }

  .hp-loading-spinner {
    width: 23px;
    height: 23px;
    border: 2px solid var(--hp-border);
    border-top-color: var(--hp-violet);
    border-radius: 50%;
    animation: hp-spin 700ms linear infinite;
  }

  .hp-loading p {
    margin: 0;
    color: var(--hp-muted);
    font-size: 12px;
  }

  /*
   * Hero
   */
  .hp-hero {
    position: relative;
    z-index: 1;
    min-height: min(900px, calc(100svh - 80px));
    padding: 88px 24px 94px;
  }

  .hp-hero-grid {
    position: relative;
    display: grid;
    width: min(1180px, 100%);
    min-height: 700px;
    margin: 0 auto;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    align-items: center;
  }

  .hp-hero-copy {
    position: relative;
    z-index: 4;
    grid-column: 1 / span 7;
    align-self: center;
    padding-bottom: 54px;
  }

  .hp-hero-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 8px 12px;
    border: 1px solid #ddd6fe;
    border-radius: 999px;
    background: rgba(245, 243, 255, 0.86);
    color: var(--hp-violet);
    font-size: 10px;
    font-weight: 760;
    letter-spacing: 0.09em;
    text-transform: uppercase;
  }

  .hp-eyebrow-pulse {
    position: relative;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--hp-green);
  }

  .hp-eyebrow-pulse::after {
    content: "";
    position: absolute;
    inset: -4px;
    border: 1px solid rgba(16, 185, 129, 0.38);
    border-radius: inherit;
    animation: hp-pulse-ring 1.8s ease-out infinite;
  }

  .hp-hero-title {
    max-width: 790px;
    margin: 25px 0 24px;
    color: var(--hp-indigo);
    font-size: clamp(54px, 7.2vw, 94px);
    font-weight: 790;
    letter-spacing: -0.065em;
    line-height: 0.91;
  }

  .hp-hero-title span {
    color: var(--hp-violet);
  }

  .hp-hero-description {
    max-width: 590px;
    margin: 0;
    color: var(--hp-muted);
    font-size: 16px;
    line-height: 1.75;
  }

  .hp-hero-action-zone {
    position: relative;
    margin-top: 112px;
  }

  .hp-hero-actions {
    display: flex;
    align-items: center;
    gap: 17px;
  }

  .hp-primary-button {
    display: inline-flex;
    min-height: 51px;
    align-items: center;
    justify-content: center;
    gap: 9px;
    padding: 0 21px;
    border-radius: 14px;
    background: var(--hp-violet);
    color: white !important;
    font-size: 13px;
    font-weight: 720;
    text-decoration: none;
    box-shadow:
      0 14px 31px rgba(124, 58, 237, 0.2);
    transition:
      background 160ms ease,
      box-shadow 160ms ease,
      transform 160ms ease;
  }

  .hp-primary-button:hover {
    transform: translateY(-2px);
    background: var(--hp-violet-dark);
    box-shadow:
      0 19px 38px rgba(124, 58, 237, 0.25);
  }

  .hp-primary-button svg {
    transition: transform 160ms ease;
  }

  .hp-primary-button:hover svg {
    transform: translateX(3px);
  }

  .hp-secondary-link {
    display: inline-flex;
    min-height: 48px;
    align-items: center;
    padding: 0 6px;
    color: var(--hp-muted) !important;
    font-size: 12px;
    font-weight: 680;
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition:
      color 160ms ease,
      border-color 160ms ease;
  }

  .hp-secondary-link:hover {
    color: var(--hp-violet) !important;
    border-color: #c4b5fd;
  }

  .hp-hero-proof {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 20px;
    margin-top: 30px;
  }

  .hp-hero-proof div {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: var(--hp-muted);
    font-size: 10px;
    font-weight: 580;
  }

  .hp-hero-proof svg {
    color: var(--hp-green);
  }

  .hp-hero-stage {
    position: relative;
    z-index: 3;
    grid-column: 7 / -1;
    align-self: center;
    min-height: 620px;
    margin-left: -18px;
  }

  .hp-stage-orbit {
    position: absolute;
    border: 1px solid rgba(124, 58, 237, 0.12);
    border-radius: 50%;
    pointer-events: none;
  }

  .hp-stage-orbit--one {
    top: 32px;
    right: -36px;
    width: 520px;
    height: 520px;
  }

  .hp-stage-orbit--two {
    top: 89px;
    right: 20px;
    width: 405px;
    height: 405px;
    border-style: dashed;
    animation: hp-orbit-spin 36s linear infinite;
  }

  .hp-stage-label {
    position: absolute;
    z-index: 7;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 11px;
    border: 1px solid var(--hp-border);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.95);
    color: var(--hp-violet);
    font-size: 9px;
    font-weight: 760;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    box-shadow: var(--hp-shadow-sm);
  }

  .hp-stage-label--top {
    top: 13px;
    left: 97px;
    transform: rotate(-4deg);
  }

  .hp-stage-side-copy {
    position: absolute;
    top: 253px;
    right: -88px;
    color: #cbc7d8;
    font-size: 9px;
    font-weight: 760;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    transform: rotate(90deg);
  }

  .hp-board {
    position: absolute;
    top: 88px;
    right: 0;
    width: min(100%, 520px);
    overflow: hidden;
    padding: 20px;
    border: 1px solid rgba(217, 214, 231, 0.95);
    border-radius: 27px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: var(--hp-shadow-md);
    backdrop-filter: blur(17px);
    transform: rotate(1.35deg);
  }

  .hp-board::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      radial-gradient(
        circle at 100% 0%,
        rgba(124, 58, 237, 0.08),
        transparent 32%
      );
    pointer-events: none;
  }

  .hp-board-toolbar,
  .hp-board-heading,
  .hp-board-section-title,
  .hp-board-session-top,
  .hp-board-courses {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .hp-board-toolbar {
    padding-bottom: 17px;
    border-bottom: 1px solid var(--hp-border);
  }

  .hp-board-window-dots {
    display: flex;
    gap: 5px;
  }

  .hp-board-window-dots span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #ddd9e8;
  }

  .hp-board-window-dots span:first-child {
    background: #c4b5fd;
  }

  .hp-board-campus {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--hp-muted);
    font-size: 9px;
    font-weight: 700;
  }

  .hp-board-campus svg {
    color: var(--hp-violet);
  }

  .hp-board-live {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 8px;
    border-radius: 999px;
    background: var(--hp-green-light);
    color: #047857;
    font-size: 8px;
    font-weight: 750;
  }

  .hp-board-live span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--hp-green);
  }

  .hp-board-heading {
    margin-top: 19px;
  }

  .hp-board-heading p {
    margin: 0 0 3px;
    color: var(--hp-faint);
    font-size: 9px;
    font-weight: 650;
  }

  .hp-board-heading h2 {
    margin: 0;
    color: var(--hp-indigo);
    font-size: 21px;
    font-weight: 760;
    letter-spacing: -0.035em;
  }

  .hp-board-avatar {
    display: grid;
    width: 37px;
    height: 37px;
    place-items: center;
    border: 1px solid #ddd6fe;
    border-radius: 12px;
    background: var(--hp-violet-light);
    color: var(--hp-violet);
    font-size: 11px;
    font-weight: 750;
  }

  .hp-board-search {
    position: relative;
    display: flex;
    min-height: 38px;
    margin-top: 16px;
    align-items: center;
    gap: 8px;
    padding: 0 11px;
    border: 1px solid #eeecf3;
    border-radius: 11px;
    background: #fbfafd;
    color: var(--hp-faint);
    font-size: 9px;
  }

  .hp-board-search kbd {
    margin-left: auto;
    padding: 3px 5px;
    border: 1px solid var(--hp-border);
    border-radius: 5px;
    background: white;
    color: var(--hp-muted);
    font-family: inherit;
    font-size: 8px;
  }

  .hp-board-grid {
    position: relative;
    display: grid;
    margin-top: 14px;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 10px;
  }

  .hp-board-live-card,
  .hp-board-session-card {
    border: 1px solid #eeecf3;
    border-radius: 15px;
    background: #fbfafd;
  }

  .hp-board-live-card {
    padding: 12px;
  }

  .hp-board-section-title span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--hp-indigo);
    font-size: 9px;
    font-weight: 720;
  }

  .hp-board-section-title span svg {
    color: var(--hp-green);
  }

  .hp-board-section-title small {
    color: var(--hp-faint);
    font-size: 8px;
  }

  .hp-board-session-card {
    padding: 12px;
    background:
      linear-gradient(
        145deg,
        #faf8ff,
        #f5f3ff
      );
    border-color: #ddd6fe;
  }

  .hp-board-session-top {
    color: var(--hp-violet);
    font-size: 8px;
    font-weight: 740;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .hp-board-course-icon {
    display: grid;
    width: 34px;
    height: 34px;
    margin-top: 14px;
    place-items: center;
    border-radius: 10px;
    background: white;
    color: var(--hp-violet);
    box-shadow:
      0 6px 15px rgba(124, 58, 237, 0.08);
  }

  .hp-board-session-card h3 {
    margin: 12px 0 5px;
    color: var(--hp-indigo);
    font-size: 11px;
    line-height: 1.35;
  }

  .hp-board-session-card > p {
    margin: 0;
    color: var(--hp-muted);
    font-size: 8px;
  }

  .hp-board-attendees {
    display: flex;
    align-items: center;
    margin-top: 13px;
  }

  .hp-board-attendees span,
  .hp-board-attendees small {
    display: grid;
    width: 24px;
    height: 24px;
    margin-left: -5px;
    place-items: center;
    border: 2px solid #f5f3ff;
    border-radius: 50%;
    background: white;
    color: var(--hp-violet);
    font-size: 7px;
    font-weight: 750;
  }

  .hp-board-attendees span:first-child {
    margin-left: 0;
  }

  .hp-board-attendees small {
    background: var(--hp-violet);
    color: white;
  }

  .hp-board-courses {
    margin-top: 14px;
    padding-top: 13px;
    border-top: 1px solid var(--hp-border);
  }

  .hp-board-courses > span {
    color: var(--hp-faint);
    font-size: 8px;
    font-weight: 700;
  }

  .hp-board-courses > div {
    display: flex;
    gap: 5px;
  }

  .hp-board-courses button {
    padding: 5px 7px;
    border: 1px solid var(--hp-border);
    border-radius: 7px;
    background: white;
    color: var(--hp-indigo);
    font: inherit;
    font-size: 7px;
    font-weight: 740;
  }

  .hp-floating-note {
    position: absolute;
    z-index: 7;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 11px 13px;
    border: 1px solid var(--hp-border);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.97);
    box-shadow:
      0 13px 31px rgba(27, 27, 58, 0.1);
    animation: hp-float-note 3.3s ease-in-out infinite;
  }

  .hp-floating-note svg {
    color: var(--hp-violet);
  }

  .hp-floating-note strong,
  .hp-floating-note span {
    display: block;
  }

  .hp-floating-note strong {
    color: var(--hp-indigo);
    font-size: 9px;
  }

  .hp-floating-note span {
    margin-top: 2px;
    color: var(--hp-faint);
    font-size: 8px;
  }

  .hp-floating-note--location {
    top: 143px;
    left: -13px;
    animation-delay: -0.6s;
  }

  .hp-floating-note--course {
    right: -29px;
    bottom: 88px;
    animation-delay: -1.5s;
  }

  .hp-stage-arrow {
    position: absolute;
    top: 5px;
    right: 16px;
    z-index: 8;
    transform: rotate(3deg);
  }

  .hp-hero-vertical-copy {
    position: absolute;
    right: -5px;
    bottom: 32px;
    margin: 0;
    color: #cbc8d6;
    font-size: 8px;
    font-weight: 750;
    letter-spacing: 0.2em;
    writing-mode: vertical-rl;
  }

  /*
   * Animated arrow system
   */
  .hp-arrow-callout {
    color: var(--hp-violet);
    pointer-events: none;
    user-select: none;
  }

  .hp-arrow-callout-motion {
    display: flex;
    align-items: flex-start;
    gap: 3px;
    animation:
      hp-arrow-float 2.8s ease-in-out infinite;
  }

  .hp-arrow-callout span {
    display: inline-flex;
    min-height: 24px;
    align-items: center;
    justify-content: center;
    padding: 5px 9px;
    border: 1px solid rgba(196, 181, 253, 0.62);
    border-radius: 999px;
    background: rgba(245, 243, 255, 0.97);
    color: var(--hp-violet);
    font-size: 8px;
    font-weight: 760;
    letter-spacing: 0.025em;
    line-height: 1;
    white-space: nowrap;
    box-shadow:
      0 7px 18px rgba(124, 58, 237, 0.08);
  }

  .hp-arrow-callout svg {
    width: 59px;
    height: 51px;
    overflow: visible;
    flex: 0 0 auto;
    filter:
      drop-shadow(
        0 2px 3px rgba(124, 58, 237, 0.11)
      );
  }

  .hp-arrow-callout path {
    stroke-dasharray: 135;
    animation:
      hp-arrow-draw 3.4s ease-in-out infinite;
  }

  .hp-arrow-callout--down
    .hp-arrow-callout-motion {
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .hp-arrow-callout--down svg {
    width: 34px;
    height: 51px;
  }

  .hp-arrow-callout--down-left
    .hp-arrow-callout-motion {
    flex-direction: row-reverse;
  }

  /*
   * Hero triple arrows
   */
  .hp-hero-arrow-cluster {
    position: absolute;
    right: 0;
    bottom: calc(100% + 10px);
    left: 0;
    height: 90px;
    pointer-events: none;
  }

  .hp-hero-arrow {
    position: absolute;
  }

  .hp-hero-arrow--left {
    top: 28px;
    left: 0;
  }

  .hp-hero-arrow--center {
    top: 0;
    left: 185px;
  }

  .hp-hero-arrow--right {
    top: 28px;
    left: 320px;
  }

  .hp-hero-arrow--left
    .hp-arrow-callout-motion {
    animation-delay: -0.4s;
  }

  .hp-hero-arrow--center
    .hp-arrow-callout-motion {
    animation-delay: -1.1s;
  }

  .hp-hero-arrow--right
    .hp-arrow-callout-motion {
    animation-delay: -1.8s;
  }

  /*
   * Ticker
   */
  .hp-ticker {
    position: relative;
    z-index: 2;
    overflow: hidden;
    border-top: 1px solid var(--hp-border);
    border-bottom: 1px solid var(--hp-border);
    background: rgba(255, 255, 255, 0.72);
    transform: rotate(-0.75deg) scale(1.015);
  }

  .hp-ticker-track {
    display: flex;
    width: max-content;
    min-height: 58px;
    align-items: center;
    animation: hp-ticker-scroll 32s linear infinite;
  }

  .hp-ticker-item {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 0 27px;
    border-right: 1px solid var(--hp-border);
    color: var(--hp-muted);
    font-size: 10px;
    font-weight: 650;
    letter-spacing: 0.025em;
    white-space: nowrap;
  }

  .hp-ticker-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--hp-violet);
    box-shadow:
      0 0 0 4px rgba(124, 58, 237, 0.08);
  }

  /*
   * Journey
   */
  .hp-journey {
    position: relative;
    z-index: 1;
    padding: 155px 24px 180px;
  }

  .hp-journey-grid {
    display: grid;
    width: min(1150px, 100%);
    margin: 0 auto;
    grid-template-columns: minmax(280px, 0.8fr) minmax(0, 1.35fr);
    gap: 95px;
    align-items: start;
  }

  .hp-journey-intro {
    position: sticky;
    top: 130px;
    padding-top: 35px;
  }

  .hp-section-kicker {
    margin: 0;
    color: var(--hp-violet);
    font-size: 9px;
    font-weight: 770;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  .hp-journey-intro h2 {
    margin: 18px 0 20px;
    color: var(--hp-indigo);
    font-size: clamp(35px, 4.6vw, 58px);
    font-weight: 770;
    letter-spacing: -0.052em;
    line-height: 1.02;
  }

  .hp-journey-intro h2 span {
    color: var(--hp-violet);
  }

  .hp-journey-intro-copy {
    max-width: 400px;
    margin: 0;
    color: var(--hp-muted);
    font-size: 13px;
    line-height: 1.75;
  }

  .hp-journey-mini-map {
    display: flex;
    width: fit-content;
    margin-top: 30px;
    align-items: center;
    gap: 7px;
    padding: 10px 12px;
    border: 1px solid var(--hp-border);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.78);
    color: var(--hp-faint);
    font-size: 8px;
    font-weight: 720;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .hp-journey-mini-map span:last-child {
    color: var(--hp-violet);
  }

  .hp-journey-cards {
    position: relative;
    display: grid;
    min-height: 1250px;
    grid-template-columns: repeat(10, 1fr);
    grid-template-rows: 350px 350px 350px;
    gap: 56px 18px;
  }

  .hp-journey-cards::before {
    content: "";
    position: absolute;
    top: 120px;
    bottom: 140px;
    left: 50%;
    width: 1px;
    background:
      linear-gradient(
        to bottom,
        transparent,
        #d8d2e9 10%,
        #d8d2e9 90%,
        transparent
      );
  }

  .hp-journey-card {
    position: relative;
    min-height: 310px;
    padding: 29px;
    border: 1px solid var(--hp-border);
    border-radius: 23px;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: var(--hp-shadow-sm);
  }

  .hp-journey-card--one {
    grid-column: 1 / span 7;
    grid-row: 1;
    transform: rotate(-1.25deg);
  }

  .hp-journey-card--two {
    grid-column: 4 / -1;
    grid-row: 2;
    transform: rotate(1.15deg);
  }

  .hp-journey-card--three {
    grid-column: 1 / span 7;
    grid-row: 3;
    transform: rotate(-0.75deg);
  }

  .hp-journey-card-number {
    position: absolute;
    top: -37px;
    right: 19px;
    color: rgba(124, 58, 237, 0.11);
    font-size: 100px;
    font-weight: 800;
    letter-spacing: -0.08em;
    pointer-events: none;
  }

  .hp-journey-card-icon {
    display: grid;
    width: 46px;
    height: 46px;
    place-items: center;
    border-radius: 14px;
  }

  .hp-journey-card-icon--violet {
    background: var(--hp-violet-light);
    color: var(--hp-violet);
  }

  .hp-journey-card-icon--green {
    background: var(--hp-green-light);
    color: #059669;
  }

  .hp-journey-card-icon--sky {
    background: var(--hp-sky-light);
    color: var(--hp-sky);
  }

  .hp-journey-card > p {
    margin: 31px 0 8px;
    color: var(--hp-violet);
    font-size: 9px;
    font-weight: 760;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .hp-journey-card h3 {
    max-width: 430px;
    margin: 0;
    color: var(--hp-indigo);
    font-size: 25px;
    font-weight: 750;
    letter-spacing: -0.035em;
    line-height: 1.12;
  }

  .hp-journey-card > span {
    display: block;
    max-width: 450px;
    margin-top: 14px;
    color: var(--hp-muted);
    font-size: 12px;
    line-height: 1.7;
  }

  /*
   * Campus pulse / asymmetric bento
   */
  .hp-pulse-section {
    position: relative;
    z-index: 1;
    width: min(1180px, calc(100% - 48px));
    margin: 0 auto;
    padding: 60px 0 180px;
  }

  .hp-pulse-heading {
    display: grid;
    margin-bottom: 61px;
    grid-template-columns: 1.25fr 0.75fr;
    align-items: end;
    gap: 70px;
  }

  .hp-pulse-heading h2 {
    max-width: 700px;
    margin: 14px 0 0;
    color: var(--hp-indigo);
    font-size: clamp(42px, 5.4vw, 69px);
    font-weight: 780;
    letter-spacing: -0.058em;
    line-height: 0.98;
  }

  .hp-pulse-heading h2 span {
    color: var(--hp-violet);
  }

  .hp-pulse-heading > p {
    margin: 0 0 5px;
    color: var(--hp-muted);
    font-size: 13px;
    line-height: 1.75;
  }

  .hp-bento {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    grid-template-rows: 310px 260px 255px;
    gap: 16px;
  }

  .hp-bento article {
    position: relative;
    overflow: hidden;
    border: 1px solid var(--hp-border);
    border-radius: 23px;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: var(--hp-shadow-sm);
  }

  .hp-map-panel {
    grid-column: 1 / span 8;
    grid-row: 1 / span 2;
    padding: 25px;
  }

  .hp-live-panel {
    grid-column: 9 / -1;
    grid-row: 1;
    padding: 23px;
  }

  .hp-course-panel {
    grid-column: 9 / -1;
    grid-row: 2;
    padding: 23px;
  }

  .hp-session-panel {
    grid-column: 1 / span 7;
    grid-row: 3;
    display: grid;
    grid-template-columns: 125px 1fr;
    background:
      linear-gradient(
        140deg,
        rgba(245, 243, 255, 0.96),
        rgba(255, 255, 255, 0.96)
      ) !important;
  }

  .hp-buddy-panel {
    grid-column: 8 / -1;
    grid-row: 3;
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 28px;
  }

  .hp-panel-topline {
    position: relative;
    z-index: 3;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }

  .hp-panel-kicker {
    margin: 0 0 6px;
    color: var(--hp-violet);
    font-size: 8px;
    font-weight: 760;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  .hp-panel-topline h3,
  .hp-live-panel h3,
  .hp-course-panel h3,
  .hp-buddy-panel h3 {
    margin: 0;
    color: var(--hp-indigo);
    font-weight: 740;
    letter-spacing: -0.03em;
  }

  .hp-panel-topline h3 {
    font-size: 22px;
  }

  .hp-live-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 9px;
    border-radius: 999px;
    background: var(--hp-green-light);
    color: #047857;
    font-size: 8px;
    font-weight: 750;
  }

  .hp-live-pill span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--hp-green);
  }

  .hp-campus-map {
    position: absolute;
    inset: 93px 19px 19px;
    overflow: hidden;
    border: 1px solid #eeecf3;
    border-radius: 17px;
    background:
      linear-gradient(
        145deg,
        #f5f4fa,
        #fbfafd
      );
  }

  .hp-campus-map-lines {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    color: rgba(255, 255, 255, 0.96);
  }

  .hp-map-building {
    position: absolute;
    border: 1px solid #e4e0ed;
    border-radius: 8px;
    background: #ebe8f1;
    transform: rotate(-8deg);
  }

  .hp-map-building--one {
    top: 44px;
    left: 55px;
    width: 105px;
    height: 55px;
  }

  .hp-map-building--two {
    top: 145px;
    left: 308px;
    width: 130px;
    height: 71px;
    transform: rotate(6deg);
  }

  .hp-map-building--three {
    right: 59px;
    bottom: 38px;
    width: 105px;
    height: 76px;
    transform: rotate(-3deg);
  }

  .hp-map-building--four {
    bottom: 44px;
    left: 94px;
    width: 78px;
    height: 51px;
    transform: rotate(8deg);
  }

  .hp-map-pin {
    position: absolute;
    z-index: 3;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border: 1px solid var(--hp-border);
    border-radius: 12px;
    background: white;
    box-shadow:
      0 10px 24px rgba(27, 27, 58, 0.09);
  }

  .hp-map-pin--one {
    top: 75px;
    left: 205px;
  }

  .hp-map-pin--two {
    right: 85px;
    bottom: 90px;
  }

  .hp-map-pin-dot {
    display: grid;
    width: 27px;
    height: 27px;
    place-items: center;
    border-radius: 9px;
  }

  .hp-map-pin-dot--violet {
    background: var(--hp-violet-light);
    color: var(--hp-violet);
  }

  .hp-map-pin-dot--green {
    background: var(--hp-green-light);
    color: #059669;
  }

  .hp-map-pin strong,
  .hp-map-pin small {
    display: block;
  }

  .hp-map-pin strong {
    color: var(--hp-indigo);
    font-size: 8px;
  }

  .hp-map-pin small {
    margin-top: 2px;
    color: var(--hp-faint);
    font-size: 7px;
  }

  .hp-map-you {
    position: absolute;
    bottom: 45px;
    left: 285px;
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--hp-muted);
    font-size: 7px;
    font-weight: 700;
  }

  .hp-map-you span {
    width: 9px;
    height: 9px;
    border: 2px solid white;
    border-radius: 50%;
    background: var(--hp-sky);
    box-shadow:
      0 0 0 4px rgba(2, 132, 199, 0.13);
  }

  .hp-map-callout {
    position: absolute;
    z-index: 5;
    right: 22px;
    top: 38px;
    transform: rotate(2deg);
  }

  .hp-panel-icon {
    display: grid;
    width: 40px;
    height: 40px;
    margin-bottom: 20px;
    place-items: center;
    border-radius: 12px;
  }

  .hp-panel-icon--green {
    background: var(--hp-green-light);
    color: #059669;
  }

  .hp-panel-icon--violet {
    background: var(--hp-violet-light);
    color: var(--hp-violet);
  }

  .hp-live-panel h3,
  .hp-course-panel h3 {
    font-size: 18px;
    line-height: 1.15;
  }

  .hp-live-list {
    display: grid;
    gap: 7px;
    margin-top: 17px;
  }

  .hp-live-panel-footer {
    display: flex;
    margin-top: 13px;
    align-items: center;
    justify-content: space-between;
    color: var(--hp-faint);
    font-size: 7px;
  }

  .hp-live-panel-footer svg {
    color: var(--hp-green);
  }

  .hp-student-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px;
    border: 1px solid #efedf4;
    border-radius: 12px;
    background: #fbfafd;
  }

  .hp-student-row--compact {
    margin-top: 8px;
    padding: 7px;
    border-radius: 10px;
    background: white;
  }

  .hp-student-avatar {
    display: grid;
    width: 30px;
    height: 30px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 10px;
    font-size: 8px;
    font-weight: 760;
  }

  .hp-student-row--compact
    .hp-student-avatar {
    width: 26px;
    height: 26px;
    border-radius: 8px;
  }

  .hp-student-avatar--violet {
    background: var(--hp-violet-light);
    color: var(--hp-violet);
  }

  .hp-student-avatar--green {
    background: var(--hp-green-light);
    color: #059669;
  }

  .hp-student-avatar--sky {
    background: var(--hp-sky-light);
    color: var(--hp-sky);
  }

  .hp-student-copy {
    min-width: 0;
    flex: 1;
  }

  .hp-student-copy > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .hp-student-copy strong {
    color: var(--hp-indigo);
    font-size: 8px;
  }

  .hp-student-copy > div span {
    padding: 3px 6px;
    border-radius: 999px;
    background: var(--hp-violet-light);
    color: var(--hp-violet);
    font-size: 6px;
    font-weight: 750;
  }

  .hp-student-copy p {
    display: flex;
    align-items: center;
    gap: 4px;
    overflow: hidden;
    margin: 3px 0 0;
    color: var(--hp-faint);
    font-size: 7px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .hp-course-panel {
    isolation: isolate;
  }

  .hp-course-orbit {
    position: absolute;
    right: -65px;
    bottom: -76px;
    width: 230px;
    height: 230px;
    border: 1px dashed rgba(124, 58, 237, 0.15);
    border-radius: 50%;
    animation: hp-orbit-spin 28s linear infinite;
  }

  .hp-course-cloud {
    position: relative;
    z-index: 2;
    display: flex;
    margin-top: 19px;
    flex-wrap: wrap;
    gap: 7px;
  }

  .hp-course-cloud span {
    display: inline-flex;
    min-height: 29px;
    align-items: center;
    padding: 0 9px;
    border: 1px solid var(--hp-border);
    border-radius: 9px;
    background: white;
    color: var(--hp-muted);
    font-size: 7px;
    font-weight: 730;
  }

  .hp-course-cloud .hp-course-chip--large {
    min-height: 38px;
    padding: 0 13px;
    border-color: #c4b5fd;
    background: var(--hp-violet);
    color: white;
    font-size: 9px;
    transform: rotate(-3deg);
    box-shadow:
      0 9px 20px rgba(124, 58, 237, 0.17);
  }

  .hp-session-time-column {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-right: 1px solid #ddd6fe;
    color: var(--hp-violet);
  }

  .hp-session-time-column span {
    font-size: 49px;
    font-weight: 780;
    letter-spacing: -0.07em;
    line-height: 0.9;
  }

  .hp-session-time-column small {
    margin-top: 5px;
    font-size: 10px;
    font-weight: 760;
    letter-spacing: 0.13em;
  }

  .hp-session-panel-content {
    padding: 28px;
  }

  .hp-session-topline {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: var(--hp-violet);
    font-size: 8px;
    font-weight: 760;
    letter-spacing: 0.09em;
    text-transform: uppercase;
  }

  .hp-session-panel h3 {
    margin: 21px 0 9px;
    color: var(--hp-indigo);
    font-size: 22px;
    font-weight: 750;
    letter-spacing: -0.035em;
  }

  .hp-session-panel-content > p {
    max-width: 500px;
    margin: 0;
    color: var(--hp-muted);
    font-size: 10px;
    line-height: 1.65;
  }

  .hp-session-meta {
    display: flex;
    gap: 17px;
    margin-top: 22px;
  }

  .hp-session-meta span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--hp-muted);
    font-size: 8px;
    font-weight: 650;
  }

  .hp-session-meta svg {
    color: var(--hp-violet);
  }

  .hp-buddy-avatars {
    position: relative;
    width: 130px;
    height: 95px;
    flex: 0 0 auto;
  }

  .hp-buddy-avatar {
    position: absolute;
    display: grid;
    width: 52px;
    height: 52px;
    place-items: center;
    border: 3px solid white;
    border-radius: 17px;
    font-size: 10px;
    font-weight: 760;
    box-shadow:
      0 10px 25px rgba(27, 27, 58, 0.09);
  }

  .hp-buddy-avatar--one {
    top: 0;
    left: 12px;
    background: var(--hp-violet-light);
    color: var(--hp-violet);
    transform: rotate(-8deg);
  }

  .hp-buddy-avatar--two {
    top: 5px;
    right: 7px;
    background: var(--hp-green-light);
    color: #059669;
    transform: rotate(7deg);
  }

  .hp-buddy-avatar--three {
    bottom: 0;
    left: 38px;
    background: var(--hp-sky-light);
    color: var(--hp-sky);
    transform: rotate(3deg);
  }

  .hp-buddy-avatar--more {
    right: 0;
    bottom: 3px;
    width: 39px;
    height: 39px;
    border-radius: 13px;
    background: var(--hp-indigo);
    color: white;
    font-size: 8px;
  }

  .hp-buddy-panel h3 {
    font-size: 19px;
  }

  .hp-buddy-panel > div:last-child > p:last-child {
    margin: 9px 0 0;
    color: var(--hp-muted);
    font-size: 10px;
    line-height: 1.6;
  }

  /*
   * Manifesto
   */
  .hp-manifesto {
    position: relative;
    z-index: 1;
    padding: 70px 24px 170px;
  }

  .hp-manifesto-stage {
    position: relative;
    width: min(1120px, 100%);
    margin: 0 auto;
    padding: 85px 50px;
    border-top: 1px solid var(--hp-border);
    border-bottom: 1px solid var(--hp-border);
    text-align: center;
  }

  .hp-manifesto-small {
    margin: 0;
    color: var(--hp-faint);
    font-size: 8px;
    font-weight: 760;
    letter-spacing: 0.18em;
  }

  .hp-manifesto-line {
    display: flex;
    margin-top: 30px;
    align-items: center;
    justify-content: center;
    gap: 19px;
    color: var(--hp-indigo);
    font-size: clamp(29px, 5vw, 61px);
    font-weight: 750;
    letter-spacing: -0.055em;
    line-height: 1;
  }

  .hp-manifesto-line svg {
    width: 24px;
    color: #c4b5fd;
  }

  .hp-manifesto-line strong {
    color: var(--hp-violet);
  }

  .hp-manifesto-copy {
    margin: 23px 0 0;
    color: var(--hp-muted);
    font-size: 12px;
  }

  .hp-manifesto-scribble {
    position: absolute;
    right: 34px;
    bottom: 17px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--hp-violet);
    transform: rotate(-4deg);
  }

  .hp-manifesto-scribble svg {
    width: 90px;
    height: 30px;
  }

  .hp-manifesto-scribble span {
    font-size: 8px;
    font-weight: 720;
  }

  /*
   * Final CTA
   */
  .hp-final-section {
    position: relative;
    z-index: 1;
    padding: 50px 24px 145px;
  }

  .hp-final-stage {
    position: relative;
    display: grid;
    width: min(1040px, 100%);
    min-height: 650px;
    margin: 0 auto;
    overflow: hidden;
    place-items: center;
    border: 1px solid rgba(217, 214, 231, 0.95);
    border-radius: 42px;
    background:
      radial-gradient(
        circle at 50% 50%,
        rgba(124, 58, 237, 0.09),
        transparent 42%
      ),
      rgba(255, 255, 255, 0.92);
    box-shadow: var(--hp-shadow-md);
  }

  .hp-final-ring {
    position: absolute;
    border: 1px solid rgba(124, 58, 237, 0.12);
    border-radius: 50%;
  }

  .hp-final-ring--one {
    width: 260px;
    height: 260px;
  }

  .hp-final-ring--two {
    width: 445px;
    height: 445px;
    border-style: dashed;
    animation: hp-orbit-spin 35s linear infinite;
  }

  .hp-final-ring--three {
    width: 650px;
    height: 650px;
    opacity: 0.55;
  }

  .hp-final-doodle {
    position: absolute;
    z-index: 2;
    display: grid;
    width: 47px;
    height: 47px;
    place-items: center;
    border: 1px solid var(--hp-border);
    border-radius: 15px;
    background: white;
    color: var(--hp-violet);
    box-shadow: var(--hp-shadow-sm);
    animation: hp-float-note 3.4s ease-in-out infinite;
  }

  .hp-final-doodle--book {
    top: 80px;
    left: 145px;
    transform: rotate(-8deg);
  }

  .hp-final-doodle--calendar {
    top: 115px;
    right: 128px;
    color: #059669;
    animation-delay: -1.2s;
  }

  .hp-final-doodle--chat {
    right: 185px;
    bottom: 93px;
    color: var(--hp-sky);
    animation-delay: -2.1s;
  }

  .hp-final-content {
    position: relative;
    z-index: 4;
    max-width: 700px;
    padding: 60px 32px;
    text-align: center;
  }

  .hp-final-content h2 {
    margin: 18px 0 20px;
    color: var(--hp-indigo);
    font-size: clamp(42px, 6vw, 73px);
    font-weight: 790;
    letter-spacing: -0.064em;
    line-height: 0.96;
  }

  .hp-final-content h2 span {
    color: var(--hp-violet);
  }

  .hp-final-content > p {
    max-width: 545px;
    margin: 0 auto;
    color: var(--hp-muted);
    font-size: 13px;
    line-height: 1.75;
  }

  .hp-final-action-zone {
    position: relative;
    width: min(100%, 480px);
    margin: 122px auto 0;
  }

  .hp-primary-button--large {
    width: 100%;
    min-height: 58px;
    font-size: 14px;
    animation:
      hp-button-breathe 3.1s ease-in-out infinite;
  }

  .hp-final-arrow-cluster {
    position: absolute;
    right: 0;
    bottom: calc(100% + 10px);
    left: 0;
    height: 91px;
  }

  .hp-final-arrow {
    position: absolute;
  }

  .hp-final-arrow--left {
    top: 27px;
    left: 0;
  }

  .hp-final-arrow--center {
    top: 0;
    left: 50%;
    transform: translateX(-50%);
  }

  .hp-final-arrow--right {
    top: 27px;
    right: 0;
  }

  .hp-final-arrow--left
    .hp-arrow-callout-motion {
    animation-delay: -0.5s;
  }

  .hp-final-arrow--center
    .hp-arrow-callout-motion {
    animation-delay: -1.2s;
  }

  .hp-final-arrow--right
    .hp-arrow-callout-motion {
    animation-delay: -1.9s;
  }

  /*
   * Entrance and scroll reveal
   */
  .hp-enter {
    animation:
      hp-enter 720ms
      cubic-bezier(0.22, 1, 0.36, 1)
      both;
  }

  .hp-enter--one {
    animation-delay: 40ms;
  }

  .hp-enter--two {
    animation-delay: 110ms;
  }

  .hp-enter--three {
    animation-delay: 180ms;
  }

  .hp-enter--four {
    animation-delay: 250ms;
  }

  .hp-enter--five {
    animation-delay: 320ms;
  }

  .hp-reveal {
    opacity: 0;
    transform: translateY(14px);
    transition:
      opacity 520ms
        cubic-bezier(0.22, 1, 0.36, 1),
      transform 520ms
        cubic-bezier(0.22, 1, 0.36, 1);
  }

  .hp-reveal--visible {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }

  .hp-journey-card:nth-child(2) {
    transition-delay: 100ms;
  }

  .hp-journey-card:nth-child(3) {
    transition-delay: 160ms;
  }

  .hp-bento article:nth-child(2) {
    transition-delay: 70ms;
  }

  .hp-bento article:nth-child(3) {
    transition-delay: 120ms;
  }

  .hp-bento article:nth-child(4) {
    transition-delay: 170ms;
  }

  .hp-bento article:nth-child(5) {
    transition-delay: 220ms;
  }

  /*
   * Focus states
   */
  .hp-primary-button:focus-visible,
  .hp-secondary-link:focus-visible {
    outline: 3px solid rgba(124, 58, 237, 0.24);
    outline-offset: 3px;
  }

  /*
   * Animation keyframes
   */
  @keyframes hp-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes hp-enter {
    from {
      opacity: 0;
      transform: translateY(18px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes hp-pulse-ring {
    0% {
      opacity: 0.55;
      transform: scale(0.7);
    }

    100% {
      opacity: 0;
      transform: scale(1.75);
    }
  }

  @keyframes hp-orbit-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes hp-float-note {
    0%,
    100% {
      transform: translateY(0) rotate(-1deg);
    }

    50% {
      transform: translateY(-8px) rotate(1deg);
    }
  }

  @keyframes hp-arrow-float {
    0%,
    100% {
      transform: translateY(0) rotate(-1deg);
    }

    50% {
      transform: translateY(-7px) rotate(1deg);
    }
  }

  @keyframes hp-arrow-draw {
    0% {
      stroke-dashoffset: 135;
      opacity: 0.25;
    }

    22% {
      stroke-dashoffset: 0;
      opacity: 1;
    }

    75% {
      stroke-dashoffset: 0;
      opacity: 1;
    }

    100% {
      stroke-dashoffset: -20;
      opacity: 0.2;
    }
  }

  @keyframes hp-ticker-scroll {
    from {
      transform: translateX(0);
    }

    to {
      transform: translateX(-50%);
    }
  }

  @keyframes hp-button-breathe {
    0%,
    100% {
      box-shadow:
        0 14px 31px rgba(124, 58, 237, 0.2),
        0 0 0 0 rgba(124, 58, 237, 0);
    }

    50% {
      box-shadow:
        0 20px 43px rgba(124, 58, 237, 0.27),
        0 0 0 7px rgba(124, 58, 237, 0.05);
    }
  }

  /*
   * Responsive
   */
  @media (max-width: 1050px) {
  .hp-hero {
    padding-top: 70px;
  }

  .hp-hero-grid {
    display: flex;
    min-height: auto;
    flex-direction: column;
    gap: 70px;
  }

  .hp-hero-copy {
    width: min(760px, 100%);
    padding-bottom: 0;
    text-align: center;
  }

  .hp-hero-description {
    margin-inline: auto;
  }

  .hp-hero-actions,
  .hp-hero-proof {
    justify-content: center;
  }

  .hp-hero-stage {
    width: min(620px, 100%);
    min-height: 620px;
    margin-left: 0;
  }

  .hp-hero-arrow--center {
    left: 50%;
    transform: translateX(-50%);
  }

  .hp-hero-arrow--right {
    right: 0;
    left: auto;
  }

  .hp-hero-vertical-copy {
    display: none;
  }

  .hp-journey-grid {
    gap: 55px;
    grid-template-columns: 0.75fr 1.25fr;
  }

  .hp-pulse-heading {
    gap: 40px;
  }
}

  @media (max-width: 860px) {
    .hp-hero-title {
      font-size: clamp(50px, 11vw, 77px);
    }

    .hp-journey {
      padding-top: 110px;
    }

    .hp-journey-grid {
      display: block;
    }

    .hp-journey-intro {
      position: relative;
      top: auto;
      max-width: 680px;
      padding-top: 0;
    }

    .hp-journey-cards {
      margin-top: 70px;
    }

    .hp-pulse-heading {
      display: block;
    }

    .hp-pulse-heading > p {
      max-width: 560px;
      margin-top: 22px;
    }

    .hp-bento {
      grid-template-rows:
        430px
        280px
        250px
        240px;
    }

    .hp-map-panel {
      grid-column: 1 / -1;
      grid-row: 1;
    }

    .hp-live-panel {
      grid-column: 1 / span 6;
      grid-row: 2;
    }

    .hp-course-panel {
      grid-column: 7 / -1;
      grid-row: 2;
    }

    .hp-session-panel {
      grid-column: 1 / -1;
      grid-row: 3;
    }

    .hp-buddy-panel {
      grid-column: 1 / -1;
      grid-row: 4;
    }

    .hp-manifesto-line {
      flex-wrap: wrap;
    }
  }

  @media (max-width: 700px) {
    .hp-hero {
      min-height: auto;
      padding: 55px 16px 75px;
    }

    .hp-hero-title {
      font-size: clamp(45px, 13.5vw, 67px);
    }

    .hp-hero-description {
      font-size: 14px;
    }

    .hp-hero-action-zone {
      margin-top: 107px;
    }

    .hp-hero-actions {
      align-items: stretch;
      flex-direction: column;
    }

    .hp-primary-button {
      width: 100%;
    }

    .hp-secondary-link {
      justify-content: center;
    }

    .hp-hero-arrow--left {
      left: 0;
    }

    .hp-hero-arrow--right {
      right: 0;
    }

    .hp-hero-arrow .hp-arrow-callout span {
      font-size: 7px;
      padding: 4px 7px;
    }

    .hp-hero-stage {
      min-height: 530px;
    }

    .hp-board {
      top: 75px;
      right: 50%;
      width: min(100%, 500px);
      transform:
        translateX(50%)
        rotate(1deg);
    }

    .hp-stage-orbit--one {
      right: 50%;
      width: 430px;
      height: 430px;
      transform: translateX(50%);
    }

    .hp-stage-orbit--two {
      right: 50%;
      width: 330px;
      height: 330px;
      transform: translateX(50%);
    }

    .hp-stage-label--top {
      left: 27px;
    }

    .hp-stage-side-copy,
    .hp-stage-arrow {
      display: none;
    }

    .hp-floating-note--location {
      top: 114px;
      left: -5px;
    }

    .hp-floating-note--course {
      right: -5px;
      bottom: 45px;
    }

    .hp-journey,
    .hp-manifesto {
      padding-right: 16px;
      padding-left: 16px;
    }

    .hp-journey-cards {
      display: grid;
      min-height: auto;
      grid-template-columns: 1fr;
      grid-template-rows: none;
      gap: 25px;
    }

    .hp-journey-cards::before {
      display: none;
    }

    .hp-journey-card--one,
    .hp-journey-card--two,
    .hp-journey-card--three {
      grid-column: 1;
      grid-row: auto;
      transform: none;
    }

    .hp-journey-card {
      min-height: 285px;
    }

    .hp-pulse-section {
      width: calc(100% - 32px);
      padding-bottom: 120px;
    }

    .hp-pulse-heading h2 {
      font-size: clamp(39px, 12vw, 58px);
    }

    .hp-bento {
      display: flex;
      flex-direction: column;
    }

    .hp-map-panel {
      min-height: 430px;
    }

    .hp-live-panel,
    .hp-course-panel {
      min-height: 285px;
    }

    .hp-session-panel {
      min-height: 270px;
    }

    .hp-buddy-panel {
      min-height: 230px;
    }

    .hp-manifesto-stage {
      padding: 70px 20px 100px;
    }

    .hp-manifesto-line {
      gap: 10px;
      font-size: clamp(27px, 9vw, 44px);
    }

    .hp-manifesto-line svg {
      width: 18px;
    }

    .hp-manifesto-scribble {
      right: 17px;
      bottom: 24px;
    }

    .hp-final-section {
      padding-right: 16px;
      padding-left: 16px;
    }

    .hp-final-stage {
      min-height: 650px;
      border-radius: 29px;
    }

    .hp-final-content {
      padding-right: 21px;
      padding-left: 21px;
    }

    .hp-final-content h2 {
      font-size: clamp(40px, 12vw, 61px);
    }

    .hp-final-ring--three {
      width: 540px;
      height: 540px;
    }

    .hp-final-doodle--book {
      top: 49px;
      left: 32px;
    }

    .hp-final-doodle--calendar {
      top: 73px;
      right: 28px;
    }

    .hp-final-doodle--chat {
      right: 47px;
      bottom: 37px;
    }
  }

  @media (max-width: 520px) {
    .hp-hero-title {
      letter-spacing: -0.055em;
    }

    .hp-hero-proof {
      align-items: center;
      flex-direction: column;
    }

    .hp-hero-arrow-cluster {
      height: 85px;
    }

    .hp-arrow-callout span {
      min-height: 21px;
      padding: 4px 7px;
      font-size: 7px;
    }

    .hp-arrow-callout svg {
      width: 45px;
      height: 42px;
    }

    .hp-arrow-callout--down svg {
      width: 26px;
      height: 43px;
    }

    .hp-hero-arrow--left,
    .hp-hero-arrow--right {
      top: 34px;
    }

    .hp-hero-stage {
      min-height: 475px;
    }

    .hp-board {
      top: 61px;
      padding: 15px;
      border-radius: 21px;
    }

    .hp-board-grid {
      grid-template-columns: 1fr;
    }

    .hp-board-session-card {
      display: none;
    }

    .hp-board-heading h2 {
      font-size: 18px;
    }

    .hp-floating-note {
      padding: 8px 9px;
    }

    .hp-floating-note--location {
      top: 42px;
      left: -3px;
    }

    .hp-floating-note--course {
      right: -2px;
      bottom: 5px;
    }

    .hp-stage-label--top,
    .hp-stage-orbit--two {
      display: none;
    }

    .hp-journey {
      padding-top: 90px;
      padding-bottom: 120px;
    }

    .hp-journey-intro h2 {
      font-size: 42px;
    }

    .hp-journey-card-number {
      font-size: 75px;
    }

    .hp-map-panel {
      min-height: 390px;
      padding: 19px;
    }

    .hp-campus-map {
      inset: 92px 13px 13px;
    }

    .hp-map-pin--one {
      top: 72px;
      left: 34px;
    }

    .hp-map-pin--two {
      right: 23px;
      bottom: 70px;
    }

    .hp-map-you {
      bottom: 35px;
      left: 48%;
    }

    .hp-map-callout {
      display: none;
    }

    .hp-session-panel {
      grid-template-columns: 82px 1fr;
    }

    .hp-session-time-column span {
      font-size: 39px;
    }

    .hp-session-panel-content {
      padding: 21px;
    }

    .hp-session-panel h3 {
      font-size: 18px;
    }

    .hp-buddy-panel {
      align-items: flex-start;
      flex-direction: column;
    }

    .hp-manifesto {
      padding-bottom: 110px;
    }

    .hp-manifesto-stage {
      padding-top: 58px;
    }

    .hp-manifesto-line {
      display: grid;
      grid-template-columns: 1fr;
    }

    .hp-manifesto-line svg {
      margin: 0 auto;
      transform: rotate(90deg);
    }

    .hp-final-action-zone {
      margin-top: 115px;
    }

    .hp-final-arrow--left {
      left: 0;
    }

    .hp-final-arrow--right {
      right: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .hp-loading-spinner,
    .hp-eyebrow-pulse::after,
    .hp-stage-orbit--two,
    .hp-floating-note,
    .hp-arrow-callout-motion,
    .hp-arrow-callout path,
    .hp-ticker-track,
    .hp-course-orbit,
    .hp-final-ring--two,
    .hp-final-doodle,
    .hp-primary-button--large,
    .hp-enter {
      animation: none;
    }

    .hp-reveal {
      opacity: 1;
      transform: none;
      transition: none;
    }

    .hp-primary-button,
    .hp-primary-button svg,
    .hp-secondary-link {
      transition: none;
    }

    .hp-primary-button:hover {
      transform: none;
    }
  }
`;
