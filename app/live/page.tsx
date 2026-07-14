"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
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
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  GraduationCap,
  MapPin,
  Radio,
  Radar,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  Waves,
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
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

function getInitial(
    name: string | null | undefined,
): string {
  return name?.trim().charAt(0).toUpperCase() || "S";
}

export default function LivePage() {
  const router = useRouter();

  const {
    profile,
    loading: onboardingLoading,
  } = useRequireOnboarding();

  const rootRef = useRef<HTMLElement>(null);

  const [pageLoading, setPageLoading] =
      useState(true);
  const [loadError, setLoadError] =
      useState<string | null>(null);

  const [courseCode, setCourseCode] =
      useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] =
      useState("");
  const [identification, setIdentification] =
      useState("");

  const [myCourses, setMyCourses] = useState<
      string[]
  >([]);

  const [saving, setSaving] = useState(false);
  const [ending, setEnding] = useState(false);

  const [liveStatus, setLiveStatus] =
      useState<LiveStatus | null>(null);

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
          router.push("/");
          return;
        }

        const [statusResult, coursesResult] =
            await Promise.all([
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

        if (cancelled) {
          return;
        }

        const courses = (
            coursesResult.data ?? []
        )
            .map((course) => course.course_code)
            .filter(
                (
                    value,
                ): value is string =>
                    typeof value === "string" &&
                    value.trim().length > 0,
            );

        setMyCourses(
            Array.from(new Set(courses)),
        );

        const status =
            statusResult.data as LiveStatus | null;

        if (!status) {
          setLiveStatus(null);
          return;
        }

        const statusAge =
            Date.now() -
            new Date(status.created_at).getTime();

        if (statusAge >= LIVE_DURATION_MS) {
          const { error: deleteError } =
              await supabase
                  .from("live_study_status")
                  .delete()
                  .eq("id", status.id);

          if (deleteError) {
            throw deleteError;
          }

          setLiveStatus(null);

          window.dispatchEvent(
              new Event("live-status-changed"),
          );

          return;
        }

        setLiveStatus({
          ...status,
          course_code: normalizeCourseCode(
              status.course_code,
          ),
        });
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
  }, [onboardingLoading, router]);

  const normalizedCourseCode = useMemo(
      () => normalizeCourseCode(courseCode),
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

  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    if (
        normalizedCourseCode &&
        !isValidCourseCode(
            normalizedCourseCode,
        )
    ) {
      errors.push(
          "Enter a valid course code such as CS400, MATH340, or BIO101.",
      );
    }

    if (
        location.trim() &&
        location.trim().length < 10
    ) {
      errors.push(
          "Make the location more specific so classmates can find the correct area.",
      );
    }

    if (
        description.trim() &&
        description.trim().length < 10
    ) {
      errors.push(
          "Add a little more detail about what you are studying.",
      );
    }

    if (
        identification.trim() &&
        identification.trim().length < 10
    ) {
      errors.push(
          "Add a clearer visual description so classmates can recognize you.",
      );
    }

    if (phoneRegex.test(combinedText)) {
      errors.push(
          "Phone numbers are not allowed.",
      );
    }

    if (socialRegex.test(combinedText)) {
      errors.push(
          "Social media handles are not allowed.",
      );
    }

    if (linkRegex.test(combinedText)) {
      errors.push("Links are not allowed.");
    }

    if (
        containsInappropriateContent(
            combinedText,
        )
    ) {
      errors.push(
          "Please remove inappropriate language.",
      );
    }

    return Array.from(new Set(errors));
  }, [
    combinedText,
    description,
    identification,
    location,
    normalizedCourseCode,
  ]);

  const courseReady =
      Boolean(normalizedCourseCode) &&
      isValidCourseCode(normalizedCourseCode);

  const locationReady =
      location.trim().length >= 10;

  const descriptionReady =
      description.trim().length >= 10;

  const identificationReady =
      identification.trim().length >= 10;

  const readySteps = [
    courseReady,
    locationReady,
    descriptionReady,
    identificationReady,
  ].filter(Boolean).length;

  const signalStrength = Math.round(
      (readySteps / 4) * 100,
  );

  const canGoLive =
      courseReady &&
      locationReady &&
      descriptionReady &&
      identificationReady &&
      validationErrors.length === 0;

  const firstName =
      profile?.name?.trim().split(/\s+/)[0] ||
      "there";

  const previewCourse =
      normalizedCourseCode || "YOUR COURSE";

  const previewLocation =
      location.trim() ||
      "Your exact campus location";

  const previewDescription =
      description.trim() ||
      "What are you working on right now?";

  const previewIdentification =
      identification.trim() ||
      "How classmates can recognize you";

  const liveStartedAt = liveStatus
      ? new Date(liveStatus.created_at).getTime()
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
        pageLoading ||
        onboardingLoading ||
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
      gsap.from(".gl-reveal", {
        opacity: 0,
        y: 28,
        duration: 0.72,
        stagger: 0.08,
        ease: "power3.out",
      });

      gsap.from(".gl-wave-node", {
        opacity: 0,
        scale: 0.72,
        duration: 0.8,
        stagger: 0.12,
        delay: 0.2,
        ease: "back.out(1.5)",
      });
    }, rootRef);

    return () => {
      context.revert();
    };
  }, [
    liveStatus?.id,
    onboardingLoading,
    pageLoading,
  ]);

  async function goLive(
      event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!canGoLive) {
      showAlert(
          "Signal Not Ready",
          validationErrors[0] ||
          "Complete all four broadcast details before going live.",
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
        router.push("/");
        return;
      }

      const { error: deleteError } =
          await supabase
              .from("live_study_status")
              .delete()
              .eq("user_id", user.id);

      if (deleteError) {
        throw deleteError;
      }

      const {
        data: insertedStatus,
        error: insertError,
      } = await supabase
          .from("live_study_status")
          .insert({
            user_id: user.id,
            course_code:
            normalizedCourseCode,
            location_name: location.trim(),
            description: description.trim(),
            identification:
                identification.trim(),
          })
          .select("*")
          .single();

      if (insertError) {
        throw insertError;
      }

      setLiveStatus({
        ...(insertedStatus as LiveStatus),
        course_code:
        normalizedCourseCode,
      });

      setCurrentTime(Date.now());

      window.dispatchEvent(
          new Event("live-status-changed"),
      );

      showAlert(
          "You’re Live",
          "Your study signal is now visible to classmates at your university.",
          "success",
      );
    } catch (error) {
      console.error(
          "Unable to go live:",
          error,
      );

      showAlert(
          "Unable to Go Live",
          error instanceof Error
              ? error.message
              : "Your live study status could not be created.",
          "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function stopBroadcast(
      preserveDetails: boolean,
  ) {
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
        router.push("/");
        return;
      }

      const { error } = await supabase
          .from("live_study_status")
          .delete()
          .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      if (preserveDetails) {
        setCourseCode(
            liveStatus.course_code,
        );
        setLocation(
            liveStatus.location_name,
        );
        setDescription(
            liveStatus.description || "",
        );
        setIdentification(
            liveStatus.identification || "",
        );
      } else {
        setCourseCode("");
        setLocation("");
        setDescription("");
        setIdentification("");
      }

      setLiveStatus(null);

      window.dispatchEvent(
          new Event("live-status-changed"),
      );
    } catch (error) {
      console.error(
          "Unable to end live status:",
          error,
      );

      showAlert(
          "Unable to End Broadcast",
          error instanceof Error
              ? error.message
              : "Your live status could not be ended.",
          "error",
      );
    } finally {
      setEnding(false);
    }
  }

  if (
      pageLoading ||
      onboardingLoading
  ) {
    return (
        <>
          <style>{livePageStyles}</style>

          <main className="gl-loading">
            <div
                className="gl-loading-transmitter"
                aria-hidden="true"
            >
              <span className="gl-loading-ring gl-loading-ring--one" />
              <span className="gl-loading-ring gl-loading-ring--two" />
              <span className="gl-loading-ring gl-loading-ring--three" />

              <Radio size={28} />
            </div>

            <p>
              Tuning your campus signal…
            </p>
          </main>
        </>
    );
  }

  if (!profile) {
    return (
        <>
          <style>{livePageStyles}</style>

          <main className="gl-loading">
            <p>
              We could not find your
              StudyGrouprr profile.
            </p>

            <Link
                href="/login"
                className="gl-loading-link"
            >
              Return to login
            </Link>
          </main>
        </>
    );
  }

  return (
      <>
        <style>{livePageStyles}</style>

        <main
            ref={rootRef}
            className={`gl-root ${
                liveStatus
                    ? "gl-root--broadcasting"
                    : ""
            }`}
        >
          <div
              className="gl-background-grid"
              aria-hidden="true"
          />

          <div className="gl-glow gl-glow--one" />
          <div className="gl-glow gl-glow--two" />

          <div className="gl-canvas">
            <button
                type="button"
                className="gl-back-button gl-reveal"
                onClick={() => router.back()}
            >
              <ArrowLeft size={17} />
              Back
            </button>

            {loadError && (
                <div
                    className="gl-error-banner"
                    role="alert"
                >
                  <div>
                    <strong>
                      Signal interference
                    </strong>
                    <span>{loadError}</span>
                  </div>

                  <button
                      type="button"
                      onClick={() =>
                          window.location.reload()
                      }
                  >
                    Retry
                  </button>
                </div>
            )}

            {liveStatus ? (
                <section className="gl-active-experience">
                  <div className="gl-active-stage gl-reveal">
                    <div
                        className="gl-active-grid"
                        aria-hidden="true"
                    />

                    <div className="gl-live-heading">
                  <h1>
                        You’re on the
                        <span>campus radar.</span>
                      </h1>

                      <p>
                        Classmates studying{" "}
                        <strong>
                          {liveStatus.course_code}
                        </strong>{" "}
                        can now see where you are,
                        what you’re working on, and
                        how to find you.
                      </p>
                    </div>

                    <div className="gl-broadcast-orbit">
                      <span className="gl-orbit-ring gl-orbit-ring--one gl-wave-node" />
                      <span className="gl-orbit-ring gl-orbit-ring--two gl-wave-node" />
                      <span className="gl-orbit-ring gl-orbit-ring--three gl-wave-node" />

                      <div className="gl-broadcast-sweep" />

                      <div className="gl-live-avatar gl-wave-node">
                        {profile.avatar_url ? (
                            <img
                                src={
                                  profile.avatar_url
                                }
                                alt=""
                            />
                        ) : (
                            <span>
                        {getInitial(
                            profile.name,
                        )}
                      </span>
                        )}

                        <span className="gl-avatar-live-dot" />
                      </div>

                      <div className="gl-orbit-note gl-orbit-note--course gl-wave-node">
                        <BookOpen size={17} />

                        <span>
                      <small>Course</small>
                      <strong>
                        {
                          liveStatus.course_code
                        }
                      </strong>
                    </span>
                      </div>

                      <div className="gl-orbit-note gl-orbit-note--location gl-wave-node">
                        <MapPin size={17} />

                        <span>
                      <small>Broadcasting from</small>
                      <strong>
                        {
                          liveStatus.location_name
                        }
                      </strong>
                    </span>
                      </div>

                      <div className="gl-orbit-note gl-orbit-note--timer gl-wave-node">
                        <Clock size={17} />

                        <span>
                      <small>Live for</small>
                      <strong>
                        {formatDuration(
                            liveElapsed,
                        )}
                      </strong>
                    </span>
                      </div>
                    </div>

                    <div className="gl-active-readout">
                      <div>
                    <span className="gl-readout-icon gl-readout-icon--green">
                      <Eye size={18} />
                    </span>

                        <span>
                      <strong>
                        Discoverable
                      </strong>
                      <small>
                        Visible in campus feeds
                      </small>
                    </span>
                      </div>

                      <span className="gl-readout-divider" />

                      <div>
                    <span className="gl-readout-icon gl-readout-icon--violet">
                      <Radio size={18} />
                    </span>

                        <span>
                      <strong>
                        {formatDuration(
                            liveRemaining,
                        )}
                      </strong>
                      <small>
                        Remaining
                      </small>
                    </span>
                      </div>

                      <span className="gl-readout-divider" />

                      <div>
                    <span className="gl-readout-icon gl-readout-icon--amber">
                      <Users size={18} />
                    </span>

                        <span>
                      <strong>
                        Campus-wide
                      </strong>
                      <small>
                        At {profile.university}
                      </small>
                    </span>
                      </div>
                    </div>
                  </div>

                  <div className="gl-active-layout">
                    <section className="gl-broadcast-details gl-reveal">
                      <div className="gl-section-heading">
                        <div>
                      <span className="gl-section-kicker">
                        <Waves size={15} />
                        Your transmission
                      </span>

                          <h2>
                            What campus can see
                          </h2>

                          <p>
                            This is the information
                            classmates use to decide
                            whether to join you.
                          </p>
                        </div>

                        <span className="gl-live-chip">
                      <span />
                      LIVE
                    </span>
                      </div>

                      <div className="gl-detail-board">
                        <article className="gl-detail-note gl-detail-note--study">
                          <div className="gl-detail-icon">
                            <FileText size={20} />
                          </div>

                          <span>
                        <small>
                          Currently studying
                        </small>

                        <strong>
                          {liveStatus.description}
                        </strong>
                      </span>
                        </article>

                        <article className="gl-detail-note gl-detail-note--find">
                          <div className="gl-detail-icon">
                            <User size={20} />
                          </div>

                          <span>
                        <small>
                          How to find you
                        </small>

                        <strong>
                          {
                            liveStatus.identification
                          }
                        </strong>
                      </span>
                        </article>

                        <article className="gl-expiration-ticket">
                          <div className="gl-ticket-top">
                        <span>
                          Signal lifespan
                        </span>

                            <Clock size={18} />
                          </div>

                          <strong>
                            {formatDuration(
                                liveRemaining,
                            )}
                          </strong>

                          <p>
                            Live statuses automatically
                            expire after two hours.
                          </p>

                          <div className="gl-expiry-track">
                        <span
                            style={{
                              width: `${liveRemainingPercentage}%`,
                            }}
                        />
                          </div>
                        </article>
                      </div>
                    </section>

                    <aside className="gl-active-sidebar">
                      <section className="gl-radar-preview gl-reveal">
                        <div className="gl-preview-top">
                      <span className="gl-preview-live">
                        <span />
                        LIVE
                      </span>

                          <span className="gl-preview-course">
                        {
                          liveStatus.course_code
                        }
                      </span>
                        </div>

                        <div className="gl-preview-person">
                          <div className="gl-preview-avatar">
                            {profile.avatar_url ? (
                                <img
                                    src={
                                      profile.avatar_url
                                    }
                                    alt=""
                                />
                            ) : (
                                <span>
                            {getInitial(
                                profile.name,
                            )}
                          </span>
                            )}
                          </div>

                          <div>
                            <strong>
                              {profile.name}
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
                        </div>

                        <div className="gl-preview-location">
                          <MapPin size={18} />

                          <span>
                        <small>
                          Broadcasting from
                        </small>
                        <strong>
                          {
                            liveStatus.location_name
                          }
                        </strong>
                      </span>
                        </div>

                        <div className="gl-preview-message">
                          <small>
                            Currently studying
                          </small>

                          <p>
                            {
                              liveStatus.description
                            }
                          </p>
                        </div>

                        <div className="gl-preview-find">
                          <Eye size={16} />
                          {
                            liveStatus.identification
                          }
                        </div>

                        <span className="gl-preview-caption">
                      Your campus radar card
                    </span>
                      </section>

                      <section className="gl-control-station gl-reveal">
                    <span className="gl-section-kicker">
                      <Radar size={15} />
                      Broadcast controls
                    </span>

                        <h2>
                          Stay live or retune.
                        </h2>

                        <p>
                          End your signal when you leave
                          so classmates don’t search for
                          an empty table.
                        </p>

                        <Link
                            href="/sessions"
                            className="gl-view-radar-button"
                        >
                          <Radar size={17} />
                          View campus radar
                          <ArrowRight size={16} />
                        </Link>

                        <button
                            type="button"
                            className="gl-edit-button"
                            disabled={ending}
                            onClick={() =>
                                void stopBroadcast(true)
                            }
                        >
                          <Sparkles size={17} />
                          End and edit details
                        </button>

                        <button
                            type="button"
                            className="gl-end-button"
                            disabled={ending}
                            onClick={() =>
                                void stopBroadcast(false)
                            }
                        >
                          <X size={17} />

                          {ending
                              ? "Ending broadcast…"
                              : "End broadcast"}
                        </button>
                      </section>
                    </aside>
                  </div>
                </section>
            ) : (
                <section className="gl-studio-experience">
                  <div className="gl-builder-intro gl-reveal">
                    <div className="gl-builder-intro-copy">
      <span className="gl-stage-eyebrow">
        <Radio size={15} />
        Go live on campus
      </span>

                      <h1>
                        Broadcast your
                        <span>study table.</span>
                      </h1>

                      <p>
                        Fill in four quick details and classmates at{" "}
                        <strong>{profile.university}</strong> can find and join you
                        right now.
                      </p>
                    </div>

                    <div className="gl-builder-progress">
                      <div className="gl-builder-progress-top">
                        <span>Signal readiness</span>
                        <strong>{signalStrength}%</strong>
                      </div>

                      <div className="gl-builder-progress-track">
        <span
            style={{
              width: `${signalStrength}%`,
            }}
        />
                      </div>

                      <p>
                        {readySteps}/4 details complete
                      </p>
                    </div>
                  </div>

                  <div className="gl-primary-builder-layout">
                    <form
                        className="gl-broadcast-console gl-broadcast-console--primary gl-reveal"
                        onSubmit={goLive}
                    >
                      <div className="gl-console-heading gl-console-heading--primary">
                        <div>
          <span className="gl-section-kicker">
            <Zap size={15} />
            Build your live signal
          </span>

                          <h2>Where are you studying?</h2>

                          <p>
                            Keep it clear and specific so classmates can decide
                            quickly whether to join.
                          </p>
                        </div>

                        <div className="gl-live-form-badge">
                          <Radio size={16} />
                          Goes live instantly
                        </div>
                      </div>

                      <div className="gl-console-fields gl-console-fields--primary">
                        <section
                            className={`gl-field-module ${
                                courseReady ? "gl-field-module--ready" : ""
                            }`}
                        >
                          <div className="gl-module-step">
                            <span>01</span>

                            {courseReady && <Check size={16} />}
                          </div>

                          <div className="gl-field-content">
                            <label
                                htmlFor="live-course"
                                className="gl-field-label"
                            >
              <span className="gl-field-icon">
                <BookOpen size={19} />
              </span>

                              <span>
                <strong>Course code</strong>
                <small>Which class are you studying?</small>
              </span>
                            </label>

                            <input
                                id="live-course"
                                className="gl-input"
                                value={courseCode}
                                onChange={(event) =>
                                    setCourseCode(
                                        normalizeCourseCode(event.target.value),
                                    )
                                }
                                placeholder="CS400"
                                autoComplete="off"
                            />

                            {myCourses.length > 0 && (
                                <div className="gl-course-shortcuts">
                                  <span>My courses</span>

                                  <div>
                                    {myCourses.map((course) => (
                                        <button
                                            key={course}
                                            type="button"
                                            className={
                                              normalizedCourseCode ===
                                              normalizeCourseCode(course)
                                                  ? "gl-course-chip gl-course-chip--active"
                                                  : "gl-course-chip"
                                            }
                                            onClick={() =>
                                                setCourseCode(
                                                    normalizeCourseCode(course),
                                                )
                                            }
                                        >
                                          {course}
                                        </button>
                                    ))}
                                  </div>
                                </div>
                            )}

                            {courseCode.trim() && !courseReady && (
                                <p className="gl-field-warning">
                                  Use a valid code such as CS400, MATH340, or BIO101.
                                </p>
                            )}
                          </div>
                        </section>

                        <section
                            className={`gl-field-module ${
                                locationReady ? "gl-field-module--ready" : ""
                            }`}
                        >
                          <div className="gl-module-step">
                            <span>02</span>

                            {locationReady && <Check size={16} />}
                          </div>

                          <div className="gl-field-content">
                            <label
                                htmlFor="live-location"
                                className="gl-field-label"
                            >
              <span className="gl-field-icon gl-field-icon--green">
                <MapPin size={19} />
              </span>

                              <span>
                <strong>Exact location</strong>
                <small>Where should classmates go?</small>
              </span>
                            </label>

                            <input
                                id="live-location"
                                className="gl-input"
                                value={location}
                                maxLength={MAX_LOCATION_LENGTH}
                                onChange={(event) =>
                                    setLocation(event.target.value)
                                }
                                placeholder="Memorial Library, 2nd floor, window tables"
                                autoComplete="off"
                            />

                            <div className="gl-field-bottom">
              <span>
                Include the building, floor, room, or area.
              </span>

                              <span>
                {location.length}/{MAX_LOCATION_LENGTH}
              </span>
                            </div>
                          </div>
                        </section>

                        <section
                            className={`gl-field-module ${
                                descriptionReady ? "gl-field-module--ready" : ""
                            }`}
                        >
                          <div className="gl-module-step">
                            <span>03</span>

                            {descriptionReady && <Check size={16} />}
                          </div>

                          <div className="gl-field-content">
                            <label
                                htmlFor="live-description"
                                className="gl-field-label"
                            >
              <span className="gl-field-icon gl-field-icon--amber">
                <FileText size={19} />
              </span>

                              <span>
                <strong>What are you working on?</strong>
                <small>Give classmates a reason to join.</small>
              </span>
                            </label>

                            <textarea
                                id="live-description"
                                className="gl-textarea"
                                value={description}
                                maxLength={MAX_DESCRIPTION_LENGTH}
                                rows={3}
                                onChange={(event) =>
                                    setDescription(event.target.value)
                                }
                                placeholder="Reviewing dynamic programming problems and preparing for the midterm…"
                            />

                            <div className="gl-field-bottom">
              <span>
                Mention the topic, assignment, or exam.
              </span>

                              <span>
                {description.length}/{MAX_DESCRIPTION_LENGTH}
              </span>
                            </div>
                          </div>
                        </section>

                        <section
                            className={`gl-field-module ${
                                identificationReady
                                    ? "gl-field-module--ready"
                                    : ""
                            }`}
                        >
                          <div className="gl-module-step">
                            <span>04</span>

                            {identificationReady && <Check size={16} />}
                          </div>

                          <div className="gl-field-content">
                            <label
                                htmlFor="live-identification"
                                className="gl-field-label"
                            >
              <span className="gl-field-icon gl-field-icon--blue">
                <User size={19} />
              </span>

                              <span>
                <strong>How can they spot you?</strong>
                <small>
                  Give a quick visual description.
                </small>
              </span>
                            </label>

                            <input
                                id="live-identification"
                                className="gl-input"
                                value={identification}
                                maxLength={MAX_IDENTIFICATION_LENGTH}
                                onChange={(event) =>
                                    setIdentification(event.target.value)
                                }
                                placeholder="Blue hoodie, black backpack, sitting by the windows"
                                autoComplete="off"
                            />

                            <div className="gl-field-bottom">
              <span>
                Avoid sharing contact information.
              </span>

                              <span>
                {identification.length}/
                                {MAX_IDENTIFICATION_LENGTH}
              </span>
                            </div>
                          </div>
                        </section>
                      </div>

                      {combinedText.trim() &&
                          validationErrors.length > 0 && (
                              <div
                                  className="gl-validation-panel"
                                  role="alert"
                              >
                                <ShieldCheck size={21} />

                                <div>
                                  <strong>Fix these details</strong>

                                  <ul>
                                    {validationErrors.map((error) => (
                                        <li key={error}>{error}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                          )}

                      <div
                          className={`gl-broadcast-action-bar ${
                              canGoLive
                                  ? "gl-broadcast-action-bar--ready"
                                  : ""
                          }`}
                      >
                        <div className="gl-action-readiness">
          <span className="gl-action-readiness-icon">
            {canGoLive ? (
                <CheckCircle2 size={21} />
            ) : (
                <Radar size={21} />
            )}
          </span>

                          <span>
            <strong>
              {canGoLive
                  ? "Your signal is ready"
                  : `${readySteps} of 4 details ready`}
            </strong>

            <small>
              {canGoLive
                  ? "Classmates will see you immediately."
                  : "Complete the remaining details to go live."}
            </small>
          </span>
                        </div>

                        <button
                            type="submit"
                            className="gl-go-live-button gl-go-live-button--compact"
                            disabled={saving || !canGoLive}
                        >
          <span className="gl-button-radio">
            <Radio size={21} />
          </span>

                          <span>
            <small>Broadcast for up to two hours</small>

            <strong>
              {saving
                  ? "Starting signal…"
                  : "Go live now"}
            </strong>
          </span>

                          <ArrowRight size={20} />
                        </button>
                      </div>
                    </form>

                    <aside className="gl-primary-preview-column">
                      <section className="gl-card-preview gl-card-preview--primary gl-reveal">
                        <div className="gl-preview-heading">
                          <div>
            <span className="gl-section-kicker gl-section-kicker--light">
              <Eye size={15} />
              Campus preview
            </span>

                            <h2>What classmates see</h2>
                          </div>

                          <span className="gl-preview-eye">
            <Eye size={18} />
          </span>
                        </div>

                        <article className="gl-campus-card">
                          <div className="gl-campus-card-top">
            <span className="gl-card-live">
              <span />
              LIVE
            </span>

                            <span className="gl-card-course">
              {previewCourse}
            </span>
                          </div>

                          <div className="gl-card-person">
                            <div className="gl-card-avatar">
                              {profile.avatar_url ? (
                                  <img
                                      src={profile.avatar_url}
                                      alt=""
                                  />
                              ) : (
                                  <span>
                  {getInitial(profile.name)}
                </span>
                              )}
                            </div>

                            <div>
                              <strong>{profile.name}</strong>

                              <span>
                {[profile.major, profile.year]
                        .filter(Boolean)
                        .join(" · ") ||
                    profile.university}
              </span>
                            </div>
                          </div>

                          <div className="gl-card-location">
            <span>
              <MapPin size={18} />
            </span>

                            <div>
                              <small>Broadcasting from</small>
                              <strong>{previewLocation}</strong>
                            </div>
                          </div>

                          <div className="gl-card-study">
                            <small>Currently studying</small>

                            <p>{previewDescription}</p>
                          </div>

                          <div className="gl-card-identification">
                            <Eye size={16} />
                            <span>{previewIdentification}</span>
                          </div>

                          <div className="gl-card-footer">
            <span>
              <GraduationCap size={15} />
              {profile.university}
            </span>

                            <span className="gl-card-ready">
              {signalStrength === 100
                  ? "Ready"
                  : `${signalStrength}% ready`}
            </span>
                          </div>
                        </article>
                      </section>

                      <section className="gl-quick-rules gl-reveal">
                        <div>
                          <ShieldCheck size={20} />

                          <span>
            <strong>Campus-safe signal</strong>
            <small>
              Contact information, social handles, and links are
              blocked.
            </small>
          </span>
                        </div>

                        <div>
                          <Clock size={20} />

                          <span>
            <strong>Expires automatically</strong>
            <small>
              Your live status disappears after two hours.
            </small>
          </span>
                        </div>
                      </section>
                    </aside>
                  </div>
                </section>
            )}
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

const livePageStyles = `
  .gl-root,
  .gl-root *,
  .gl-loading,
  .gl-loading * {
    box-sizing: border-box;
  }

  .gl-root,
  .gl-loading {
    --gl-indigo: #1B1B3A;
    --gl-indigo-soft: #292953;
    --gl-violet: #7C3AED;
    --gl-violet-dark: #5B21B6;
    --gl-violet-light: #EDE9FE;
    --gl-violet-faint: #F5F3FF;
    --gl-lilac: #C4B5FD;
    --gl-green: #10B981;
    --gl-green-dark: #047857;
    --gl-green-light: #D1FAE5;
    --gl-amber: #F59E0B;
    --gl-amber-dark: #B45309;
    --gl-amber-light: #FEF3C7;
    --gl-red: #EF4444;
    --gl-red-light: #FEE2E2;
    --gl-blue: #0EA5E9;
    --gl-blue-light: #E0F2FE;
    --gl-cream: #FFF9E8;
    --gl-background: #F5F4FB;
    --gl-surface: #FFFFFF;
    --gl-border: #E4E2F0;
    --gl-text: #1B1B3A;
    --gl-muted: #64748B;
    --gl-faint: #94A3B8;
  }

  .gl-root {
    position: relative;
    min-height: 100vh;
    overflow: hidden;
    isolation: isolate;
    padding: 20px 20px 100px;
    color: var(--gl-text);
    background:
      radial-gradient(
        circle at 50% -8%,
        rgba(124, 58, 237, 0.2),
        transparent 30rem
      ),
      var(--gl-background);
  }

  .gl-root--broadcasting {
    background:
      radial-gradient(
        circle at 50% -8%,
        rgba(16, 185, 129, 0.18),
        transparent 31rem
      ),
      #F0FDF7;
  }

  .gl-background-grid {
    position: absolute;
    inset: 0;
    z-index: -4;
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
        black 7%,
        black 92%,
        transparent
      );
  }

  .gl-glow {
    position: absolute;
    z-index: -3;
    border-radius: 999px;
    pointer-events: none;
    filter: blur(6px);
  }

  .gl-glow--one {
    top: 700px;
    right: -220px;
    width: 450px;
    height: 450px;
    background: rgba(16, 185, 129, 0.1);
  }

  .gl-glow--two {
    top: 1300px;
    left: -280px;
    width: 520px;
    height: 520px;
    background: rgba(124, 58, 237, 0.1);
  }

  .gl-canvas {
    position: relative;
    z-index: 1;
    width: min(1180px, 100%);
    margin: 0 auto;
  }

  .gl-back-button {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin: 0 0 16px 5px;
    padding: 8px 10px;
    color: var(--gl-muted);
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid var(--gl-border);
    border-radius: 11px;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    backdrop-filter: blur(12px);
    transition:
      color 150ms ease,
      transform 150ms ease,
      border-color 150ms ease;
  }

  .gl-back-button:hover {
    color: var(--gl-violet);
    border-color: var(--gl-lilac);
    transform: translateX(-3px);
  }

  .gl-error-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 18px;
    padding: 15px 18px;
    color: #991B1B;
    background: var(--gl-red-light);
    border: 1px solid #FCA5A5;
    border-radius: 17px;
  }

  .gl-error-banner > div {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .gl-error-banner strong {
    font-size: 14px;
  }

  .gl-error-banner span {
    font-size: 13px;
  }

  .gl-error-banner button {
    flex-shrink: 0;
    padding: 9px 13px;
    color: white;
    background: var(--gl-red);
    border: 0;
    border-radius: 10px;
    font: inherit;
    font-size: 12px;
    font-weight: 750;
    cursor: pointer;
  }

  .gl-studio-stage,
  .gl-active-stage {
    position: relative;
    min-height: 500px;
    overflow: hidden;
    padding: 55px 50px 110px;
    color: white;
    background:
      radial-gradient(
        circle at 75% 44%,
        rgba(124, 58, 237, 0.42),
        transparent 27%
      ),
      linear-gradient(
        135deg,
        #17172E 0%,
        var(--gl-indigo) 48%,
        #292953 100%
      );
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 48px 48px 24px 48px;
    box-shadow:
      0 30px 80px rgba(27, 27, 58, 0.23),
      inset 0 1px rgba(255, 255, 255, 0.07);
  }

  .gl-active-stage {
    min-height: 570px;
    background:
      radial-gradient(
        circle at 70% 43%,
        rgba(16, 185, 129, 0.38),
        transparent 29%
      ),
      linear-gradient(
        135deg,
        #062E27 0%,
        #064E3B 47%,
        #065F46 100%
      );
  }

  .gl-stage-grid,
  .gl-active-grid {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.14;
    background-image:
      linear-gradient(
        rgba(255, 255, 255, 0.14) 1px,
        transparent 1px
      ),
      linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.14) 1px,
        transparent 1px
      );
    background-size: 37px 37px;
    mask-image:
      radial-gradient(
        circle at 70% 45%,
        black,
        transparent 68%
      );
  }

  .gl-stage-copy,
  .gl-live-heading {
    position: relative;
    z-index: 3;
    width: min(56%, 610px);
  }

  .gl-stage-eyebrow,
  .gl-live-eyebrow,
  .gl-section-kicker {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 13px;
    color: var(--gl-violet);
    font-size: 12px;
    font-weight: 850;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .gl-stage-eyebrow {
    color: var(--gl-lilac);
  }

  .gl-live-eyebrow {
    color: #A7F3D0;
  }

  .gl-live-dot {
    position: relative;
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #34D399;
  }

  .gl-live-dot::after {
    position: absolute;
    inset: -5px;
    content: "";
    border-radius: inherit;
    background: #34D399;
    opacity: 0.3;
    animation: gl-live-pulse 1.6s ease-out infinite;
  }

  .gl-stage-copy h1,
  .gl-live-heading h1 {
    margin: 0;
    font-size: clamp(50px, 6.8vw, 84px);
    font-weight: 850;
    letter-spacing: -0.075em;
    line-height: 0.9;
  }

  .gl-stage-copy h1 span,
  .gl-live-heading h1 span {
    display: block;
    margin-top: 9px;
    color: var(--gl-lilac);
  }

  .gl-live-heading h1 span {
    color: #6EE7B7;
  }

  .gl-stage-copy > p,
  .gl-live-heading > p {
    max-width: 555px;
    margin: 27px 0 0;
    color: rgba(255, 255, 255, 0.62);
    font-size: 16px;
    line-height: 1.75;
  }

  .gl-live-heading > p strong {
    color: white;
  }

  .gl-stage-benefits {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-top: 25px;
    flex-wrap: wrap;
  }

  .gl-stage-benefits span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    color: rgba(255, 255, 255, 0.72);
    background: rgba(255, 255, 255, 0.075);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
  }

  .gl-stage-benefits svg {
    color: #6EE7B7;
  }

  .gl-transmitter-scene,
  .gl-broadcast-orbit {
    position: absolute;
    z-index: 2;
    top: 30px;
    right: 40px;
    width: 435px;
    height: 410px;
  }

  .gl-broadcast-orbit {
    top: 28px;
    height: 445px;
  }

  .gl-transmitter-ring,
  .gl-orbit-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    border: 1px solid rgba(196, 181, 253, 0.24);
    border-radius: 999px;
    transform: translate(-50%, -50%);
  }

  .gl-orbit-ring {
    border-color: rgba(110, 231, 183, 0.27);
  }

  .gl-transmitter-ring--one,
  .gl-orbit-ring--one {
    width: 355px;
    height: 355px;
  }

  .gl-transmitter-ring--two,
  .gl-orbit-ring--two {
    width: 270px;
    height: 270px;
  }

  .gl-transmitter-ring--three,
  .gl-orbit-ring--three {
    width: 185px;
    height: 185px;
  }

  .gl-transmitter-sweep,
  .gl-broadcast-sweep {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 44%;
    height: 44%;
    transform-origin: top left;
    background:
      conic-gradient(
        from 270deg at 0 0,
        transparent 0deg,
        rgba(167, 139, 250, 0.11) 32deg,
        rgba(167, 139, 250, 0.45) 74deg,
        transparent 76deg
      );
    animation: gl-radar-spin 6s linear infinite;
  }

  .gl-broadcast-sweep {
    background:
      conic-gradient(
        from 270deg at 0 0,
        transparent 0deg,
        rgba(52, 211, 153, 0.1) 32deg,
        rgba(52, 211, 153, 0.44) 74deg,
        transparent 76deg
      );
  }

  .gl-transmitter-core,
  .gl-live-avatar {
    position: absolute;
    z-index: 5;
    top: 50%;
    left: 50%;
    display: grid;
    width: 135px;
    height: 135px;
    overflow: visible;
    place-items: center;
    color: white;
    background:
      radial-gradient(
        circle at 35% 28%,
        #A78BFA,
        var(--gl-violet) 56%,
        var(--gl-violet-dark)
      );
    border: 8px solid rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    box-shadow:
      0 0 0 14px rgba(124, 58, 237, 0.08),
      0 24px 55px rgba(0, 0, 0, 0.34);
    transform: translate(-50%, -50%);
  }

  .gl-live-avatar {
    width: 150px;
    height: 150px;
    background: var(--gl-green);
    box-shadow:
      0 0 0 14px rgba(16, 185, 129, 0.09),
      0 24px 55px rgba(0, 0, 0, 0.34);
  }

  .gl-transmitter-core > img,
  .gl-live-avatar > img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: inherit;
  }

  .gl-transmitter-core > span,
  .gl-live-avatar > span {
    font-size: 38px;
    font-weight: 850;
  }

  .gl-transmitter-radio {
    position: absolute;
    right: -5px;
    bottom: 1px;
    display: grid;
    width: 41px;
    height: 41px;
    place-items: center;
    color: var(--gl-violet);
    background: white;
    border: 4px solid var(--gl-indigo);
    border-radius: 999px;
  }

  .gl-avatar-live-dot {
    position: absolute;
    right: 3px;
    bottom: 11px;
    width: 25px;
    height: 25px;
    border: 5px solid #064E3B;
    border-radius: 999px;
    background: #34D399;
  }

  .gl-floating-signal,
  .gl-orbit-note {
    position: absolute;
    z-index: 7;
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 11px 13px;
    color: var(--gl-text);
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.72);
    border-radius: 13px;
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.25);
    font-size: 12px;
    font-weight: 750;
    backdrop-filter: blur(10px);
  }

  .gl-floating-signal svg {
    color: var(--gl-violet);
  }

  .gl-floating-signal--course {
    top: 28px;
    left: 6px;
    transform: rotate(-3deg);
  }

  .gl-floating-signal--location {
    top: 93px;
    right: -4px;
    transform: rotate(3deg);
  }

  .gl-floating-signal--people {
    bottom: 44px;
    left: 11px;
    transform: rotate(2deg);
  }

  .gl-orbit-note {
    align-items: flex-start;
    max-width: 200px;
  }

  .gl-orbit-note svg {
    flex-shrink: 0;
    color: var(--gl-green-dark);
  }

  .gl-orbit-note > span {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .gl-orbit-note small {
    color: var(--gl-muted);
    font-size: 11px;
    font-weight: 750;
  }

  .gl-orbit-note strong {
    overflow: hidden;
    margin-top: 2px;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .gl-orbit-note--course {
    top: 30px;
    left: 5px;
    transform: rotate(-3deg);
  }

  .gl-orbit-note--location {
    top: 92px;
    right: -10px;
    transform: rotate(2deg);
  }

  .gl-orbit-note--timer {
    bottom: 43px;
    left: 13px;
    transform: rotate(2deg);
  }

  .gl-stage-ticket {
    position: absolute;
    z-index: 8;
    right: 32px;
    bottom: 24px;
    display: flex;
    align-items: center;
    gap: 11px;
    width: 280px;
    padding: 15px;
    color: var(--gl-text);
    background: var(--gl-cream);
    border: 1px solid #FDE68A;
    border-radius: 7px 16px 16px 16px;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.24);
    transform: rotate(1.5deg);
  }

  .gl-ticket-pin {
    position: absolute;
    top: -7px;
    left: 50%;
    width: 14px;
    height: 14px;
    border: 3px solid white;
    border-radius: 999px;
    background: var(--gl-amber);
    transform: translateX(-50%);
  }

  .gl-stage-ticket > svg {
    flex-shrink: 0;
    color: var(--gl-amber-dark);
  }

  .gl-stage-ticket > span:last-child {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .gl-stage-ticket strong {
    font-size: 14px;
  }

  .gl-stage-ticket small {
    margin-top: 2px;
    color: #78520B;
    font-size: 12px;
  }

  .gl-active-readout {
    position: absolute;
    z-index: 8;
    right: 28px;
    bottom: 25px;
    left: 28px;
    display: grid;
    grid-template-columns: 1fr auto 1fr auto 1fr;
    align-items: center;
    min-height: 78px;
    padding: 13px 18px;
    color: var(--gl-text);
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid rgba(255, 255, 255, 0.77);
    border-radius: 18px;
    box-shadow: 0 15px 38px rgba(0, 0, 0, 0.23);
    backdrop-filter: blur(15px);
  }

  .gl-active-readout > div {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 11px;
  }

  .gl-active-readout > div > span:last-child {
    display: flex;
    flex-direction: column;
  }

  .gl-active-readout strong {
    font-size: 16px;
  }

  .gl-active-readout small {
    margin-top: 3px;
    color: var(--gl-muted);
    font-size: 12px;
  }

  .gl-readout-icon {
    display: grid;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    place-items: center;
    border-radius: 12px;
  }

  .gl-readout-icon--green {
    color: var(--gl-green-dark);
    background: var(--gl-green-light);
  }

  .gl-readout-icon--violet {
    color: var(--gl-violet);
    background: var(--gl-violet-light);
  }

  .gl-readout-icon--amber {
    color: var(--gl-amber-dark);
    background: var(--gl-amber-light);
  }

  .gl-readout-divider {
    width: 1px;
    height: 38px;
    background: var(--gl-border);
  }

  .gl-studio-layout,
  .gl-active-layout {
    display: grid;
    grid-template-columns:
      minmax(0, 1.45fr)
      minmax(315px, 0.65fr);
    gap: 22px;
    margin-top: 24px;
    align-items: start;
  }

  .gl-broadcast-console,
  .gl-broadcast-details {
    padding: 31px;
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid var(--gl-border);
    border-radius: 38px 21px 38px 21px;
    box-shadow: 0 20px 50px rgba(27, 27, 58, 0.09);
    backdrop-filter: blur(13px);
  }

  .gl-console-heading,
  .gl-section-heading,
  .gl-preview-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 25px;
  }

  .gl-console-heading h2,
  .gl-section-heading h2,
  .gl-preview-heading h2,
  .gl-control-station h2 {
    margin: 0;
    font-size: clamp(27px, 3.2vw, 38px);
    letter-spacing: -0.052em;
    line-height: 1.05;
  }

  .gl-console-heading p,
  .gl-section-heading p,
  .gl-control-station p {
    max-width: 520px;
    margin: 8px 0 0;
    color: var(--gl-muted);
    font-size: 14px;
    line-height: 1.65;
  }

  .gl-strength-dial {
    flex-shrink: 0;
    padding: 5px;
    border: 1px dashed var(--gl-lilac);
    border-radius: 999px;
  }

  .gl-strength-dial > span {
    --gl-strength: 0deg;

    display: grid;
    width: 78px;
    height: 78px;
    place-items: center;
    align-content: center;
    background:
      radial-gradient(
        circle,
        white 58%,
        transparent 59%
      ),
      conic-gradient(
        var(--gl-violet)
          var(--gl-strength),
        var(--gl-violet-light)
          var(--gl-strength)
      );
    border-radius: 999px;
  }

  .gl-strength-dial strong,
  .gl-strength-dial small {
    display: block;
    text-align: center;
  }

  .gl-strength-dial strong {
    font-size: 18px;
  }

  .gl-strength-dial small {
    color: var(--gl-muted);
    font-size: 11px;
    font-weight: 750;
    text-transform: uppercase;
  }

  .gl-console-fields {
    display: flex;
    flex-direction: column;
    gap: 13px;
  }

  .gl-field-module {
    display: grid;
    grid-template-columns: 55px minmax(0, 1fr);
    gap: 16px;
    padding: 18px;
    background: var(--gl-background);
    border: 1px solid var(--gl-border);
    border-radius: 17px;
    transition:
      border-color 170ms ease,
      background 170ms ease,
      box-shadow 170ms ease;
  }

  .gl-field-module:focus-within {
    background: white;
    border-color: var(--gl-lilac);
    box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.07);
  }

  .gl-field-module--ready {
    background: #F0FDF9;
    border-color: #A7F3D0;
  }

  .gl-module-step {
    display: flex;
    width: 46px;
    height: 46px;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    color: var(--gl-violet);
    background: white;
    border: 1px solid var(--gl-border);
    border-radius: 14px;
    font-size: 13px;
    font-weight: 850;
  }

  .gl-field-module--ready .gl-module-step {
    color: var(--gl-green-dark);
    background: var(--gl-green-light);
    border-color: #A7F3D0;
  }

  .gl-field-content {
    min-width: 0;
  }

  .gl-field-label {
    display: flex;
    align-items: center;
    gap: 11px;
    color: var(--gl-text);
    cursor: pointer;
  }

  .gl-field-icon {
    display: grid;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    place-items: center;
    color: var(--gl-violet);
    background: var(--gl-violet-light);
    border-radius: 12px;
  }

  .gl-field-icon--green {
    color: var(--gl-green-dark);
    background: var(--gl-green-light);
  }

  .gl-field-icon--amber {
    color: var(--gl-amber-dark);
    background: var(--gl-amber-light);
  }

  .gl-field-icon--blue {
    color: #0369A1;
    background: var(--gl-blue-light);
  }

  .gl-field-label > span:last-child {
    display: flex;
    flex-direction: column;
  }

  .gl-field-label strong {
    font-size: 15px;
  }

  .gl-field-label small {
    margin-top: 2px;
    color: var(--gl-muted);
    font-size: 12px;
  }

  .gl-input,
  .gl-textarea {
    width: 100%;
    margin-top: 13px;
    padding: 13px 14px;
    color: var(--gl-text);
    background: white;
    border: 1px solid var(--gl-border);
    border-radius: 12px;
    outline: none;
    font: inherit;
    font-size: 14px;
    line-height: 1.5;
    resize: vertical;
    transition:
      border-color 150ms ease,
      box-shadow 150ms ease;
  }

  .gl-input:focus,
  .gl-textarea:focus {
    border-color: var(--gl-violet);
    box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.09);
  }

  .gl-input::placeholder,
  .gl-textarea::placeholder {
    color: var(--gl-faint);
  }

  .gl-course-shortcuts {
    margin-top: 12px;
  }

  .gl-course-shortcuts > span {
    display: block;
    margin-bottom: 8px;
    color: var(--gl-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.09em;
    text-transform: uppercase;
  }

  .gl-course-shortcuts > div {
    display: flex;
    gap: 7px;
    flex-wrap: wrap;
  }

  .gl-course-chip {
    padding: 7px 10px;
    color: var(--gl-violet);
    background: var(--gl-violet-light);
    border: 1px solid transparent;
    border-radius: 999px;
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
    transition:
      color 150ms ease,
      background 150ms ease,
      transform 150ms ease;
  }

  .gl-course-chip:hover {
    transform: translateY(-2px);
  }

  .gl-course-chip--active {
    color: white;
    background: var(--gl-violet);
  }

  .gl-field-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 13px;
    margin-top: 8px;
    color: var(--gl-muted);
    font-size: 12px;
    line-height: 1.4;
  }

  .gl-field-bottom span:last-child {
    flex-shrink: 0;
    color: var(--gl-faint);
  }

  .gl-field-warning {
    margin: 9px 0 0;
    color: #B45309;
    font-size: 12px;
    line-height: 1.5;
  }

  .gl-validation-panel,
  .gl-ready-panel {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-top: 16px;
    padding: 15px;
    border-radius: 14px;
  }

  .gl-validation-panel {
    color: #991B1B;
    background: var(--gl-red-light);
    border: 1px solid #FCA5A5;
  }

  .gl-validation-panel > svg {
    flex-shrink: 0;
    margin-top: 1px;
  }

  .gl-validation-panel strong {
    font-size: 14px;
  }

  .gl-validation-panel ul {
    margin: 7px 0 0;
    padding-left: 18px;
    font-size: 13px;
    line-height: 1.55;
  }

  .gl-ready-panel {
    align-items: center;
    color: #065F46;
    background: var(--gl-green-light);
    border: 1px solid #6EE7B7;
  }

  .gl-ready-panel > span {
    display: grid;
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    place-items: center;
    color: white;
    background: var(--gl-green);
    border-radius: 12px;
  }

  .gl-ready-panel strong {
    font-size: 15px;
  }

  .gl-ready-panel p {
    margin: 3px 0 0;
    font-size: 13px;
  }

  .gl-go-live-button {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 13px;
    width: 100%;
    min-height: 70px;
    margin-top: 16px;
    padding: 13px 16px;
    color: white;
    background:
      linear-gradient(
        135deg,
        var(--gl-violet),
        var(--gl-violet-dark)
      );
    border: 0;
    border-radius: 16px;
    box-shadow: 0 15px 32px rgba(91, 33, 182, 0.23);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      opacity 160ms ease;
  }

  .gl-go-live-button:hover:not(:disabled) {
    transform: translateY(-4px);
    box-shadow: 0 22px 42px rgba(91, 33, 182, 0.3);
  }

  .gl-go-live-button:disabled {
    opacity: 0.48;
    cursor: not-allowed;
    box-shadow: none;
  }

  .gl-button-radio {
    display: grid;
    width: 44px;
    height: 44px;
    place-items: center;
    color: var(--gl-violet);
    background: white;
    border-radius: 13px;
  }

  .gl-go-live-button > span:nth-child(2) {
    display: flex;
    flex-direction: column;
  }

  .gl-go-live-button small {
    color: rgba(255, 255, 255, 0.63);
    font-size: 11px;
  }

  .gl-go-live-button strong {
    margin-top: 2px;
    font-size: 15px;
  }

  .gl-preview-column,
  .gl-active-sidebar {
    position: sticky;
    top: 105px;
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 18px;
  }

  .gl-card-preview,
  .gl-radar-preview {
    overflow: hidden;
    padding: 23px;
    color: white;
    background:
      radial-gradient(
        circle at 82% 15%,
        rgba(124, 58, 237, 0.34),
        transparent 25%
      ),
      linear-gradient(
        145deg,
        #18182F,
        var(--gl-indigo-soft)
      );
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 20px 38px 20px 38px;
    box-shadow: 0 20px 48px rgba(27, 27, 58, 0.19);
  }

  .gl-preview-heading h2 {
    font-size: 25px;
  }

  .gl-section-kicker--light,
  .gl-preview-heading .gl-section-kicker {
    color: var(--gl-lilac);
  }

  .gl-preview-eye {
    display: grid;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    place-items: center;
    color: var(--gl-lilac);
    background: rgba(255, 255, 255, 0.08);
    border-radius: 12px;
  }

  .gl-campus-card,
  .gl-radar-preview {
    color: var(--gl-text);
  }

  .gl-campus-card {
    position: relative;
    padding: 18px;
    background: var(--gl-surface);
    border: 1px solid rgba(255, 255, 255, 0.7);
    border-radius: 17px;
    box-shadow: 0 18px 38px rgba(0, 0, 0, 0.29);
    transform: rotate(-1deg);
  }

  .gl-campus-card-top,
  .gl-preview-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 11px;
  }

  .gl-card-live,
  .gl-preview-live {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--gl-red);
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.1em;
  }

  .gl-card-live > span,
  .gl-preview-live > span {
    position: relative;
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--gl-red);
  }

  .gl-card-live > span::after,
  .gl-preview-live > span::after {
    position: absolute;
    inset: -4px;
    content: "";
    border-radius: inherit;
    background: var(--gl-red);
    opacity: 0.28;
    animation: gl-live-pulse 1.5s ease-out infinite;
  }

  .gl-card-course,
  .gl-preview-course {
    padding: 5px 9px;
    color: var(--gl-violet);
    background: var(--gl-violet-light);
    border-radius: 999px;
    font-size: 12px;
    font-weight: 850;
  }

  .gl-card-person,
  .gl-preview-person {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 19px;
  }

  .gl-card-avatar,
  .gl-preview-avatar {
    display: grid;
    width: 52px;
    height: 52px;
    overflow: hidden;
    flex-shrink: 0;
    place-items: center;
    color: white;
    background: var(--gl-violet);
    border: 3px solid white;
    border-radius: 16px;
    font-size: 18px;
    font-weight: 850;
    box-shadow: 0 6px 16px rgba(27, 27, 58, 0.14);
  }

  .gl-card-avatar img,
  .gl-preview-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .gl-card-person > div:last-child,
  .gl-preview-person > div:last-child {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .gl-card-person strong,
  .gl-preview-person strong {
    font-size: 15px;
  }

  .gl-card-person span,
  .gl-preview-person span {
    margin-top: 3px;
    color: var(--gl-muted);
    font-size: 12px;
  }

  .gl-card-location,
  .gl-preview-location {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 17px;
    padding: 12px;
    background: var(--gl-green-light);
    border: 1px solid #A7F3D0;
    border-radius: 13px;
  }

  .gl-card-location > span:first-child {
    display: grid;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    place-items: center;
    color: var(--gl-green-dark);
    background: white;
    border-radius: 11px;
  }

  .gl-card-location > div,
  .gl-preview-location > span {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .gl-card-location small,
  .gl-preview-location small {
    color: var(--gl-green-dark);
    font-size: 11px;
    font-weight: 750;
  }

  .gl-card-location strong,
  .gl-preview-location strong {
    overflow: hidden;
    margin-top: 2px;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .gl-card-study,
  .gl-preview-message {
    margin-top: 12px;
    padding: 13px;
    background: var(--gl-violet-faint);
    border-radius: 12px;
  }

  .gl-card-study small,
  .gl-preview-message small {
    color: var(--gl-violet);
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .gl-card-study p,
  .gl-preview-message p {
    margin: 6px 0 0;
    color: var(--gl-muted);
    font-size: 13px;
    line-height: 1.55;
  }

  .gl-card-identification,
  .gl-preview-find {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-top: 11px;
    padding: 11px 12px;
    color: #78520B;
    background: var(--gl-amber-light);
    border: 1px dashed #FCD34D;
    border-radius: 11px;
    font-size: 12px;
    line-height: 1.5;
  }

  .gl-card-identification svg,
  .gl-preview-find svg {
    flex-shrink: 0;
    margin-top: 1px;
  }

  .gl-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 15px;
  }

  .gl-card-footer > span:first-child {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--gl-muted);
    font-size: 11px;
  }

  .gl-card-ready {
    padding: 5px 8px;
    color: var(--gl-violet);
    background: var(--gl-violet-light);
    border-radius: 999px;
    font-size: 11px;
    font-weight: 800;
  }

  .gl-checklist-card,
  .gl-control-station {
    padding: 22px;
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid var(--gl-border);
    border-radius: 31px 17px 31px 17px;
    box-shadow: 0 16px 40px rgba(27, 27, 58, 0.08);
    backdrop-filter: blur(12px);
  }

  .gl-checklist-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 15px;
  }

  .gl-checklist-heading > strong {
    display: grid;
    width: 40px;
    height: 40px;
    place-items: center;
    color: var(--gl-violet);
    background: var(--gl-violet-light);
    border-radius: 13px;
    font-size: 14px;
  }

  .gl-checklist {
    display: flex;
    flex-direction: column;
    gap: 9px;
    margin-top: 8px;
  }

  .gl-check-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px;
    color: var(--gl-muted);
    background: var(--gl-background);
    border: 1px solid var(--gl-border);
    border-radius: 12px;
  }

  .gl-check-item > span {
    display: grid;
    width: 30px;
    height: 30px;
    flex-shrink: 0;
    place-items: center;
    color: var(--gl-muted);
    background: white;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 850;
  }

  .gl-check-item > div {
    display: flex;
    flex-direction: column;
  }

  .gl-check-item strong {
    color: var(--gl-text);
    font-size: 13px;
  }

  .gl-check-item small {
    margin-top: 2px;
    font-size: 11px;
  }

  .gl-check-item--ready {
    color: var(--gl-green-dark);
    background: var(--gl-green-light);
    border-color: #A7F3D0;
  }

  .gl-check-item--ready > span {
    color: white;
    background: var(--gl-green);
  }

  .gl-safety-note {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    padding: 17px;
    color: #1E3A5F;
    background: var(--gl-blue-light);
    border: 1px solid #BAE6FD;
    border-radius: 15px;
  }

  .gl-safety-note > svg {
    flex-shrink: 0;
    color: #0369A1;
  }

  .gl-safety-note strong {
    font-size: 13px;
  }

  .gl-safety-note p {
    margin: 4px 0 0;
    color: #315675;
    font-size: 12px;
    line-height: 1.55;
  }

  .gl-active-layout {
    grid-template-columns:
      minmax(0, 1.35fr)
      minmax(320px, 0.65fr);
  }

  .gl-live-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 10px;
    color: #B91C1C;
    background: var(--gl-red-light);
    border-radius: 999px;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.1em;
  }

  .gl-live-chip > span {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--gl-red);
  }

  .gl-detail-board {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 13px;
  }

  .gl-detail-note,
  .gl-expiration-ticket {
    position: relative;
    min-height: 155px;
    padding: 18px;
    border-radius: 16px;
  }

  .gl-detail-note {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    background: var(--gl-violet-faint);
    border: 1px solid #DDD6FE;
  }

  .gl-detail-note--study {
    transform: rotate(-0.6deg);
  }

  .gl-detail-note--find {
    color: #78520B;
    background: var(--gl-amber-light);
    border-color: #FCD34D;
    transform: rotate(0.7deg);
  }

  .gl-detail-icon {
    display: grid;
    width: 42px;
    height: 42px;
    flex-shrink: 0;
    place-items: center;
    color: var(--gl-violet);
    background: white;
    border-radius: 13px;
    box-shadow: 0 6px 15px rgba(27, 27, 58, 0.08);
  }

  .gl-detail-note--find .gl-detail-icon {
    color: var(--gl-amber-dark);
  }

  .gl-detail-note > span {
    display: flex;
    flex-direction: column;
  }

  .gl-detail-note small {
    color: var(--gl-muted);
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .gl-detail-note strong {
    margin-top: 7px;
    font-size: 15px;
    line-height: 1.55;
  }

  .gl-expiration-ticket {
    grid-column: 1 / -1;
    color: white;
    background:
      radial-gradient(
        circle at 82% 18%,
        rgba(167, 139, 250, 0.36),
        transparent 26%
      ),
      var(--gl-indigo);
  }

  .gl-ticket-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: var(--gl-lilac);
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .gl-expiration-ticket > strong {
    display: block;
    margin-top: 12px;
    font-size: 34px;
    letter-spacing: -0.055em;
  }

  .gl-expiration-ticket > p {
    margin: 7px 0 0;
    color: rgba(255, 255, 255, 0.58);
    font-size: 13px;
  }

  .gl-expiry-track {
    height: 7px;
    overflow: hidden;
    margin-top: 17px;
    background: rgba(255, 255, 255, 0.11);
    border-radius: 999px;
  }

  .gl-expiry-track > span {
    display: block;
    height: 100%;
    background:
      linear-gradient(
        90deg,
        #34D399,
        #A7F3D0
      );
    border-radius: inherit;
    transition: width 400ms ease;
  }

  .gl-radar-preview {
    padding: 20px;
    background: var(--gl-surface);
    border: 1px solid var(--gl-border);
    border-radius: 18px;
    box-shadow: 0 18px 43px rgba(27, 27, 58, 0.1);
    transform: rotate(0.7deg);
  }

  .gl-preview-person {
    margin-top: 17px;
  }

  .gl-preview-location {
    color: var(--gl-text);
  }

  .gl-preview-location > svg {
    flex-shrink: 0;
    color: var(--gl-green-dark);
  }

  .gl-preview-caption {
    display: block;
    margin-top: 14px;
    color: var(--gl-faint);
    font-size: 11px;
    font-weight: 750;
    text-align: center;
    text-transform: uppercase;
  }

  .gl-control-station h2 {
    font-size: 27px;
  }

  .gl-view-radar-button,
  .gl-edit-button,
  .gl-end-button {
    display: flex;
    width: 100%;
    min-height: 44px;
    align-items: center;
    justify-content: center;
    gap: 7px;
    margin-top: 10px;
    padding: 10px 13px;
    border-radius: 11px;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    text-decoration: none;
    cursor: pointer;
    transition:
      transform 150ms ease,
      background 150ms ease,
      border-color 150ms ease;
  }

  .gl-view-radar-button {
    margin-top: 18px;
    color: white;
    background: var(--gl-violet);
  }

  .gl-edit-button {
    color: var(--gl-violet);
    background: var(--gl-violet-light);
    border: 1px solid #DDD6FE;
  }

  .gl-end-button {
    color: #B91C1C;
    background: var(--gl-red-light);
    border: 1px solid #FCA5A5;
  }

  .gl-view-radar-button:hover,
  .gl-edit-button:hover:not(:disabled),
  .gl-end-button:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  .gl-edit-button:disabled,
  .gl-end-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .gl-loading {
    display: flex;
    min-height: 75vh;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 18px;
    color: var(--gl-muted);
    background: var(--gl-background);
    font-size: 14px;
  }

  .gl-loading-transmitter {
    position: relative;
    display: grid;
    width: 88px;
    height: 88px;
    place-items: center;
    color: var(--gl-violet);
    background: var(--gl-violet-faint);
    border-radius: 999px;
  }

  .gl-loading-ring {
    position: absolute;
    border: 1px solid var(--gl-lilac);
    border-radius: inherit;
    animation:
      gl-loading-wave 1.8s ease-out infinite;
  }

  .gl-loading-ring--one {
    inset: 9px;
  }

  .gl-loading-ring--two {
    inset: -4px;
    animation-delay: 0.4s;
  }

  .gl-loading-ring--three {
    inset: -18px;
    animation-delay: 0.8s;
  }

  .gl-loading-link {
    color: var(--gl-violet);
    font-weight: 800;
    text-decoration: none;
  }

  .gl-root a:focus-visible,
  .gl-root button:focus-visible,
  .gl-root input:focus-visible,
  .gl-root textarea:focus-visible,
  .gl-loading a:focus-visible {
    outline: 3px solid rgba(124, 58, 237, 0.35);
    outline-offset: 3px;
  }

  @keyframes gl-radar-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes gl-live-pulse {
    0% {
      opacity: 0.35;
      transform: scale(1);
    }

    75%,
    100% {
      opacity: 0;
      transform: scale(2.4);
    }
  }

  @keyframes gl-loading-wave {
    0% {
      opacity: 0.6;
      transform: scale(0.75);
    }

    100% {
      opacity: 0;
      transform: scale(1.25);
    }
  }

  @media (max-width: 1040px) {
    .gl-transmitter-scene,
    .gl-broadcast-orbit {
      right: 20px;
      width: 400px;
    }

    .gl-studio-layout,
    .gl-active-layout {
      grid-template-columns:
        minmax(0, 1fr)
        320px;
    }
  }

  @media (max-width: 880px) {
    .gl-studio-stage,
    .gl-active-stage {
      min-height: 725px;
    }

    .gl-stage-copy,
    .gl-live-heading {
      width: 100%;
      max-width: calc(100% - 350px);
    }

    .gl-transmitter-scene,
    .gl-broadcast-orbit {
      top: 250px;
      left: 50%;
      width: 430px;
      transform: translateX(-50%);
    }

    .gl-active-readout {
      grid-template-columns: 1fr 1fr;
    }

    .gl-active-readout > div:last-child {
      grid-column: 1 / -1;
    }

    .gl-readout-divider {
      display: none;
    }

    .gl-active-readout > div {
      justify-content: flex-start;
      padding: 5px 12px;
    }

    .gl-stage-ticket {
      right: 26px;
    }

    .gl-studio-layout,
    .gl-active-layout {
      grid-template-columns: 1fr;
    }

    .gl-preview-column,
    .gl-active-sidebar {
      position: relative;
      top: auto;
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    .gl-card-preview,
    .gl-radar-preview {
      grid-row: span 2;
    }
  }

  @media (max-width: 680px) {
    .gl-root {
      padding: 10px 12px 70px;
    }

    .gl-studio-stage,
    .gl-active-stage {
      min-height: 820px;
      padding: 34px 23px 130px;
      border-radius: 31px 31px 18px 31px;
    }

    .gl-stage-copy,
    .gl-live-heading {
      max-width: none;
    }

    .gl-stage-copy h1,
    .gl-live-heading h1 {
      font-size:
        clamp(48px, 16vw, 69px);
    }

    .gl-stage-copy > p,
    .gl-live-heading > p {
      font-size: 15px;
    }

    .gl-transmitter-scene,
    .gl-broadcast-orbit {
      top: 365px;
      width: 330px;
      height: 360px;
    }

    .gl-transmitter-ring--one,
    .gl-orbit-ring--one {
      width: 295px;
      height: 295px;
    }

    .gl-transmitter-ring--two,
    .gl-orbit-ring--two {
      width: 220px;
      height: 220px;
    }

    .gl-transmitter-ring--three,
    .gl-orbit-ring--three {
      width: 155px;
      height: 155px;
    }

    .gl-floating-signal,
    .gl-orbit-note {
      max-width: 155px;
      padding: 9px 10px;
      font-size: 11px;
    }

    .gl-floating-signal--location,
    .gl-orbit-note--location {
      right: 0;
    }

    .gl-stage-ticket {
      right: 16px;
      bottom: 16px;
      left: 16px;
      width: auto;
    }

    .gl-active-readout {
      right: 15px;
      bottom: 15px;
      left: 15px;
      padding: 10px;
    }

    .gl-broadcast-console,
    .gl-broadcast-details {
      padding: 23px 17px;
    }

    .gl-console-heading,
    .gl-section-heading,
    .gl-preview-heading {
      flex-direction: column;
    }

    .gl-strength-dial {
      align-self: flex-start;
    }

    .gl-field-module {
      grid-template-columns: 1fr;
    }

    .gl-module-step {
      width: 42px;
      height: 42px;
    }

    .gl-field-bottom {
      align-items: flex-start;
      flex-direction: column;
      gap: 5px;
    }

    .gl-preview-column,
    .gl-active-sidebar {
      display: flex;
    }

    .gl-detail-board {
      grid-template-columns: 1fr;
    }

    .gl-expiration-ticket {
      grid-column: auto;
    }

    .gl-active-readout {
      grid-template-columns: 1fr;
    }

    .gl-active-readout > div:last-child {
      grid-column: auto;
    }
  }

  @media (max-width: 430px) {
    .gl-studio-stage,
    .gl-active-stage {
      min-height: 870px;
    }

    .gl-transmitter-scene,
    .gl-broadcast-orbit {
      top: 410px;
      width: 300px;
    }

    .gl-floating-signal--people,
    .gl-orbit-note--timer {
      bottom: 55px;
    }

    .gl-stage-benefits {
      align-items: flex-start;
      flex-direction: column;
    }

    .gl-card-footer {
      align-items: flex-start;
      flex-direction: column;
    }

    .gl-go-live-button {
      grid-template-columns: auto 1fr;
    }

    .gl-go-live-button > svg {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .gl-root *,
    .gl-loading * {
      scroll-behavior: auto !important;
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
    }
  }
  
  
  
    /* ─────────────────────────────────────────────
     GO LIVE PRIMARY LAYOUT
  ───────────────────────────────────────────── */

  .gl-builder-intro {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 260px;
    align-items: center;
    gap: 32px;
    margin-bottom: 18px;
    padding: 27px 31px;
    color: white;
    background:
      radial-gradient(
        circle at 82% 25%,
        rgba(124, 58, 237, 0.42),
        transparent 30%
      ),
      linear-gradient(
        135deg,
        #17172e,
        var(--gl-indigo-soft)
      );
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 25px 42px 25px 42px;
    box-shadow: 0 20px 50px rgba(27, 27, 58, 0.18);
  }

  .gl-builder-intro-copy h1 {
    margin: 0;
    font-size: clamp(38px, 5vw, 62px);
    font-weight: 850;
    letter-spacing: -0.065em;
    line-height: 0.94;
  }

  .gl-builder-intro-copy h1 span {
    display: block;
    margin-top: 5px;
    color: var(--gl-lilac);
  }

  .gl-builder-intro-copy p {
    max-width: 670px;
    margin: 16px 0 0;
    color: rgba(255, 255, 255, 0.64);
    font-size: 15px;
    line-height: 1.65;
  }

  .gl-builder-intro-copy p strong {
    color: white;
  }

  .gl-builder-progress {
    padding: 18px;
    color: var(--gl-text);
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.76);
    border-radius: 16px;
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.22);
    transform: rotate(1deg);
  }

  .gl-builder-progress-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .gl-builder-progress-top span {
    color: var(--gl-muted);
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .gl-builder-progress-top strong {
    font-size: 22px;
  }

  .gl-builder-progress-track {
    height: 8px;
    overflow: hidden;
    margin-top: 12px;
    background: var(--gl-violet-light);
    border-radius: 999px;
  }

  .gl-builder-progress-track span {
    display: block;
    height: 100%;
    background:
      linear-gradient(
        90deg,
        var(--gl-violet),
        var(--gl-green)
      );
    border-radius: inherit;
    transition: width 250ms ease;
  }

  .gl-builder-progress p {
    margin: 9px 0 0;
    color: var(--gl-muted);
    font-size: 12px;
  }

  .gl-primary-builder-layout {
    display: grid;
    grid-template-columns:
      minmax(0, 1.55fr)
      minmax(310px, 0.65fr);
    gap: 20px;
    align-items: start;
  }

  .gl-broadcast-console--primary {
    padding: 27px;
    border-radius: 30px 18px 30px 18px;
  }

  .gl-console-heading--primary {
    margin-bottom: 19px;
  }

  .gl-console-heading--primary h2 {
    font-size: clamp(27px, 3vw, 36px);
  }

  .gl-live-form-badge {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: 7px;
    padding: 9px 11px;
    color: var(--gl-green-dark);
    background: var(--gl-green-light);
    border: 1px solid #a7f3d0;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 800;
  }

  .gl-console-fields--primary {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .gl-console-fields--primary .gl-field-module {
    grid-template-columns: 42px minmax(0, 1fr);
    gap: 12px;
    min-width: 0;
    padding: 15px;
  }

  .gl-console-fields--primary .gl-module-step {
    width: 38px;
    height: 38px;
    border-radius: 11px;
    font-size: 11px;
  }

  .gl-console-fields--primary .gl-field-icon {
    width: 34px;
    height: 34px;
  }

  .gl-console-fields--primary .gl-field-label strong {
    font-size: 14px;
  }

  .gl-console-fields--primary .gl-field-label small {
    font-size: 11px;
  }

  .gl-console-fields--primary .gl-input,
  .gl-console-fields--primary .gl-textarea {
    margin-top: 10px;
    padding: 11px 12px;
    font-size: 13px;
  }

  .gl-console-fields--primary .gl-field-bottom {
    font-size: 11px;
  }

  .gl-broadcast-action-bar {
    position: sticky;
    z-index: 20;
    bottom: 14px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(290px, 0.8fr);
    align-items: center;
    gap: 15px;
    margin-top: 17px;
    padding: 13px;
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid var(--gl-border);
    border-radius: 17px;
    box-shadow: 0 18px 45px rgba(27, 27, 58, 0.16);
    backdrop-filter: blur(17px);
  }

  .gl-broadcast-action-bar--ready {
    border-color: #6ee7b7;
    box-shadow:
      0 18px 45px rgba(27, 27, 58, 0.13),
      0 0 0 4px rgba(16, 185, 129, 0.07);
  }

  .gl-action-readiness {
    display: flex;
    align-items: center;
    gap: 11px;
    min-width: 0;
  }

  .gl-action-readiness-icon {
    display: grid;
    width: 42px;
    height: 42px;
    flex-shrink: 0;
    place-items: center;
    color: var(--gl-violet);
    background: var(--gl-violet-light);
    border-radius: 13px;
  }

  .gl-broadcast-action-bar--ready
    .gl-action-readiness-icon {
    color: white;
    background: var(--gl-green);
  }

  .gl-action-readiness > span:last-child {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .gl-action-readiness strong {
    font-size: 14px;
  }

  .gl-action-readiness small {
    margin-top: 3px;
    color: var(--gl-muted);
    font-size: 12px;
  }

  .gl-go-live-button--compact {
    min-height: 58px;
    margin: 0;
    padding: 9px 13px;
  }

  .gl-go-live-button--compact .gl-button-radio {
    width: 38px;
    height: 38px;
  }

  .gl-primary-preview-column {
    position: sticky;
    top: 105px;
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 16px;
  }

  .gl-card-preview--primary {
    padding: 20px;
  }

  .gl-card-preview--primary .gl-preview-heading {
    margin-bottom: 18px;
  }

  .gl-card-preview--primary .gl-preview-heading h2 {
    font-size: 23px;
  }

  .gl-quick-rules {
    display: flex;
    flex-direction: column;
    gap: 9px;
    padding: 17px;
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid var(--gl-border);
    border-radius: 17px 17px 32px 17px;
    box-shadow: 0 14px 36px rgba(27, 27, 58, 0.08);
  }

  .gl-quick-rules > div {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 11px;
    background: var(--gl-background);
    border-radius: 12px;
  }

  .gl-quick-rules svg {
    flex-shrink: 0;
    color: var(--gl-violet);
  }

  .gl-quick-rules > div:last-child svg {
    color: var(--gl-green-dark);
  }

  .gl-quick-rules span {
    display: flex;
    flex-direction: column;
  }

  .gl-quick-rules strong {
    font-size: 13px;
  }

  .gl-quick-rules small {
    margin-top: 3px;
    color: var(--gl-muted);
    font-size: 11px;
    line-height: 1.5;
  }

  @media (max-width: 930px) {
    .gl-primary-builder-layout {
      grid-template-columns: 1fr;
    }

    .gl-primary-preview-column {
      position: relative;
      top: auto;
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 760px) {
    .gl-builder-intro {
      grid-template-columns: 1fr;
      padding: 24px 21px;
    }

    .gl-builder-progress {
      transform: none;
    }

    .gl-console-fields--primary {
      grid-template-columns: 1fr;
    }

    .gl-broadcast-action-bar {
      grid-template-columns: 1fr;
    }

    .gl-primary-preview-column {
      display: flex;
    }
  }

  @media (max-width: 520px) {
    .gl-builder-intro-copy h1 {
      font-size: 43px;
    }

    .gl-broadcast-console--primary {
      padding: 20px 14px;
    }

    .gl-console-fields--primary .gl-field-module {
      grid-template-columns: 1fr;
    }

    .gl-console-heading--primary {
      flex-direction: column;
    }

    .gl-live-form-badge {
      align-self: flex-start;
    }

    .gl-broadcast-action-bar {
      bottom: 8px;
    }

    .gl-action-readiness {
      display: none;
    }

    .gl-go-live-button--compact {
      width: 100%;
    }
  }
`;