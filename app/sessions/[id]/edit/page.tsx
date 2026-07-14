"use client";

import Link from "next/link";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { gsap } from "gsap";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  FileText,
  GraduationCap,
  MapPin,
  Radio,
  RotateCcw,
  Save,
  SearchX,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  X,
  Zap,
} from "lucide-react";

import AlertModal from "@/components/AlertModal";
import { useRequireOnboarding } from "@/hooks/useRequiredOnboarding";
import { containsInappropriateContent } from "@/lib/contentModeration";
import {
  isValidCourseCode,
  normalizeCourseCode,
} from "@/lib/courseValidation";
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

type SessionForm = {
  title: string;
  courseCode: string;
  location: string;
  identification: string;
  description: string;
  startTime: string;
  endTime: string;
};

type SessionRecord = {
  id: string;
  title: string;
  course_code: string;
  location_name: string;
  identification: string | null;
  description: string | null;
  start_time: string;
  end_time: string;
  creator_id: string;
};

type SafeAvatarProps = {
  src: string | null | undefined;
  name: string | null | undefined;
};

const EMPTY_FORM: SessionForm = {
  title: "",
  courseCode: "",
  location: "",
  identification: "",
  description: "",
  startTime: "",
  endTime: "",
};

const MAX_TITLE_LENGTH = 120;
const MAX_LOCATION_LENGTH = 180;
const MAX_IDENTIFICATION_LENGTH = 180;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_DURATION_MINUTES = 6 * 60;

const PHONE_REGEX =
    /(\+?1)?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;

const SOCIAL_REGEX =
    /(instagram|snapchat|discord|telegram|tiktok|@)/i;

const LINK_REGEX =
    /(https?:\/\/|www\.)/i;

