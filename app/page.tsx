"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  MapPin,
  Radio,
  Search,
  Users,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { isEduEmail } from "@/lib/authRules";

import styles from "./home.module.css";

type HomeView = "checking" | "guest" | "redirecting";
type ActivityTab = "live" | "sessions";
type AvatarTone = "violet" | "green" | "sky" | "amber";

type StudentActivity = {
  initial: string;
  name: string;
  course: string;
  location: string;
  started: string;
  topic: string;
  tone: AvatarTone;
};

type SessionPreview = {
  time: string;
  period: string;
  title: string;
  course: string;
  location: string;
  attendees: number;
};

const liveStudents: StudentActivity[] = [
  {
    initial: "S",
    name: "Sarah",
    course: "CS400",
    location: "Memorial Library",
    started: "12 min ago",
    topic: "Algorithms and dynamic programming",
    tone: "violet",
  },
  {
    initial: "A",
    name: "Alex",
    course: "MATH340",
    location: "Engineering Hall",
    started: "7 min ago",
    topic: "Problem set 8",
    tone: "green",
  },
  {
    initial: "M",
    name: "Maya",
    course: "ECON101",
    location: "College Library",
    started: "21 min ago",
    topic: "Exam review",
    tone: "sky",
  },
];

const upcomingSessions: SessionPreview[] = [
  {
    time: "6:00",
    period: "PM",
    title: "CS400 Midterm Review",
    course: "CS400",
    location: "Union South · Room 214",
    attendees: 5,
  },
  {
    time: "7:30",
    period: "PM",
    title: "MATH340 Homework Help",
    course: "MATH340",
    location: "Memorial Library · Floor 2",
    attendees: 3,
  },
  {
    time: "10:00",
    period: "AM",
    title: "ECON101 Exam Prep",
    course: "ECON101",
    location: "College Library · East Commons",
    attendees: 7,
  },
];

export default function HomePage() {
  const router = useRouter();
  const rootRef = useRef<HTMLElement>(null);
  const routeRef = useRef<HTMLElement>(null);

  const [view, setView] = useState<HomeView>("checking");
  const [activityTab, setActivityTab] = useState<ActivityTab>("live");
  const [activeRouteStep, setActiveRouteStep] = useState(0);

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
            profile?.onboarding_complete ? "/dashboard" : "/onboarding",
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

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
    ).matches;
    const revealElements = root.querySelectorAll<HTMLElement>(
        `.${styles.reveal}`,
    );

    if (reducedMotion) {
      revealElements.forEach((element) => {
        element.classList.add(styles.visible);
      });
      return;
    }

    const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }

            entry.target.classList.add(styles.visible);
            observer.unobserve(entry.target);
          });
        },
        {
          threshold: 0.12,
          rootMargin: "0px 0px -8% 0px",
        },
    );

    revealElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [view]);

  useEffect(() => {
    if (view !== "guest") {
      return;
    }

    const section = routeRef.current;

    if (!section) {
      return;
    }

    let frame = 0;

    function updateRouteProgress() {
      frame = 0;

      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const start = viewportHeight * 0.72;
      const end = viewportHeight * 0.28;
      const travel = rect.height + start - end;
      const progress = Math.min(
          1,
          Math.max(0, (start - rect.top) / Math.max(travel, 1)),
      );

      section.style.setProperty("--route-progress", progress.toFixed(3));

      const nextStep = progress > 0.67 ? 2 : progress > 0.31 ? 1 : 0;
      setActiveRouteStep((current) =>
          current === nextStep ? current : nextStep,
      );
    }

    function requestUpdate() {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(updateRouteProgress);
    }

    updateRouteProgress();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);

      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [view]);

  if (view !== "guest") {
    return <LoadingScreen redirecting={view === "redirecting"} />;
  }

  return (
      <main id="studygrouprr-home" ref={rootRef} className={styles.home}>
        <HeroSection />

        <JourneySection
            routeRef={routeRef}
            activeStep={activeRouteStep}
        />

        <ProductExperience
            activeTab={activityTab}
            onTabChange={setActivityTab}
        />

        <ProblemSection />
        <CampusNetworkSection />
        <FinalCallToAction />
        <HomeFooter />
      </main>
  );
}

