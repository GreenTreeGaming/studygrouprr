"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { gsap } from "gsap";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  GraduationCap,
  MapPin,
  Radio,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";

import AlertModal from "@/components/AlertModal";
import { useRequireOnboarding } from "@/hooks/useRequiredOnboarding";
import { containsInappropriateContent } from "@/lib/contentModeration";
import { supabase } from "@/lib/supabase";

type AlertType =
    | "success"
    | "error"
    | "warning"
    | "info";

type AlertConfig = {
  title: string;
  message: string;
  type: AlertType;
};

type SafeAvatarProps = {
  src: string | null | undefined;
  name: string | null | undefined;
};

const MAX_TITLE_LENGTH = 120;
const MAX_LOCATION_LENGTH = 180;
const MAX_IDENTIFICATION_LENGTH = 180;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_SESSION_DURATION_MINUTES = 6 * 60;

const COURSE_CODE_REGEX =
    /^[A-Z]{2,6}-?\d{2,4}$/;

const PHONE_REGEX =
    /(\+?1)?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;

const SOCIAL_REGEX =
    /(instagram|snapchat|discord|telegram|tiktok|@)/i;

const LINK_REGEX =
    /(https?:\/\/|www\.)/i;

function normalizeCourseCode(
    input: string,
): string {
  return input
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");
}

function getInitial(
    name: string | null | undefined,
): string {
  return (
      name?.trim().charAt(0).toUpperCase() ||
      "S"
  );
}

function SafeAvatar({
                      src,
                      name,
                    }: SafeAvatarProps) {
  const [imageFailed, setImageFailed] =
      useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  const canRenderImage =
      typeof src === "string" &&
      src.trim().length > 0 &&
      !imageFailed;

  if (!canRenderImage) {
    return (
        <span aria-hidden="true">
        {getInitial(name)}
      </span>
    );
  }

  return (
      <img
          src={src}
          alt={`${name || "Student"} avatar`}
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
      />
  );
}

function formatForDateTimeInput(
    date: Date,
): string {
  return new Date(
      date.getTime() -
      date.getTimezoneOffset() * 60_000,
  )
      .toISOString()
      .slice(0, 16);
}

function roundUpToQuarterHour(
    date: Date,
): Date {
  const roundedDate = new Date(date);
  const minutes = roundedDate.getMinutes();

  const minutesToAdd =
      (15 - (minutes % 15)) % 15;

  roundedDate.setMinutes(
      minutes + minutesToAdd,
      0,
      0,
  );

  return roundedDate;
}