function formatForDateTimeInput(
    dateString: string,
): string {
  const date = new Date(dateString);

  return new Date(
      date.getTime() -
      date.getTimezoneOffset() * 60_000,
  )
      .toISOString()
      .slice(0, 16);
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

function formatDuration(
    durationMinutes: number,
): string {
  if (durationMinutes <= 0) {
    return "No duration";
  }

  const hours = Math.floor(
      durationMinutes / 60,
  );

  const minutes =
      durationMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function normalizeForComparison(
    form: SessionForm,
): SessionForm {
  return {
    title: form.title.trim(),
    courseCode: normalizeCourseCode(
        form.courseCode,
    ),
    location: form.location.trim(),
    identification:
        form.identification.trim(),
    description:
        form.description.trim(),
    startTime: form.startTime,
    endTime: form.endTime,
  };
}

export default function EditSessionPage() {
  const router = useRouter();
  const params = useParams();

  const {
    profile,
    loading: onboardingLoading,
  } = useRequireOnboarding();

  const rootRef =
      useRef<HTMLElement>(null);

  const id = Array.isArray(
      params.id,
  )
      ? params.id[0]
      : String(params.id || "");

  const [form, setForm] =
      useState<SessionForm>(
          EMPTY_FORM,
      );

  const [originalForm, setOriginalForm] =
      useState<SessionForm>(
          EMPTY_FORM,
      );

  const [pageLoading, setPageLoading] =
      useState(true);

  const [loadError, setLoadError] =
      useState<string | null>(null);

  const [notFound, setNotFound] =
      useState(false);

  const [saving, setSaving] =
      useState(false);

  const [deleting, setDeleting] =
      useState(false);

  const [deleteOpen, setDeleteOpen] =
      useState(false);

  const [discardOpen, setDiscardOpen] =
      useState(false);

  const [
    pendingNavigation,
    setPendingNavigation,
  ] = useState<string | null>(
      null,
  );

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
      title: string,
      message: string,
      type: AlertType = "info",
  ) {
    setAlertConfig({
      title,
      message,
      type,
    });

    setAlertOpen(true);
  }

  function updateField<
      Field extends keyof SessionForm,
  >(
      field: Field,
      value: SessionForm[Field],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  useEffect(() => {
    const intervalId =
        window.setInterval(() => {
          setCurrentTime(Date.now());
        }, 60_000);

    return () => {
      window.clearInterval(
          intervalId,
      );
    };
  }, []);

  const loadSession =
      useCallback(async () => {
        if (!id) {
          setNotFound(true);
          setPageLoading(false);
          return;
        }

        setPageLoading(true);
        setLoadError(null);
        setNotFound(false);

        try {
          const {
            data: { user },
            error: userError,
          } =
              await supabase.auth.getUser();

          if (userError) {
            throw userError;
          }

          if (!user) {
            router.replace("/");
            return;
          }

          const {
            data,
            error,
          } = await supabase
              .from("study_sessions")
              .select("*")
              .eq("id", id)
              .maybeSingle();

          if (error) {
            throw error;
          }

          if (!data) {
            setNotFound(true);
            return;
          }

          const session =
              data as SessionRecord;

          if (
              session.creator_id !==
              user.id
          ) {
            router.replace(
                `/sessions/${id}`,
            );
            return;
          }

          if (
              new Date(
                  session.end_time,
              ).getTime() <
              Date.now()
          ) {
            router.replace(
                `/sessions/${id}`,
            );
            return;
          }

          const loadedForm: SessionForm = {
            title: session.title || "",
            courseCode:
                normalizeCourseCode(
                    session.course_code,
                ),
            location:
                session.location_name ||
                "",
            identification:
                session.identification ||
                "",
            description:
                session.description || "",
            startTime:
                formatForDateTimeInput(
                    session.start_time,
                ),
            endTime:
                formatForDateTimeInput(
                    session.end_time,
                ),
          };

          setForm(loadedForm);
          setOriginalForm(loadedForm);
        } catch (error) {
          console.error(
              "Unable to load session:",
              error,
          );

          setLoadError(
              error instanceof Error
                  ? error.message
                  : "This session could not be loaded.",
          );
        } finally {
          setPageLoading(false);
        }
      }, [id, router]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const normalizedForm =
      useMemo(
          () =>
              normalizeForComparison(
                  form,
              ),
          [form],
      );

  const normalizedOriginal =
      useMemo(
          () =>
              normalizeForComparison(
                  originalForm,
              ),
          [originalForm],
      );

  const hasChanges =
      useMemo(
          () =>
              JSON.stringify(
                  normalizedForm,
              ) !==
              JSON.stringify(
                  normalizedOriginal,
              ),
          [
            normalizedForm,
            normalizedOriginal,
          ],
      );

  useEffect(() => {
    function protectDraft(
        event: BeforeUnloadEvent,
    ) {
      if (
          !hasChanges ||
          saving ||
          deleting
      ) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener(
        "beforeunload",
        protectDraft,
    );

    return () => {
      window.removeEventListener(
          "beforeunload",
          protectDraft,
      );
    };
  }, [
    deleting,
    hasChanges,
    saving,
  ]);

  const startDate =
      useMemo(() => {
        if (!form.startTime) {
          return null;
        }

        const date = new Date(
            form.startTime,
        );

        return Number.isNaN(
            date.getTime(),
        )
            ? null
            : date;
      }, [form.startTime]);

  const endDate =
      useMemo(() => {
        if (!form.endTime) {
          return null;
        }

        const date = new Date(
            form.endTime,
        );

        return Number.isNaN(
            date.getTime(),
        )
            ? null
            : date;
      }, [form.endTime]);

  const originalStartDate =
      useMemo(() => {
        if (
            !originalForm.startTime
        ) {
          return null;
        }

        const date = new Date(
            originalForm.startTime,
        );

        return Number.isNaN(
            date.getTime(),
        )
            ? null
            : date;
      }, [
        originalForm.startTime,
      ]);

  const durationMinutes =
      useMemo(() => {
        if (
            !startDate ||
            !endDate
        ) {
          return 0;
        }

        return Math.round(
            (endDate.getTime() -
                startDate.getTime()) /
            60_000,
        );
      }, [endDate, startDate]);

  const originalStartWasPast =
      Boolean(
          originalStartDate &&
          originalStartDate.getTime() <
          currentTime - 60_000,
      );

  const startMatchesOriginal =
      form.startTime ===
      originalForm.startTime;

  const startTimeAllowed =
      Boolean(
          startDate &&
          (startDate.getTime() >=
              currentTime - 60_000 ||
              (originalStartWasPast &&
                  startMatchesOriginal)),
      );

  const titleReady =
      form.title.trim().length >= 4;

  const courseReady =
      Boolean(
          normalizedForm.courseCode,
      ) &&
      isValidCourseCode(
          normalizedForm.courseCode,
      );

  const identityReady =
      titleReady && courseReady;

  const locationReady =
      form.location.trim().length >=
      10;

  const identificationReady =
      form.identification
          .trim().length >= 10;

  const descriptionReady =
      form.description
          .trim().length >= 10;

  const scheduleReady =
      Boolean(startDate) &&
      Boolean(endDate) &&
      startTimeAllowed &&
      Boolean(
          endDate &&
          endDate.getTime() >
          currentTime,
      ) &&
      durationMinutes > 0 &&
      durationMinutes <=
      MAX_DURATION_MINUTES;

  const publicText =
      useMemo(
          () =>
              [
                form.title,
                form.location,
                form.identification,
                form.description,
              ].join(" "),
          [
            form.description,
            form.identification,
            form.location,
            form.title,
          ],
      );

  const validationErrors =
      useMemo(() => {
        const errors: string[] =
            [];

        const title =
            form.title.trim();

        const location =
            form.location.trim();

        const identification =
            form.identification.trim();

        const description =
            form.description.trim();

        if (!title) {
          errors.push(
              "Add a session title.",
          );
        } else if (
            title.length < 4
        ) {
          errors.push(
              "Make the session title a little more descriptive.",
          );
        } else if (
            title.length >
            MAX_TITLE_LENGTH
        ) {
          errors.push(
              `Keep the title under ${MAX_TITLE_LENGTH} characters.`,
          );
        }

        if (
            !normalizedForm.courseCode
        ) {
          errors.push(
              "Add a course code.",
          );
        } else if (
            !isValidCourseCode(
                normalizedForm.courseCode,
            )
        ) {
          errors.push(
              "Enter a valid course code such as CS400, MATH340, or BIO101.",
          );
        }

        if (!location) {
          errors.push(
              "Add a campus location.",
          );
        } else if (
            location.length < 10
        ) {
          errors.push(
              "Make the location more specific by including a building, floor, room, or table.",
          );
        } else if (
            location.length >
            MAX_LOCATION_LENGTH
        ) {
          errors.push(
              `Keep the location under ${MAX_LOCATION_LENGTH} characters.`,
          );
        }

        if (!identification) {
          errors.push(
              "Describe how students can recognize you.",
          );
        } else if (
            identification.length < 10
        ) {
          errors.push(
              "Add a clearer description of how classmates can recognize you.",
          );
        } else if (
            identification.length >
            MAX_IDENTIFICATION_LENGTH
        ) {
          errors.push(
              `Keep the identification note under ${MAX_IDENTIFICATION_LENGTH} characters.`,
          );
        }

        if (!description) {
          errors.push(
              "Add a study plan.",
          );
        } else if (
            description.length < 10
        ) {
          errors.push(
              "Describe what the group will study in at least 10 characters.",
          );
        } else if (
            description.length >
            MAX_DESCRIPTION_LENGTH
        ) {
          errors.push(
              `Keep the description under ${MAX_DESCRIPTION_LENGTH} characters.`,
          );
        }

        if (!startDate) {
          errors.push(
              "Choose a valid start time.",
          );
        } else if (
            !startTimeAllowed
        ) {
          errors.push(
              "The session start time cannot be moved into the past.",
          );
        }

        if (!endDate) {
          errors.push(
              "Choose a valid end time.",
          );
        } else if (
            endDate.getTime() <=
            currentTime
        ) {
          errors.push(
              "The session end time must still be in the future.",
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
            MAX_DURATION_MINUTES
        ) {
          errors.push(
              "Study sessions cannot be longer than six hours.",
          );
        }

        if (
            PHONE_REGEX.test(
                publicText,
            )
        ) {
          errors.push(
              "Phone numbers are not allowed in public session details.",
          );
        }

        if (
            SOCIAL_REGEX.test(
                publicText,
            )
        ) {
          errors.push(
              "Social media handles are not allowed in public session details.",
          );
        }

        if (
            LINK_REGEX.test(
                publicText,
            )
        ) {
          errors.push(
              "Links are not allowed in public session details.",
          );
        }

        if (
            containsInappropriateContent(
                publicText,
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
        currentTime,
        durationMinutes,
        endDate,
        form.description,
        form.identification,
        form.location,
        form.title,
        normalizedForm.courseCode,
        publicText,
        startDate,
        startTimeAllowed,
      ]);

  const readinessSteps = [
    identityReady,
    locationReady,
    identificationReady,
    scheduleReady,
    descriptionReady,
  ];

  const completedSteps =
      readinessSteps.filter(
          Boolean,
      ).length;

  const readinessPercentage =
      Math.round(
          (completedSteps /
              readinessSteps.length) *
          100,
      );

  const canSave =
      hasChanges &&
      readinessSteps.every(Boolean) &&
      validationErrors.length === 0;

  const changedFields =
      useMemo(() => {
        const changes: string[] =
            [];

        if (
            normalizedForm.title !==
            normalizedOriginal.title
        ) {
          changes.push("Title");
        }

        if (
            normalizedForm.courseCode !==
            normalizedOriginal.courseCode
        ) {
          changes.push("Course");
        }

        if (
            normalizedForm.location !==
            normalizedOriginal.location
        ) {
          changes.push("Location");
        }

        if (
            normalizedForm.identification !==
            normalizedOriginal.identification
        ) {
          changes.push(
              "Identification",
          );
        }

        if (
            normalizedForm.startTime !==
            normalizedOriginal.startTime ||
            normalizedForm.endTime !==
            normalizedOriginal.endTime
        ) {
          changes.push("Schedule");
        }

        if (
            normalizedForm.description !==
            normalizedOriginal.description
        ) {
          changes.push(
              "Study plan",
          );
        }

        return changes;
      }, [
        normalizedForm,
        normalizedOriginal,
      ]);

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

    updateField(
        "endTime",
        new Date(
            nextEnd.getTime() -
            nextEnd.getTimezoneOffset() *
            60_000,
        )
            .toISOString()
            .slice(0, 16),
    );
  }

  function resetChanges() {
    setForm(originalForm);
  }

  function requestNavigation(
      destination: string,
  ) {
    if (
        !hasChanges ||
        saving ||
        deleting
    ) {
      router.push(destination);
      return;
    }

    setPendingNavigation(
        destination,
    );

    setDiscardOpen(true);
  }

  function discardAndNavigate() {
    const destination =
        pendingNavigation;

    setDiscardOpen(false);
    setPendingNavigation(null);

    if (destination) {
      router.push(destination);
    }
  }

  async function saveSession() {
    if (
        saving ||
        !canSave
    ) {
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } =
          await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
            "Your session expired. Please sign in again.",
        );
      }

      const {
        data: updatedSession,
        error,
      } = await supabase
          .from("study_sessions")
          .update({
            title:
            normalizedForm.title,
            course_code:
            normalizedForm.courseCode,
            location_name:
            normalizedForm.location,
            identification:
            normalizedForm.identification,
            description:
            normalizedForm.description,
            start_time:
                new Date(
                    normalizedForm.startTime,
                ).toISOString(),
            end_time:
                new Date(
                    normalizedForm.endTime,
                ).toISOString(),
          })
          .eq("id", id)
          .eq(
              "creator_id",
              user.id,
          )
          .select("id")
          .maybeSingle();

      if (error) {
        throw error;
      }

      if (!updatedSession) {
        throw new Error(
            "The session could not be updated. You may no longer have permission to edit it.",
        );
      }

      setOriginalForm(
          normalizedForm,
      );

      setForm(normalizedForm);

      showAlert(
          "Session Updated",
          "Your changes are saved and visible to attendees.",
          "success",
      );

      window.setTimeout(() => {
        router.push(
            `/sessions/${id}`,
        );
      }, 700);
    } catch (error) {
      showAlert(
          "Unable to Save Session",
          error instanceof Error
              ? error.message
              : "Your changes could not be saved.",
          "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteSession() {
    if (deleting) {
      return;
    }

    setDeleting(true);

    try {
      const {
        data: { user },
        error: userError,
      } =
          await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
            "Your session expired. Please sign in again.",
        );
      }

      const {
        data: deletedSession,
        error,
      } = await supabase
          .from("study_sessions")
          .delete()
          .eq("id", id)
          .eq(
              "creator_id",
              user.id,
          )
          .select("id")
          .maybeSingle();

      if (error) {
        throw error;
      }

      if (!deletedSession) {
        throw new Error(
            "The session could not be deleted. You may no longer have permission to manage it.",
        );
      }

      setDeleteOpen(false);

      router.push(
          "/dashboard",
      );
    } catch (error) {
      showAlert(
          "Unable to Delete Session",
          error instanceof Error
              ? error.message
              : "This session could not be deleted.",
          "error",
      );
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    if (
        pageLoading ||
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

    const context =
        gsap.context(() => {
          gsap.from(
              ".ee-reveal",
              {
                opacity: 0,
                y: 25,
                duration: 0.68,
                stagger: 0.075,
                ease: "power3.out",
              },
          );

          gsap.from(
              ".ee-field-card",
              {
                opacity: 0,
                y: 18,
                rotate: -0.4,
                duration: 0.55,
                stagger: 0.065,
                delay: 0.15,
                ease: "power3.out",
              },
          );

          gsap.from(
              ".ee-signal-ring",
              {
                opacity: 0,
                scale: 0.72,
                duration: 0.68,
                stagger: 0.1,
                delay: 0.2,
                ease: "back.out(1.45)",
              },
          );
        }, rootRef);

    return () => {
      context.revert();
    };
  }, [
    onboardingLoading,
    pageLoading,
    profile,
  ]);

  useEffect(() => {
    if (
        !deleteOpen &&
        !discardOpen
    ) {
      return;
    }

    function closeOnEscape(
        event: KeyboardEvent,
    ) {
      if (
          event.key !== "Escape" ||
          deleting
      ) {
        return;
      }

      setDeleteOpen(false);
      setDiscardOpen(false);
      setPendingNavigation(
          null,
      );
    }

    window.addEventListener(
        "keydown",
        closeOnEscape,
    );

    return () => {
      window.removeEventListener(
          "keydown",
          closeOnEscape,
      );
    };
  }, [
    deleteOpen,
    deleting,
    discardOpen,
  ]);

  if (
      pageLoading ||
      onboardingLoading
  ) {
    return (
        <>
          <style>
            {editSessionStyles}
          </style>

          <main className="ee-loading">
            <div
                className="ee-loading-signal"
                aria-hidden="true"
            >
              <span />
              <span />
              <Edit3 size={28} />
            </div>

            <p>
              Opening the session controls…
            </p>
          </main>
        </>
    );
  }

  if (
      notFound ||
      !profile
  ) {
    return (
        <>
          <style>
            {editSessionStyles}
          </style>

          <main className="ee-loading">
            <div className="ee-not-found">
              <div className="ee-not-found-icon">
                <SearchX size={38} />
              </div>

              <span className="ee-kicker">
              Session unavailable
            </span>

              <h1>
                These controls disappeared.
              </h1>

              <p>
                The session may have been
                removed, completed, or you may
                not have access to edit it.
              </p>

              <Link href="/sessions">
                Browse sessions
                <ArrowRight size={17} />
              </Link>
            </div>
          </main>
        </>
    );
  }

  return (
      <>
        <style>
          {editSessionStyles}
        </style>

        <main
            ref={rootRef}
            className="ee-root"
        >
          <div
              className="ee-background-grid"
              aria-hidden="true"
          />

          <div className="ee-glow ee-glow--one" />
          <div className="ee-glow ee-glow--two" />

          <div className="ee-canvas">
            <header className="ee-command-bar ee-reveal">
              <button
                  type="button"
                  className="ee-back-button"
                  onClick={() =>
                      requestNavigation(
                          `/sessions/${id}`,
                      )
                  }
              >
                <ArrowLeft size={17} />
                Back to session
              </button>

              <div className="ee-command-title">
              <span className="ee-command-icon">
                <Edit3 size={18} />
              </span>

                <span>
                <strong>
                  Session Control Room
                </strong>

                <small>
                  Update the meetup signal
                </small>
              </span>
              </div>

              <span
                  className={
                    hasChanges
                        ? "ee-unsaved-badge ee-unsaved-badge--active"
                        : "ee-unsaved-badge"
                  }
              >
              <span />

                {hasChanges
                    ? "Unsaved changes"
                    : "Everything saved"}
            </span>
            </header>

            {loadError && (
                <div
                    className="ee-error-banner"
                    role="alert"
                >
                  <div>
                    <strong>
                      Connection interrupted
                    </strong>

                    <span>
                  {loadError}
                </span>
                  </div>

                  <button
                      type="button"
                      onClick={() =>
                          void loadSession()
                      }
                  >
                    Try again
                  </button>
                </div>
            )}

            <section className="ee-hero ee-reveal">
              <div
                  className="ee-hero-grid"
                  aria-hidden="true"
              />

              <span className="ee-hero-orbit ee-hero-orbit--one" />
              <span className="ee-hero-orbit ee-hero-orbit--two" />

              <div className="ee-hero-copy">
              <span className="ee-kicker ee-kicker--light">
                <Sparkles size={15} />
                Edit your study meetup
              </span>

                <h1>
                  Retune the session
                  <span>without losing the signal.</span>
                </h1>

                <p>
                  Update the plan, meeting spot,
                  or timing. Everyone attending
                  will see the latest version on
                  the session page.
                </p>

                <div className="ee-hero-tags">
                <span>
                  <GraduationCap size={15} />
                  {profile.university ||
                      "Your university"}
                </span>

                  <span>
                  <BookOpen size={15} />
                    {normalizedForm.courseCode ||
                        "Course"}
                </span>

                  <span>
                  <Clock size={15} />
                    {formatDuration(
                        durationMinutes,
                    )}
                </span>
                </div>
              </div>

              <div className="ee-save-console">
                <div
                    className="ee-readiness-dial"
                    style={
                      {
                        "--ee-readiness-angle": `${readinessPercentage * 3.6}deg`,
                      } as CSSProperties
                    }
                >
                <span>
                  <strong>
                    {readinessPercentage}%
                  </strong>

                  <small>
                    ready
                  </small>
                </span>
                </div>

                <div className="ee-save-console-copy">
                  <small>
                    Change status
                  </small>

                  <strong>
                    {hasChanges
                        ? `${changedFields.length} area${
                            changedFields.length ===
                            1
                                ? ""
                                : "s"
                        } modified`
                        : "No edits yet"}
                  </strong>

                  <p>
                    {canSave
                        ? "Everything looks good. Publish the update when ready."
                        : hasChanges
                            ? "Resolve the remaining issues before publishing."
                            : "Make a change to activate the save control."}
                  </p>
                </div>

                <button
                    type="button"
                    className="ee-save-button"
                    disabled={
                        saving ||
                        !canSave
                    }
                    onClick={() =>
                        void saveSession()
                    }
                >
                <span>
                  <Save size={20} />
                </span>

                  <span>
                  <small>
                    Publish updates
                  </small>

                  <strong>
                    {saving
                        ? "Saving changes…"
                        : "Save changes"}
                  </strong>
                </span>

                  <ArrowRight size={19} />
                </button>
              </div>
            </section>

            <div className="ee-layout">
              <section className="ee-editor ee-reveal">
                <div className="ee-editor-heading">
                  <div>
                  <span className="ee-kicker">
                    <Radio size={15} />
                    Session controls
                  </span>

                    <h2>
                      Adjust what attendees see.
                    </h2>

                    <p>
                      Keep every detail clear,
                      specific, and useful for
                      students heading to the
                      meetup.
                    </p>
                  </div>

                  {hasChanges && (
                      <button
                          type="button"
                          className="ee-reset-button"
                          onClick={
                            resetChanges
                          }
                      >
                        <RotateCcw
                            size={16}
                        />
                        Reset edits
                      </button>
                  )}
                </div>

                <div className="ee-form-grid">
                  <article
                      className={`ee-field-card ee-field-card--wide ${
                          identityReady
                              ? "ee-field-card--ready"
                              : ""
                      }`}
                  >
                    <div className="ee-field-number">
                      <span>01</span>

                      {identityReady && (
                          <Check size={16} />
                      )}
                    </div>

                    <div className="ee-field-content">
                      <div className="ee-field-heading">
                      <span className="ee-field-icon">
                        <BookOpen
                            size={20}
                        />
                      </span>

                        <span>
                        <strong>
                          Session identity
                        </strong>

                        <small>
                          The name and course
                          students recognize first
                        </small>
                      </span>
                      </div>

                      <div className="ee-input-pair">
                        <label className="ee-field">
                        <span>
                          Session title
                        </span>

                          <input
                              value={
                                form.title
                              }
                              maxLength={
                                MAX_TITLE_LENGTH
                              }
                              onChange={(
                                  event,
                              ) =>
                                  updateField(
                                      "title",
                                      event.target
                                          .value,
                                  )
                              }
                              placeholder="CS400 Midterm Review"
                              autoComplete="off"
                          />

                          <small>
                            {
                              form.title
                                  .length
                            }
                            /
                            {
                              MAX_TITLE_LENGTH
                            }
                          </small>
                        </label>

                        <label className="ee-field">
                        <span>
                          Course code
                        </span>

                          <input
                              value={
                                form.courseCode
                              }
                              maxLength={10}
                              onChange={(
                                  event,
                              ) =>
                                  updateField(
                                      "courseCode",
                                      normalizeCourseCode(
                                          event.target
                                              .value,
                                      ),
                                  )
                              }
                              placeholder="CS400"
                              autoComplete="off"
                          />

                          <small>
                            Example: CS400 or
                            CHEM-103
                          </small>
                        </label>
                      </div>

                      {form.courseCode &&
                          !courseReady && (
                              <p className="ee-inline-warning">
                                Use a valid course code
                                such as CS400, MATH340,
                                or BIO101.
                              </p>
                          )}
                    </div>
                  </article>

                  <article
                      className={`ee-field-card ${
                          locationReady
                              ? "ee-field-card--ready"
                              : ""
                      }`}
                  >
                    <div className="ee-field-number ee-field-number--green">
                      <span>02</span>

                      {locationReady && (
                          <Check size={16} />
                      )}
                    </div>

                    <div className="ee-field-content">
                      <div className="ee-field-heading">
                      <span className="ee-field-icon ee-field-icon--green">
                        <MapPin size={20} />
                      </span>

                        <span>
                        <strong>
                          Meeting spot
                        </strong>

                        <small>
                          Pin the exact campus
                          location
                        </small>
                      </span>
                      </div>

                      <label className="ee-field">
                      <span>
                        Campus location
                      </span>

                        <input
                            value={
                              form.location
                            }
                            maxLength={
                              MAX_LOCATION_LENGTH
                            }
                            onChange={(
                                event,
                            ) =>
                                updateField(
                                    "location",
                                    event.target
                                        .value,
                                )
                            }
                            placeholder="Memorial Library, 2nd floor, window tables"
                            autoComplete="off"
                        />

                        <small>
                          {
                            form.location
                                .length
                          }
                          /
                          {
                            MAX_LOCATION_LENGTH
                          }
                        </small>
                      </label>

                      <div
                          className={
                            locationReady
                                ? "ee-field-feedback ee-field-feedback--ready"
                                : "ee-field-feedback"
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
                            ? "That location should be easy to find."
                            : "Include a building, floor, room, table, or area."}
                      </span>
                      </div>
                    </div>
                  </article>

                  <article
                      className={`ee-field-card ${
                          identificationReady
                              ? "ee-field-card--ready"
                              : ""
                      }`}
                  >
                    <div className="ee-field-number ee-field-number--amber">
                      <span>03</span>

                      {identificationReady && (
                          <Check size={16} />
                      )}
                    </div>

                    <div className="ee-field-content">
                      <div className="ee-field-heading">
                      <span className="ee-field-icon ee-field-icon--amber">
                        <User size={20} />
                      </span>

                        <span>
                        <strong>
                          Find the host
                        </strong>

                        <small>
                          Give attendees a visual
                          clue
                        </small>
                      </span>
                      </div>

                      <label className="ee-field">
                      <span>
                        How can students find you?
                      </span>

                        <input
                            value={
                              form.identification
                            }
                            maxLength={
                              MAX_IDENTIFICATION_LENGTH
                            }
                            onChange={(
                                event,
                            ) =>
                                updateField(
                                    "identification",
                                    event.target
                                        .value,
                                )
                            }
                            placeholder="Blue hoodie, black backpack, sitting by the windows"
                            autoComplete="off"
                        />

                        <small>
                          {
                            form
                                .identification
                                .length
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
                                ? "ee-field-feedback ee-field-feedback--ready"
                                : "ee-field-feedback"
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
                            ? "Students should be able to recognize the table."
                            : "Mention clothing, a backpack, laptop, or seat location."}
                      </span>
                      </div>
                    </div>
                  </article>

                  <article
                      className={`ee-field-card ee-field-card--wide ${
                          scheduleReady
                              ? "ee-field-card--ready"
                              : ""
                      }`}
                  >
                    <div className="ee-field-number ee-field-number--blue">
                      <span>04</span>

                      {scheduleReady && (
                          <Check size={16} />
                      )}
                    </div>

                    <div className="ee-field-content">
                      <div className="ee-field-heading">
                      <span className="ee-field-icon ee-field-icon--blue">
                        <CalendarDays
                            size={20}
                        />
                      </span>

                        <span>
                        <strong>
                          Meetup window
                        </strong>

                        <small>
                          Adjust the start, end,
                          or duration
                        </small>
                      </span>

                        <span className="ee-duration-badge">
                        <Clock size={15} />
                          {formatDuration(
                              durationMinutes,
                          )}
                      </span>
                      </div>

                      <div className="ee-input-pair">
                        <label className="ee-field">
                        <span>
                          Start time
                        </span>

                          <input
                              type="datetime-local"
                              value={
                                form.startTime
                              }
                              onChange={(
                                  event,
                              ) =>
                                  updateField(
                                      "startTime",
                                      event.target
                                          .value,
                                  )
                              }
                          />
                        </label>

                        <label className="ee-field">
                        <span>
                          End time
                        </span>

                          <input
                              type="datetime-local"
                              value={
                                form.endTime
                              }
                              onChange={(
                                  event,
                              ) =>
                                  updateField(
                                      "endTime",
                                      event.target
                                          .value,
                                  )
                              }
                          />
                        </label>
                      </div>

                      <div className="ee-duration-options">
                      <span>
                        Quick duration
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
                                      key={
                                        minutes
                                      }
                                      type="button"
                                      className={
                                        durationMinutes ===
                                        minutes
                                            ? "ee-duration-option ee-duration-option--active"
                                            : "ee-duration-option"
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

                      {originalStartWasPast &&
                          startMatchesOriginal && (
                              <div className="ee-live-edit-note">
                                <Radio size={16} />

                                <span>
                            This session has
                            already started. You
                            can keep the original
                            start time while
                            updating the other
                            details.
                          </span>
                              </div>
                          )}
                    </div>
                  </article>

                  <article
                      className={`ee-field-card ee-field-card--wide ${
                          descriptionReady
                              ? "ee-field-card--ready"
                              : ""
                      }`}
                  >
                    <div className="ee-field-number ee-field-number--violet">
                      <span>05</span>

                      {descriptionReady && (
                          <Check size={16} />
                      )}
                    </div>

                    <div className="ee-field-content">
                      <div className="ee-field-heading">
                      <span className="ee-field-icon ee-field-icon--violet">
                        <FileText
                            size={20}
                        />
                      </span>

                        <span>
                        <strong>
                          Study plan
                        </strong>

                        <small>
                          Explain what the group
                          will work on
                        </small>
                      </span>
                      </div>

                      <label className="ee-field">
                      <span>
                        Session description
                      </span>

                        <textarea
                            rows={5}
                            value={
                              form.description
                            }
                            maxLength={
                              MAX_DESCRIPTION_LENGTH
                            }
                            onChange={(
                                event,
                            ) =>
                                updateField(
                                    "description",
                                    event.target
                                        .value,
                                )
                            }
                            placeholder="Reviewing dynamic programming problems, comparing solutions, and working through past midterm questions…"
                        />

                        <small>
                          {
                            form.description
                                .length
                          }
                          /
                          {
                            MAX_DESCRIPTION_LENGTH
                          }
                        </small>
                      </label>
                    </div>
                  </article>
                </div>

                {validationErrors.length >
                    0 && (
                        <div
                            className="ee-validation-panel"
                            role="alert"
                        >
                          <ShieldCheck
                              size={22}
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
                    className={`ee-publish-panel ${
                        canSave
                            ? "ee-publish-panel--ready"
                            : ""
                    }`}
                >
                  <div className="ee-publish-status">
                  <span>
                    {canSave ? (
                        <CheckCircle2
                            size={22}
                        />
                    ) : hasChanges ? (
                        <Radio size={22} />
                    ) : (
                        <Edit3 size={22} />
                    )}
                  </span>

                    <div>
                      <strong>
                        {canSave
                            ? "Your update is ready"
                            : hasChanges
                                ? `${completedSteps} of 5 areas ready`
                                : "No changes to publish"}
                      </strong>

                      <small>
                        {canSave
                            ? "Save to update the session page for every attendee."
                            : hasChanges
                                ? "Complete or fix the remaining details before saving."
                                : "Edit any detail above to activate publishing."}
                      </small>
                    </div>
                  </div>

                  <button
                      type="button"
                      disabled={
                          saving ||
                          !canSave
                      }
                      className="ee-publish-button"
                      onClick={() =>
                          void saveSession()
                      }
                  >
                  <span>
                    <Save size={20} />
                  </span>

                    <span>
                    <small>
                      Publish updates
                    </small>

                    <strong>
                      {saving
                          ? "Saving changes…"
                          : "Save changes"}
                    </strong>
                  </span>

                    <ArrowRight
                        size={19}
                    />
                  </button>
                </div>
              </section>

              <aside className="ee-sidebar">
                <section className="ee-preview-panel ee-reveal">
                  <div className="ee-preview-heading">
                    <div>
                    <span className="ee-sidebar-kicker">
                      <Eye size={15} />
                      Updated preview
                    </span>

                      <h2>
                        What attendees see
                      </h2>
                    </div>

                    <span className="ee-preview-icon">
                    <Eye size={18} />
                  </span>
                  </div>

                  <article className="ee-session-ticket">
                    <span className="ee-ticket-cut ee-ticket-cut--left" />
                    <span className="ee-ticket-cut ee-ticket-cut--right" />

                    <div className="ee-ticket-top">
                    <span className="ee-ticket-status">
                      <span />
                      Updated session
                    </span>

                      <span className="ee-ticket-course">
                      {normalizedForm.courseCode ||
                          "COURSE"}
                    </span>
                    </div>

                    <div className="ee-ticket-host">
                      <div className="ee-ticket-avatar">
                        <SafeAvatar
                            src={
                              profile.avatar_url
                            }
                            name={
                              profile.name
                            }
                        />
                      </div>

                      <span>
                      <small>
                        Organized by
                      </small>

                      <strong>
                        {profile.name ||
                            "Student"}
                      </strong>
                    </span>
                    </div>

                    <h3>
                      {form.title.trim() ||
                          "Session title"}
                    </h3>

                    <div className="ee-ticket-route">
                      <div>
                      <span className="ee-ticket-route-icon ee-ticket-route-icon--violet">
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
                              form.startTime,
                          )}
                        </strong>

                        <p>
                          {formatSessionTime(
                              form.startTime,
                          )}{" "}
                          –{" "}
                          {formatSessionTime(
                              form.endTime,
                          )}
                        </p>
                      </span>
                      </div>

                      <span className="ee-ticket-route-line" />

                      <div>
                      <span className="ee-ticket-route-icon ee-ticket-route-icon--green">
                        <MapPin
                            size={17}
                        />
                      </span>

                        <span>
                        <small>
                          Where
                        </small>

                        <strong>
                          {form.location.trim() ||
                              "Add a precise campus location"}
                        </strong>
                      </span>
                      </div>
                    </div>

                    <div className="ee-ticket-plan">
                      <small>
                        Study plan
                      </small>

                      <p>
                        {form.description.trim() ||
                            "Explain what the group will work on together."}
                      </p>
                    </div>

                    <div className="ee-ticket-find">
                      <Eye size={16} />

                      <span>
                      {form.identification.trim() ||
                          "Describe how classmates can recognize you."}
                    </span>
                    </div>

                    <div className="ee-ticket-footer">
                    <span>
                      <Clock size={15} />
                      {formatDuration(
                          durationMinutes,
                      )}
                    </span>

                      <span>
                      {profile.university ||
                          "Your university"}
                    </span>
                    </div>
                  </article>
                </section>

                <section className="ee-change-monitor ee-reveal">
                  <div className="ee-monitor-heading">
                  <span className="ee-sidebar-kicker ee-sidebar-kicker--dark">
                    <Zap size={15} />
                    Change monitor
                  </span>

                    <strong>
                      {changedFields.length}
                    </strong>
                  </div>

                  {changedFields.length >
                  0 ? (
                      <div className="ee-change-list">
                        {changedFields.map(
                            (field) => (
                                <div
                                    key={field}
                                >
                          <span>
                            <Check
                                size={14}
                            />
                          </span>

                                  <p>
                                    <strong>
                                      {field}
                                    </strong>

                                    <small>
                                      Modified and ready
                                      to review
                                    </small>
                                  </p>
                                </div>
                            ),
                        )}
                      </div>
                  ) : (
                      <div className="ee-no-changes">
                        <Edit3 size={24} />

                        <span>
                      <strong>
                        No edits yet
                      </strong>

                      <small>
                        Changed areas will appear
                        here.
                      </small>
                    </span>
                      </div>
                  )}
                </section>

                <section className="ee-safety-card ee-reveal">
                  <ShieldCheck size={21} />

                  <div>
                    <strong>
                      Public session safety
                    </strong>

                    <p>
                      Phone numbers, social
                      handles, external links, and
                      inappropriate language are
                      blocked from public session
                      details.
                    </p>
                  </div>
                </section>
              </aside>
            </div>

            <section className="ee-danger-zone ee-reveal">
              <div className="ee-danger-copy">
              <span className="ee-kicker ee-kicker--danger">
                <Trash2 size={15} />
                Danger zone
              </span>

                <h2>
                  Permanently remove this meetup.
                </h2>

                <p>
                  Deleting the session removes it
                  from discovery and removes the
                  session page for every attendee.
                  This cannot be undone.
                </p>
              </div>

              <button
                  type="button"
                  className="ee-delete-button"
                  onClick={() =>
                      setDeleteOpen(true)
                  }
              >
                <Trash2 size={18} />
                Delete session
              </button>
            </section>
          </div>
        </main>

        {discardOpen && (
            <div
                className="ee-modal-backdrop"
                role="presentation"
                onMouseDown={(event) => {
                  if (
                      event.target ===
                      event.currentTarget
                  ) {
                    setDiscardOpen(false);
                    setPendingNavigation(
                        null,
                    );
                  }
                }}
            >
              <div
                  className="ee-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="discard-title"
              >
                <button
                    type="button"
                    className="ee-modal-close"
                    aria-label="Close"
                    onClick={() => {
                      setDiscardOpen(false);
                      setPendingNavigation(
                          null,
                      );
                    }}
                >
                  <X size={18} />
                </button>

                <div className="ee-modal-icon ee-modal-icon--warning">
                  <RotateCcw size={26} />
                </div>

                <span className="ee-kicker">
              Unsaved changes
            </span>

                <h2 id="discard-title">
                  Leave without saving?
                </h2>

                <p>
                  Your current edits will be
                  discarded and the session will
                  remain unchanged.
                </p>

                <div className="ee-modal-actions">
                  <button
                      type="button"
                      className="ee-modal-secondary"
                      onClick={() => {
                        setDiscardOpen(false);
                        setPendingNavigation(
                            null,
                        );
                      }}
                  >
                    Keep editing
                  </button>

                  <button
                      type="button"
                      className="ee-modal-warning"
                      onClick={
                        discardAndNavigate
                      }
                  >
                    Discard changes
                  </button>
                </div>
              </div>
            </div>
        )}

        {deleteOpen && (
            <div
                className="ee-modal-backdrop"
                role="presentation"
                onMouseDown={(event) => {
                  if (
                      event.target ===
                      event.currentTarget &&
                      !deleting
                  ) {
                    setDeleteOpen(false);
                  }
                }}
            >
              <div
                  className="ee-modal ee-modal--danger"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="delete-title"
              >
                <button
                    type="button"
                    className="ee-modal-close"
                    aria-label="Close"
                    disabled={deleting}
                    onClick={() =>
                        setDeleteOpen(false)
                    }
                >
                  <X size={18} />
                </button>

                <div className="ee-modal-icon ee-modal-icon--danger">
                  <Trash2 size={27} />
                </div>

                <span className="ee-kicker ee-kicker--danger">
              Permanent action
            </span>

                <h2 id="delete-title">
                  Delete this session?
                </h2>

                <p>
                  <strong>
                    {form.title ||
                        "This study session"}
                  </strong>{" "}
                  will be permanently removed for
                  you and every attendee. This
                  cannot be undone.
                </p>

                <div className="ee-modal-actions">
                  <button
                      type="button"
                      className="ee-modal-secondary"
                      disabled={deleting}
                      onClick={() =>
                          setDeleteOpen(false)
                      }
                  >
                    Keep session
                  </button>

                  <button
                      type="button"
                      className="ee-modal-delete"
                      disabled={deleting}
                      onClick={() =>
                          void deleteSession()
                      }
                  >
                    <Trash2 size={17} />

                    {deleting
                        ? "Deleting…"
                        : "Delete permanently"}
                  </button>
                </div>
              </div>
            </div>
        )}

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

const editSessionStyles = `
  .ee-root,
  .ee-root *,
  .ee-loading,
  .ee-loading *,
  .ee-modal-backdrop,
  .ee-modal-backdrop * {
    box-sizing: border-box;
  }

  .ee-root,
  .ee-loading,
  .ee-modal-backdrop {
    --ee-indigo: #1B1B3A;
    --ee-indigo-soft: #292953;
    --ee-violet: #7C3AED;
    --ee-violet-dark: #5B21B6;
    --ee-violet-light: #EDE9FE;
    --ee-violet-faint: #F5F3FF;
    --ee-lilac: #C4B5FD;
    --ee-green: #10B981;
    --ee-green-dark: #047857;
    --ee-green-light: #D1FAE5;
    --ee-amber: #F59E0B;
    --ee-amber-dark: #B45309;
    --ee-amber-light: #FEF3C7;
    --ee-red: #EF4444;
    --ee-red-dark: #B91C1C;
    --ee-red-light: #FEE2E2;
    --ee-blue: #0EA5E9;
    --ee-blue-light: #E0F2FE;
    --ee-cream: #FFF9E8;
    --ee-background: #F5F4FB;
    --ee-surface: #FFFFFF;
    --ee-border: #E4E2F0;
    --ee-text: #1B1B3A;
    --ee-muted: #64748B;
    --ee-faint: #94A3B8;
  }

  .ee-root {
    position: relative;
    min-height: 100vh;
    overflow: hidden;
    isolation: isolate;
    padding: 18px 20px 100px;
    color: var(--ee-text);
    background:
      radial-gradient(
        circle at 50% -8%,
        rgba(124, 58, 237, 0.2),
        transparent 30rem
      ),
      var(--ee-background);
  }

  .ee-background-grid {
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

  .ee-glow {
    position: absolute;
    z-index: -4;
    border-radius: 999px;
    pointer-events: none;
    filter: blur(7px);
  }

  .ee-glow--one {
    top: 620px;
    right: -230px;
    width: 460px;
    height: 460px;
    background:
      rgba(16, 185, 129, 0.1);
  }

  .ee-glow--two {
    top: 1280px;
    left: -280px;
    width: 520px;
    height: 520px;
    background:
      rgba(124, 58, 237, 0.1);
  }

  .ee-canvas {
    position: relative;
    z-index: 1;
    width: min(1220px, 100%);
    margin: 0 auto;
  }

  .ee-command-bar {
    display: grid;
    grid-template-columns:
      auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
    padding: 11px 14px;
    background:
      rgba(255, 255, 255, 0.86);
    border:
      1px solid var(--ee-border);
    border-radius: 16px;
    box-shadow:
      0 10px 30px
      rgba(27, 27, 58, 0.07);
    backdrop-filter: blur(16px);
  }

  .ee-back-button {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 11px;
    color: var(--ee-muted);
    background:
      var(--ee-background);
    border:
      1px solid var(--ee-border);
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

  .ee-back-button:hover {
    color: var(--ee-violet);
    border-color: var(--ee-lilac);
    transform: translateX(-3px);
  }

  .ee-command-title {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 10px;
  }

  .ee-command-icon {
    display: grid;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    place-items: center;
    color: white;
    background:
      linear-gradient(
        145deg,
        var(--ee-violet),
        var(--ee-violet-dark)
      );
    border-radius: 12px;
    box-shadow:
      0 8px 18px
      rgba(91, 33, 182, 0.2);
  }

  .ee-command-title > span:last-child {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .ee-command-title strong {
    font-size: 14px;
  }

  .ee-command-title small {
    margin-top: 2px;
    color: var(--ee-muted);
    font-size: 12px;
  }

  .ee-unsaved-badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 11px;
    color: var(--ee-green-dark);
    background:
      var(--ee-green-light);
    border: 1px solid #A7F3D0;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 800;
  }

  .ee-unsaved-badge > span {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--ee-green);
  }

  .ee-unsaved-badge--active {
    color: var(--ee-amber-dark);
    background:
      var(--ee-amber-light);
    border-color: #FCD34D;
  }

  .ee-unsaved-badge--active > span {
    background: var(--ee-amber);
    box-shadow:
      0 0 0 4px
      rgba(245, 158, 11, 0.12);
  }

  .ee-error-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 16px;
    padding: 15px 18px;
    color: #991B1B;
    background: var(--ee-red-light);
    border: 1px solid #FCA5A5;
    border-radius: 16px;
  }

  .ee-error-banner > div {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .ee-error-banner strong {
    font-size: 14px;
  }

  .ee-error-banner span {
    font-size: 13px;
  }

  .ee-error-banner button {
    flex-shrink: 0;
    padding: 9px 13px;
    color: white;
    background: var(--ee-red);
    border: 0;
    border-radius: 10px;
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
  }

  .ee-hero {
    position: relative;
    display: grid;
    grid-template-columns:
      minmax(0, 1fr)
      minmax(300px, 0.48fr);
    align-items: center;
    gap: 26px;
    overflow: hidden;
    padding: 29px;
    color: white;
    background:
      radial-gradient(
        circle at 85% 15%,
        rgba(124, 58, 237, 0.45),
        transparent 30%
      ),
      linear-gradient(
        140deg,
        #17172E,
        var(--ee-indigo-soft)
      );
    border:
      1px solid
      rgba(255, 255, 255, 0.09);
    border-radius:
      25px 47px 25px 47px;
    box-shadow:
      0 27px 67px
      rgba(27, 27, 58, 0.22),
      inset 0 1px
      rgba(255, 255, 255, 0.07);
  }

  .ee-hero-grid {
    position: absolute;
    inset: 0;
    opacity: 0.13;
    pointer-events: none;
    background-image:
      linear-gradient(
        rgba(255, 255, 255, 0.13) 1px,
        transparent 1px
      ),
      linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.13) 1px,
        transparent 1px
      );
    background-size: 35px 35px;
    mask-image:
      radial-gradient(
        circle at 79% 20%,
        black,
        transparent 73%
      );
  }

  .ee-hero-orbit {
    position: absolute;
    top: -125px;
    right: -70px;
    border:
      1px dashed
      rgba(196, 181, 253, 0.17);
    border-radius: 999px;
  }

  .ee-hero-orbit--one {
    width: 350px;
    height: 350px;
  }

  .ee-hero-orbit--two {
    top: -65px;
    right: -10px;
    width: 230px;
    height: 230px;
  }

  .ee-hero-copy,
  .ee-save-console {
    position: relative;
    z-index: 2;
  }

  .ee-kicker,
  .ee-sidebar-kicker {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 11px;
    color: var(--ee-violet);
    font-size: 12px;
    font-weight: 850;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .ee-kicker--light,
  .ee-sidebar-kicker {
    color: var(--ee-lilac);
  }

  .ee-kicker--danger {
    color: var(--ee-red-dark);
  }

  .ee-hero-copy h1 {
    max-width: 760px;
    margin: 0;
    font-size:
      clamp(39px, 5.3vw, 65px);
    letter-spacing: -0.068em;
    line-height: 0.97;
  }

  .ee-hero-copy h1 span {
    display: block;
    margin-top: 5px;
    color: var(--ee-lilac);
  }

  .ee-hero-copy > p {
    max-width: 710px;
    margin: 17px 0 0;
    color:
      rgba(255, 255, 255, 0.61);
    font-size: 14px;
    line-height: 1.7;
  }

  .ee-hero-tags {
    display: flex;
    gap: 8px;
    margin-top: 21px;
    flex-wrap: wrap;
  }

  .ee-hero-tags > span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    color:
      rgba(255, 255, 255, 0.7);
    background:
      rgba(255, 255, 255, 0.07);
    border:
      1px solid
      rgba(255, 255, 255, 0.09);
    border-radius: 999px;
    font-size: 11px;
    font-weight: 750;
  }

  .ee-save-console {
    display: grid;
    grid-template-columns:
      auto minmax(0, 1fr);
    gap: 13px;
    padding: 17px;
    color: var(--ee-text);
    background:
      rgba(255, 255, 255, 0.96);
    border:
      1px solid
      rgba(255, 255, 255, 0.76);
    border-radius: 17px;
    box-shadow:
      0 17px 37px
      rgba(0, 0, 0, 0.24);
    transform: rotate(0.6deg);
  }

  .ee-readiness-dial {
    --ee-readiness-angle: 0deg;

    display: grid;
    width: 77px;
    height: 77px;
    flex-shrink: 0;
    padding: 5px;
    place-items: center;
    background:
      conic-gradient(
        var(--ee-violet)
          var(--ee-readiness-angle),
        var(--ee-violet-light)
          var(--ee-readiness-angle)
      );
    border-radius: 999px;
  }

  .ee-readiness-dial > span {
    display: grid;
    width: 100%;
    height: 100%;
    place-items: center;
    align-content: center;
    background: white;
    border-radius: inherit;
  }

  .ee-readiness-dial strong {
    font-size: 18px;
    line-height: 1;
  }

  .ee-readiness-dial small {
    margin-top: 3px;
    color: var(--ee-muted);
    font-size: 9px;
    font-weight: 850;
    text-transform: uppercase;
  }

  .ee-save-console-copy {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .ee-save-console-copy > small {
    color: var(--ee-violet);
    font-size: 10px;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .ee-save-console-copy > strong {
    margin-top: 4px;
    font-size: 15px;
  }

  .ee-save-console-copy > p {
    margin: 5px 0 0;
    color: var(--ee-muted);
    font-size: 11px;
    line-height: 1.45;
  }

  .ee-save-button {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns:
      auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 60px;
    padding: 9px 12px;
    color: white;
    background:
      linear-gradient(
        135deg,
        var(--ee-violet),
        var(--ee-violet-dark)
      );
    border: 0;
    border-radius: 13px;
    box-shadow:
      0 13px 28px
      rgba(91, 33, 182, 0.23);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      opacity 160ms ease;
  }

  .ee-save-button:hover:not(:disabled) {
    transform: translateY(-3px);
    box-shadow:
      0 19px 36px
      rgba(91, 33, 182, 0.29);
  }

  .ee-save-button:disabled {
    opacity: 0.43;
    cursor: not-allowed;
    box-shadow: none;
  }

  .ee-save-button > span:first-child,
  .ee-publish-button > span:first-child {
    display: grid;
    width: 40px;
    height: 40px;
    place-items: center;
    color: var(--ee-violet);
    background: white;
    border-radius: 11px;
  }

  .ee-save-button > span:nth-child(2),
  .ee-publish-button > span:nth-child(2) {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .ee-save-button small,
  .ee-publish-button small {
    color:
      rgba(255, 255, 255, 0.64);
    font-size: 11px;
  }

  .ee-save-button strong,
  .ee-publish-button strong {
    margin-top: 2px;
    font-size: 14px;
  }

  .ee-layout {
    display: grid;
    grid-template-columns:
      minmax(0, 1fr)
      minmax(315px, 0.42fr);
    gap: 20px;
    margin-top: 21px;
    align-items: start;
  }

  .ee-editor {
    min-width: 0;
    padding: 27px;
    background:
      rgba(255, 255, 255, 0.95);
    border:
      1px solid var(--ee-border);
    border-radius:
      41px 22px 41px 22px;
    box-shadow:
      0 21px 52px
      rgba(27, 27, 58, 0.1);
    backdrop-filter: blur(14px);
  }

  .ee-editor-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 22px;
  }

  .ee-editor-heading h2,
  .ee-danger-zone h2 {
    margin: 0;
    font-size:
      clamp(28px, 3.5vw, 40px);
    letter-spacing: -0.052em;
    line-height: 1.05;
  }

  .ee-editor-heading p {
    max-width: 600px;
    margin: 9px 0 0;
    color: var(--ee-muted);
    font-size: 14px;
    line-height: 1.65;
  }

  .ee-reset-button {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: 6px;
    padding: 9px 11px;
    color: var(--ee-violet);
    background:
      var(--ee-violet-light);
    border: 1px solid #DDD6FE;
    border-radius: 11px;
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
    transition:
      transform 150ms ease,
      background 150ms ease;
  }

  .ee-reset-button:hover {
    background: #DDD6FE;
    transform: translateY(-2px);
  }

  .ee-form-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .ee-field-card {
    position: relative;
    display: grid;
    grid-template-columns:
      43px minmax(0, 1fr);
    gap: 13px;
    min-width: 0;
    padding: 16px;
    background:
      var(--ee-background);
    border:
      1px solid var(--ee-border);
    border-radius: 16px;
    transition:
      background 160ms ease,
      border-color 160ms ease,
      box-shadow 160ms ease;
  }

  .ee-field-card--wide {
    grid-column: 1 / -1;
  }

  .ee-field-card:focus-within {
    z-index: 5;
    background: white;
    border-color: var(--ee-lilac);
    box-shadow:
      0 0 0 4px
      rgba(124, 58, 237, 0.07),
      0 14px 30px
      rgba(27, 27, 58, 0.08);
  }

  .ee-field-card--ready {
    background: #F0FDF9;
    border-color: #A7F3D0;
  }

  .ee-field-number {
    display: flex;
    width: 39px;
    height: 46px;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    color: var(--ee-violet);
    background: white;
    border:
      1px solid var(--ee-border);
    border-radius: 12px;
    font-size: 11px;
    font-weight: 900;
  }

  .ee-field-number--green {
    color: var(--ee-green-dark);
  }

  .ee-field-number--amber {
    color: var(--ee-amber-dark);
  }

  .ee-field-number--blue {
    color: #0369A1;
  }

  .ee-field-number--violet {
    color: var(--ee-violet);
  }

  .ee-field-card--ready
    .ee-field-number {
    color: var(--ee-green-dark);
    background:
      var(--ee-green-light);
    border-color: #A7F3D0;
  }

  .ee-field-number svg {
    margin-top: 1px;
  }

  .ee-field-content {
    min-width: 0;
  }

  .ee-field-heading {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 10px;
  }

  .ee-field-icon {
    display: grid;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    place-items: center;
    color: var(--ee-violet);
    background:
      var(--ee-violet-light);
    border-radius: 11px;
  }

  .ee-field-icon--green {
    color: var(--ee-green-dark);
    background:
      var(--ee-green-light);
  }

  .ee-field-icon--amber {
    color: var(--ee-amber-dark);
    background:
      var(--ee-amber-light);
  }

  .ee-field-icon--blue {
    color: #0369A1;
    background:
      var(--ee-blue-light);
  }

  .ee-field-icon--violet {
    color: var(--ee-violet);
    background:
      var(--ee-violet-light);
  }

  .ee-field-heading > span:nth-child(2) {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .ee-field-heading strong {
    font-size: 15px;
  }

  .ee-field-heading small {
    margin-top: 2px;
    color: var(--ee-muted);
    font-size: 12px;
    line-height: 1.4;
  }

  .ee-duration-badge {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: 6px;
    margin-left: auto;
    padding: 7px 9px;
    color: var(--ee-violet);
    background:
      var(--ee-violet-light);
    border-radius: 999px;
    font-size: 12px;
    font-weight: 800;
  }

  .ee-input-pair {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 14px;
  }

  .ee-field {
    display: flex;
    min-width: 0;
    margin-top: 14px;
    flex-direction: column;
  }

  .ee-input-pair .ee-field {
    margin-top: 0;
  }

  .ee-field > span {
    color: var(--ee-text);
    font-size: 12px;
    font-weight: 800;
  }

  .ee-field input,
  .ee-field textarea {
    width: 100%;
    min-width: 0;
    margin-top: 7px;
    padding: 12px 13px;
    color: var(--ee-text);
    background: white;
    border:
      1px solid var(--ee-border);
    border-radius: 11px;
    outline: none;
    font: inherit;
    font-size: 14px;
    line-height: 1.5;
    transition:
      border-color 150ms ease,
      box-shadow 150ms ease;
  }

  .ee-field textarea {
    min-height: 128px;
    resize: vertical;
  }

  .ee-field input:focus,
  .ee-field textarea:focus {
    border-color:
      var(--ee-violet);
    box-shadow:
      0 0 0 4px
      rgba(124, 58, 237, 0.08);
  }

  .ee-field input::placeholder,
  .ee-field textarea::placeholder {
    color: var(--ee-faint);
  }

  .ee-field > small {
    align-self: flex-end;
    margin-top: 5px;
    color: var(--ee-faint);
    font-size: 11px;
    line-height: 1.4;
  }

  .ee-inline-warning {
    margin: 9px 0 0;
    color: var(--ee-amber-dark);
    font-size: 12px;
    line-height: 1.5;
  }

  .ee-field-feedback,
  .ee-live-edit-note {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    margin-top: 10px;
    padding: 9px 10px;
    color: var(--ee-muted);
    background:
      rgba(255, 255, 255, 0.72);
    border:
      1px solid var(--ee-border);
    border-radius: 10px;
    font-size: 12px;
    line-height: 1.45;
  }

  .ee-field-feedback svg,
  .ee-live-edit-note svg {
    flex-shrink: 0;
    margin-top: 1px;
  }

  .ee-field-feedback--ready {
    color: var(--ee-green-dark);
    background:
      var(--ee-green-light);
    border-color: #A7F3D0;
  }

  .ee-live-edit-note {
    color: #075985;
    background:
      var(--ee-blue-light);
    border-color: #BAE6FD;
  }

  .ee-duration-options {
    margin-top: 13px;
  }

  .ee-duration-options > span {
    display: block;
    margin-bottom: 8px;
    color: var(--ee-muted);
    font-size: 11px;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .ee-duration-options > div {
    display: flex;
    gap: 7px;
    flex-wrap: wrap;
  }

  .ee-duration-option {
    padding: 8px 10px;
    color: var(--ee-muted);
    background: white;
    border:
      1px solid var(--ee-border);
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

  .ee-duration-option:hover {
    border-color: var(--ee-lilac);
    transform: translateY(-2px);
  }

  .ee-duration-option--active {
    color: white;
    background: var(--ee-violet);
    border-color: var(--ee-violet);
  }

  .ee-validation-panel {
    display: grid;
    grid-template-columns:
      auto minmax(0, 1fr);
    align-items: flex-start;
    gap: 13px;
    margin-top: 16px;
    padding: 17px;
    color: #991B1B;
    background: #FFF1F2;
    border: 1px solid #FDA4AF;
    border-radius: 15px;
  }

  .ee-validation-panel > svg {
    flex-shrink: 0;
    margin-top: 1px;
    color: var(--ee-red-dark);
  }

  .ee-validation-panel strong {
    font-size: 15px;
  }

  .ee-validation-panel ul {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin: 9px 0 0;
    padding-left: 18px;
    font-size: 12px;
    line-height: 1.5;
  }

  .ee-publish-panel {
    display: grid;
    grid-template-columns:
      minmax(0, 1fr)
      minmax(270px, 0.72fr);
    align-items: center;
    gap: 15px;
    margin-top: 17px;
    padding: 14px;
    background: white;
    border:
      1px solid var(--ee-border);
    border-radius: 17px;
    box-shadow:
      0 14px 34px
      rgba(27, 27, 58, 0.1);
  }

  .ee-publish-panel--ready {
    border-color: #6EE7B7;
    box-shadow:
      0 14px 34px
      rgba(27, 27, 58, 0.1),
      0 0 0 4px
      rgba(16, 185, 129, 0.07);
  }

  .ee-publish-status {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 11px;
  }

  .ee-publish-status > span {
    display: grid;
    width: 45px;
    height: 45px;
    flex-shrink: 0;
    place-items: center;
    color: var(--ee-violet);
    background:
      var(--ee-violet-light);
    border-radius: 13px;
  }

  .ee-publish-panel--ready
    .ee-publish-status > span {
    color: white;
    background: var(--ee-green);
  }

  .ee-publish-status > div {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .ee-publish-status strong {
    font-size: 14px;
  }

  .ee-publish-status small {
    margin-top: 3px;
    color: var(--ee-muted);
    font-size: 12px;
    line-height: 1.45;
  }

  .ee-publish-button {
    display: grid;
    grid-template-columns:
      auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 11px;
    min-height: 61px;
    padding: 9px 12px;
    color: white;
    background:
      linear-gradient(
        135deg,
        var(--ee-violet),
        var(--ee-violet-dark)
      );
    border: 0;
    border-radius: 14px;
    box-shadow:
      0 13px 28px
      rgba(91, 33, 182, 0.23);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      opacity 160ms ease;
  }

  .ee-publish-button:hover:not(:disabled) {
    transform: translateY(-3px);
    box-shadow:
      0 19px 36px
      rgba(91, 33, 182, 0.29);
  }

  .ee-publish-button:disabled {
    opacity: 0.43;
    cursor: not-allowed;
    box-shadow: none;
  }

  .ee-sidebar {
    position: sticky;
    top: 94px;
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 15px;
  }

  .ee-preview-panel {
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
        var(--ee-indigo-soft)
      );
    border:
      1px solid
      rgba(255, 255, 255, 0.09);
    border-radius:
      20px 38px 20px 38px;
    box-shadow:
      0 21px 50px
      rgba(27, 27, 58, 0.19);
  }

  .ee-preview-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 17px;
  }

  .ee-preview-heading h2 {
    margin: 0;
    font-size: 25px;
    letter-spacing: -0.045em;
  }

  .ee-preview-icon {
    display: grid;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    place-items: center;
    color: var(--ee-lilac);
    background:
      rgba(255, 255, 255, 0.08);
    border-radius: 12px;
  }

  .ee-session-ticket {
    position: relative;
    padding: 18px;
    color: var(--ee-text);
    background: white;
    border-radius: 17px;
    box-shadow:
      0 19px 39px
      rgba(0, 0, 0, 0.29);
    transform: rotate(-0.6deg);
  }

  .ee-ticket-cut {
    position: absolute;
    top: 48%;
    width: 19px;
    height: 19px;
    border-radius: 999px;
    background: #222246;
  }

  .ee-ticket-cut--left {
    left: -10px;
  }

  .ee-ticket-cut--right {
    right: -10px;
  }

  .ee-ticket-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 9px;
  }

  .ee-ticket-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--ee-violet);
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .ee-ticket-status > span {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--ee-violet);
    box-shadow:
      0 0 0 4px
      rgba(124, 58, 237, 0.11);
  }

  .ee-ticket-course {
    padding: 5px 9px;
    color: var(--ee-violet);
    background:
      var(--ee-violet-light);
    border-radius: 999px;
    font-size: 11px;
    font-weight: 850;
  }

  .ee-ticket-host {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-top: 16px;
  }

  .ee-ticket-avatar {
    display: grid;
    width: 43px;
    height: 43px;
    overflow: hidden;
    flex-shrink: 0;
    place-items: center;
    color: white;
    background: var(--ee-violet);
    border: 3px solid white;
    border-radius: 13px;
    box-shadow:
      0 6px 15px
      rgba(27, 27, 58, 0.13);
    font-size: 15px;
    font-weight: 850;
  }

  .ee-ticket-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .ee-ticket-host > span {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .ee-ticket-host small {
    color: var(--ee-muted);
    font-size: 10px;
  }

  .ee-ticket-host strong {
    overflow: hidden;
    margin-top: 2px;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ee-session-ticket h3 {
    margin: 17px 0 0;
    font-size: 21px;
    letter-spacing: -0.035em;
    line-height: 1.15;
  }

  .ee-ticket-route {
    margin-top: 16px;
    padding: 12px;
    background:
      var(--ee-background);
    border:
      1px solid var(--ee-border);
    border-radius: 12px;
  }

  .ee-ticket-route > div {
    display: flex;
    min-width: 0;
    align-items: flex-start;
    gap: 9px;
  }

  .ee-ticket-route-icon {
    display: grid;
    width: 33px;
    height: 33px;
    flex-shrink: 0;
    place-items: center;
    border-radius: 10px;
  }

  .ee-ticket-route-icon--violet {
    color: var(--ee-violet);
    background:
      var(--ee-violet-light);
  }

  .ee-ticket-route-icon--green {
    color: var(--ee-green-dark);
    background:
      var(--ee-green-light);
  }

  .ee-ticket-route > div > span:last-child {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .ee-ticket-route small {
    color: var(--ee-muted);
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .ee-ticket-route strong {
    overflow: hidden;
    margin-top: 3px;
    font-size: 12px;
    line-height: 1.4;
    text-overflow: ellipsis;
  }

  .ee-ticket-route p {
    margin: 2px 0 0;
    color: var(--ee-muted);
    font-size: 11px;
  }

  .ee-ticket-route-line {
    display: block;
    width: 1px;
    height: 17px;
    margin: 5px 0 5px 16px;
    background:
      repeating-linear-gradient(
        to bottom,
        var(--ee-lilac) 0,
        var(--ee-lilac) 3px,
        transparent 3px,
        transparent 6px
      );
  }

  .ee-ticket-plan {
    margin-top: 10px;
    padding: 11px;
    background:
      var(--ee-violet-faint);
    border-radius: 10px;
  }

  .ee-ticket-plan small {
    color: var(--ee-violet);
    font-size: 10px;
    font-weight: 850;
    text-transform: uppercase;
  }

  .ee-ticket-plan p {
    display: -webkit-box;
    overflow: hidden;
    margin: 5px 0 0;
    color: var(--ee-muted);
    font-size: 11px;
    line-height: 1.5;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
  }

  .ee-ticket-find {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    margin-top: 9px;
    padding: 9px;
    color: #78520B;
    background:
      var(--ee-amber-light);
    border: 1px dashed #FCD34D;
    border-radius: 10px;
    font-size: 11px;
    line-height: 1.45;
  }

  .ee-ticket-find svg {
    flex-shrink: 0;
    margin-top: 1px;
  }

  .ee-ticket-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 9px;
    margin-top: 12px;
    padding-top: 11px;
    color: var(--ee-muted);
    border-top:
      1px dashed
      var(--ee-border);
    font-size: 10px;
  }

  .ee-ticket-footer > span:first-child {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .ee-change-monitor {
    padding: 19px;
    background:
      rgba(255, 255, 255, 0.95);
    border:
      1px solid var(--ee-border);
    border-radius:
      28px 16px 28px 16px;
    box-shadow:
      0 16px 38px
      rgba(27, 27, 58, 0.08);
  }

  .ee-sidebar-kicker--dark {
    color: var(--ee-violet);
  }

  .ee-monitor-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .ee-monitor-heading > strong {
    display: grid;
    width: 39px;
    height: 39px;
    place-items: center;
    color: var(--ee-violet);
    background:
      var(--ee-violet-light);
    border-radius: 12px;
    font-size: 13px;
  }

  .ee-change-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 4px;
  }

  .ee-change-list > div {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 10px;
    color: var(--ee-green-dark);
    background:
      var(--ee-green-light);
    border: 1px solid #A7F3D0;
    border-radius: 11px;
  }

  .ee-change-list > div > span {
    display: grid;
    width: 29px;
    height: 29px;
    flex-shrink: 0;
    place-items: center;
    color: white;
    background: var(--ee-green);
    border-radius: 9px;
  }

  .ee-change-list p {
    display: flex;
    min-width: 0;
    margin: 0;
    flex-direction: column;
  }

  .ee-change-list strong {
    font-size: 12px;
  }

  .ee-change-list small {
    margin-top: 2px;
    font-size: 10px;
  }

  .ee-no-changes {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 5px;
    padding: 14px;
    color: var(--ee-muted);
    background:
      var(--ee-background);
    border:
      1px dashed var(--ee-border);
    border-radius: 12px;
  }

  .ee-no-changes > svg {
    flex-shrink: 0;
    color: var(--ee-violet);
  }

  .ee-no-changes > span {
    display: flex;
    flex-direction: column;
  }

  .ee-no-changes strong {
    color: var(--ee-text);
    font-size: 12px;
  }

  .ee-no-changes small {
    margin-top: 2px;
    font-size: 11px;
  }

  .ee-safety-card {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 16px;
    color: #1E3A5F;
    background:
      var(--ee-blue-light);
    border: 1px solid #BAE6FD;
    border-radius: 14px;
  }

  .ee-safety-card > svg {
    flex-shrink: 0;
    color: #0369A1;
  }

  .ee-safety-card strong {
    font-size: 13px;
  }

  .ee-safety-card p {
    margin: 4px 0 0;
    color: #315675;
    font-size: 12px;
    line-height: 1.5;
  }

  .ee-danger-zone {
    display: grid;
    grid-template-columns:
      minmax(0, 1fr) auto;
    align-items: center;
    gap: 25px;
    margin-top: 22px;
    padding: 27px;
    background:
      linear-gradient(
        135deg,
        #FFF7F7,
        #FFF1F2
      );
    border: 1px solid #FDA4AF;
    border-radius:
      22px 42px 22px 42px;
    box-shadow:
      0 17px 42px
      rgba(127, 29, 29, 0.08);
  }

  .ee-danger-zone h2 {
    font-size: 30px;
  }

  .ee-danger-zone p {
    max-width: 760px;
    margin: 9px 0 0;
    color: #7F1D1D;
    font-size: 13px;
    line-height: 1.6;
  }

  .ee-delete-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 12px 15px;
    color: white;
    background: var(--ee-red);
    border: 0;
    border-radius: 12px;
    box-shadow:
      0 11px 24px
      rgba(239, 68, 68, 0.2);
    font: inherit;
    font-size: 13px;
    font-weight: 850;
    cursor: pointer;
    transition:
      transform 150ms ease,
      background 150ms ease;
  }

  .ee-delete-button:hover {
    background: #DC2626;
    transform: translateY(-2px);
  }

  .ee-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    background:
      rgba(15, 23, 42, 0.62);
    backdrop-filter: blur(7px);
  }

  .ee-modal {
    position: relative;
    width: min(455px, 100%);
    padding: 28px;
    color: var(--ee-text);
    background: white;
    border:
      1px solid var(--ee-border);
    border-radius:
      22px 39px 22px 39px;
    box-shadow:
      0 28px 80px
      rgba(15, 23, 42, 0.28);
  }

  .ee-modal--danger {
    border-color: #FDA4AF;
  }

  .ee-modal-close {
    position: absolute;
    top: 14px;
    right: 14px;
    display: grid;
    width: 34px;
    height: 34px;
    place-items: center;
    color: var(--ee-muted);
    background:
      var(--ee-background);
    border:
      1px solid var(--ee-border);
    border-radius: 10px;
    cursor: pointer;
  }

  .ee-modal-close:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .ee-modal-icon {
    display: grid;
    width: 62px;
    height: 62px;
    margin-bottom: 21px;
    place-items: center;
    border-radius: 18px;
  }

  .ee-modal-icon--warning {
    color: var(--ee-amber-dark);
    background:
      var(--ee-amber-light);
  }

  .ee-modal-icon--danger {
    color: var(--ee-red-dark);
    background:
      var(--ee-red-light);
  }

  .ee-modal h2 {
    margin: 0;
    font-size: 27px;
    letter-spacing: -0.045em;
  }

  .ee-modal > p {
    margin: 10px 0 0;
    color: var(--ee-muted);
    font-size: 14px;
    line-height: 1.65;
  }

  .ee-modal-actions {
    display: grid;
    grid-template-columns:
      1fr 1fr;
    gap: 10px;
    margin-top: 24px;
  }

  .ee-modal-actions button {
    min-height: 46px;
    padding: 11px 13px;
    border-radius: 12px;
    font: inherit;
    font-size: 12px;
    font-weight: 850;
    cursor: pointer;
  }

  .ee-modal-secondary {
    color: var(--ee-text);
    background: white;
    border:
      1px solid var(--ee-border);
  }

  .ee-modal-warning {
    color: #78350F;
    background:
      var(--ee-amber-light);
    border: 1px solid #FCD34D;
  }

  .ee-modal-delete {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: white;
    background: var(--ee-red);
    border: 0;
  }

  .ee-modal-delete:disabled,
  .ee-modal-actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .ee-loading {
    display: flex;
    min-height: 75vh;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 19px;
    padding: 24px;
    color: var(--ee-muted);
    background:
      var(--ee-background);
    font-size: 14px;
  }

  .ee-loading-signal {
    position: relative;
    display: grid;
    width: 88px;
    height: 88px;
    place-items: center;
    color: var(--ee-violet);
    background:
      var(--ee-violet-faint);
    border-radius: 999px;
  }

  .ee-loading-signal > span {
    position: absolute;
    border:
      1px solid var(--ee-lilac);
    border-radius: inherit;
    animation:
      ee-loading-wave
      1.8s ease-out infinite;
  }

  .ee-loading-signal > span:nth-child(1) {
    inset: 8px;
  }

  .ee-loading-signal > span:nth-child(2) {
    inset: -13px;
    animation-delay: 0.55s;
  }

  .ee-not-found {
    display: flex;
    width: min(450px, 100%);
    align-items: center;
    flex-direction: column;
    padding: 34px;
    background: white;
    border:
      1px solid var(--ee-border);
    border-radius:
      24px 42px 24px 42px;
    box-shadow:
      0 20px 52px
      rgba(27, 27, 58, 0.12);
    text-align: center;
  }

  .ee-not-found-icon {
    display: grid;
    width: 80px;
    height: 80px;
    margin-bottom: 24px;
    place-items: center;
    color: var(--ee-violet);
    background:
      var(--ee-violet-light);
    border-radius: 999px;
  }

  .ee-not-found h1 {
    margin: 0;
    font-size: 29px;
    letter-spacing: -0.045em;
  }

  .ee-not-found p {
    margin: 9px 0 0;
    color: var(--ee-muted);
    font-size: 14px;
    line-height: 1.6;
  }

  .ee-not-found a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 20px;
    padding: 11px 14px;
    color: white;
    background: var(--ee-violet);
    border-radius: 11px;
    font-size: 13px;
    font-weight: 800;
    text-decoration: none;
  }

  .ee-root a:focus-visible,
  .ee-root button:focus-visible,
  .ee-root input:focus-visible,
  .ee-root textarea:focus-visible,
  .ee-modal-backdrop button:focus-visible,
  .ee-loading a:focus-visible {
    outline:
      3px solid
      rgba(124, 58, 237, 0.35);
    outline-offset: 3px;
  }

  @keyframes ee-loading-wave {
    0% {
      opacity: 0.6;
      transform: scale(0.75);
    }

    100% {
      opacity: 0;
      transform: scale(1.25);
    }
  }

  @media (max-width: 1050px) {
    .ee-layout {
      grid-template-columns:
        minmax(0, 1fr) 315px;
    }

    .ee-hero {
      grid-template-columns:
        minmax(0, 1fr) 300px;
    }
  }

  @media (max-width: 900px) {
    .ee-hero,
    .ee-layout {
      grid-template-columns: 1fr;
    }

    .ee-save-console {
      transform: none;
    }

    .ee-sidebar {
      position: relative;
      top: auto;
      display: grid;
      grid-template-columns:
        1fr 1fr;
    }

    .ee-preview-panel {
      grid-row: span 3;
    }
  }

  @media (max-width: 720px) {
    .ee-root {
      padding:
        10px 12px 70px;
    }

    .ee-command-bar {
      grid-template-columns:
        auto minmax(0, 1fr);
    }

    .ee-unsaved-badge {
      grid-column: 1 / -1;
      justify-content: center;
    }

    .ee-hero {
      padding: 23px 18px;
      border-radius:
        29px 29px 18px 29px;
    }

    .ee-hero-copy h1 {
      font-size:
        clamp(38px, 13vw, 55px);
    }

    .ee-editor {
      padding: 23px 17px;
    }

    .ee-editor-heading {
      align-items: flex-start;
      flex-direction: column;
    }

    .ee-form-grid {
      grid-template-columns: 1fr;
    }

    .ee-field-card--wide {
      grid-column: auto;
    }

    .ee-input-pair {
      grid-template-columns: 1fr;
    }

    .ee-publish-panel {
      grid-template-columns: 1fr;
    }

    .ee-sidebar {
      display: flex;
    }

    .ee-danger-zone {
      grid-template-columns: 1fr;
      padding: 23px 18px;
    }

    .ee-delete-button {
      width: 100%;
    }
  }

  @media (max-width: 520px) {
    .ee-command-title small {
      display: none;
    }

    .ee-field-card {
      grid-template-columns: 1fr;
    }

    .ee-field-number {
      width: 39px;
      height: 39px;
    }

    .ee-field-heading {
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .ee-duration-badge {
      margin-left: 0;
    }

    .ee-save-console {
      grid-template-columns: 1fr;
    }

    .ee-readiness-dial {
      justify-self: start;
    }

    .ee-save-button {
      grid-column: auto;
    }

    .ee-modal-actions {
      grid-template-columns: 1fr;
    }
  }

  @media (
    prefers-reduced-motion:
    reduce
  ) {
    .ee-root *,
    .ee-loading *,
    .ee-modal-backdrop * {
      scroll-behavior:
        auto !important;
      animation-duration:
        0.001ms !important;
      animation-iteration-count:
        1 !important;
      transition-duration:
        0.001ms !important;
    }
  }
`;