function LoadingScreen({ redirecting }: { redirecting: boolean }) {
  return (
      <main className={styles.loading} role="status" aria-live="polite">
      <span className={styles.loadingMark} aria-hidden="true">
        <BookOpen size={21} strokeWidth={2.4} />
      </span>
        <span className={styles.loadingLine} aria-hidden="true" />
        <p>{redirecting ? "Opening your campus…" : "Loading StudyGrouprr…"}</p>
      </main>
  );
}


function HeroSection() {
  return (
      <section className={styles.hero}>
        <div className={styles.heroGrid} aria-hidden="true" />
        <span className={styles.heroCoordinateOne} aria-hidden="true">
        CAMPUS ROUTE 04
      </span>
        <span className={styles.heroCoordinateTwo} aria-hidden="true">
        43.0766° N
      </span>

        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <Radio size={14} />
              Live campus study network
            </p>

            <h1>
              Find people studying
              <span> your course.</span>
              <strong> Right now.</strong>
            </h1>

            <p className={styles.heroDescription}>
              See classmates studying live, discover sessions near you, and join
              them on campus.
            </p>

            <div className={styles.heroActions}>
              <Link href="/login" className={styles.primaryButton}>
                Find your study group
                <ArrowRight size={18} />
              </Link>

              <a href="#how-it-works" className={styles.textAction}>
                See how it works
                <span aria-hidden="true">↓</span>
              </a>
            </div>

            <div className={styles.heroProof}>
            <span>
              <CheckCircle2 size={15} /> University students
            </span>
              <span>
              <CheckCircle2 size={15} /> Real campus meetups
            </span>
            </div>
          </div>

          <div className={styles.heroStage}>
            <svg
                className={styles.heroRoute}
                viewBox="0 0 720 650"
                fill="none"
                aria-hidden="true"
            >
              <path
                  d="M20 508C109 454 136 554 226 496C312 440 276 288 391 272C505 256 496 100 701 74"
                  pathLength="1"
              />
            </svg>

            <div className={styles.heroAppWrap}>
              <HeroApplication />
            </div>

            <div className={`${styles.heroNote} ${styles.heroNoteLocation}`}>
              <MapPin size={15} />
              <span>
              <strong>Memorial Library</strong>
              <small>3 students studying</small>
            </span>
            </div>

            <div className={`${styles.heroNote} ${styles.heroNoteCourse}`}>
              <span className={styles.courseFlag}>CS400</span>
              <span>
              <strong>Review starts soon</strong>
              <small>Today · 6:00 PM</small>
            </span>
            </div>

            <div className={styles.heroAnnotation} aria-hidden="true">
              <svg viewBox="0 0 116 58" fill="none">
                <path d="M111 7C82 7 65 13 50 28C39 39 25 47 5 51" />
                <path d="M15 42L5 51L17 55" />
              </svg>
              <span>someone from your class</span>
            </div>
          </div>
        </div>
      </section>
  );
}

function HeroApplication() {
  return (
      <div className={styles.heroApp}>
        <div className={styles.appToolbar}>
          <div>
            <GraduationCap size={14} />
            Campus preview
          </div>
          <span className={styles.liveStatus}>
          <span aria-hidden="true" /> Live
        </span>
        </div>

        <div className={styles.appHeading}>
          <div>
            <p>Good afternoon</p>
            <h2>Who’s studying?</h2>
          </div>
          <span className={styles.appAvatar}>K</span>
        </div>

        <div className={styles.appSearch}>
          <Search size={16} />
          <span>Search CS400, MATH340…</span>
          <kbd>⌘ K</kbd>
        </div>

        <div className={styles.appCourseHeader}>
          <span>CS400</span>
          <small>2 ways to join</small>
        </div>

        <article className={styles.liveStudentCard}>
          <Avatar initial="S" tone="violet" />
          <div className={styles.liveStudentCopy}>
            <p>
              <span className={styles.statusDot} aria-hidden="true" />
              Sarah is studying now
            </p>
            <strong>Algorithms and dynamic programming</strong>
            <small>
              <MapPin size={12} /> Memorial Library · 0.3 miles
            </small>
          </div>
          <button type="button" tabIndex={-1}>
            View <ArrowRight size={14} />
          </button>
        </article>

        <article className={styles.upcomingCard}>
          <div className={styles.upcomingTime}>
            <strong>06</strong>
            <span>PM</span>
          </div>
          <div className={styles.upcomingCopy}>
            <p>Starting soon</p>
            <strong>CS400 Midterm Review</strong>
            <small>Union South · Today</small>
          </div>
          <div className={styles.upcomingAction}>
            <AvatarStack />
            <button type="button" tabIndex={-1}>
              Join
            </button>
          </div>
        </article>
      </div>
  );
}

