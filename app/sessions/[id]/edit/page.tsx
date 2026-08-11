"use client";

/* eslint-disable @next/next/no-img-element */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  Edit3,
  Eye,
  MapPin,
  RotateCcw,
  Save,
  SearchX,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";

import AlertModal from "@/components/AlertModal";
import { useRequireOnboarding } from "@/hooks/useRequiredOnboarding";
import { containsInappropriateContent } from "@/lib/contentModeration";
import {
  isValidCourseCode,
  normalizeCourseCode,
} from "@/lib/courseValidation";
import { supabase } from "@/lib/supabase";

import styles from "./edit-session.module.css";

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

type FieldErrors = {
  title?: string;
  courseCode?: string;
  location?: string;
  identification?: string;
  description?: string;
  schedule?: string;
  safety?: string[];
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
    value: string | Date,
): string {
  const date =
      value instanceof Date
          ? value
          : new Date(value);

  return new Date(
      date.getTime() -
      date.getTimezoneOffset() * 60_000,
  )
      .toISOString()
      .slice(0, 16);
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

export default function EditSessionPage() {
  const router = useRouter();
  const params = useParams();

  const {
    profile,
    loading: onboardingLoading,
  } = useRequireOnboarding();

  const id = Array.isArray(params.id)
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

  const [myCourses, setMyCourses] =
      useState<string[]>([]);

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

  const [submitAttempted, setSubmitAttempted] =
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
      useState(Date.now());

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
            router.replace("/login");
            return;
          }

          const [
            sessionResult,
            coursesResult,
          ] = await Promise.all([
            supabase
                .from("study_sessions")
                .select("*")
                .eq("id", id)
                .maybeSingle(),

            supabase
                .from("user_courses")
                .select("course_code")
                .eq("user_id", user.id)
                .order("course_code"),
          ]);

          if (sessionResult.error) {
            throw sessionResult.error;
          }

          if (coursesResult.error) {
            console.error(
                "Unable to load saved courses:",
                coursesResult.error,
            );
          }

          if (!sessionResult.data) {
            setNotFound(true);
            return;
          }

          const session =
              sessionResult.data as SessionRecord;

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
                session.location_name || "",
            identification:
                session.identification || "",
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

          const courses = Array.from(
              new Set(
                  (coursesResult.data ?? [])
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

          setForm(loadedForm);
          setOriginalForm(loadedForm);
          setMyCourses(courses);
          setSubmitAttempted(false);
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

  const normalizedForm = useMemo(
      () =>
          normalizeForComparison(
              form,
          ),
      [form],
  );

  const normalizedOriginal = useMemo(
      () =>
          normalizeForComparison(
              originalForm,
          ),
      [originalForm],
  );

  const hasChanges = useMemo(
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

  const startDate = useMemo(() => {
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

  const endDate = useMemo(() => {
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

  const originalStartDate = useMemo(() => {
    if (!originalForm.startTime) {
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
  }, [originalForm.startTime]);

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

  const originalStartWasPast =
      Boolean(
          originalStartDate &&
          originalStartDate.getTime() <
          currentTime - 60_000,
      );

  const startMatchesOriginal =
      form.startTime ===
      originalForm.startTime;

  const startTimeAllowed = Boolean(
      startDate &&
      (startDate.getTime() >=
          currentTime - 60_000 ||
          (originalStartWasPast &&
              startMatchesOriginal)),
  );

  const publicText = useMemo(
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

  const fieldErrors =
      useMemo<FieldErrors>(() => {
        const errors: FieldErrors = {};
        const safetyErrors: string[] = [];

        const title =
            form.title.trim();

        const location =
            form.location.trim();

        const identification =
            form.identification.trim();

        const description =
            form.description.trim();

        if (!title) {
          errors.title =
              "Add a session title.";
        } else if (
            title.length < 4
        ) {
          errors.title =
              "Make the title a little more descriptive.";
        }

        if (
            !normalizedForm.courseCode
        ) {
          errors.courseCode =
              "Add a course code.";
        } else if (
            !isValidCourseCode(
                normalizedForm.courseCode,
            )
        ) {
          errors.courseCode =
              "Use a code such as CS400, MATH340, or BIO101.";
        }

        if (!location) {
          errors.location =
              "Add a campus location.";
        } else if (
            location.length < 10
        ) {
          errors.location =
              "Include a building and a specific room, floor, table, or area.";
        }

        if (!identification) {
          errors.identification =
              "Describe how students can recognize the group.";
        } else if (
            identification.length < 10
        ) {
          errors.identification =
              "Add a clearer visual description.";
        }

        if (!description) {
          errors.description =
              "Add a study plan.";
        } else if (
            description.length < 10
        ) {
          errors.description =
              "Add at least 10 characters of study detail.";
        }

        if (!startDate || !endDate) {
          errors.schedule =
              "Choose a valid start and end time.";
        } else if (!startTimeAllowed) {
          errors.schedule =
              "The session start time cannot be moved into the past.";
        } else if (
            endDate.getTime() <=
            currentTime
        ) {
          errors.schedule =
              "The session end time must still be in the future.";
        } else if (endDate <= startDate) {
          errors.schedule =
              "The session must end after it starts.";
        } else if (
            durationMinutes >
            MAX_DURATION_MINUTES
        ) {
          errors.schedule =
              "Sessions cannot be longer than six hours.";
        }

        if (
            PHONE_REGEX.test(
                publicText,
            )
        ) {
          safetyErrors.push(
              "Phone numbers are not allowed.",
          );
        }

        if (
            SOCIAL_REGEX.test(
                publicText,
            )
        ) {
          safetyErrors.push(
              "Social handles are not allowed.",
          );
        }

        if (
            LINK_REGEX.test(
                publicText,
            )
        ) {
          safetyErrors.push(
              "Links are not allowed.",
          );
        }

        if (
            containsInappropriateContent(
                publicText,
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

  const validationMessages =
      useMemo(
          () =>
              [
                fieldErrors.title,
                fieldErrors.courseCode,
                fieldErrors.location,
                fieldErrors.identification,
                fieldErrors.schedule,
                fieldErrors.description,
                ...(fieldErrors.safety ?? []),
              ].filter(
                  (
                      message,
                  ): message is string =>
                      Boolean(message),
              ),
          [fieldErrors],
      );

  const changedFields = useMemo(() => {
    const changes: string[] = [];

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
      changes.push("Study plan");
    }

    return changes;
  }, [
    normalizedForm,
    normalizedOriginal,
  ]);

  const canSave =
      hasChanges &&
      validationMessages.length === 0;

  function updateStartTime(
      value: string,
  ) {
    const existingDuration =
        durationMinutes > 0
            ? durationMinutes
            : 60;

    updateField(
        "startTime",
        value,
    );

    const nextStart =
        new Date(value);

    if (
        Number.isNaN(
            nextStart.getTime(),
        )
    ) {
      return;
    }

    const nextEnd = new Date(
        nextStart.getTime() +
        existingDuration * 60_000,
    );

    updateField(
        "endTime",
        formatForDateTimeInput(
            nextEnd,
        ),
    );
  }

  function applyStartOffset(
      offsetMinutes: number,
  ) {
    const nextStart = new Date(
        Date.now() +
        offsetMinutes * 60_000,
    );

    nextStart.setSeconds(0, 0);

    const roundedMinutes =
        Math.ceil(
            nextStart.getMinutes() / 15,
        ) * 15;

    nextStart.setMinutes(
        roundedMinutes,
    );

    const nextDuration =
        durationMinutes > 0
            ? durationMinutes
            : 60;

    const nextEnd = new Date(
        nextStart.getTime() +
        nextDuration * 60_000,
    );

    updateField(
        "startTime",
        formatForDateTimeInput(
            nextStart,
        ),
    );

    updateField(
        "endTime",
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

    nextStart.setHours(
        18,
        0,
        0,
        0,
    );

    const nextDuration =
        durationMinutes > 0
            ? durationMinutes
            : 60;

    const nextEnd = new Date(
        nextStart.getTime() +
        nextDuration * 60_000,
    );

    updateField(
        "startTime",
        formatForDateTimeInput(
            nextStart,
        ),
    );

    updateField(
        "endTime",
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

    updateField(
        "endTime",
        formatForDateTimeInput(
            nextEnd,
        ),
    );
  }

  function resetChanges() {
    setForm(originalForm);
    setSubmitAttempted(false);
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

  async function saveSession(
      event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (saving || !hasChanges) {
      return;
    }

    setSubmitAttempted(true);

    if (!canSave) {
      showAlert(
          "Check your session details",
          validationMessages[0] ||
          "Resolve the form errors before saving.",
          "warning",
      );
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
                    normalizedForm.startTime,
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
      setSubmitAttempted(false);

      showAlert(
          "Session updated",
          "Your changes are saved and visible to attendees.",
          "success",
      );

      window.setTimeout(() => {
        router.push(
            `/sessions/${id}`,
        );
      }, 650);
    } catch (error) {
      showAlert(
          "Unable to save session",
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
          "Unable to delete session",
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
      setPendingNavigation(null);
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

  const previewTitle =
      form.title.trim() ||
      "Your study session";

  const previewCourse =
      normalizedForm.courseCode ||
      "COURSE";

  const previewLocation =
      form.location.trim() ||
      "Add a precise campus location";

  const previewDescription =
      form.description.trim() ||
      "Explain what the group will work on together.";

  const previewIdentification =
      form.identification.trim() ||
      "How classmates can recognize the group";

  if (
      pageLoading ||
      onboardingLoading
  ) {
    return <EditSessionLoading />;
  }

  if (!profile) {
    return (
        <main
            id="studygrouprr-edit-session"
            className={styles.loadingPage}
        >
          <div className={styles.loadingCard}>
            <strong>
              We could not find your profile.
            </strong>

            <button
                type="button"
                onClick={() =>
                    router.push("/login")
                }
            >
              Return to sign in
            </button>
          </div>
        </main>
    );
  }

  if (notFound) {
    return (
        <main
            id="studygrouprr-edit-session"
            className={styles.loadingPage}
        >
          <div className={styles.notFoundCard}>
          <span
              className={styles.notFoundIcon}
          >
            <SearchX size={28} />
          </span>

            <h1>Session unavailable</h1>

            <p>
              It may have been removed,
              completed, or you may not have
              permission to edit it.
            </p>

            <button
                type="button"
                onClick={() =>
                    router.push("/sessions")
                }
            >
              Browse sessions
              <ArrowRight size={16} />
            </button>
          </div>
        </main>
    );
  }

  return (
      <>
        <main
            id="studygrouprr-edit-session"
            className={styles.page}
        >
          <div className={styles.shell}>
            <div className={styles.topBar}>
              <button
                  type="button"
                  onClick={() =>
                      requestNavigation(
                          `/sessions/${id}`,
                      )
                  }
              >
                <ArrowLeft size={16} />
                Back to session
              </button>

              <span
                  className={[
                    styles.savedState,
                    hasChanges
                        ? styles.savedStateChanged
                        : "",
                  ]
                      .filter(Boolean)
                      .join(" ")}
              >
              {hasChanges ? (
                  <>
                    <Edit3 size={14} />
                    {changedFields.length}{" "}
                    {changedFields.length === 1
                        ? "change"
                        : "changes"}{" "}
                    not saved
                  </>
              ) : (
                  <>
                    <Check size={14} />
                    Everything saved
                  </>
              )}
            </span>
            </div>

            {loadError && (
                <div
                    className={styles.errorBanner}
                    role="alert"
                >
                  <div>
                    <strong>
                      Session data could not be refreshed
                    </strong>

                    <span>{loadError}</span>
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

            <header className={styles.header}>
              <div className={styles.headerCopy}>
                <p>
                  {profile.university}
                </p>

                <h1>Edit session</h1>

                <span>
                Keep the meeting plan accurate for
                everyone who joined.
              </span>
              </div>

              <button
                  type="button"
                  className={styles.viewButton}
                  onClick={() =>
                      requestNavigation(
                          `/sessions/${id}`,
                      )
                  }
              >
                View session
                <ArrowRight size={15} />
              </button>
            </header>

            <div className={styles.contentGrid}>
              <form
                  className={styles.formCard}
                  onSubmit={saveSession}
                  noValidate
              >
                <div className={styles.formHeader}>
                  <div>
                    <h2>Session details</h2>

                    <p>
                      Changes are published to the
                      existing session and attendee
                      list.
                    </p>
                  </div>

                  {hasChanges && (
                      <span>
                    Unsaved changes
                  </span>
                  )}
                </div>

                <FormSection
                    icon={<BookOpen size={17} />}
                    title="Course and title"
                    description="Update how the meetup appears in session discovery."
                >
                  <div
                      className={styles.twoColumnFields}
                  >
                    <div className={styles.field}>
                      <label htmlFor="edit-course">
                        Course code
                      </label>

                      <input
                          id="edit-course"
                          value={form.courseCode}
                          maxLength={9}
                          onChange={(event) =>
                              updateField(
                                  "courseCode",
                                  normalizeCourseCode(
                                      event.target.value,
                                  ),
                              )
                          }
                          placeholder="CS400"
                          autoComplete="off"
                          aria-invalid={Boolean(
                              submitAttempted &&
                              fieldErrors.courseCode,
                          )}
                      />

                      {myCourses.length > 0 && (
                          <div
                              className={styles.courseChips}
                          >
                            {myCourses.map((course) => (
                                <button
                                    key={course}
                                    type="button"
                                    className={
                                      normalizedForm.courseCode ===
                                      course
                                          ? styles.chipActive
                                          : undefined
                                    }
                                    onClick={() =>
                                        updateField(
                                            "courseCode",
                                            course,
                                        )
                                    }
                                >
                                  {course}
                                </button>
                            ))}
                          </div>
                      )}

                      {submitAttempted &&
                          fieldErrors.courseCode && (
                              <p
                                  className={styles.fieldError}
                              >
                                {fieldErrors.courseCode}
                              </p>
                          )}
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="edit-title">
                        Session title
                      </label>

                      <input
                          id="edit-title"
                          value={form.title}
                          maxLength={MAX_TITLE_LENGTH}
                          onChange={(event) =>
                              updateField(
                                  "title",
                                  event.target.value,
                              )
                          }
                          placeholder="CS400 Midterm Review"
                          autoComplete="off"
                          aria-invalid={Boolean(
                              submitAttempted &&
                              fieldErrors.title,
                          )}
                      />

                      <FieldFooter
                          hint="Keep it specific and easy to scan."
                          count={`${form.title.length}/${MAX_TITLE_LENGTH}`}
                      />

                      {submitAttempted &&
                          fieldErrors.title && (
                              <p
                                  className={styles.fieldError}
                              >
                                {fieldErrors.title}
                              </p>
                          )}
                    </div>
                  </div>
                </FormSection>

                <FormSection
                    icon={<MapPin size={17} />}
                    title="Meeting place"
                    description="Make sure students can reach the correct room or table."
                >
                  <div
                      className={styles.twoColumnFields}
                  >
                    <div className={styles.field}>
                      <label htmlFor="edit-location">
                        Exact location
                      </label>

                      <input
                          id="edit-location"
                          value={form.location}
                          maxLength={MAX_LOCATION_LENGTH}
                          onChange={(event) =>
                              updateField(
                                  "location",
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

                      <FieldFooter
                          hint="Building, floor, room, or area."
                          count={`${form.location.length}/${MAX_LOCATION_LENGTH}`}
                      />

                      {submitAttempted &&
                          fieldErrors.location && (
                              <p
                                  className={styles.fieldError}
                              >
                                {fieldErrors.location}
                              </p>
                          )}
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="edit-identification">
                        How to find the group
                      </label>

                      <input
                          id="edit-identification"
                          value={form.identification}
                          maxLength={
                            MAX_IDENTIFICATION_LENGTH
                          }
                          onChange={(event) =>
                              updateField(
                                  "identification",
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

                      <FieldFooter
                          hint="Avoid contact information."
                          count={`${form.identification.length}/${MAX_IDENTIFICATION_LENGTH}`}
                      />

                      {submitAttempted &&
                          fieldErrors.identification && (
                              <p
                                  className={styles.fieldError}
                              >
                                {fieldErrors.identification}
                              </p>
                          )}
                    </div>
                  </div>
                </FormSection>

                <FormSection
                    icon={<Clock3 size={17} />}
                    title="Schedule"
                    description="Update when the meetup starts and how long it lasts."
                >
                  <div
                      className={styles.scheduleShortcuts}
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
                        onClick={applyTomorrowEvening}
                    >
                      Tomorrow at 6 PM
                    </button>
                  </div>

                  <div
                      className={styles.twoColumnFields}
                  >
                    <div className={styles.field}>
                      <label htmlFor="edit-start">
                        Starts
                      </label>

                      <input
                          id="edit-start"
                          type="datetime-local"
                          value={form.startTime}
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
                      <label htmlFor="edit-end">
                        Ends
                      </label>

                      <input
                          id="edit-end"
                          type="datetime-local"
                          value={form.endTime}
                          min={form.startTime}
                          onChange={(event) =>
                              updateField(
                                  "endTime",
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

                  <div className={styles.durationRow}>
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
                                        ? styles.chipActive
                                        : undefined
                                  }
                                  onClick={() =>
                                      applyDuration(minutes)
                                  }
                              >
                                {formatDuration(minutes)}
                              </button>
                          ),
                      )}
                    </div>
                  </div>

                  {submitAttempted &&
                      fieldErrors.schedule && (
                          <p
                              className={styles.scheduleError}
                          >
                            {fieldErrors.schedule}
                          </p>
                      )}
                </FormSection>

                <FormSection
                    icon={<Eye size={17} />}
                    title="Study plan"
                    description="Explain what students will work on together."
                >
                  <div className={styles.field}>
                    <label htmlFor="edit-description">
                      Description
                    </label>

                    <textarea
                        id="edit-description"
                        value={form.description}
                        maxLength={MAX_DESCRIPTION_LENGTH}
                        rows={5}
                        onChange={(event) =>
                            updateField(
                                "description",
                                event.target.value,
                            )
                        }
                        placeholder="Reviewing dynamic programming problems and preparing for the midterm"
                        aria-invalid={Boolean(
                            submitAttempted &&
                            fieldErrors.description,
                        )}
                    />

                    <FieldFooter
                        hint="Mention the topic, assignment, or exam."
                        count={`${form.description.length}/${MAX_DESCRIPTION_LENGTH}`}
                    />

                    {submitAttempted &&
                        fieldErrors.description && (
                            <p
                                className={styles.fieldError}
                            >
                              {fieldErrors.description}
                            </p>
                        )}
                  </div>
                </FormSection>

                {fieldErrors.safety &&
                    fieldErrors.safety.length > 0 && (
                        <div
                            className={styles.safetyError}
                            role="alert"
                        >
                          <ShieldCheck size={18} />

                          <div>
                            <strong>
                              Remove private or unsafe content
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
                      {hasChanges
                          ? `${changedFields.join(", ")} ${
                              changedFields.length === 1
                                  ? "has"
                                  : "have"
                          } changed.`
                          : "This session matches the saved version."}
                    </strong>

                    <span>
                    Saving updates the existing session
                    for every attendee.
                  </span>
                  </div>

                  <div className={styles.actionButtons}>
                    {hasChanges && (
                        <button
                            type="button"
                            className={styles.resetButton}
                            disabled={saving}
                            onClick={resetChanges}
                        >
                          <RotateCcw size={15} />
                          Reset
                        </button>
                    )}

                    <button
                        type="submit"
                        className={styles.saveButton}
                        disabled={
                            saving ||
                            !hasChanges
                        }
                    >
                      <Save size={16} />

                      {saving
                          ? "Saving…"
                          : "Save changes"}
                    </button>
                  </div>
                </div>
              </form>

              <aside className={styles.sidebar}>
                <section className={styles.previewCard}>
                  <div className={styles.previewHeader}>
                    <div>
                      <p>Preview</p>
                      <h2>
                        Updated session card
                      </h2>
                    </div>

                    <Edit3 size={18} />
                  </div>

                  <article className={styles.sessionPreview}>
                    <div className={styles.previewTop}>
                    <span className={styles.previewCourse}>
                      {previewCourse}
                    </span>

                      <span>
                      {formatDuration(
                          durationMinutes,
                      )}
                    </span>
                    </div>

                    <h3>{previewTitle}</h3>

                    <div className={styles.previewMeta}>
                    <span>
                      <CalendarDays size={14} />
                      {formatSessionDate(
                          form.startTime,
                      )}
                    </span>

                      <span>
                      <Clock3 size={14} />
                        {formatSessionTime(
                            form.startTime,
                        )}{" "}
                        –{" "}
                        {formatSessionTime(
                            form.endTime,
                        )}
                    </span>

                      <span>
                      <MapPin size={14} />
                        {previewLocation}
                    </span>
                    </div>

                    <p className={styles.previewDescription}>
                      {previewDescription}
                    </p>

                    <div
                        className={styles.previewIdentification}
                    >
                      <User size={14} />
                      <span>
                      {previewIdentification}
                    </span>
                    </div>

                    <div className={styles.previewHost}>
                      <div className={styles.avatar}>
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

                <section className={styles.changeCard}>
                  <div className={styles.sideHeading}>
                    <div>
                      <p>Changes</p>
                      <h2>
                        {hasChanges
                            ? `${changedFields.length} pending`
                            : "Everything saved"}
                      </h2>
                    </div>

                    {hasChanges ? (
                        <Edit3 size={18} />
                    ) : (
                        <Check size={18} />
                    )}
                  </div>

                  {hasChanges ? (
                      <ul>
                        {changedFields.map((field) => (
                            <li key={field}>
                              <Check size={13} />
                              {field}
                            </li>
                        ))}
                      </ul>
                  ) : (
                      <p>
                        Make a change in the form to update
                        this session.
                      </p>
                  )}
                </section>

                <section className={styles.rulesCard}>
                  <div>
                    <ShieldCheck size={18} />

                    <span>
                    <strong>
                      Public campus details
                    </strong>

                    <small>
                      Phone numbers, social handles,
                      links, and inappropriate language
                      remain blocked.
                    </small>
                  </span>
                  </div>

                  <div>
                    <Clock3 size={18} />

                    <span>
                    <strong>
                      Keep attendees informed
                    </strong>

                    <small>
                      Update the meeting time or location
                      as soon as plans change.
                    </small>
                  </span>
                  </div>
                </section>

                <section className={styles.dangerCard}>
                  <div>
                    <p>Danger zone</p>
                    <h2>Delete session</h2>

                    <span>
                    This removes the session and sends
                    you back to the dashboard.
                  </span>
                  </div>

                  <button
                      type="button"
                      disabled={deleting}
                      onClick={() =>
                          setDeleteOpen(true)
                      }
                  >
                    <Trash2 size={16} />
                    Delete session
                  </button>
                </section>
              </aside>
            </div>
          </div>
        </main>

        {discardOpen && (
            <ConfirmDialog
                title="Discard unsaved changes?"
                description="Your edits will be lost and the saved session will remain unchanged."
                confirmLabel="Discard changes"
                tone="neutral"
                busy={false}
                onCancel={() => {
                  setDiscardOpen(false);
                  setPendingNavigation(null);
                }}
                onConfirm={discardAndNavigate}
            />
        )}

        {deleteOpen && (
            <ConfirmDialog
                title="Delete this session?"
                description="This cannot be undone. The session will disappear from campus discovery and attendee schedules."
                confirmLabel={
                  deleting
                      ? "Deleting…"
                      : "Delete session"
                }
                tone="danger"
                busy={deleting}
                onCancel={() =>
                    setDeleteOpen(false)
                }
                onConfirm={() =>
                    void deleteSession()
                }
            />
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

function FormSection({
                       icon,
                       title,
                       description,
                       children,
                     }: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
      <section className={styles.section}>
        <div className={styles.sectionHeading}>
        <span className={styles.sectionIcon}>
          {icon}
        </span>

          <div>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        </div>

        {children}
      </section>
  );
}

function FieldFooter({
                       hint,
                       count,
                     }: {
  hint: string;
  count: string;
}) {
  return (
      <div className={styles.fieldFooter}>
        <span>{hint}</span>
        <span>{count}</span>
      </div>
  );
}

function ConfirmDialog({
                         title,
                         description,
                         confirmLabel,
                         tone,
                         busy,
                         onCancel,
                         onConfirm,
                       }: {
  title: string;
  description: string;
  confirmLabel: string;
  tone: "neutral" | "danger";
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
      <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (
                event.target ===
                event.currentTarget &&
                !busy
            ) {
              onCancel();
            }
          }}
      >
        <section
            className={styles.confirmDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-session-confirm-title"
        >
        <span
            className={[
              styles.confirmIcon,
              tone === "danger"
                  ? styles.confirmIconDanger
                  : "",
            ]
                .filter(Boolean)
                .join(" ")}
        >
          {tone === "danger" ? (
              <Trash2 size={21} />
          ) : (
              <RotateCcw size={21} />
          )}
        </span>

          <h2 id="edit-session-confirm-title">
            {title}
          </h2>

          <p>{description}</p>

          <div className={styles.confirmActions}>
            <button
                type="button"
                disabled={busy}
                onClick={onCancel}
            >
              Cancel
            </button>

            <button
                type="button"
                disabled={busy}
                className={
                  tone === "danger"
                      ? styles.confirmDanger
                      : styles.confirmPrimary
                }
                onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </section>
      </div>
  );
}

function EditSessionLoading() {
  return (
      <main
          id="studygrouprr-edit-session"
          className={styles.loadingPage}
          role="status"
          aria-live="polite"
      >
        <div className={styles.loadingCard}>
          <strong>
            Loading session controls…
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
