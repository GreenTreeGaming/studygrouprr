"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock3,
  Eye,
  MapPin,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";

import AlertModal from "@/components/AlertModal";
import { useRequireOnboarding } from "@/hooks/useRequiredOnboarding";
import { containsInappropriateContent } from "@/lib/contentModeration";
import { supabase } from "@/lib/supabase";

import styles from "./create-session.module.css";

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

type FieldErrors = {
  courseCode?: string;
  title?: string;
  location?: string;
  identification?: string;
  schedule?: string;
  description?: string;
  safety?: string[];
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
      name?.trim().charAt(0).toUpperCase() || "S"
  );
}

function SafeAvatar({
                      src,
                      name,
                    }: {
  src: string | null | undefined;
  name: string | null | undefined;
}) {
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
          alt=""
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

function getDefaultSchedule(): {
  start: string;
  end: string;
} {
  const start = roundUpToQuarterHour(
      new Date(Date.now() + 30 * 60_000),
  );

  const end = new Date(
      start.getTime() + 60 * 60_000,
  );

  return {
    start: formatForDateTimeInput(start),
    end: formatForDateTimeInput(end),
  };
}

function formatDuration(
    minutes: number,
): string {
  if (minutes <= 0) {
    return "Choose a duration";
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
    return "Choose a time";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Choose a time";
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

  const createdSuccessfullyRef =
      useRef(false);

  const [title, setTitle] =
      useState("");

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

  const [
    submitAttempted,
    setSubmitAttempted,
  ] = useState(false);

  const [currentTime, setCurrentTime] =
      useState(0);

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
    const now = Date.now();
    const schedule = getDefaultSchedule();

    setCurrentTime(now);
    setStartTime(schedule.start);
    setEndTime(schedule.end);

    const timerId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(timerId);
    };
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

        const courses = Array.from(
            new Set(
                (data ?? [])
                    .map((row) =>
                        typeof row.course_code ===
                        "string"
                            ? normalizeCourseCode(
                                row.course_code,
                            )
                            : "",
                    )
                    .filter(Boolean),
            ),
        );

        setMyCourses(courses);
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

  const fieldErrors =
      useMemo<FieldErrors>(() => {
        const errors: FieldErrors = {};
        const safetyErrors: string[] = [];

        if (!normalizedCourseCode) {
          errors.courseCode =
              "Choose or enter a course code.";
        } else if (
            !COURSE_CODE_REGEX.test(
                normalizedCourseCode,
            )
        ) {
          errors.courseCode =
              "Use a code such as CS400, MATH340, or CHEM-103.";
        }

        if (!title.trim()) {
          errors.title =
              "Enter a session title.";
        } else if (
            title.trim().length < 4
        ) {
          errors.title =
              "Make the title a little more descriptive.";
        }

        if (!location.trim()) {
          errors.location =
              "Enter where the group will meet.";
        } else if (
            location.trim().length < 10
        ) {
          errors.location =
              "Include a building and specific area.";
        }

        if (!identification.trim()) {
          errors.identification =
              "Explain how classmates can recognize the group.";
        } else if (
            identification.trim().length < 10
        ) {
          errors.identification =
              "Add a clearer visual description.";
        }

        if (!description.trim()) {
          errors.description =
              "Describe what the group will study.";
        } else if (
            description.trim().length < 10
        ) {
          errors.description =
              "Add at least 10 characters of study detail.";
        }

        if (!startDate || !endDate) {
          errors.schedule =
              "Choose a start and end time.";
        } else if (
            startDate.getTime() <
            currentTime - 60_000
        ) {
          errors.schedule =
              "The start time cannot be in the past.";
        } else if (endDate <= startDate) {
          errors.schedule =
              "The session must end after it starts.";
        } else if (
            durationMinutes >
            MAX_SESSION_DURATION_MINUTES
        ) {
          errors.schedule =
              "Sessions cannot be longer than six hours.";
        }

        if (
            PHONE_REGEX.test(
                combinedPublicText,
            )
        ) {
          safetyErrors.push(
              "Phone numbers are not allowed.",
          );
        }

        if (
            SOCIAL_REGEX.test(
                combinedPublicText,
            )
        ) {
          safetyErrors.push(
              "Social media handles are not allowed.",
          );
        }

        if (
            LINK_REGEX.test(
                combinedPublicText,
            )
        ) {
          safetyErrors.push(
              "Links are not allowed.",
          );
        }

        if (
            containsInappropriateContent(
                combinedPublicText,
            )
        ) {
          safetyErrors.push(
              "Remove inappropriate language.",
          );
        }

        if (safetyErrors.length > 0) {
          errors.safety = Array.from(
              new Set(safetyErrors),
          );
        }

        return errors;
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

  const validationMessages = useMemo(
      () =>
          [
            fieldErrors.courseCode,
            fieldErrors.title,
            fieldErrors.location,
            fieldErrors.identification,
            fieldErrors.schedule,
            fieldErrors.description,
            ...(fieldErrors.safety ?? []),
          ].filter(
              (message): message is string =>
                  Boolean(message),
          ),
      [fieldErrors],
  );

  const canCreate =
      validationMessages.length === 0;

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
        formatForDateTimeInput(
            nextEnd,
        ),
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
        formatForDateTimeInput(
            nextEnd,
        ),
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

  function clearForm() {
    const schedule = getDefaultSchedule();

    setCourseCode(
        normalizeCourseCode(
            prefilledCourse,
        ),
    );

    setTitleTouched(false);
    setLocation("");
    setIdentification("");
    setDescription("");
    setStartTime(schedule.start);
    setEndTime(schedule.end);
    setSubmitAttempted(false);
  }

  async function createSession(
      event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (creating) {
      return;
    }

    setSubmitAttempted(true);

    if (!canCreate) {
      showAlert(
          "Check your session details",
          validationMessages[0] ||
          "Complete the required fields before creating the session.",
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
        router.replace("/login");
        return;
      }

      const start = new Date(startTime);
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
          "Session created",
          memberError
              ? "Your session was created, but you could not be added to the attendee list automatically."
              : "Your session is ready for classmates to discover.",
          memberError
              ? "warning"
              : "success",
      );

      window.setTimeout(() => {
        router.push(
            `/sessions/${createdSession.id}`,
        );
      }, 650);
    } catch (error) {
      console.error(
          "Unable to create session:",
          error,
      );

      showAlert(
          "Unable to create session",
          error instanceof Error
              ? error.message
              : "Your study session could not be created.",
          "error",
      );
    } finally {
      setCreating(false);
    }
  }

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
      "How classmates can recognize the group";

  const previewDescription =
      description.trim() ||
      "Explain what the group will work on together.";

  if (onboardingLoading) {
    return <CreateSessionLoading />;
  }

  if (!profile) {
    return (
        <main
            id="studygrouprr-create-session"
            className={styles.loadingPage}
        >
          <div className={styles.loadingCard}>
            <strong>
              We could not find your profile.
            </strong>

            <Link href="/login">
              Return to sign in
            </Link>
          </div>
        </main>
    );
  }

  return (
      <>
        <main
            id="studygrouprr-create-session"
            className={styles.page}
        >
          <div className={styles.shell}>
            <div className={styles.backRow}>
              <Link href="/dashboard">
                <ArrowLeft size={16} />
                Dashboard
              </Link>

              <Link href="/sessions">
                Browse sessions
                <ArrowRight size={15} />
              </Link>
            </div>

            <header className={styles.header}>
              <div className={styles.headerCopy}>
                <p>
                  {profile.university}
                </p>

                <h1>Create session</h1>

                <span>
                Schedule a campus study meetup
                classmates can discover and join.
              </span>
              </div>

              <span className={styles.headerBadge}>
              <CalendarDays size={15} />
              Scheduled meetup
            </span>
            </header>

            <div className={styles.contentGrid}>
              <form
                  className={styles.formCard}
                  onSubmit={createSession}
                  noValidate
              >
                <div className={styles.formHeader}>
                  <div>
                    <h2>Session details</h2>

                    <p>
                      Add enough detail for students
                      to understand the plan and find
                      the group.
                    </p>
                  </div>

                  {prefilledCourse && (
                      <span>
                    Course selected
                  </span>
                  )}
                </div>

                <section className={styles.section}>
                  <div
                      className={
                        styles.sectionHeading
                      }
                  >
                  <span
                      className={
                        styles.sectionIcon
                      }
                  >
                    <BookOpen size={17} />
                  </span>

                    <div>
                      <h3>Course and title</h3>
                      <p>
                        What will students see in the
                        session feed?
                      </p>
                    </div>
                  </div>

                  <div
                      className={
                        styles.twoColumnFields
                      }
                  >
                    <div className={styles.field}>
                      <label htmlFor="session-course">
                        Course code
                      </label>

                      <input
                          id="session-course"
                          value={courseCode}
                          disabled={Boolean(
                              prefilledCourse,
                          )}
                          onChange={(event) =>
                              updateCourse(
                                  event.target.value,
                              )
                          }
                          placeholder="CS400"
                          autoComplete="off"
                          aria-invalid={Boolean(
                              submitAttempted &&
                              fieldErrors.courseCode,
                          )}
                      />

                      {coursesLoading ? (
                          <span
                              className={
                                styles.fieldHint
                              }
                          >
                        Loading your courses…
                      </span>
                      ) : myCourses.length > 0 ? (
                          <div
                              className={
                                styles.courseChips
                              }
                          >
                            {myCourses.map(
                                (course) => (
                                    <button
                                        key={course}
                                        type="button"
                                        disabled={Boolean(
                                            prefilledCourse,
                                        )}
                                        className={
                                          normalizedCourseCode ===
                                          normalizeCourseCode(
                                              course,
                                          )
                                              ? styles.courseChipActive
                                              : undefined
                                        }
                                        onClick={() =>
                                            updateCourse(course)
                                        }
                                    >
                                      {course}
                                    </button>
                                ),
                            )}
                          </div>
                      ) : null}

                      {prefilledCourse && (
                          <span
                              className={
                                styles.fieldHint
                              }
                          >
                        This session was started from
                        a course page.
                      </span>
                      )}

                      {submitAttempted &&
                          fieldErrors.courseCode && (
                              <p
                                  className={
                                    styles.fieldError
                                  }
                              >
                                {
                                  fieldErrors.courseCode
                                }
                              </p>
                          )}
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="session-title">
                        Session title
                      </label>

                      <input
                          id="session-title"
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
                          aria-invalid={Boolean(
                              submitAttempted &&
                              fieldErrors.title,
                          )}
                      />

                      <div
                          className={
                            styles.fieldFooter
                          }
                      >
                      <span>
                        Keep it specific and easy to
                        scan.
                      </span>

                        <span>
                        {title.length}/
                          {MAX_TITLE_LENGTH}
                      </span>
                      </div>

                      {submitAttempted &&
                          fieldErrors.title && (
                              <p
                                  className={
                                    styles.fieldError
                                  }
                              >
                                {fieldErrors.title}
                              </p>
                          )}
                    </div>
                  </div>
                </section>

                <section className={styles.section}>
                  <div
                      className={
                        styles.sectionHeading
                      }
                  >
                  <span
                      className={
                        styles.sectionIcon
                      }
                  >
                    <MapPin size={17} />
                  </span>

                    <div>
                      <h3>Meeting place</h3>
                      <p>
                        Help classmates reach the
                        correct table or room.
                      </p>
                    </div>
                  </div>

                  <div
                      className={
                        styles.twoColumnFields
                      }
                  >
                    <div className={styles.field}>
                      <label htmlFor="session-location">
                        Exact location
                      </label>

                      <input
                          id="session-location"
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
                          aria-invalid={Boolean(
                              submitAttempted &&
                              fieldErrors.location,
                          )}
                      />

                      <div
                          className={
                            styles.fieldFooter
                          }
                      >
                      <span>
                        Building, floor, room, or
                        area.
                      </span>

                        <span>
                        {location.length}/
                          {MAX_LOCATION_LENGTH}
                      </span>
                      </div>

                      {submitAttempted &&
                          fieldErrors.location && (
                              <p
                                  className={
                                    styles.fieldError
                                  }
                              >
                                {fieldErrors.location}
                              </p>
                          )}
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="session-identification">
                        How to find the group
                      </label>

                      <input
                          id="session-identification"
                          value={identification}
                          maxLength={
                            MAX_IDENTIFICATION_LENGTH
                          }
                          onChange={(event) =>
                              setIdentification(
                                  event.target.value,
                              )
                          }
                          placeholder="Blue hoodie, black backpack, sign on the table"
                          autoComplete="off"
                          aria-invalid={Boolean(
                              submitAttempted &&
                              fieldErrors.identification,
                          )}
                      />

                      <div
                          className={
                            styles.fieldFooter
                          }
                      >
                      <span>
                        Avoid sharing contact
                        information.
                      </span>

                        <span>
                        {identification.length}/
                          {
                            MAX_IDENTIFICATION_LENGTH
                          }
                      </span>
                      </div>

                      {submitAttempted &&
                          fieldErrors.identification && (
                              <p
                                  className={
                                    styles.fieldError
                                  }
                              >
                                {
                                  fieldErrors.identification
                                }
                              </p>
                          )}
                    </div>
                  </div>
                </section>

                <section className={styles.section}>
                  <div
                      className={
                        styles.sectionHeading
                      }
                  >
                  <span
                      className={
                        styles.sectionIcon
                      }
                  >
                    <Clock3 size={17} />
                  </span>

                    <div>
                      <h3>Schedule</h3>
                      <p>
                        Choose when the meetup starts
                        and how long it lasts.
                      </p>
                    </div>
                  </div>

                  <div
                      className={
                        styles.scheduleShortcuts
                      }
                  >
                    <button
                        type="button"
                        onClick={() =>
                            applyStartOffset(30)
                        }
                    >
                      In 30 minutes
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
                      Tomorrow at 6 PM
                    </button>
                  </div>

                  <div
                      className={
                        styles.twoColumnFields
                      }
                  >
                    <div className={styles.field}>
                      <label htmlFor="session-start">
                        Starts
                      </label>

                      <input
                          id="session-start"
                          type="datetime-local"
                          value={startTime}
                          min={
                            currentTime
                                ? formatForDateTimeInput(
                                    new Date(currentTime),
                                )
                                : undefined
                          }
                          onChange={(event) =>
                              updateStartTime(
                                  event.target.value,
                              )
                          }
                          aria-invalid={Boolean(
                              submitAttempted &&
                              fieldErrors.schedule,
                          )}
                      />
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="session-end">
                        Ends
                      </label>

                      <input
                          id="session-end"
                          type="datetime-local"
                          value={endTime}
                          min={
                              startTime ||
                              (currentTime
                                  ? formatForDateTimeInput(
                                      new Date(currentTime),
                                  )
                                  : undefined)
                          }
                          onChange={(event) =>
                              setEndTime(
                                  event.target.value,
                              )
                          }
                          aria-invalid={Boolean(
                              submitAttempted &&
                              fieldErrors.schedule,
                          )}
                      />
                    </div>
                  </div>

                  <div
                      className={
                        styles.durationRow
                      }
                  >
                  <span>
                    Duration:{" "}
                    <strong>
                      {formatDuration(
                          durationMinutes,
                      )}
                    </strong>
                  </span>

                    <div>
                      {[60, 90, 120].map(
                          (minutes) => (
                              <button
                                  key={minutes}
                                  type="button"
                                  className={
                                    durationMinutes ===
                                    minutes
                                        ? styles.durationActive
                                        : undefined
                                  }
                                  onClick={() =>
                                      applyDuration(minutes)
                                  }
                              >
                                {formatDuration(
                                    minutes,
                                )}
                              </button>
                          ),
                      )}
                    </div>
                  </div>

                  {submitAttempted &&
                      fieldErrors.schedule && (
                          <p
                              className={
                                styles.scheduleError
                              }
                          >
                            {fieldErrors.schedule}
                          </p>
                      )}
                </section>

                <section className={styles.section}>
                  <div
                      className={
                        styles.sectionHeading
                      }
                  >
                  <span
                      className={
                        styles.sectionIcon
                      }
                  >
                    <Users size={17} />
                  </span>

                    <div>
                      <h3>Study plan</h3>
                      <p>
                        Tell students what they will
                        work on together.
                      </p>
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="session-description">
                      Description
                    </label>

                    <textarea
                        id="session-description"
                        value={description}
                        maxLength={
                          MAX_DESCRIPTION_LENGTH
                        }
                        rows={5}
                        onChange={(event) =>
                            setDescription(
                                event.target.value,
                            )
                        }
                        placeholder="Reviewing dynamic programming problems and preparing for the midterm"
                        aria-invalid={Boolean(
                            submitAttempted &&
                            fieldErrors.description,
                        )}
                    />

                    <div
                        className={
                          styles.fieldFooter
                        }
                    >
                    <span>
                      Mention the topic, assignment,
                      or exam.
                    </span>

                      <span>
                      {description.length}/
                        {MAX_DESCRIPTION_LENGTH}
                    </span>
                    </div>

                    {submitAttempted &&
                        fieldErrors.description && (
                            <p
                                className={
                                  styles.fieldError
                                }
                            >
                              {fieldErrors.description}
                            </p>
                        )}
                  </div>
                </section>

                {fieldErrors.safety &&
                    fieldErrors.safety.length > 0 && (
                        <div
                            className={
                              styles.safetyError
                            }
                            role="alert"
                        >
                          <ShieldCheck size={18} />

                          <div>
                            <strong>
                              Remove private or unsafe
                              content
                            </strong>

                            <ul>
                              {fieldErrors.safety.map(
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

                <div className={styles.formActions}>
                  <div>
                    <strong>
                      Your session will appear in the
                      campus feed.
                    </strong>

                    <span>
                    You will be added as the first
                    attendee automatically.
                  </span>
                  </div>

                  <div
                      className={
                        styles.actionButtons
                      }
                  >
                    {hasMeaningfulDraft && (
                        <button
                            type="button"
                            className={
                              styles.clearButton
                            }
                            disabled={creating}
                            onClick={clearForm}
                        >
                          Clear
                        </button>
                    )}

                    <button
                        type="submit"
                        className={
                          styles.submitButton
                        }
                        disabled={creating}
                    >
                      <CalendarDays size={17} />

                      {creating
                          ? "Creating…"
                          : "Create session"}
                    </button>
                  </div>
                </div>
              </form>

              <aside className={styles.sidebar}>
                <section
                    className={styles.previewCard}
                >
                  <div
                      className={
                        styles.previewHeader
                      }
                  >
                    <div>
                      <p>Preview</p>
                      <h2>
                        What classmates see
                      </h2>
                    </div>

                    <Eye size={18} />
                  </div>

                  <article
                      className={
                        styles.sessionPreview
                      }
                  >
                    <div
                        className={
                          styles.previewTop
                        }
                    >
                    <span
                        className={
                          styles.previewCourse
                        }
                    >
                      {previewCourse}
                    </span>

                      <span>
                      {formatDuration(
                          durationMinutes,
                      )}
                    </span>
                    </div>

                    <h3>{previewTitle}</h3>

                    <div
                        className={
                          styles.previewMeta
                        }
                    >
                    <span>
                      <CalendarDays size={14} />
                      {formatSessionDate(
                          startTime,
                      )}
                    </span>

                      <span>
                      <Clock3 size={14} />
                        {formatSessionTime(
                            startTime,
                        )}{" "}
                        –{" "}
                        {formatSessionTime(
                            endTime,
                        )}
                    </span>

                      <span>
                      <MapPin size={14} />
                        {previewLocation}
                    </span>
                    </div>

                    <p
                        className={
                          styles.previewDescription
                        }
                    >
                      {previewDescription}
                    </p>

                    <div
                        className={
                          styles.previewIdentification
                        }
                    >
                      <User size={14} />
                      <span>
                      {previewIdentification}
                    </span>
                    </div>

                    <div
                        className={
                          styles.previewHost
                        }
                    >
                      <div
                          className={styles.avatar}
                      >
                        <SafeAvatar
                            src={profile.avatar_url}
                            name={profile.name}
                        />
                      </div>

                      <div>
                        <small>Hosted by</small>

                        <strong>
                          {profile.name ||
                              "Campus student"}
                        </strong>
                      </div>
                    </div>
                  </article>
                </section>

                <section
                    className={styles.rulesCard}
                >
                  <div>
                    <ShieldCheck size={18} />

                    <span>
                    <strong>
                      Public campus details
                    </strong>

                    <small>
                      Phone numbers, social handles,
                      links, and inappropriate
                      language are blocked.
                    </small>
                  </span>
                  </div>

                  <div>
                    <Clock3 size={18} />

                    <span>
                    <strong>
                      Keep the schedule accurate
                    </strong>

                    <small>
                      Sessions can last up to six
                      hours. Edit or cancel the
                      session if plans change.
                    </small>
                  </span>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </main>

        <AlertModal
            open={alertOpen}
            title={alertConfig.title}
            message={alertConfig.message}
            type={alertConfig.type}
            onClose={() => setAlertOpen(false)}
        />
      </>
  );
}

function CreateSessionLoading() {
  return (
      <main
          id="studygrouprr-create-session"
          className={styles.loadingPage}
          role="status"
          aria-live="polite"
      >
        <div className={styles.loadingCard}>
          <strong>
            Preparing the session form…
          </strong>

          <div
              className={styles.loadingRows}
              aria-hidden="true"
          >
            <span />
            <span />
            <span />
          </div>
        </div>
      </main>
  );
}