function JourneySection({
                          routeRef,
                          activeStep,
                        }: {
  routeRef: RefObject<HTMLElement | null>;
  activeStep: number;
}) {
  return (
      <section
          id="how-it-works"
          ref={routeRef}
          className={styles.journey}
          style={{ "--route-progress": 0 } as CSSProperties}
      >
        <div className={styles.sectionIntro}>
          <p className={styles.sectionKicker}>How StudyGrouprr works</p>
          <h2>From “I should study” to an actual table.</h2>
          <p>Three clear steps. No giant group chats. No awkward searching.</p>
        </div>

        <div className={styles.journeyCanvas}>
          <div className={styles.routeTrack} aria-hidden="true">
            <span className={styles.routeBase} />
            <span className={styles.routeProgress} />
          </div>

          <JourneyStep
              number="01"
              label="Your course"
              title="Choose the class you are taking."
              description="Add your courses and see activity organized around what matters to you."
              active={activeStep >= 0}
              className={styles.journeyStepOne}
          >
            <CoursePickerPreview />
          </JourneyStep>

          <JourneyStep
              number="02"
              label="Campus activity"
              title="See who is studying and what starts next."
              description="Live students, upcoming sessions, campus locations, and the people already going."
              active={activeStep >= 1}
              className={styles.journeyStepTwo}
          >
            <ActivitySignalPreview />
          </JourneyStep>

          <JourneyStep
              number="03"
              label="The table"
              title="Join once. Meet in person."
              description="Turn a vague study plan into a real meetup with classmates from the same course."
              active={activeStep >= 2}
              className={styles.journeyStepThree}
          >
            <JoinedPreview />
          </JourneyStep>
        </div>
      </section>
  );
}

function JourneyStep({
                       number,
                       label,
                       title,
                       description,
                       active,
                       className,
                       children,
                     }: {
  number: string;
  label: string;
  title: string;
  description: string;
  active: boolean;
  className: string;
  children: ReactNode;
}) {
  return (
      <article
          className={`${styles.journeyStep} ${className} ${
              active ? styles.journeyStepActive : ""
          }`}
      >
        <div className={styles.journeyNode}>
          <span>{number}</span>
        </div>

        <div className={styles.journeyPreview}>{children}</div>

        <div className={styles.journeyCopy}>
          <p>{label}</p>
          <h3>{title}</h3>
          <span>{description}</span>
        </div>
      </article>
  );
}

function CoursePickerPreview() {
  return (
      <div className={styles.coursePicker}>
        <div className={styles.miniToolbar}>
          <BookOpen size={14} /> Your courses
        </div>
        <label>
          <Search size={14} />
          <span>Search course code</span>
        </label>
        <div className={styles.courseChoices}>
          <span className={styles.selectedCourse}>CS400</span>
          <span>MATH340</span>
          <span>ECON101</span>
        </div>
        <p>
          <CheckCircle2 size={14} /> CS400 added to your campus feed
        </p>
      </div>
  );
}

function ActivitySignalPreview() {
  return (
      <div className={styles.signalPreview}>
        <div className={styles.signalMap} aria-hidden="true">
          <span className={`${styles.signalBuilding} ${styles.signalBuildingOne}`} />
          <span className={`${styles.signalBuilding} ${styles.signalBuildingTwo}`} />
          <span className={`${styles.signalBuilding} ${styles.signalBuildingThree}`} />
          <span className={`${styles.signalPin} ${styles.signalPinOne}`}>
          <i />
        </span>
          <span className={`${styles.signalPin} ${styles.signalPinTwo}`}>
          <i />
        </span>
          <svg viewBox="0 0 360 200" preserveAspectRatio="none">
            <path d="M-10 160C68 132 92 176 158 138C231 96 263 49 373 57" />
          </svg>
        </div>
        <div className={styles.signalCard}>
        <span className={styles.liveStatus}>
          <span aria-hidden="true" /> Live now
        </span>
          <strong>Sarah · CS400</strong>
          <small>Memorial Library</small>
        </div>
        <div className={styles.signalSession}>
          <Clock3 size={14} />
          <span>
          <strong>Review at 6:00 PM</strong>
          <small>5 students going</small>
        </span>
        </div>
      </div>
  );
}

