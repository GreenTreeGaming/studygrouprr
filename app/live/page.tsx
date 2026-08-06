"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock3,
  Eye,
  MapPin,
  Radio,
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

import styles from "./live.module.css";

type LiveStatus = {
  id: string;
  user_id: string;
  course_code: string;
  location_name: string;
  description: string | null;
  identification: string | null;
  created_at: string;
};

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
  location?: string;
  description?: string;
  identification?: string;
  safety?: string[];
};

const LIVE_DURATION_MS = 2 * 60 * 60 * 1000;
const MAX_DESCRIPTION_LENGTH = 300;
const MAX_IDENTIFICATION_LENGTH = 180;
const MAX_LOCATION_LENGTH = 160;

const linkRegex = /(https?:\/\/|www\.)/i;

const phoneRegex =
    /(\+?1)?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;

const socialRegex =
    /(instagram|snapchat|discord|telegram|tiktok|@)/i;

function formatDuration(milliseconds: number): string {
  const safeMilliseconds = Math.max(
      0,
      milliseconds,
  );

  const totalMinutes = Math.floor(
      safeMilliseconds / 60_000,
  );

  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes > 0
      ? `${hours}h ${minutes}m`
      : `${hours}h`;
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

  const canShowImage =
      typeof src === "string" &&
      src.trim().length > 0 &&
      !imageFailed;

  if (!canShowImage) {
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

export default function LivePage() {
  const router = useRouter();

  const {
    profile,
    loading: onboardingLoading,
  } = useRequireOnboarding();

  const [pageLoading, setPageLoading] =
      useState(true);

  const [reloadKey, setReloadKey] =
      useState(0);

  const [loadError, setLoadError] =
      useState<string | null>(null);

  const [courseCode, setCourseCode] =
      useState("");

  const [location, setLocation] =
      useState("");

  const [description, setDescription] =
      useState("");

  const [
    identification,
    setIdentification,
  ] = useState("");

  const [myCourses, setMyCourses] =
      useState<string[]>([]);

  const [saving, setSaving] =
      useState(false);

  const [ending, setEnding] =
      useState(false);

  const [
    submitAttempted,
    setSubmitAttempted,
  ] = useState(false);

  const [liveStatus, setLiveStatus] =
      useState<LiveStatus | null>(null);

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

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 30_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (onboardingLoading) {
      return;
    }

    let cancelled = false;

    async function loadPage() {
      setPageLoading(true);
      setLoadError(null);

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

        const [
          statusResult,
          coursesResult,
        ] = await Promise.all([
          supabase
              .from("live_study_status")
              .select("*")
              .eq("user_id", user.id)
              .maybeSingle(),

          supabase
              .from("user_courses")
              .select("course_code")
              .eq("user_id", user.id)
              .order("course_code"),
        ]);

        if (statusResult.error) {
          throw statusResult.error;
        }

        if (coursesResult.error) {
          throw coursesResult.error;
        }

        const courses = Array.from(
            new Set(
                (coursesResult.data ?? [])
                    .map((course) =>
                        typeof course.course_code ===
                        "string"
                            ? normalizeCourseCode(
                                course.course_code,
                            )
                            : "",
                    )
                    .filter(Boolean),
            ),
        );

        const status =
            statusResult.data as LiveStatus | null;

        if (cancelled) {
          return;
        }

        setMyCourses(courses);

        if (!status) {
          setLiveStatus(null);
          return;
        }

        const statusAge =
            Date.now() -
            new Date(
                status.created_at,
            ).getTime();

        if (statusAge >= LIVE_DURATION_MS) {
          const { error: deleteError } =
              await supabase
                  .from("live_study_status")
                  .delete()
                  .eq("id", status.id);

          if (deleteError) {
            throw deleteError;
          }

          if (!cancelled) {
            setLiveStatus(null);

            window.dispatchEvent(
                new Event(
                    "live-status-changed",
                ),
            );
          }

          return;
        }

        const normalizedStatus = {
          ...status,
          course_code:
              normalizeCourseCode(
                  status.course_code,
              ),
        };

        setLiveStatus(normalizedStatus);
        setCourseCode(
            normalizedStatus.course_code,
        );
        setLocation(
            normalizedStatus.location_name,
        );
        setDescription(
            normalizedStatus.description || "",
        );
        setIdentification(
            normalizedStatus.identification || "",
        );
      } catch (error) {
        console.error(
            "Unable to load live status:",
            error,
        );

        if (!cancelled) {
          setLoadError(
              error instanceof Error
                  ? error.message
                  : "Your live status could not be loaded.",
          );
        }
      } finally {
        if (!cancelled) {
          setPageLoading(false);
        }
      }
    }

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, [
    onboardingLoading,
    reloadKey,
    router,
  ]);

  const normalizedCourseCode = useMemo(
      () =>
          normalizeCourseCode(courseCode),
      [courseCode],
  );

  const combinedText = useMemo(
      () =>
          [
            courseCode,
            location,
            description,
            identification,
          ].join(" "),
      [
        courseCode,
        description,
        identification,
        location,
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
            !isValidCourseCode(
                normalizedCourseCode,
            )
        ) {
          errors.courseCode =
              "Use a code such as CS400, MATH340, or BIO101.";
        }

        if (!location.trim()) {
          errors.location =
              "Enter where you are studying.";
        } else if (
            location.trim().length < 10
        ) {
          errors.location =
              "Add the building and a specific area.";
        }

        if (!description.trim()) {
          errors.description =
              "Say what you are working on.";
        } else if (
            description.trim().length < 10
        ) {
          errors.description =
              "Add a little more study detail.";
        }

        if (!identification.trim()) {
          errors.identification =
              "Describe how classmates can recognize you.";
        } else if (
            identification.trim().length < 10
        ) {
          errors.identification =
              "Add a clearer visual description.";
        }

        if (phoneRegex.test(combinedText)) {
          safetyErrors.push(
              "Phone numbers are not allowed.",
          );
        }

        if (socialRegex.test(combinedText)) {
          safetyErrors.push(
              "Social handles are not allowed.",
          );
        }

        if (linkRegex.test(combinedText)) {
          safetyErrors.push(
              "Links are not allowed.",
          );
        }

        if (
            containsInappropriateContent(
                combinedText,
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
        combinedText,
        description,
        identification,
        location,
        normalizedCourseCode,
      ]);

  const validationMessages = useMemo(
      () =>
          [
            fieldErrors.courseCode,
            fieldErrors.location,
            fieldErrors.description,
            fieldErrors.identification,
            ...(fieldErrors.safety ?? []),
          ].filter(
              (message): message is string =>
                  Boolean(message),
          ),
      [fieldErrors],
  );

  const canSubmit =
      validationMessages.length === 0;

  const liveStartedAt = liveStatus
      ? new Date(
          liveStatus.created_at,
      ).getTime()
      : 0;

  const liveElapsed = liveStatus
      ? currentTime - liveStartedAt
      : 0;

  const liveRemaining = liveStatus
      ? liveStartedAt +
      LIVE_DURATION_MS -
      currentTime
      : LIVE_DURATION_MS;

  const liveRemainingPercentage =
      liveStatus
          ? Math.max(
              0,
              Math.min(
                  100,
                  (liveRemaining /
                      LIVE_DURATION_MS) *
                  100,
              ),
          )
          : 100;

  useEffect(() => {
    if (
        !liveStatus ||
        liveRemaining > 0
    ) {
      return;
    }

    let cancelled = false;

    async function expireStatus() {
      const { error } = await supabase
          .from("live_study_status")
          .delete()
          .eq("id", liveStatus!.id);

      if (error) {
        console.error(
            "Unable to expire live status:",
            error,
        );
        return;
      }

      if (!cancelled) {
        setLiveStatus(null);

        window.dispatchEvent(
            new Event(
                "live-status-changed",
            ),
        );
      }
    }

    void expireStatus();

    return () => {
      cancelled = true;
    };
  }, [liveRemaining, liveStatus]);

  async function saveLiveStatus(
      event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setSubmitAttempted(true);

    if (!canSubmit) {
      showAlert(
          "Check your details",
          validationMessages[0] ||
          "Complete all four fields before going live.",
          "warning",
      );
      return;
    }

    setSaving(true);

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

      const payload = {
        course_code:
        normalizedCourseCode,
        location_name: location.trim(),
        description:
            description.trim(),
        identification:
            identification.trim(),
      };

      let savedStatus: LiveStatus;

      if (liveStatus) {
        const {
          data,
          error,
        } = await supabase
            .from("live_study_status")
            .update(payload)
            .eq("id", liveStatus.id)
            .eq("user_id", user.id)
            .select("*")
            .single();

        if (error) {
          throw error;
        }

        savedStatus = data as LiveStatus;
      } else {
        const { error: deleteError } =
            await supabase
                .from("live_study_status")
                .delete()
                .eq("user_id", user.id);

        if (deleteError) {
          throw deleteError;
        }

        const {
          data,
          error,
        } = await supabase
            .from("live_study_status")
            .insert({
              user_id: user.id,
              ...payload,
            })
            .select("*")
            .single();

        if (error) {
          throw error;
        }

        savedStatus = data as LiveStatus;
      }

      const normalizedStatus = {
        ...savedStatus,
        course_code:
            normalizeCourseCode(
                savedStatus.course_code,
            ),
      };

      setLiveStatus(normalizedStatus);
      setCurrentTime(Date.now());
      setSubmitAttempted(false);

      window.dispatchEvent(
          new Event("live-status-changed"),
      );

      showAlert(
          liveStatus
              ? "Live status updated"
              : "You’re live",
          liveStatus
              ? "Your new details are visible to classmates."
              : "Classmates at your university can now find you.",
          "success",
      );
    } catch (error) {
      console.error(
          "Unable to save live status:",
          error,
      );

      showAlert(
          liveStatus
              ? "Unable to update status"
              : "Unable to go live",
          error instanceof Error
              ? error.message
              : "Your live study status could not be saved.",
          "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function endLiveStatus() {
    if (!liveStatus) {
      return;
    }

    setEnding(true);

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

      const { error } = await supabase
          .from("live_study_status")
          .delete()
          .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      setLiveStatus(null);
      setCurrentTime(Date.now());

      window.dispatchEvent(
          new Event("live-status-changed"),
      );

      showAlert(
          "Live status ended",
          "You are no longer visible in campus live feeds.",
          "success",
      );
    } catch (error) {
      console.error(
          "Unable to end live status:",
          error,
      );

      showAlert(
          "Unable to end live status",
          error instanceof Error
              ? error.message
              : "Please try again.",
          "error",
      );
    } finally {
      setEnding(false);
    }
  }

  function clearForm() {
    setCourseCode("");
    setLocation("");
    setDescription("");
    setIdentification("");
    setSubmitAttempted(false);
  }

  const previewCourse =
      normalizedCourseCode || "COURSE";

  const previewLocation =
      location.trim() ||
      "Your campus location";

  const previewDescription =
      description.trim() ||
      "What you are studying";

  const previewIdentification =
      identification.trim() ||
      "How classmates can identify you";

  if (
      onboardingLoading ||
      (profile && pageLoading)
  ) {
    return <LiveLoading />;
  }

  if (!profile) {
    return (
        <main
            id="studygrouprr-live"
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
            id="studygrouprr-live"
            className={styles.page}
        >
          <div className={styles.shell}>
            <div className={styles.backRow}>
              <Link href="/dashboard">
                <ArrowLeft size={16} />
                Dashboard
              </Link>

              <Link href="/sessions">
                View sessions
                <ArrowRight size={15} />
              </Link>
            </div>

            {loadError && (
                <div
                    className={styles.errorBanner}
                    role="alert"
                >
                  <div>
                    <strong>
                      Live status could not be loaded
                    </strong>

                    <span>{loadError}</span>
                  </div>

                  <button
                      type="button"
                      onClick={() =>
                          setReloadKey(
                              (current) =>
                                  current + 1,
                          )
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

                <h1>Go live</h1>

                <span>
                Let classmates know where you are
                studying right now.
              </span>
              </div>

              <span
                  className={[
                    styles.statusBadge,
                    liveStatus
                        ? styles.statusBadgeLive
                        : "",
                  ]
                      .filter(Boolean)
                      .join(" ")}
              >
              <Radio size={15} />

                {liveStatus
                    ? "Currently live"
                    : "Not live"}
            </span>
            </header>

            {liveStatus && (
                <section
                    className={styles.activeBar}
                    aria-label="Active live status"
                >
                  <div
                      className={styles.activeSummary}
                  >
                <span
                    className={styles.activeIcon}
                >
                  <Radio size={18} />
                </span>

                    <div>
                      <strong>
                        You are visible to classmates
                      </strong>

                      <span>
                    Live for{" "}
                        {formatDuration(
                            liveElapsed,
                        )}{" "}
                        ·{" "}
                        {formatDuration(
                            liveRemaining,
                        )}{" "}
                        remaining
                  </span>
                    </div>
                  </div>

                  <div
                      className={styles.activeProgress}
                      aria-hidden="true"
                  >
                <span
                    style={{
                      width: `${liveRemainingPercentage}%`,
                    }}
                />
                  </div>

                  <button
                      type="button"
                      disabled={ending}
                      onClick={() =>
                          void endLiveStatus()
                      }
                  >
                    <Trash2 size={15} />

                    {ending
                        ? "Ending…"
                        : "End live status"}
                  </button>
                </section>
            )}

            <div className={styles.contentGrid}>
              <form
                  className={styles.formCard}
                  onSubmit={saveLiveStatus}
                  noValidate
              >
                <div className={styles.formHeader}>
                  <div>
                    <h2>
                      {liveStatus
                          ? "Update your live details"
                          : "Share your study location"}
                    </h2>

                    <p>
                      All four details are required so
                      classmates can decide quickly
                      whether to join.
                    </p>
                  </div>

                  {liveStatus && (
                      <span>
                    Changes stay live
                  </span>
                  )}
                </div>

                <div className={styles.fields}>
                  <div className={styles.field}>
                    <label htmlFor="live-course">
                    <span
                        className={styles.fieldIcon}
                    >
                      <BookOpen size={17} />
                    </span>

                      <span>
                      <strong>Course</strong>
                      <small>
                        Which class are you studying?
                      </small>
                    </span>
                    </label>

                    <input
                        id="live-course"
                        value={courseCode}
                        onChange={(event) =>
                            setCourseCode(
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
                                    normalizedCourseCode ===
                                    normalizeCourseCode(
                                        course,
                                    )
                                        ? styles.courseChipActive
                                        : undefined
                                  }
                                  onClick={() =>
                                      setCourseCode(
                                          normalizeCourseCode(
                                              course,
                                          ),
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
                                className={
                                  styles.fieldError
                                }
                            >
                              {fieldErrors.courseCode}
                            </p>
                        )}
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="live-location">
                    <span
                        className={styles.fieldIcon}
                    >
                      <MapPin size={17} />
                    </span>

                      <span>
                      <strong>
                        Exact location
                      </strong>
                      <small>
                        Building, floor, room, or area
                      </small>
                    </span>
                    </label>

                    <input
                        id="live-location"
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
                        className={styles.fieldFooter}
                    >
                    <span>
                      Be specific enough to find.
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
                    <label htmlFor="live-description">
                    <span
                        className={styles.fieldIcon}
                    >
                      <Eye size={17} />
                    </span>

                      <span>
                      <strong>
                        What are you studying?
                      </strong>
                      <small>
                        Topic, assignment, or exam
                      </small>
                    </span>
                    </label>

                    <textarea
                        id="live-description"
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
                        placeholder="Reviewing dynamic programming problems for the midterm"
                        aria-invalid={Boolean(
                            submitAttempted &&
                            fieldErrors.description,
                        )}
                    />

                    <div
                        className={styles.fieldFooter}
                    >
                    <span>
                      Explain what someone can join.
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

                  <div className={styles.field}>
                    <label htmlFor="live-identification">
                    <span
                        className={styles.fieldIcon}
                    >
                      <User size={17} />
                    </span>

                      <span>
                      <strong>
                        How can they spot you?
                      </strong>
                      <small>
                        A short visual description
                      </small>
                    </span>
                    </label>

                    <input
                        id="live-identification"
                        value={identification}
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
                        aria-invalid={Boolean(
                            submitAttempted &&
                            fieldErrors.identification,
                        )}
                    />

                    <div
                        className={styles.fieldFooter}
                    >
                    <span>
                      Do not include contact details.
                    </span>

                      <span>
                      {identification.length}/
                        {MAX_IDENTIFICATION_LENGTH}
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

                {fieldErrors.safety &&
                    fieldErrors.safety.length > 0 && (
                        <div
                            className={styles.safetyError}
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
                      {liveStatus
                          ? "Your current timer will not reset."
                          : "Your status expires automatically after two hours."}
                    </strong>

                    <span>
                    Visible only to students at{" "}
                      {profile.university}.
                  </span>
                  </div>

                  <div
                      className={
                        styles.actionButtons
                      }
                  >
                    {!liveStatus &&
                        (courseCode ||
                            location ||
                            description ||
                            identification) && (
                            <button
                                type="button"
                                className={
                                  styles.clearButton
                                }
                                onClick={clearForm}
                                disabled={saving}
                            >
                              Clear
                            </button>
                        )}

                    <button
                        type="submit"
                        className={
                          styles.submitButton
                        }
                        disabled={saving}
                    >
                      <Radio size={17} />

                      {saving
                          ? "Saving…"
                          : liveStatus
                              ? "Update live status"
                              : "Go live now"}
                    </button>
                  </div>
                </div>
              </form>

              <aside className={styles.sidebar}>
                <section className={styles.previewCard}>
                  <div
                      className={styles.previewHeader}
                  >
                    <div>
                      <p>Preview</p>
                      <h2>
                        What classmates see
                      </h2>
                    </div>

                    <span>
                    {liveStatus
                        ? "Live"
                        : "Preview"}
                  </span>
                  </div>

                  <article
                      className={styles.studentCard}
                  >
                    <div
                        className={styles.studentTop}
                    >
                      <div
                          className={styles.avatar}
                      >
                        <SafeAvatar
                            src={profile.avatar_url}
                            name={profile.name}
                        />
                      </div>

                      <div
                          className={
                            styles.studentIdentity
                          }
                      >
                        <strong>
                          {profile.name ||
                              "Campus student"}
                        </strong>

                        <span>
                        {[
                              profile.major,
                              profile.year,
                            ]
                                .filter(Boolean)
                                .join(" · ") ||
                            profile.university}
                      </span>
                      </div>

                      <span
                          className={
                            styles.previewCourse
                          }
                      >
                      {previewCourse}
                    </span>
                    </div>

                    <div
                        className={
                          styles.previewLocation
                        }
                    >
                      <MapPin size={15} />
                      <span>
                      {previewLocation}
                    </span>
                    </div>

                    <div
                        className={styles.previewStudy}
                    >
                      <small>
                        Currently studying
                      </small>

                      <p>
                        {previewDescription}
                      </p>
                    </div>

                    <div
                        className={
                          styles.previewIdentification
                        }
                    >
                      <Eye size={14} />

                      <span>
                      {previewIdentification}
                    </span>
                    </div>
                  </article>
                </section>

                <section className={styles.rulesCard}>
                  <div>
                    <ShieldCheck size={18} />

                    <span>
                    <strong>
                      Keep it campus-safe
                    </strong>

                    <small>
                      Links, phone numbers, social
                      handles, and inappropriate
                      language are blocked.
                    </small>
                  </span>
                  </div>

                  <div>
                    <Clock3 size={18} />

                    <span>
                    <strong>
                      Two-hour limit
                    </strong>

                    <small>
                      End your status early when you
                      leave so nobody searches for an
                      empty table.
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

function LiveLoading() {
  return (
      <main
          id="studygrouprr-live"
          className={styles.loadingPage}
          role="status"
          aria-live="polite"
      >
        <div className={styles.loadingCard}>
          <strong>
            Loading your live status…
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