function formatDuration(
    minutes: number,
): string {
  if (minutes <= 0) {
    return "No duration";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

function formatSessionDate(
    value: string,
): string {
  if (!value) {
    return "Choose a date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Choose a date";
  }

  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatSessionTime(
    value: string,
): string {
  if (!value) {
    return "Time";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Time";
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CreateSessionClient({
                                              prefilledCourse,
                                            }: {
  prefilledCourse: string;
}) {
  const router = useRouter();

  const {
    profile,
    loading: onboardingLoading,
  } = useRequireOnboarding();

  const rootRef = useRef<HTMLElement>(null);
  const createdSuccessfullyRef =
      useRef(false);

  const [title, setTitle] = useState("");
  const [courseCode, setCourseCode] =
      useState(() =>
          normalizeCourseCode(prefilledCourse),
      );

  const [location, setLocation] =
      useState("");

  const [
    identification,
    setIdentification,
  ] = useState("");

  const [description, setDescription] =
      useState("");

  const [startTime, setStartTime] =
      useState("");

  const [endTime, setEndTime] =
      useState("");

  const [titleTouched, setTitleTouched] =
      useState(false);

  const [myCourses, setMyCourses] =
      useState<string[]>([]);

  const [coursesLoading, setCoursesLoading] =
      useState(true);

  const [creating, setCreating] =
      useState(false);

  const [currentTime, setCurrentTime] =
      useState(() => Date.now());

  const [alertOpen, setAlertOpen] =
      useState(false);

  const [alertConfig, setAlertConfig] =
      useState<AlertConfig>({
        title: "",
        message: "",
        type: "info",
      });

  function showAlert(
      alertTitle: string,
      message: string,
      type: AlertType = "info",
  ) {
    setAlertConfig({
      title: alertTitle,
      message,
      type,
    });

    setAlertOpen(true);
  }

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  useEffect(() => {
    const start = roundUpToQuarterHour(
        new Date(Date.now() + 30 * 60_000),
    );

    const end = new Date(
        start.getTime() + 60 * 60_000,
    );

    setStartTime(
        formatForDateTimeInput(start),
    );

    setEndTime(
        formatForDateTimeInput(end),
    );
  }, []);

  useEffect(() => {
    const normalized =
        normalizeCourseCode(courseCode);

    if (titleTouched) {
      return;
    }

    setTitle(
        normalized
            ? `${normalized} Study Session`
            : "",
    );
  }, [courseCode, titleTouched]);

  useEffect(() => {
    if (!profile?.id) {
      return;
    }

    let cancelled = false;

    async function loadCourses() {
      setCoursesLoading(true);

      try {
        const { data, error } =
            await supabase
                .from("user_courses")
                .select("course_code")
                .eq("user_id", profile.id)
                .order("course_code");

        if (error) {
          throw error;
        }

        if (cancelled) {
          return;
        }

        const courses = (
            data ?? []
        )
            .map(
                (row) => row.course_code,
            )
            .filter(
                (
                    value,
                ): value is string =>
                    typeof value === "string" &&
                    value.trim().length > 0,
            )
            .map(normalizeCourseCode);

        setMyCourses(
            Array.from(
                new Set(courses),
            ),
        );
      } catch (error) {
        console.error(
            "Unable to load courses:",
            error,
        );

        if (!cancelled) {
          setMyCourses([]);
        }
      } finally {
        if (!cancelled) {
          setCoursesLoading(false);
        }
      }
    }

    void loadCourses();

    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  const hasMeaningfulDraft = useMemo(
      () =>
          Boolean(
              title.trim() ||
              courseCode.trim() ||
              location.trim() ||
              identification.trim() ||
              description.trim(),
          ),
      [
        courseCode,
        description,
        identification,
        location,
        title,
      ],
  );

  useEffect(() => {
    function preventAccidentalExit(
        event: BeforeUnloadEvent,
    ) {
      if (
          !hasMeaningfulDraft ||
          creating ||
          createdSuccessfullyRef.current
      ) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener(
        "beforeunload",
        preventAccidentalExit,
    );

    return () => {
      window.removeEventListener(
          "beforeunload",
          preventAccidentalExit,
      );
    };
  }, [creating, hasMeaningfulDraft]);

  const normalizedCourseCode =
      useMemo(
          () =>
              normalizeCourseCode(courseCode),
          [courseCode],
      );

  const startDate = useMemo(() => {
    if (!startTime) {
      return null;
    }

    const date = new Date(startTime);

    return Number.isNaN(date.getTime())
        ? null
        : date;
  }, [startTime]);

  const endDate = useMemo(() => {
    if (!endTime) {
      return null;
    }

    const date = new Date(endTime);

    return Number.isNaN(date.getTime())
        ? null
        : date;
  }, [endTime]);

  const durationMinutes = useMemo(() => {
    if (!startDate || !endDate) {
      return 0;
    }

    return Math.round(
        (endDate.getTime() -
            startDate.getTime()) /
        60_000,
    );
  }, [endDate, startDate]);

  const combinedPublicText = useMemo(
      () =>
          [
            title,
            location,
            identification,
            description,
          ].join(" "),
      [
        description,
        identification,
        location,
        title,
      ],
  );

  const courseReady =
      Boolean(normalizedCourseCode) &&
      COURSE_CODE_REGEX.test(
          normalizedCourseCode,
      );

  const titleReady =
      title.trim().length >= 4;

  const identityReady =
      courseReady && titleReady;

  const locationReady =
      location.trim().length >= 10;

  const identificationReady =
      identification.trim().length >= 10;

  const scheduleReady =
      Boolean(startDate) &&
      Boolean(endDate) &&
      Boolean(
          startDate &&
          startDate.getTime() >=
          currentTime - 60_000,
      ) &&
      durationMinutes > 0 &&
      durationMinutes <=
      MAX_SESSION_DURATION_MINUTES;

  const descriptionReady =
      description.trim().length >= 10;

  const validationErrors =
      useMemo(() => {
        const errors: string[] = [];

        if (
            title.trim() &&
            title.trim().length < 4
        ) {
          errors.push(
              "Make the session title a little more descriptive.",
          );
        }

        if (
            normalizedCourseCode &&
            !COURSE_CODE_REGEX.test(
                normalizedCourseCode,
            )
        ) {
          errors.push(
              "Enter a valid course code such as CS400, MATH340, or CHEM-103.",
          );
        }

        if (
            location.trim() &&
            location.trim().length < 10
        ) {
          errors.push(
              "Make the location more specific by including a building, floor, room, or table.",
          );
        }

        if (
            identification.trim() &&
            identification.trim().length < 10
        ) {
          errors.push(
              "Add a clearer description of how classmates can recognize you.",
          );
        }

        if (
            description.trim() &&
            description.trim().length < 10
        ) {
          errors.push(
              "Describe what the group will study in at least 10 characters.",
          );
        }

        if (
            startDate &&
            startDate.getTime() <
            currentTime - 60_000
        ) {
          errors.push(
              "The session start time cannot be in the past.",
          );
        }

        if (
            startDate &&
            endDate &&
            endDate <= startDate
        ) {
          errors.push(
              "The session must end after it starts.",
          );
        }

        if (
            durationMinutes >
            MAX_SESSION_DURATION_MINUTES
        ) {
          errors.push(
              "Study sessions cannot be longer than six hours.",
          );
        }

        if (
            PHONE_REGEX.test(
                combinedPublicText,
            )
        ) {
          errors.push(
              "Phone numbers are not allowed in public session details.",
          );
        }

        if (
            SOCIAL_REGEX.test(
                combinedPublicText,
            )
        ) {
          errors.push(
              "Social media handles are not allowed in public session details.",
          );
        }

        if (
            LINK_REGEX.test(
                combinedPublicText,
            )
        ) {
          errors.push(
              "Links are not allowed in public session details.",
          );
        }

        if (
            containsInappropriateContent(
                combinedPublicText,
            )
        ) {
          errors.push(
              "Please remove inappropriate language.",
          );
        }

        return Array.from(
            new Set(errors),
        );
      }, [
        combinedPublicText,
        currentTime,
        description,
        durationMinutes,
        endDate,
        identification,
        location,
        normalizedCourseCode,
        startDate,
        title,
      ]);

  const readinessSteps = [
    identityReady,
    locationReady,
    identificationReady,
    scheduleReady,
    descriptionReady,
  ];

  const completedSteps =
      readinessSteps.filter(Boolean).length;

  const readinessPercentage =
      Math.round(
          (completedSteps /
              readinessSteps.length) *
          100,
      );

  const canCreate =
      readinessSteps.every(Boolean) &&
      validationErrors.length === 0;

  const previewTitle =
      title.trim() ||
      "Your study session";

  const previewCourse =
      normalizedCourseCode ||
      "COURSE";

  const previewLocation =
      location.trim() ||
      "Add a precise campus location";

  const previewIdentification =
      identification.trim() ||
      "Describe how classmates can recognize you";

  const previewDescription =
      description.trim() ||
      "Explain what the group will work on together.";

  function updateCourse(
      value: string,
  ) {
    if (prefilledCourse) {
      return;
    }

    setCourseCode(
        normalizeCourseCode(value),
    );
  }

  function updateStartTime(
      value: string,
  ) {
    const previousDuration =
        durationMinutes > 0
            ? durationMinutes
            : 60;

    setStartTime(value);

    const nextStart = new Date(value);

    if (
        Number.isNaN(
            nextStart.getTime(),
        )
    ) {
      return;
    }

    const nextEnd = new Date(
        nextStart.getTime() +
        previousDuration * 60_000,
    );

    setEndTime(
        formatForDateTimeInput(nextEnd),
    );
  }

  function applyStartOffset(
      offsetMinutes: number,
  ) {
    const nextStart =
        roundUpToQuarterHour(
            new Date(
                Date.now() +
                offsetMinutes * 60_000,
            ),
        );

    const nextDuration =
        durationMinutes > 0
            ? durationMinutes
            : 60;

    const nextEnd = new Date(
        nextStart.getTime() +
        nextDuration * 60_000,
    );

    setStartTime(
        formatForDateTimeInput(
            nextStart,
        ),
    );

    setEndTime(
        formatForDateTimeInput(nextEnd),
    );
  }

  function applyTomorrowEvening() {
    const nextStart = new Date();

    nextStart.setDate(
        nextStart.getDate() + 1,
    );

    nextStart.setHours(18, 0, 0, 0);

    const nextDuration =
        durationMinutes > 0
            ? durationMinutes
            : 60;

    const nextEnd = new Date(
        nextStart.getTime() +
        nextDuration * 60_000,
    );

    setStartTime(
        formatForDateTimeInput(
            nextStart,
        ),
    );

    setEndTime(
        formatForDateTimeInput(nextEnd),
    );
  }

  function applyDuration(
      minutes: number,
  ) {
    if (!startDate) {
      return;
    }

    const nextEnd = new Date(
        startDate.getTime() +
        minutes * 60_000,
    );

    setEndTime(
        formatForDateTimeInput(nextEnd),
    );
  }

  async function createSession(
      event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (creating) {
      return;
    }

    if (!canCreate) {
      showAlert(
          "Session Not Ready",
          validationErrors[0] ||
          "Complete all five session details before launching it.",
          "warning",
      );

      return;
    }

    setCreating(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        router.push("/");
        return;
      }

      const start = new Date(
          startTime,
      );

      const end = new Date(endTime);

      if (
          start.getTime() <
          Date.now() - 60_000
      ) {
        throw new Error(
            "The selected start time has passed. Choose a new start time.",
        );
      }

      const {
        data: createdSession,
        error: sessionError,
      } = await supabase
          .from("study_sessions")
          .insert({
            title: title.trim(),
            course_code:
            normalizedCourseCode,
            location_name:
                location.trim(),
            description:
                description.trim(),
            identification:
                identification.trim(),
            start_time:
                start.toISOString(),
            end_time: end.toISOString(),
            creator_id: user.id,
          })
          .select("id")
          .single();

      if (sessionError) {
        throw sessionError;
      }

      const { error: memberError } =
          await supabase
              .from("session_members")
              .insert({
                session_id:
                createdSession.id,
                user_id: user.id,
              });

      if (memberError) {
        console.error(
            "Session created, but creator membership could not be added:",
            memberError,
        );
      }

      createdSuccessfullyRef.current =
          true;

      showAlert(
          "Session Launched",
          memberError
              ? "Your session was created, but we could not automatically add you to the attendee list."
              : "Your session is live and ready for classmates to discover.",
          memberError
              ? "warning"
              : "success",
      );

      window.setTimeout(() => {
        router.push(
            `/sessions/${createdSession.id}`,
        );
      }, 850);
    } catch (error) {
      console.error(
          "Unable to create session:",
          error,
      );

      showAlert(
          "Unable to Create Session",
          error instanceof Error
              ? error.message
              : "Your study session could not be created.",
          "error",
      );
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    if (
        onboardingLoading ||
        !profile ||
        !rootRef.current
    ) {
      return;
    }

    const prefersReducedMotion =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

    if (prefersReducedMotion) {
      return;
    }

    const context = gsap.context(() => {
      gsap.from(".cs2-reveal", {
        opacity: 0,
        y: 26,
        duration: 0.68,
        stagger: 0.075,
        ease: "power3.out",
      });

      gsap.from(".cs2-step-card", {
        opacity: 0,
        y: 20,
        rotate: -0.5,
        duration: 0.56,
        stagger: 0.07,
        delay: 0.16,
        ease: "power3.out",
      });

      gsap.from(".cs2-preview-orbit", {
        opacity: 0,
        scale: 0.72,
        duration: 0.7,
        stagger: 0.1,
        delay: 0.22,
        ease: "back.out(1.45)",
      });
    }, rootRef);

    return () => {
      context.revert();
    };
  }, [onboardingLoading, profile]);

  if (onboardingLoading) {
    return (
        <>
          <style>{createSessionStyles}</style>

          <main className="cs2-loading">
            <div
                className="cs2-loading-ticket"
                aria-hidden="true"
            >
              <span />
              <span />
              <CalendarDays size={28} />
            </div>

            <p>
              Preparing your session builder…
            </p>
          </main>
        </>
    );
  }

  if (!profile) {
    return (
        <>
          <style>{createSessionStyles}</style>

          <main className="cs2-loading">
            <p>
              We could not find your
              StudyGrouprr profile.
            </p>

            <Link
                href="/login"
                className="cs2-loading-link"
            >
              Return to login
            </Link>
          </main>
        </>
    );
  }

  return (
      <>
        <style>{createSessionStyles}</style>

        <main
            ref={rootRef}
            className="cs2-root"
        >
          <div
              className="cs2-background-grid"
              aria-hidden="true"
          />

          <div className="cs2-glow cs2-glow--one" />
          <div className="cs2-glow cs2-glow--two" />

          <div className="cs2-canvas">
            <header className="cs2-command-bar cs2-reveal">
              <button
                  type="button"
                  className="cs2-back-button"
                  onClick={() =>
                      router.back()
                  }
              >
                <ArrowLeft size={17} />
                Back
              </button>

              <div className="cs2-command-title">
              <span className="cs2-command-icon">
                <Sparkles size={18} />
              </span>

                <span>
                <strong>
                  Session Launchpad
                </strong>

                <small>
                  Build a real campus meetup
                </small>
              </span>
              </div>

              <div className="cs2-campus-badge">
                <GraduationCap
                    size={16}
                />

                <span>
                {profile.university ||
                    "Your university"}
              </span>
              </div>
            </header>

            <div className="cs2-layout">
              <form
                  className="cs2-builder cs2-reveal"
                  onSubmit={createSession}
              >
                <section className="cs2-builder-intro">
                  <div className="cs2-builder-copy">
                  <span className="cs2-eyebrow">
                    <Zap size={15} />
                    Create a study session
                  </span>

                    <h1>
                      Put a study table
                      <span>on the campus radar.</span>
                    </h1>

                    <p>
                      Fill in five clear details,
                      launch the meetup, and let
                      classmates taking the same
                      course find you.
                    </p>
                  </div>

                  <div className="cs2-readiness-card">
                    <div className="cs2-readiness-top">
                    <span>
                      Launch readiness
                    </span>

                      <strong>
                        {readinessPercentage}%
                      </strong>
                    </div>

                    <div className="cs2-readiness-track">
                    <span
                        style={{
                          width: `${readinessPercentage}%`,
                        }}
                    />
                    </div>

                    <p>
                      {completedSteps} of 5 details
                      complete
                    </p>
                  </div>
                </section>

                <div className="cs2-form-grid">
                  <section
                      className={`cs2-step-card cs2-step-card--wide ${
                          identityReady
                              ? "cs2-step-card--ready"
                              : ""
                      }`}
                  >
                    <div className="cs2-step-marker">
                      <span>01</span>

                      {identityReady && (
                          <Check size={17} />
                      )}
                    </div>

                    <div className="cs2-step-content">
                      <div className="cs2-step-heading">
                      <span className="cs2-step-icon">
                        <BookOpen
                            size={20}
                        />
                      </span>

                        <span>
                        <strong>
                          Name the meetup
                        </strong>

                        <small>
                          Give students an immediate
                          reason to open it
                        </small>
                      </span>
                      </div>

                      <div className="cs2-field-pair">
                        <label className="cs2-field">
                        <span>
                          Session title
                        </span>

                          <input
                              value={title}
                              maxLength={
                                MAX_TITLE_LENGTH
                              }
                              onChange={(event) => {
                                setTitleTouched(true);
                                setTitle(
                                    event.target.value,
                                );
                              }}
                              placeholder="CS400 Midterm Review"
                              autoComplete="off"
                          />

                          <small>
                            {title.length}/
                            {MAX_TITLE_LENGTH}
                          </small>
                        </label>

                        <label className="cs2-field">
                        <span>
                          Course code
                        </span>

                          <input
                              value={courseCode}
                              maxLength={10}
                              disabled={
                                Boolean(
                                    prefilledCourse,
                                )
                              }
                              onChange={(event) =>
                                  updateCourse(
                                      event.target.value,
                                  )
                              }
                              placeholder="CS400"
                              autoComplete="off"
                          />

                          <small>
                            {prefilledCourse
                                ? "Locked to the selected course"
                                : "Example: CS400 or CHEM-103"}
                          </small>
                        </label>
                      </div>

                      {!prefilledCourse &&
                          myCourses.length > 0 && (
                              <div className="cs2-course-shortcuts">
                          <span>
                            My courses
                          </span>

                                <div>
                                  {myCourses.map(
                                      (course) => (
                                          <button
                                              key={course}
                                              type="button"
                                              className={
                                                normalizedCourseCode ===
                                                course
                                                    ? "cs2-course-chip cs2-course-chip--active"
                                                    : "cs2-course-chip"
                                              }
                                              onClick={() =>
                                                  updateCourse(
                                                      course,
                                                  )
                                              }
                                          >
                                            {course}
                                          </button>
                                      ),
                                  )}
                                </div>
                              </div>
                          )}

                      {!prefilledCourse &&
                          coursesLoading && (
                              <p className="cs2-inline-note">
                                Loading your courses…
                              </p>
                          )}

                      {normalizedCourseCode &&
                          !courseReady && (
                              <p className="cs2-field-warning">
                                Use a code such as CS400,
                                MATH340, or CHEM-103.
                              </p>
                          )}
                    </div>
                  </section>

                  <section
                      className={`cs2-step-card ${
                          locationReady
                              ? "cs2-step-card--ready"
                              : ""
                      }`}
                  >
                    <div className="cs2-step-marker">
                      <span>02</span>

                      {locationReady && (
                          <Check size={17} />
                      )}
                    </div>

                    <div className="cs2-step-content">
                      <div className="cs2-step-heading">
                      <span className="cs2-step-icon cs2-step-icon--green">
                        <MapPin size={20} />
                      </span>

                        <span>
                        <strong>
                          Pin the table
                        </strong>

                        <small>
                          Tell classmates exactly
                          where to go
                        </small>
                      </span>
                      </div>

                      <label className="cs2-field">
                      <span>
                        Campus location
                      </span>

                        <input
                            value={location}
                            maxLength={
                              MAX_LOCATION_LENGTH
                            }
                            onChange={(event) =>
                                setLocation(
                                    event.target.value,
                                )
                            }
                            placeholder="Memorial Library, 2nd floor, window tables"
                            autoComplete="off"
                        />

                        <small>
                          {location.length}/
                          {
                            MAX_LOCATION_LENGTH
                          }
                        </small>
                      </label>

                      <div
                          className={
                            locationReady
                                ? "cs2-feedback cs2-feedback--ready"
                                : "cs2-feedback"
                          }
                      >
                        {locationReady ? (
                            <CheckCircle2
                                size={16}
                            />
                        ) : (
                            <MapPin size={16} />
                        )}

                        <span>
                        {locationReady
                            ? "That should be specific enough to find."
                            : "Include the building, floor, room, or table area."}
                      </span>
                      </div>
                    </div>
                  </section>

                  <section
                      className={`cs2-step-card ${
                          identificationReady
                              ? "cs2-step-card--ready"
                              : ""
                      }`}
                  >
                    <div className="cs2-step-marker">
                      <span>03</span>

                      {identificationReady && (
                          <Check size={17} />
                      )}
                    </div>

                    <div className="cs2-step-content">
                      <div className="cs2-step-heading">
                      <span className="cs2-step-icon cs2-step-icon--amber">
                        <User size={20} />
                      </span>

                        <span>
                        <strong>
                          Make yourself findable
                        </strong>

                        <small>
                          Give a quick visual clue
                        </small>
                      </span>
                      </div>

                      <label className="cs2-field">
                      <span>
                        How can they spot you?
                      </span>

                        <input
                            value={
                              identification
                            }
                            maxLength={
                              MAX_IDENTIFICATION_LENGTH
                            }
                            onChange={(event) =>
                                setIdentification(
                                    event.target.value,
                                )
                            }
                            placeholder="Blue hoodie, black backpack, sitting by the windows"
                            autoComplete="off"
                        />

                        <small>
                          {
                            identification.length
                          }
                          /
                          {
                            MAX_IDENTIFICATION_LENGTH
                          }
                        </small>
                      </label>

                      <div
                          className={
                            identificationReady
                                ? "cs2-feedback cs2-feedback--ready"
                                : "cs2-feedback"
                          }
                      >
                        {identificationReady ? (
                            <CheckCircle2
                                size={16}
                            />
                        ) : (
                            <Eye size={16} />
                        )}

                        <span>
                        {identificationReady
                            ? "Classmates should be able to recognize you."
                            : "Mention clothing, a backpack, laptop, or seat location."}
                      </span>
                      </div>
                    </div>
                  </section>

                  <section
                      className={`cs2-step-card cs2-step-card--wide ${
                          scheduleReady
                              ? "cs2-step-card--ready"
                              : ""
                      }`}
                  >
                    <div className="cs2-step-marker">
                      <span>04</span>

                      {scheduleReady && (
                          <Check size={17} />
                      )}
                    </div>

                    <div className="cs2-step-content">
                      <div className="cs2-step-heading">
                      <span className="cs2-step-icon cs2-step-icon--blue">
                        <CalendarDays
                            size={20}
                        />
                      </span>

                        <span>
                        <strong>
                          Set the meetup window
                        </strong>

                        <small>
                          Sessions can last up to
                          six hours
                        </small>
                      </span>

                        <span className="cs2-duration-badge">
                        <Clock size={15} />
                          {formatDuration(
                              durationMinutes,
                          )}
                      </span>
                      </div>

                      <div className="cs2-schedule-shortcuts">
                      <span>
                        Quick start
                      </span>

                        <div>
                          <button
                              type="button"
                              onClick={() =>
                                  applyStartOffset(30)
                              }
                          >
                            In 30 min
                          </button>

                          <button
                              type="button"
                              onClick={() =>
                                  applyStartOffset(60)
                              }
                          >
                            In 1 hour
                          </button>

                          <button
                              type="button"
                              onClick={
                                applyTomorrowEvening
                              }
                          >
                            Tomorrow at 6
                          </button>
                        </div>
                      </div>

                      <div className="cs2-field-pair">
                        <label className="cs2-field">
                        <span>
                          Start time
                        </span>

                          <input
                              type="datetime-local"
                              value={startTime}
                              onChange={(event) =>
                                  updateStartTime(
                                      event.target.value,
                                  )
                              }
                          />
                        </label>

                        <label className="cs2-field">
                        <span>
                          End time
                        </span>

                          <input
                              type="datetime-local"
                              value={endTime}
                              onChange={(event) =>
                                  setEndTime(
                                      event.target.value,
                                  )
                              }
                          />
                        </label>
                      </div>

                      <div className="cs2-duration-shortcuts">
                      <span>
                        Session length
                      </span>

                        <div>
                          {[
                            [60, "1 hour"],
                            [90, "1.5 hours"],
                            [120, "2 hours"],
                            [180, "3 hours"],
                          ].map(
                              ([
                                 minutes,
                                 label,
                               ]) => (
                                  <button
                                      key={minutes}
                                      type="button"
                                      className={
                                        durationMinutes ===
                                        minutes
                                            ? "cs2-duration-option cs2-duration-option--active"
                                            : "cs2-duration-option"
                                      }
                                      onClick={() =>
                                          applyDuration(
                                              Number(
                                                  minutes,
                                              ),
                                          )
                                      }
                                  >
                                    {label}
                                  </button>
                              ),
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section
                      className={`cs2-step-card cs2-step-card--wide ${
                          descriptionReady
                              ? "cs2-step-card--ready"
                              : ""
                      }`}
                  >
                    <div className="cs2-step-marker">
                      <span>05</span>

                      {descriptionReady && (
                          <Check size={17} />
                      )}
                    </div>

                    <div className="cs2-step-content">
                      <div className="cs2-step-heading">
                      <span className="cs2-step-icon cs2-step-icon--violet">
                        <FileText
                            size={20}
                        />
                      </span>

                        <span>
                        <strong>
                          Share the study plan
                        </strong>

                        <small>
                          Explain what everyone
                          will work on
                        </small>
                      </span>
                      </div>

                      <label className="cs2-field">
                      <span>
                        What will you be studying?
                      </span>

                        <textarea
                            value={description}
                            maxLength={
                              MAX_DESCRIPTION_LENGTH
                            }
                            rows={4}
                            onChange={(event) =>
                                setDescription(
                                    event.target.value,
                                )
                            }
                            placeholder="Reviewing dynamic programming problems, comparing solutions, and working through past midterm questions…"
                        />

                        <small>
                          {description.length}/
                          {
                            MAX_DESCRIPTION_LENGTH
                          }
                        </small>
                      </label>
                    </div>
                  </section>
                </div>

                {combinedPublicText.trim() &&
                    validationErrors.length >
                    0 && (
                        <div
                            className="cs2-validation-panel"
                            role="alert"
                        >
                          <ShieldCheck
                              size={21}
                          />

                          <div>
                            <strong>
                              Retune these details
                            </strong>

                            <ul>
                              {validationErrors.map(
                                  (error) => (
                                      <li key={error}>
                                        {error}
                                      </li>
                                  ),
                              )}
                            </ul>
                          </div>
                        </div>
                    )}

                <div
                    className={`cs2-launch-bar ${
                        canCreate
                            ? "cs2-launch-bar--ready"
                            : ""
                    }`}
                >
                  <div className="cs2-launch-status">
                  <span>
                    {canCreate ? (
                        <CheckCircle2
                            size={22}
                        />
                    ) : (
                        <Radio size={22} />
                    )}
                  </span>

                    <div>
                      <strong>
                        {canCreate
                            ? "Your meetup is ready"
                            : `${completedSteps} of 5 details ready`}
                      </strong>

                      <small>
                        {canCreate
                            ? "Students at your university will be able to discover it."
                            : "Complete the remaining details to launch the session."}
                      </small>
                    </div>
                  </div>

                  <button
                      type="submit"
                      className="cs2-launch-button"
                      disabled={
                          creating ||
                          !canCreate
                      }
                  >
                  <span className="cs2-launch-button-icon">
                    <Zap size={21} />
                  </span>

                    <span>
                    <small>
                      Publish to campus
                    </small>

                    <strong>
                      {creating
                          ? "Launching session…"
                          : "Create session"}
                    </strong>
                  </span>

                    <ArrowRight size={20} />
                  </button>
                </div>
              </form>

              <aside className="cs2-sidebar">
                <section className="cs2-preview-panel cs2-reveal">
                  <div className="cs2-preview-heading">
                    <div>
                    <span className="cs2-sidebar-kicker">
                      <Eye size={15} />
                      Live preview
                    </span>

                      <h2>
                        What classmates see
                      </h2>
                    </div>

                    <span className="cs2-preview-eye">
                    <Eye size={18} />
                  </span>
                  </div>

                  <article className="cs2-session-ticket">
                    <span className="cs2-ticket-cut cs2-ticket-cut--left" />
                    <span className="cs2-ticket-cut cs2-ticket-cut--right" />

                    <div className="cs2-ticket-top">
                    <span className="cs2-ticket-status">
                      <span />
                      Upcoming
                    </span>

                      <span className="cs2-ticket-course">
                      {previewCourse}
                    </span>
                    </div>

                    <div className="cs2-ticket-person">
                      <div className="cs2-ticket-avatar">
                        <SafeAvatar
                            src={
                              profile.avatar_url
                            }
                            name={
                              profile.name
                            }
                        />
                      </div>

                      <div>
                        <small>
                          Hosted by
                        </small>

                        <strong>
                          {profile.name}
                        </strong>
                      </div>
                    </div>

                    <h3>
                      {previewTitle}
                    </h3>

                    <div className="cs2-ticket-route">
                      <div>
                      <span className="cs2-route-icon cs2-route-icon--violet">
                        <CalendarDays
                            size={17}
                        />
                      </span>

                        <span>
                        <small>
                          When
                        </small>

                        <strong>
                          {formatSessionDate(
                              startTime,
                          )}
                        </strong>

                        <p>
                          {formatSessionTime(
                              startTime,
                          )}{" "}
                          –{" "}
                          {formatSessionTime(
                              endTime,
                          )}
                        </p>
                      </span>
                      </div>

                      <span className="cs2-route-line" />

                      <div>
                      <span className="cs2-route-icon cs2-route-icon--green">
                        <MapPin
                            size={17}
                        />
                      </span>

                        <span>
                        <small>
                          Where
                        </small>

                        <strong>
                          {previewLocation}
                        </strong>
                      </span>
                      </div>
                    </div>

                    <div className="cs2-ticket-description">
                      <small>
                        Study plan
                      </small>

                      <p>
                        {previewDescription}
                      </p>
                    </div>

                    <div className="cs2-ticket-find">
                      <Eye size={16} />

                      <span>
                      {previewIdentification}
                    </span>
                    </div>

                    <div className="cs2-ticket-footer">
                    <span>
                      <Users size={16} />
                      Creator automatically joins
                    </span>

                      <span>
                      {formatDuration(
                          durationMinutes,
                      )}
                    </span>
                    </div>
                  </article>

                  <span className="cs2-preview-caption">
                  Campus session card
                </span>
                </section>

                <section className="cs2-checklist cs2-reveal">
                  <div className="cs2-checklist-heading">
                  <span className="cs2-sidebar-kicker cs2-sidebar-kicker--dark">
                    <Radio size={15} />
                    Launch checklist
                  </span>

                    <strong>
                      {completedSteps}/5
                    </strong>
                  </div>

                  <div className="cs2-checklist-items">
                    {[
                      {
                        label:
                            "Session named",
                        detail:
                            "Title and course are clear",
                        complete:
                        identityReady,
                      },
                      {
                        label:
                            "Location pinned",
                        detail:
                            "Classmates know where to go",
                        complete:
                        locationReady,
                      },
                      {
                        label:
                            "Host recognizable",
                        detail:
                            "Students can find your table",
                        complete:
                        identificationReady,
                      },
                      {
                        label:
                            "Time window valid",
                        detail:
                            "Future start and valid duration",
                        complete:
                        scheduleReady,
                      },
                      {
                        label:
                            "Study plan shared",
                        detail:
                            "The purpose is easy to understand",
                        complete:
                        descriptionReady,
                      },
                    ].map((item) => (
                        <div
                            key={item.label}
                            className={
                              item.complete
                                  ? "cs2-check-item cs2-check-item--ready"
                                  : "cs2-check-item"
                            }
                        >
                      <span>
                        {item.complete ? (
                            <Check
                                size={15}
                            />
                        ) : (
                            <Radio
                                size={15}
                            />
                        )}
                      </span>

                          <div>
                            <strong>
                              {item.label}
                            </strong>

                            <small>
                              {item.detail}
                            </small>
                          </div>
                        </div>
                    ))}
                  </div>
                </section>

                <section className="cs2-safety-card cs2-reveal">
                  <ShieldCheck size={22} />

                  <div>
                    <strong>
                      Campus-safe by design
                    </strong>

                    <p>
                      Only students at{" "}
                      {profile.university ||
                          "your university"}{" "}
                      can discover this session.
                      Contact details, social handles,
                      and links are blocked.
                    </p>
                  </div>
                </section>

                <Link
                    href="/sessions"
                    className="cs2-browse-link cs2-reveal"
                >
                  <BookOpen size={18} />

                  <span>
                  <strong>
                    Browse existing sessions
                  </strong>

                  <small>
                    Check whether someone already
                    created a meetup
                  </small>
                </span>

                  <ChevronRight size={18} />
                </Link>
              </aside>
            </div>
          </div>
        </main>

        <AlertModal
            open={alertOpen}
            title={alertConfig.title}
            message={alertConfig.message}
            type={alertConfig.type}
            onClose={() =>
                setAlertOpen(false)
            }
        />
      </>
  );
}

const createSessionStyles = `
  .cs2-root,
  .cs2-root *,
  .cs2-loading,
  .cs2-loading * {
    box-sizing: border-box;
  }

  .cs2-root,
  .cs2-loading {
    --cs2-indigo: #1B1B3A;
    --cs2-indigo-soft: #292953;
    --cs2-violet: #7C3AED;
    --cs2-violet-dark: #5B21B6;
    --cs2-violet-light: #EDE9FE;
    --cs2-violet-faint: #F5F3FF;
    --cs2-lilac: #C4B5FD;
    --cs2-green: #10B981;
    --cs2-green-dark: #047857;
    --cs2-green-light: #D1FAE5;
    --cs2-amber: #F59E0B;
    --cs2-amber-dark: #B45309;
    --cs2-amber-light: #FEF3C7;
    --cs2-red: #EF4444;
    --cs2-red-light: #FEE2E2;
    --cs2-blue: #0EA5E9;
    --cs2-blue-light: #E0F2FE;
    --cs2-cream: #FFF9E8;
    --cs2-background: #F5F4FB;
    --cs2-surface: #FFFFFF;
    --cs2-border: #E4E2F0;
    --cs2-text: #1B1B3A;
    --cs2-muted: #64748B;
    --cs2-faint: #94A3B8;
  }

  .cs2-root {
    position: relative;
    min-height: 100vh;
    overflow: hidden;
    isolation: isolate;
    padding: 18px 20px 100px;
    color: var(--cs2-text);
    background:
      radial-gradient(
        circle at 50% -8%,
        rgba(124, 58, 237, 0.2),
        transparent 30rem
      ),
      var(--cs2-background);
  }

  .cs2-background-grid {
    position: absolute;
    inset: 0;
    z-index: -5;
    opacity: 0.3;
    pointer-events: none;
    background-image:
      radial-gradient(
        circle,
        rgba(27, 27, 58, 0.17) 1px,
        transparent 1px
      );
    background-size: 27px 27px;
    mask-image:
      linear-gradient(
        to bottom,
        transparent,
        black 6%,
        black 94%,
        transparent
      );
  }

  .cs2-glow {
    position: absolute;
    z-index: -4;
    border-radius: 999px;
    pointer-events: none;
    filter: blur(7px);
  }

  .cs2-glow--one {
    top: 520px;
    right: -230px;
    width: 460px;
    height: 460px;
    background: rgba(16, 185, 129, 0.1);
  }

  .cs2-glow--two {
    top: 1180px;
    left: -280px;
    width: 520px;
    height: 520px;
    background: rgba(124, 58, 237, 0.1);
  }

  .cs2-canvas {
    position: relative;
    z-index: 1;
    width: min(1220px, 100%);
    margin: 0 auto;
  }

  .cs2-command-bar {
    display: grid;
    grid-template-columns:
      auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
    padding: 11px 14px;
    background: rgba(255, 255, 255, 0.86);
    border: 1px solid var(--cs2-border);
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(27, 27, 58, 0.07);
    backdrop-filter: blur(16px);
  }

  .cs2-back-button {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 11px;
    color: var(--cs2-muted);
    background: var(--cs2-background);
    border: 1px solid var(--cs2-border);
    border-radius: 11px;
    font: inherit;
    font-size: 13px;
    font-weight: 750;
    cursor: pointer;
    transition:
      color 150ms ease,
      transform 150ms ease,
      border-color 150ms ease;
  }

  .cs2-back-button:hover {
    color: var(--cs2-violet);
    border-color: var(--cs2-lilac);
    transform: translateX(-3px);
  }

  .cs2-command-title {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 10px;
  }

  .cs2-command-icon {
    display: grid;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    place-items: center;
    color: white;
    background:
      linear-gradient(
        145deg,
        var(--cs2-violet),
        var(--cs2-violet-dark)
      );
    border-radius: 12px;
    box-shadow: 0 8px 18px rgba(91, 33, 182, 0.2);
  }

  .cs2-command-title > span:last-child {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .cs2-command-title strong {
    font-size: 14px;
  }

  .cs2-command-title small {
    margin-top: 2px;
    color: var(--cs2-muted);
    font-size: 12px;
  }

  .cs2-campus-badge {
    display: inline-flex;
    max-width: 280px;
    align-items: center;
    gap: 7px;
    padding: 9px 11px;
    color: var(--cs2-green-dark);
    background: var(--cs2-green-light);
    border: 1px solid #A7F3D0;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 750;
  }

  .cs2-campus-badge span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cs2-layout {
    display: grid;
    grid-template-columns:
      minmax(0, 1fr)
      minmax(320px, 0.42fr);
    gap: 20px;
    align-items: start;
  }

  .cs2-builder {
    position: relative;
    min-width: 0;
    padding: 24px;
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid var(--cs2-border);
    border-radius: 29px 18px 42px 18px;
    box-shadow: 0 22px 58px rgba(27, 27, 58, 0.1);
    backdrop-filter: blur(14px);
  }

  .cs2-builder-intro {
    display: grid;
    grid-template-columns:
      minmax(0, 1fr) 220px;
    align-items: center;
    gap: 22px;
    margin-bottom: 17px;
    padding: 24px;
    color: white;
    background:
      radial-gradient(
        circle at 88% 25%,
        rgba(124, 58, 237, 0.43),
        transparent 32%
      ),
      linear-gradient(
        135deg,
        #17172E,
        var(--cs2-indigo-soft)
      );
    border-radius: 19px 35px 19px 35px;
    box-shadow: 0 17px 38px rgba(27, 27, 58, 0.18);
  }

  .cs2-eyebrow,
  .cs2-sidebar-kicker {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 10px;
    color: var(--cs2-lilac);
    font-size: 12px;
    font-weight: 850;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .cs2-builder-copy h1 {
    margin: 0;
    font-size: clamp(35px, 4.6vw, 55px);
    font-weight: 850;
    letter-spacing: -0.065em;
    line-height: 0.95;
  }

  .cs2-builder-copy h1 span {
    display: block;
    margin-top: 6px;
    color: var(--cs2-lilac);
  }

  .cs2-builder-copy p {
    max-width: 640px;
    margin: 15px 0 0;
    color: rgba(255, 255, 255, 0.62);
    font-size: 14px;
    line-height: 1.65;
  }

  .cs2-readiness-card {
    padding: 17px;
    color: var(--cs2-text);
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid rgba(255, 255, 255, 0.75);
    border-radius: 15px;
    box-shadow: 0 13px 29px rgba(0, 0, 0, 0.22);
    transform: rotate(1deg);
  }

  .cs2-readiness-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 11px;
  }

  .cs2-readiness-top span {
    color: var(--cs2-muted);
    font-size: 11px;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .cs2-readiness-top strong {
    font-size: 21px;
  }

  .cs2-readiness-track {
    height: 8px;
    overflow: hidden;
    margin-top: 11px;
    background: var(--cs2-violet-light);
    border-radius: 999px;
  }

  .cs2-readiness-track > span {
    display: block;
    height: 100%;
    background:
      linear-gradient(
        90deg,
        var(--cs2-violet),
        var(--cs2-green)
      );
    border-radius: inherit;
    transition: width 250ms ease;
  }

  .cs2-readiness-card p {
    margin: 8px 0 0;
    color: var(--cs2-muted);
    font-size: 12px;
  }

  .cs2-form-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .cs2-step-card {
    position: relative;
    display: grid;
    grid-template-columns:
      43px minmax(0, 1fr);
    gap: 13px;
    min-width: 0;
    padding: 16px;
    background: var(--cs2-background);
    border: 1px solid var(--cs2-border);
    border-radius: 16px;
    transition:
      background 160ms ease,
      border-color 160ms ease,
      box-shadow 160ms ease,
      transform 160ms ease;
  }

  .cs2-step-card--wide {
    grid-column: 1 / -1;
  }

  .cs2-step-card:focus-within {
    z-index: 3;
    background: white;
    border-color: var(--cs2-lilac);
    box-shadow:
      0 0 0 4px rgba(124, 58, 237, 0.07),
      0 14px 29px rgba(27, 27, 58, 0.08);
  }

  .cs2-step-card--ready {
    background: #F0FDF9;
    border-color: #A7F3D0;
  }

  .cs2-step-marker {
    display: flex;
    width: 39px;
    height: 46px;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    color: var(--cs2-violet);
    background: white;
    border: 1px solid var(--cs2-border);
    border-radius: 12px;
    font-size: 11px;
    font-weight: 900;
  }

  .cs2-step-card--ready
    .cs2-step-marker {
    color: var(--cs2-green-dark);
    background: var(--cs2-green-light);
    border-color: #A7F3D0;
  }

  .cs2-step-marker svg {
    margin-top: 1px;
  }

  .cs2-step-content {
    min-width: 0;
  }

  .cs2-step-heading {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .cs2-step-icon {
    display: grid;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    place-items: center;
    color: var(--cs2-violet);
    background: var(--cs2-violet-light);
    border-radius: 11px;
  }

  .cs2-step-icon--green {
    color: var(--cs2-green-dark);
    background: var(--cs2-green-light);
  }

  .cs2-step-icon--amber {
    color: var(--cs2-amber-dark);
    background: var(--cs2-amber-light);
  }

  .cs2-step-icon--blue {
    color: #0369A1;
    background: var(--cs2-blue-light);
  }

  .cs2-step-icon--violet {
    color: var(--cs2-violet);
    background: var(--cs2-violet-light);
  }

  .cs2-step-heading > span:nth-child(2) {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .cs2-step-heading strong {
    font-size: 15px;
  }

  .cs2-step-heading small {
    margin-top: 2px;
    color: var(--cs2-muted);
    font-size: 12px;
    line-height: 1.4;
  }

  .cs2-duration-badge {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: 6px;
    margin-left: auto;
    padding: 7px 9px;
    color: var(--cs2-violet);
    background: var(--cs2-violet-light);
    border-radius: 999px;
    font-size: 12px;
    font-weight: 800;
  }

  .cs2-field-pair {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 14px;
  }

  .cs2-field {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .cs2-field > span {
    color: var(--cs2-text);
    font-size: 12px;
    font-weight: 800;
  }

  .cs2-field input,
  .cs2-field textarea {
    width: 100%;
    min-width: 0;
    margin-top: 7px;
    padding: 12px 13px;
    color: var(--cs2-text);
    background: white;
    border: 1px solid var(--cs2-border);
    border-radius: 11px;
    outline: none;
    font: inherit;
    font-size: 14px;
    line-height: 1.5;
    transition:
      border-color 150ms ease,
      box-shadow 150ms ease,
      background 150ms ease;
  }

  .cs2-field textarea {
    min-height: 115px;
    resize: vertical;
  }

  .cs2-field input:focus,
  .cs2-field textarea:focus {
    border-color: var(--cs2-violet);
    box-shadow:
      0 0 0 4px rgba(124, 58, 237, 0.08);
  }

  .cs2-field input:disabled {
    color: var(--cs2-violet);
    background: var(--cs2-violet-light);
    cursor: not-allowed;
  }

  .cs2-field input::placeholder,
  .cs2-field textarea::placeholder {
    color: var(--cs2-faint);
  }

  .cs2-field > small {
    align-self: flex-end;
    margin-top: 5px;
    color: var(--cs2-faint);
    font-size: 11px;
    line-height: 1.4;
  }

  .cs2-course-shortcuts,
  .cs2-schedule-shortcuts,
  .cs2-duration-shortcuts {
    margin-top: 12px;
  }

  .cs2-course-shortcuts > span,
  .cs2-schedule-shortcuts > span,
  .cs2-duration-shortcuts > span {
    display: block;
    margin-bottom: 8px;
    color: var(--cs2-muted);
    font-size: 11px;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .cs2-course-shortcuts > div,
  .cs2-schedule-shortcuts > div,
  .cs2-duration-shortcuts > div {
    display: flex;
    gap: 7px;
    flex-wrap: wrap;
  }

  .cs2-course-chip,
  .cs2-schedule-shortcuts button,
  .cs2-duration-option {
    padding: 8px 10px;
    color: var(--cs2-violet);
    background: var(--cs2-violet-light);
    border: 1px solid transparent;
    border-radius: 999px;
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
    transition:
      color 150ms ease,
      background 150ms ease,
      border-color 150ms ease,
      transform 150ms ease;
  }

  .cs2-schedule-shortcuts button {
    color: var(--cs2-muted);
    background: white;
    border-color: var(--cs2-border);
  }

  .cs2-duration-option {
    color: var(--cs2-muted);
    background: white;
    border-color: var(--cs2-border);
  }

  .cs2-course-chip:hover,
  .cs2-schedule-shortcuts button:hover,
  .cs2-duration-option:hover {
    border-color: var(--cs2-lilac);
    transform: translateY(-2px);
  }

  .cs2-course-chip--active,
  .cs2-duration-option--active {
    color: white;
    background: var(--cs2-violet);
    border-color: var(--cs2-violet);
  }

  .cs2-inline-note,
  .cs2-field-warning {
    margin: 9px 0 0;
    font-size: 12px;
    line-height: 1.5;
  }

  .cs2-inline-note {
    color: var(--cs2-muted);
  }

  .cs2-field-warning {
    color: var(--cs2-amber-dark);
  }

  .cs2-feedback {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    margin-top: 10px;
    padding: 9px 10px;
    color: var(--cs2-muted);
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid var(--cs2-border);
    border-radius: 10px;
    font-size: 12px;
    line-height: 1.45;
  }

  .cs2-feedback svg {
    flex-shrink: 0;
    margin-top: 1px;
  }

  .cs2-feedback--ready {
    color: var(--cs2-green-dark);
    background: var(--cs2-green-light);
    border-color: #A7F3D0;
  }

    /* ─────────────────────────────────────────────
     VALIDATION + CREATE ACTION
     Normal document flow — no overlap
  ───────────────────────────────────────────── */

  .cs2-validation-panel {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: flex-start;
    gap: 14px;
    width: 100%;
    margin-top: 18px;
    padding: 18px 20px;
    color: #991b1b;
    background: #fff1f2;
    border: 1px solid #fda4af;
    border-radius: 16px;
  }

  .cs2-validation-panel > svg {
    flex-shrink: 0;
    margin-top: 1px;
    color: #b91c1c;
  }

  .cs2-validation-panel > div {
    min-width: 0;
  }

  .cs2-validation-panel strong {
    display: block;
    font-size: 15px;
    line-height: 1.4;
  }

  .cs2-validation-panel ul {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin: 10px 0 0;
    padding-left: 19px;
    font-size: 13px;
    line-height: 1.5;
  }

  .cs2-validation-panel li {
    padding-left: 2px;
  }

  .cs2-launch-bar {
    /* Do not make this sticky—it was overlapping the form. */
    position: relative;
    z-index: 1;
    bottom: auto;

    display: grid;
    grid-template-columns:
      minmax(0, 1fr)
      minmax(280px, 0.72fr);
    align-items: center;
    gap: 16px;

    width: 100%;
    margin-top: 20px;
    padding: 15px;

    background: #ffffff;
    border: 1px solid var(--cs2-border);
    border-radius: 18px;
    box-shadow: 0 14px 34px rgba(27, 27, 58, 0.1);
  }

  .cs2-launch-bar--ready {
    border-color: #6ee7b7;
    box-shadow:
      0 14px 34px rgba(27, 27, 58, 0.1),
      0 0 0 4px rgba(16, 185, 129, 0.07);
  }

  .cs2-launch-status {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 12px;
  }

  .cs2-launch-status > span {
    display: grid;
    width: 46px;
    height: 46px;
    flex-shrink: 0;
    place-items: center;
    color: var(--cs2-violet);
    background: var(--cs2-violet-light);
    border-radius: 14px;
  }

  .cs2-launch-bar--ready
    .cs2-launch-status > span {
    color: white;
    background: var(--cs2-green);
  }

  .cs2-launch-status > div {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .cs2-launch-status strong {
    font-size: 15px;
    line-height: 1.35;
  }

  .cs2-launch-status small {
    margin-top: 4px;
    color: var(--cs2-muted);
    font-size: 13px;
    line-height: 1.45;
  }

  .cs2-launch-button {
    display: grid;
    grid-template-columns:
      auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;

    width: 100%;
    min-height: 64px;
    padding: 10px 14px;

    color: white;
    background:
      linear-gradient(
        135deg,
        var(--cs2-violet),
        var(--cs2-violet-dark)
      );

    border: 0;
    border-radius: 15px;
    box-shadow: 0 13px 28px rgba(91, 33, 182, 0.22);

    font: inherit;
    text-align: left;
    cursor: pointer;

    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      opacity 160ms ease;
  }

  .cs2-launch-button:hover:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 0 19px 36px rgba(91, 33, 182, 0.29);
  }

  .cs2-launch-button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }

  .cs2-launch-button-icon {
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    color: var(--cs2-violet);
    background: white;
    border-radius: 12px;
  }

  .cs2-launch-button > span:nth-child(2) {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .cs2-launch-button small {
    color: rgba(255, 255, 255, 0.68);
    font-size: 12px;
    line-height: 1.3;
  }

  .cs2-launch-button strong {
    margin-top: 2px;
    font-size: 15px;
    line-height: 1.35;
  }

  .cs2-sidebar {
    position: sticky;
    top: 95px;
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 15px;
  }

  .cs2-preview-panel {
    overflow: hidden;
    padding: 20px;
    color: white;
    background:
      radial-gradient(
        circle at 85% 14%,
        rgba(124, 58, 237, 0.37),
        transparent 27%
      ),
      linear-gradient(
        145deg,
        #17172E,
        var(--cs2-indigo-soft)
      );
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 20px 38px 20px 38px;
    box-shadow: 0 21px 50px rgba(27, 27, 58, 0.19);
  }

  .cs2-preview-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 17px;
  }

  .cs2-preview-heading h2 {
    margin: 0;
    font-size: 25px;
    letter-spacing: -0.045em;
  }

  .cs2-preview-eye {
    display: grid;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    place-items: center;
    color: var(--cs2-lilac);
    background: rgba(255, 255, 255, 0.08);
    border-radius: 12px;
  }

  .cs2-session-ticket {
    position: relative;
    padding: 18px;
    color: var(--cs2-text);
    background: white;
    border-radius: 17px;
    box-shadow: 0 19px 39px rgba(0, 0, 0, 0.29);
    transform: rotate(-0.7deg);
  }

  .cs2-ticket-cut {
    position: absolute;
    top: 48%;
    width: 19px;
    height: 19px;
    border-radius: 999px;
    background: #222246;
  }

  .cs2-ticket-cut--left {
    left: -10px;
  }

  .cs2-ticket-cut--right {
    right: -10px;
  }

  .cs2-ticket-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 9px;
  }

  .cs2-ticket-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--cs2-violet);
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .cs2-ticket-status > span {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--cs2-violet);
    box-shadow:
      0 0 0 4px rgba(124, 58, 237, 0.11);
  }

  .cs2-ticket-course {
    padding: 5px 9px;
    color: var(--cs2-violet);
    background: var(--cs2-violet-light);
    border-radius: 999px;
    font-size: 11px;
    font-weight: 850;
  }

  .cs2-ticket-person {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 17px;
  }

  .cs2-ticket-avatar {
    display: grid;
    width: 45px;
    height: 45px;
    overflow: hidden;
    flex-shrink: 0;
    place-items: center;
    color: white;
    background: var(--cs2-violet);
    border: 3px solid white;
    border-radius: 14px;
    font-size: 16px;
    font-weight: 850;
    box-shadow: 0 6px 15px rgba(27, 27, 58, 0.13);
  }

  .cs2-ticket-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .cs2-ticket-person > div:last-child {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .cs2-ticket-person small {
    color: var(--cs2-muted);
    font-size: 11px;
  }

  .cs2-ticket-person strong {
    overflow: hidden;
    margin-top: 2px;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cs2-session-ticket h3 {
    margin: 18px 0 0;
    font-size: 22px;
    letter-spacing: -0.035em;
    line-height: 1.15;
  }

  .cs2-ticket-route {
    margin-top: 17px;
    padding: 13px;
    background: var(--cs2-background);
    border: 1px solid var(--cs2-border);
    border-radius: 13px;
  }

  .cs2-ticket-route > div {
    display: flex;
    min-width: 0;
    align-items: flex-start;
    gap: 9px;
  }

  .cs2-route-icon {
    display: grid;
    width: 34px;
    height: 34px;
    flex-shrink: 0;
    place-items: center;
    border-radius: 10px;
  }

  .cs2-route-icon--violet {
    color: var(--cs2-violet);
    background: var(--cs2-violet-light);
  }

  .cs2-route-icon--green {
    color: var(--cs2-green-dark);
    background: var(--cs2-green-light);
  }

  .cs2-ticket-route > div > span:last-child {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .cs2-ticket-route small {
    color: var(--cs2-muted);
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .cs2-ticket-route strong {
    overflow: hidden;
    margin-top: 3px;
    font-size: 13px;
    line-height: 1.4;
    text-overflow: ellipsis;
  }

  .cs2-ticket-route p {
    margin: 2px 0 0;
    color: var(--cs2-muted);
    font-size: 12px;
  }

  .cs2-route-line {
    display: block;
    width: 1px;
    height: 18px;
    margin: 5px 0 5px 16px;
    background:
      repeating-linear-gradient(
        to bottom,
        var(--cs2-lilac) 0,
        var(--cs2-lilac) 3px,
        transparent 3px,
        transparent 6px
      );
  }

  .cs2-ticket-description {
    margin-top: 11px;
    padding: 12px;
    background: var(--cs2-violet-faint);
    border-radius: 11px;
  }

  .cs2-ticket-description small {
    color: var(--cs2-violet);
    font-size: 10px;
    font-weight: 850;
    text-transform: uppercase;
  }

  .cs2-ticket-description p {
    display: -webkit-box;
    overflow: hidden;
    margin: 6px 0 0;
    color: var(--cs2-muted);
    font-size: 12px;
    line-height: 1.5;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
  }

  .cs2-ticket-find {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    margin-top: 10px;
    padding: 10px;
    color: #78520B;
    background: var(--cs2-amber-light);
    border: 1px dashed #FCD34D;
    border-radius: 10px;
    font-size: 12px;
    line-height: 1.45;
  }

  .cs2-ticket-find svg {
    flex-shrink: 0;
    margin-top: 1px;
  }

  .cs2-ticket-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 9px;
    margin-top: 13px;
    padding-top: 12px;
    color: var(--cs2-muted);
    border-top: 1px dashed var(--cs2-border);
    font-size: 11px;
  }

  .cs2-ticket-footer > span:first-child {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .cs2-ticket-footer > span:last-child {
    flex-shrink: 0;
    padding: 5px 8px;
    color: var(--cs2-violet);
    background: var(--cs2-violet-light);
    border-radius: 999px;
    font-weight: 800;
  }

  .cs2-preview-caption {
    display: block;
    margin-top: 14px;
    color: rgba(255, 255, 255, 0.43);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-align: center;
    text-transform: uppercase;
  }

  .cs2-checklist {
    padding: 19px;
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid var(--cs2-border);
    border-radius: 28px 16px 28px 16px;
    box-shadow: 0 16px 38px rgba(27, 27, 58, 0.08);
  }

  .cs2-sidebar-kicker--dark {
    color: var(--cs2-violet);
  }

  .cs2-checklist-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .cs2-checklist-heading > strong {
    display: grid;
    width: 39px;
    height: 39px;
    place-items: center;
    color: var(--cs2-violet);
    background: var(--cs2-violet-light);
    border-radius: 12px;
    font-size: 13px;
  }

  .cs2-checklist-items {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 5px;
  }

  .cs2-check-item {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 10px;
    color: var(--cs2-muted);
    background: var(--cs2-background);
    border: 1px solid var(--cs2-border);
    border-radius: 11px;
  }

  .cs2-check-item > span {
    display: grid;
    width: 30px;
    height: 30px;
    flex-shrink: 0;
    place-items: center;
    color: var(--cs2-muted);
    background: white;
    border-radius: 9px;
  }

  .cs2-check-item > div {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .cs2-check-item strong {
    color: var(--cs2-text);
    font-size: 12px;
  }

  .cs2-check-item small {
    margin-top: 2px;
    font-size: 11px;
    line-height: 1.4;
  }

  .cs2-check-item--ready {
    color: var(--cs2-green-dark);
    background: var(--cs2-green-light);
    border-color: #A7F3D0;
  }

  .cs2-check-item--ready > span {
    color: white;
    background: var(--cs2-green);
  }

  .cs2-safety-card {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 16px;
    color: #1E3A5F;
    background: var(--cs2-blue-light);
    border: 1px solid #BAE6FD;
    border-radius: 14px;
  }

  .cs2-safety-card > svg {
    flex-shrink: 0;
    color: #0369A1;
  }

  .cs2-safety-card strong {
    font-size: 13px;
  }

  .cs2-safety-card p {
    margin: 4px 0 0;
    color: #315675;
    font-size: 12px;
    line-height: 1.5;
  }

  .cs2-browse-link {
    display: grid;
    grid-template-columns:
      auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 15px;
    color: var(--cs2-text);
    background: var(--cs2-cream);
    border: 1px solid #FDE68A;
    border-radius: 8px 15px 15px 15px;
    box-shadow: 0 13px 29px rgba(120, 82, 8, 0.09);
    text-decoration: none;
    transform: rotate(0.5deg);
    transition:
      transform 150ms ease,
      box-shadow 150ms ease;
  }

  .cs2-browse-link:hover {
    box-shadow: 0 18px 34px rgba(120, 82, 8, 0.14);
    transform: translateY(-3px) rotate(0deg);
  }

  .cs2-browse-link > svg:first-child {
    color: var(--cs2-amber-dark);
  }

  .cs2-browse-link > span {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .cs2-browse-link strong {
    font-size: 13px;
  }

  .cs2-browse-link small {
    margin-top: 3px;
    color: #78520B;
    font-size: 11px;
    line-height: 1.4;
  }

  .cs2-loading {
    display: flex;
    min-height: 75vh;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 19px;
    color: var(--cs2-muted);
    background: var(--cs2-background);
    font-size: 14px;
  }

  .cs2-loading-ticket {
    position: relative;
    display: grid;
    width: 88px;
    height: 88px;
    place-items: center;
    color: var(--cs2-violet);
    background: var(--cs2-violet-faint);
    border: 1px solid var(--cs2-lilac);
    border-radius: 18px;
    animation: cs2-loading-float 1.8s ease-in-out infinite;
  }

  .cs2-loading-ticket > span {
    position: absolute;
    border: 1px dashed var(--cs2-lilac);
    border-radius: 999px;
    animation: cs2-loading-wave 1.8s ease-out infinite;
  }

  .cs2-loading-ticket > span:nth-child(1) {
    inset: -12px;
  }

  .cs2-loading-ticket > span:nth-child(2) {
    inset: -27px;
    animation-delay: 0.55s;
  }

  .cs2-loading-link {
    color: var(--cs2-violet);
    font-weight: 800;
    text-decoration: none;
  }

  .cs2-root a:focus-visible,
  .cs2-root button:focus-visible,
  .cs2-root input:focus-visible,
  .cs2-root textarea:focus-visible,
  .cs2-loading a:focus-visible {
    outline: 3px solid rgba(124, 58, 237, 0.35);
    outline-offset: 3px;
  }

  @keyframes cs2-loading-float {
    0%,
    100% {
      transform: translateY(0)
        rotate(-2deg);
    }

    50% {
      transform: translateY(-7px)
        rotate(2deg);
    }
  }

  @keyframes cs2-loading-wave {
    0% {
      opacity: 0.58;
      transform: scale(0.76);
    }

    100% {
      opacity: 0;
      transform: scale(1.18);
    }
  }

  @media (max-width: 1080px) {
    .cs2-layout {
      grid-template-columns:
        minmax(0, 1fr) 320px;
    }

    .cs2-builder-intro {
      grid-template-columns:
        minmax(0, 1fr) 190px;
    }
  }

  @media (max-width: 920px) {
    .cs2-layout {
      grid-template-columns: 1fr;
    }

    .cs2-sidebar {
      position: relative;
      top: auto;
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    .cs2-preview-panel {
      grid-row: span 3;
    }
  }

  @media (max-width: 760px) {
    .cs2-root {
      padding: 10px 12px 70px;
    }

    .cs2-command-bar {
      grid-template-columns:
        auto minmax(0, 1fr);
    }

    .cs2-campus-badge {
      grid-column: 1 / -1;
      max-width: none;
      justify-content: center;
    }

    .cs2-builder {
      padding: 16px;
    }

    .cs2-builder-intro {
      grid-template-columns: 1fr;
      padding: 22px 18px;
    }

    .cs2-readiness-card {
      transform: none;
    }

    .cs2-form-grid {
      grid-template-columns: 1fr;
    }

    .cs2-step-card--wide {
      grid-column: auto;
    }

    .cs2-field-pair {
      grid-template-columns: 1fr;
    }

        .cs2-launch-bar {
      grid-template-columns: 1fr;
      gap: 12px;
      margin-top: 18px;
      padding: 12px;
    }

    .cs2-sidebar {
      display: flex;
    }
  }

  @media (max-width: 520px) {
    .cs2-command-title small {
      display: none;
    }

    .cs2-builder-copy h1 {
      font-size: 40px;
    }

    .cs2-step-card {
      grid-template-columns: 1fr;
    }

    .cs2-step-marker {
      width: 39px;
      height: 39px;
    }

    .cs2-step-heading {
      align-items: flex-start;
    }

    .cs2-duration-badge {
      margin-left: 0;
    }

    .cs2-step-heading {
      flex-wrap: wrap;
    }

        .cs2-launch-status {
      display: flex;
    }

    .cs2-launch-button {
      width: 100%;
    }

    .cs2-ticket-footer {
      align-items: flex-start;
      flex-direction: column;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .cs2-root *,
    .cs2-loading * {
      scroll-behavior: auto !important;
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
    }
  }
`;