function JoinedPreview() {
  return (
      <div className={styles.joinedPreview}>
      <span className={styles.joinedCheck}>
        <CheckCircle2 size={22} />
      </span>
        <p>You joined</p>
        <h4>CS400 Midterm Review</h4>
        <div>
        <span>
          <CalendarDays size={14} /> Today · 6:00 PM
        </span>
          <span>
          <MapPin size={14} /> Memorial Library · Table 3
        </span>
        </div>
        <div className={styles.joinedPeople}>
          <AvatarStack />
          <small>You and 5 classmates</small>
        </div>
      </div>
  );
}

function ProductExperience({
                             activeTab,
                             onTabChange,
                           }: {
  activeTab: ActivityTab;
  onTabChange: (tab: ActivityTab) => void;
}) {
  return (
      <section id="campus-activity" className={styles.productSection}>
        <div className={`${styles.productHeading} ${styles.reveal}`}>
          <div>
            <p className={styles.sectionKicker}>What’s happening on campus</p>
            <h2>See who is studying and what starts next.</h2>
          </div>
          <p>
            Study activity is organized by course, time, and place—not buried in
            another conversation feed.
          </p>
        </div>

        <div className={`${styles.productFrame} ${styles.reveal}`}>
          <div className={styles.productToolbar}>
            <div className={styles.productPath}>
              <BookOpen size={15} />
              <span>StudyGrouprr</span>
              <small>/ Campus activity</small>
            </div>

            <span className={styles.productCampus}>
            <GraduationCap size={14} /> Your campus
          </span>
          </div>

          <div className={styles.productTopline}>
            <div>
              <p>CS400</p>
              <h3>Find a place to study together.</h3>
            </div>

            <div className={styles.tabList} role="tablist" aria-label="Activity views">
              <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "live"}
                  aria-controls="activity-live-panel"
                  id="activity-live-tab"
                  className={activeTab === "live" ? styles.activeTab : ""}
                  onClick={() => onTabChange("live")}
              >
                <Radio size={15} /> Studying now
              </button>
              <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "sessions"}
                  aria-controls="activity-sessions-panel"
                  id="activity-sessions-tab"
                  className={activeTab === "sessions" ? styles.activeTab : ""}
                  onClick={() => onTabChange("sessions")}
              >
                <CalendarDays size={15} /> Upcoming sessions
              </button>
            </div>
          </div>

          <div className={styles.productContent}>
            {activeTab === "live" ? <LiveActivityPanel /> : <SessionsPanel />}
          </div>
        </div>

        <div className={styles.productAnnotations} aria-hidden="true">
          <span>see your course first</span>
          <span>join without starting a group chat</span>
        </div>
      </section>
  );
}

function LiveActivityPanel() {
  return (
      <div
          id="activity-live-panel"
          role="tabpanel"
          aria-labelledby="activity-live-tab"
          className={styles.livePanel}
      >
        <div className={styles.studentList}>
          <div className={styles.listHeading}>
            <span>Students live now</span>
            <small>Updated moments ago</small>
          </div>

          {liveStudents.map((student) => (
              <article key={student.name} className={styles.studentRow}>
                <Avatar initial={student.initial} tone={student.tone} />
                <div className={styles.studentIdentity}>
                  <strong>{student.name}</strong>
                  <span>{student.course}</span>
                </div>
                <div className={styles.studentTopic}>
                  <strong>{student.topic}</strong>
                  <span>
                <MapPin size={13} /> {student.location}
              </span>
                </div>
                <div className={styles.studentStatus}>
              <span>
                <i aria-hidden="true" /> Started {student.started}
              </span>
                  <Link href="/login">View</Link>
                </div>
              </article>
          ))}
        </div>

        <CampusActivityMap />
      </div>
  );
}

function SessionsPanel() {
  return (
      <div
          id="activity-sessions-panel"
          role="tabpanel"
          aria-labelledby="activity-sessions-tab"
          className={styles.sessionsPanel}
      >
        <div className={styles.dayLabel}>
          <span>Today</span>
          <small>2 sessions</small>
        </div>

        {upcomingSessions.slice(0, 2).map((session) => (
            <SessionRow key={session.title} session={session} />
        ))}

        <div className={styles.dayLabel}>
          <span>Tomorrow</span>
          <small>1 session</small>
        </div>

        <SessionRow session={upcomingSessions[2]} />
      </div>
  );
}

function SessionRow({ session }: { session: SessionPreview }) {
  return (
      <article className={styles.sessionRow}>
        <div className={styles.sessionTime}>
          <strong>{session.time}</strong>
          <span>{session.period}</span>
        </div>
        <span className={styles.sessionCourse}>{session.course}</span>
        <div className={styles.sessionDetails}>
          <strong>{session.title}</strong>
          <span>
          <MapPin size={13} /> {session.location}
        </span>
        </div>
        <div className={styles.sessionPeople}>
          <AvatarStack compact />
          <span>{session.attendees} going</span>
        </div>
        <Link href="/login" className={styles.joinButton}>
          Join <ArrowRight size={14} />
        </Link>
      </article>
  );
}

function CampusActivityMap() {
  return (
      <aside className={styles.campusMapPanel}>
        <div className={styles.mapHeading}>
          <div>
            <p>Campus locations</p>
            <strong>8 students live</strong>
          </div>
          <MapPin size={18} />
        </div>

        <div className={styles.campusMap} aria-label="Illustrated campus activity map">
          <svg viewBox="0 0 560 360" preserveAspectRatio="none" aria-hidden="true">
            <path d="M-30 292C85 252 118 324 219 274C329 219 340 96 591 82" />
            <path d="M78 -30C112 73 157 82 204 137C265 208 258 331 327 394" />
          </svg>

          <span className={`${styles.mapBuilding} ${styles.mapBuildingOne}`}>
          Memorial
        </span>
          <span className={`${styles.mapBuilding} ${styles.mapBuildingTwo}`}>
          Engineering
        </span>
          <span className={`${styles.mapBuilding} ${styles.mapBuildingThree}`}>
          College
        </span>

          <MapPinBubble
              className={styles.mapPinOne}
              count="3"
              label="Memorial Library"
          />
          <MapPinBubble
              className={styles.mapPinTwo}
              count="2"
              label="Engineering Hall"
          />
          <MapPinBubble
              className={styles.mapPinThree}
              count="3"
              label="College Library"
          />
        </div>

        <ul className={styles.mapLegend}>
          <li>
            <span className={styles.legendDotViolet} /> Memorial Library
            <strong>3</strong>
          </li>
          <li>
            <span className={styles.legendDotGreen} /> Engineering Hall
            <strong>2</strong>
          </li>
          <li>
            <span className={styles.legendDotSky} /> College Library
            <strong>3</strong>
          </li>
        </ul>
      </aside>
  );
}

function MapPinBubble({
                        className,
                        count,
                        label,
                      }: {
  className: string;
  count: string;
  label: string;
}) {
  return (
      <span className={`${styles.mapPinBubble} ${className}`} aria-label={`${label}: ${count} students`}>
      <i aria-hidden="true" />
      <strong>{count}</strong>
    </span>
  );
}

function ProblemSection() {
  return (
      <section id="why-it-exists" className={styles.problemSection}>
        <div className={styles.problemGrid} aria-hidden="true" />
        <div className={styles.problemGlow} aria-hidden="true" />

        <div className={styles.problemShell}>
          <div className={`${styles.problemIntro} ${styles.reveal}`}>
            <div className={styles.problemIntroTop}>
              <p className={styles.darkKicker}>Why this needs to exist</p>

              <span className={styles.problemIndex} aria-hidden="true">
              03 / THE GAP
            </span>
            </div>

            <div className={styles.problemHeadlineRow}>
              <h2>
                Campuses are full of students
                <span> studying alone, together.</span>
              </h2>

              <p>
                You can sit twenty feet from someone in your class and never know
                they are working on the exact same assignment.
              </p>
            </div>
          </div>

          <div className={`${styles.problemExperience} ${styles.reveal}`}>
            <div className={styles.problemBefore}>
              <div className={styles.problemStateLabel}>
                <span className={styles.problemStateNumber}>01</span>
                <span>Without StudyGrouprr</span>
              </div>

              <blockquote>
                “I need someone to study CS400 with.”
              </blockquote>

              <ul>
                <li>
                  <span>Group chat</span>
                  <strong>147 unread messages</strong>
                </li>

                <li>
                  <span>Course server</span>
                  <strong>Nobody replies</strong>
                </li>

                <li>
                  <span>Library</span>
                  <strong>No idea who is in CS400</strong>
                </li>
              </ul>

              <div className={styles.problemBeforeNote}>
                The people are nearby. The signal is missing.
              </div>
            </div>

            <div className={styles.problemBridge} aria-hidden="true">
            <span className={styles.problemBridgeLabel}>
              StudyGrouprr
            </span>

              <div className={styles.problemBridgeLine}>
                <span />
                <ArrowRight size={20} />
              </div>
            </div>

            <div className={styles.problemAfter}>
              <div className={styles.problemStateLabel}>
                <span className={styles.problemStateNumber}>02</span>
                <span>With StudyGrouprr</span>
              </div>

              <div className={styles.problemCourseHeader}>
                <div>
                  <span>CS400</span>
                  <small>Algorithms</small>
                </div>

                <span className={styles.problemLiveBadge}>
                <i aria-hidden="true" />
                3 nearby
              </span>
              </div>

              <article className={styles.problemResultCard}>
                <Avatar initial="S" tone="violet" />

                <div>
                <span className={styles.problemResultStatus}>
                  Studying now
                </span>
                  <strong>Sarah</strong>
                  <small>Memorial Library · 0.3 miles</small>
                </div>

                <ArrowRight size={16} />
              </article>

              <article className={styles.problemResultCard}>
              <span className={styles.problemResultIcon}>
                <Clock3 size={17} />
              </span>

                <div>
                <span className={styles.problemResultStatus}>
                  Starting soon
                </span>
                  <strong>CS400 Midterm Review</strong>
                  <small>Union South · 6:00 PM</small>
                </div>

                <ArrowRight size={16} />
              </article>
            </div>
          </div>

          <div className={`${styles.problemPositioning} ${styles.reveal}`}>
            <div className={styles.problemPositioningList}>
              <span>Not an AI tutor</span>
              <span>Not a notes app</span>
              <span>Not another Discord server</span>
            </div>

            <div className={styles.problemPositioningAnswer}>
              <small>The actual product</small>
              <strong>A way to find people.</strong>
            </div>
          </div>
        </div>
      </section>
  );
}

function CampusNetworkSection() {
  return (
      <section className={styles.networkSection}>
        <div className={`${styles.networkHeading} ${styles.reveal}`}>
          <p className={styles.sectionKicker}>The campus network</p>
          <h2>Meet once. Find each other again.</h2>
          <p>
            One-time sessions can become familiar classmates and regular study
            groups.
          </p>
        </div>

        <div className={styles.networkGrid}>
          <article className={`${styles.networkMapCard} ${styles.reveal}`}>
            <div className={styles.networkCardHeading}>
              <div>
                <p>Campus activity</p>
                <h3>Study signals by location</h3>
              </div>
              <span>
              <MapPin size={16} /> Near you
            </span>
            </div>

            <div className={styles.networkMap} aria-hidden="true">
              <svg viewBox="0 0 720 430" preserveAspectRatio="none">
                <path d="M-30 329C106 290 128 357 252 294C385 226 390 94 759 83" />
                <path d="M125 -30C164 77 233 91 277 171C327 264 320 342 389 468" />
              </svg>
              <span className={`${styles.networkBuilding} ${styles.networkBuildingOne}`} />
              <span className={`${styles.networkBuilding} ${styles.networkBuildingTwo}`} />
              <span className={`${styles.networkBuilding} ${styles.networkBuildingThree}`} />

              <div className={`${styles.networkLocation} ${styles.networkLocationOne}`}>
                <span>5</span>
                <div>
                  <strong>Memorial Library</strong>
                  <small>CS400 · MATH340</small>
                </div>
              </div>

              <div className={`${styles.networkLocation} ${styles.networkLocationTwo}`}>
                <span>2</span>
                <div>
                  <strong>Engineering Hall</strong>
                  <small>CHEM104</small>
                </div>
              </div>
            </div>
          </article>

          <article className={`${styles.buddiesCard} ${styles.reveal}`}>
            <div className={styles.networkCardHeading}>
              <div>
                <p>Study buddies</p>
                <h3>People you have studied with</h3>
              </div>
              <Users size={20} />
            </div>

            <div className={styles.buddyList}>
              <BuddyRow
                  initial="S"
                  tone="violet"
                  name="Sarah Chen"
                  detail="CS400 · 3 sessions together"
                  action="Study again"
              />
              <BuddyRow
                  initial="A"
                  tone="green"
                  name="Alex Morgan"
                  detail="MATH340 · Studied last Tuesday"
                  action="Invite"
              />
              <BuddyRow
                  initial="M"
                  tone="sky"
                  name="Maya Patel"
                  detail="ECON101 · 2 mutual courses"
                  action="View"
              />
            </div>

            <div className={styles.buddyFooter}>
              <AvatarStack />
              <p>
                <strong>Your campus gets more familiar.</strong>
                <span>Keep the people you study well with close.</span>
              </p>
            </div>
          </article>
        </div>
      </section>
  );
}

function BuddyRow({
                    initial,
                    tone,
                    name,
                    detail,
                    action,
                  }: {
  initial: string;
  tone: AvatarTone;
  name: string;
  detail: string;
  action: string;
}) {
  return (
      <div className={styles.buddyRow}>
        <Avatar initial={initial} tone={tone} />
        <div>
          <strong>{name}</strong>
          <span>{detail}</span>
        </div>
        <Link href="/login">{action}</Link>
      </div>
  );
}

function FinalCallToAction() {
  return (
      <section className={styles.finalSection}>
        <div className={styles.finalGrid} aria-hidden="true" />
        <svg
            className={styles.finalRoute}
            viewBox="0 0 1300 430"
            preserveAspectRatio="none"
            aria-hidden="true"
        >
          <path d="M-20 337C171 323 205 192 378 218C568 247 617 364 821 301C1013 242 1006 98 1260 80" />
        </svg>

        <div className={`${styles.finalContent} ${styles.reveal}`}>
          <p className={styles.finalKicker}>Your next table</p>
          <h2>Your next study group may already be on campus.</h2>
          <p>Add your courses and see who is studying.</p>
          <div className={styles.finalActions}>
            <Link href="/login" className={styles.finalButton}>
              Join your campus
              <ArrowRight size={18} />
            </Link>
            <Link href="/login" className={styles.finalSignIn}>
              Already have an account? <strong>Sign in</strong>
            </Link>
          </div>
        </div>

        <div className={styles.finalPin}>
          <span className={styles.finalPinPulse} aria-hidden="true" />
          <span className={styles.finalPinIcon}>
          <MapPin size={21} />
        </span>
          <div>
            <strong>Memorial Library</strong>
            <small>CS400 · 3 students</small>
          </div>
        </div>
      </section>
  );
}

function HomeFooter() {
  const year = new Date().getFullYear();

  return (
      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <Link href="/" aria-label="StudyGrouprr home">
            <span>
              <BookOpen size={18} />
            </span>
              StudyGrouprr
            </Link>
            <p>
              Find classmates studying your course and meet them on campus.
            </p>
          </div>

          <div className={styles.footerLinks}>
            <div>
              <strong>Product</strong>
              <a href="#campus-activity">Campus activity</a>
              <Link href="/sessions">Sessions</Link>
              <Link href="/live">Go live</Link>
              <Link href="/buddies">Study buddies</Link>
            </div>
            <div>
              <strong>Project</strong>
              <a href="#why-it-exists">Why it exists</a>
              <Link href="/login">Join campus</Link>
              <a
                  href="https://github.com/GreenTreeGaming/studygrouprr"
                  target="_blank"
                  rel="noreferrer"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <span>© {year} StudyGrouprr</span>
          <span>Built for students who study better together.</span>
        </div>
      </footer>
  );
}

function Avatar({
                  initial,
                  tone,
                }: {
  initial: string;
  tone: AvatarTone;
}) {
  const toneClass = {
    violet: styles.avatarViolet,
    green: styles.avatarGreen,
    sky: styles.avatarSky,
    amber: styles.avatarAmber,
  }[tone];

  return <span className={`${styles.avatar} ${toneClass}`}>{initial}</span>;
}

function AvatarStack({ compact = false }: { compact?: boolean }) {
  return (
      <span
          className={`${styles.avatarStack} ${compact ? styles.avatarStackCompact : ""}`}
          aria-label="Student attendees"
      >
      <i className={styles.stackOne}>S</i>
      <i className={styles.stackTwo}>A</i>
      <i className={styles.stackThree}>M</i>
        {!compact && <small>+2</small>}
    </span>
  );
}

