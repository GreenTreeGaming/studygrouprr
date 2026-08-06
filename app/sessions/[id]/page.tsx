"use client";

/* eslint-disable @next/next/no-img-element */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Edit3,
  Eye,
  GraduationCap,
  MapPin,
  Radio,
  SearchX,
  Share2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  useParams,
  useRouter,
} from "next/navigation";

import AlertModal from "@/components/AlertModal";
import { useRequireOnboarding } from "@/hooks/useRequiredOnboarding";
import { supabase } from "@/lib/supabase";

import styles from "./session-details.module.css";

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

type SessionState =
    | "live"
    | "soon"
    | "upcoming"
    | "completed";

type Session = {
  id: string;
  title: string;
  course_code: string;
  location_name: string;
  description: string | null;
  identification: string | null;
  start_time: string;
  end_time: string;
  creator_id: string;
};

type Person = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  university: string | null;
  major: string | null;
  year: string | null;
};

type SessionMemberRow = {
  user_id: string;
  profiles:
      | Person
      | Person[]
      | null;
};

type Friendship = {
  requester_id: string;
  receiver_id: string;
  status: string;
};

function normalizeRelation<T>(
    value: T | T[] | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
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

function getSessionState(
    session: Session,
    now: Date,
): SessionState {
  const start = new Date(
      session.start_time,
  );

  const end = new Date(
      session.end_time,
  );

  if (now > end) {
    return "completed";
  }

  if (now >= start && now <= end) {
    return "live";
  }

  const minutesUntilStart =
      (start.getTime() -
          now.getTime()) /
      60_000;

  if (minutesUntilStart <= 30) {
    return "soon";
  }

  return "upcoming";
}

function getStateLabel(
    state: SessionState,
): string {
  switch (state) {
    case "live":
      return "Happening now";
    case "soon":
      return "Starting soon";
    case "completed":
      return "Session completed";
    default:
      return "Upcoming session";
  }
}

function getRelativeLabel(
    session: Session,
    now: Date,
): string {
  const start = new Date(
      session.start_time,
  );

  const end = new Date(
      session.end_time,
  );

  if (now > end) {
    const elapsedMinutes = Math.max(
        1,
        Math.round(
            (now.getTime() -
                end.getTime()) /
            60_000,
        ),
    );

    if (elapsedMinutes < 60) {
      return `Ended ${elapsedMinutes}m ago`;
    }

    const elapsedHours = Math.round(
        elapsedMinutes / 60,
    );

    if (elapsedHours < 24) {
      return `Ended ${elapsedHours}h ago`;
    }

    const elapsedDays = Math.round(
        elapsedHours / 24,
    );

    return `Ended ${elapsedDays}d ago`;
  }

  if (now >= start) {
    const remainingMinutes = Math.max(
        1,
        Math.ceil(
            (end.getTime() -
                now.getTime()) /
            60_000,
        ),
    );

    if (remainingMinutes < 60) {
      return `${remainingMinutes}m remaining`;
    }

    const hours = Math.floor(
        remainingMinutes / 60,
    );

    const minutes =
        remainingMinutes % 60;

    return minutes
        ? `${hours}h ${minutes}m remaining`
        : `${hours}h remaining`;
  }

  const minutesUntilStart = Math.max(
      1,
      Math.ceil(
          (start.getTime() -
              now.getTime()) /
          60_000,
      ),
  );

  if (minutesUntilStart < 60) {
    return `Starts in ${minutesUntilStart}m`;
  }

  if (minutesUntilStart < 24 * 60) {
    const hours = Math.floor(
        minutesUntilStart / 60,
    );

    const minutes =
        minutesUntilStart % 60;

    return minutes
        ? `Starts in ${hours}h ${minutes}m`
        : `Starts in ${hours}h`;
  }

  const days = Math.ceil(
      minutesUntilStart /
      (24 * 60),
  );

  return `Starts in ${days} day${
      days === 1 ? "" : "s"
  }`;
}

function getDurationLabel(
    session: Session,
): string {
  const minutes = Math.max(
      0,
      Math.round(
          (new Date(
                  session.end_time,
              ).getTime() -
              new Date(
                  session.start_time,
              ).getTime()) /
          60_000,
      ),
  );

  const hours = Math.floor(
      minutes / 60,
  );

  const remainingMinutes =
      minutes % 60;

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
  return new Date(
      value,
  ).toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatSessionTime(
    value: string,
): string {
  return new Date(
      value,
  ).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SessionDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const {
    profile,
    loading: onboardingLoading,
  } = useRequireOnboarding();

  const id = Array.isArray(params.id)
      ? params.id[0]
      : String(params.id || "");

  const [loading, setLoading] =
      useState(true);

  const [notFound, setNotFound] =
      useState(false);

  const [loadError, setLoadError] =
      useState<string | null>(null);

  const [session, setSession] =
      useState<Session | null>(null);

  const [creator, setCreator] =
      useState<Person | null>(null);

  const [attendees, setAttendees] =
      useState<Person[]>([]);

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState<string | null>(null);

  const [joined, setJoined] =
      useState(false);

  const [
    acceptedBuddyIds,
    setAcceptedBuddyIds,
  ] = useState<Set<string>>(
      new Set(),
  );

  const [
    pendingBuddyIds,
    setPendingBuddyIds,
  ] = useState<Set<string>>(
      new Set(),
  );

  const [
    membershipBusy,
    setMembershipBusy,
  ] = useState(false);

  const [
    buddyBusyIds,
    setBuddyBusyIds,
  ] = useState<Set<string>>(
      new Set(),
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

  useEffect(() => {
    const intervalId =
        window.setInterval(() => {
          setCurrentTime(Date.now());
        }, 30_000);

    return () => {
      window.clearInterval(
          intervalId,
      );
    };
  }, []);

  const loadSession =
      useCallback(
          async (
              showFullLoader = true,
          ) => {
            if (!id) {
              setNotFound(true);
              setLoading(false);
              return;
            }

            if (showFullLoader) {
              setLoading(true);
            }

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

              setCurrentUserId(
                  user?.id ?? null,
              );

              const {
                data: sessionData,
                error: sessionError,
              } = await supabase
                  .from("study_sessions")
                  .select("*")
                  .eq("id", id)
                  .maybeSingle();

              if (sessionError) {
                throw sessionError;
              }

              if (!sessionData) {
                setSession(null);
                setNotFound(true);
                return;
              }

              const typedSession =
                  sessionData as Session;

              const [
                membersResult,
                creatorResult,
              ] = await Promise.all([
                supabase
                    .from("session_members")
                    .select(`
                user_id,
                profiles (
                  id,
                  name,
                  avatar_url,
                  university,
                  major,
                  year
                )
              `)
                    .eq(
                        "session_id",
                        id,
                    ),

                supabase
                    .from("profiles")
                    .select(
                        "id, name, avatar_url, university, major, year",
                    )
                    .eq(
                        "id",
                        typedSession.creator_id,
                    )
                    .maybeSingle(),
              ]);

              if (membersResult.error) {
                throw membersResult.error;
              }

              if (creatorResult.error) {
                throw creatorResult.error;
              }

              const formattedAttendees = (
                  (membersResult.data ??
                      []) as unknown as SessionMemberRow[]
              )
                  .map((member) =>
                      normalizeRelation(
                          member.profiles,
                      ),
                  )
                  .filter(
                      (
                          attendee,
                      ): attendee is Person =>
                          attendee !== null,
                  )
                  .sort(
                      (first, second) => {
                        if (
                            first.id ===
                            typedSession.creator_id
                        ) {
                          return -1;
                        }

                        if (
                            second.id ===
                            typedSession.creator_id
                        ) {
                          return 1;
                        }

                        return (
                            first.name || ""
                        ).localeCompare(
                            second.name || "",
                        );
                      },
                  );

              setSession(typedSession);
              setAttendees(
                  formattedAttendees,
              );

              setCreator(
                  creatorResult.data as
                      | Person
                      | null,
              );

              if (!user) {
                setJoined(false);
                setAcceptedBuddyIds(
                    new Set(),
                );
                setPendingBuddyIds(
                    new Set(),
                );
                return;
              }

              const [
                membershipResult,
                friendshipsResult,
              ] = await Promise.all([
                supabase
                    .from("session_members")
                    .select("user_id")
                    .eq(
                        "session_id",
                        id,
                    )
                    .eq(
                        "user_id",
                        user.id,
                    )
                    .maybeSingle(),

                supabase
                    .from("friendships")
                    .select(
                        "requester_id, receiver_id, status",
                    )
                    .or(
                        `requester_id.eq.${user.id},receiver_id.eq.${user.id}`,
                    ),
              ]);

              if (
                  membershipResult.error
              ) {
                throw membershipResult.error;
              }

              if (
                  friendshipsResult.error
              ) {
                throw friendshipsResult.error;
              }

              setJoined(
                  Boolean(
                      membershipResult.data,
                  ),
              );

              const acceptedIds =
                  new Set<string>();

              const pendingIds =
                  new Set<string>();

              (
                  (friendshipsResult.data ??
                      []) as Friendship[]
              ).forEach(
                  (friendship) => {
                    const otherUserId =
                        friendship.requester_id ===
                        user.id
                            ? friendship.receiver_id
                            : friendship.requester_id;

                    if (
                        friendship.status ===
                        "accepted"
                    ) {
                      acceptedIds.add(
                          otherUserId,
                      );
                    } else {
                      pendingIds.add(
                          otherUserId,
                      );
                    }
                  },
              );

              setAcceptedBuddyIds(
                  acceptedIds,
              );

              setPendingBuddyIds(
                  pendingIds,
              );
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
              if (showFullLoader) {
                setLoading(false);
              }
            }
          },
          [id],
      );

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const now = useMemo(
      () => new Date(currentTime),
      [currentTime],
  );

  const state = useMemo(
      () =>
          session
              ? getSessionState(
                  session,
                  now,
              )
              : "upcoming",
      [now, session],
  );

  const isCompleted =
      state === "completed";

  const isLive =
      state === "live";

  const isCreator = Boolean(
      session &&
      currentUserId ===
      session.creator_id,
  );

  const relativeTime = useMemo(
      () =>
          session
              ? getRelativeLabel(
                  session,
                  now,
              )
              : "",
      [now, session],
  );

  const durationLabel = useMemo(
      () =>
          session
              ? getDurationLabel(
                  session,
              )
              : "",
      [session],
  );

  async function joinSession() {
    if (
        !session ||
        isCompleted ||
        membershipBusy
    ) {
      return;
    }

    setMembershipBusy(true);

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
            "You must be signed in to join this session.",
        );
      }

      if (
          new Date(
              session.end_time,
          ).getTime() <
          Date.now()
      ) {
        throw new Error(
            "This session has already ended.",
        );
      }

      const { error } =
          await supabase
              .from(
                  "session_members",
              )
              .insert({
                session_id:
                session.id,
                user_id: user.id,
              });

      if (
          error &&
          error.code !== "23505"
      ) {
        throw error;
      }

      setJoined(true);
      await loadSession(false);

      showAlert(
          "You’re attending",
          "The organizer can now see that you joined.",
          "success",
      );
    } catch (error) {
      showAlert(
          "Unable to join session",
          error instanceof Error
              ? error.message
              : "You could not be added to this session.",
          "error",
      );
    } finally {
      setMembershipBusy(false);
    }
  }

  async function leaveSession() {
    if (
        !session ||
        isCompleted ||
        membershipBusy ||
        isCreator
    ) {
      return;
    }

    setMembershipBusy(true);

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
            "You must be signed in to leave this session.",
        );
      }

      const { error } =
          await supabase
              .from(
                  "session_members",
              )
              .delete()
              .eq(
                  "session_id",
                  session.id,
              )
              .eq(
                  "user_id",
                  user.id,
              );

      if (error) {
        throw error;
      }

      setJoined(false);
      await loadSession(false);

      showAlert(
          "Session left",
          "You are no longer listed as an attendee.",
          "success",
      );
    } catch (error) {
      showAlert(
          "Unable to leave session",
          error instanceof Error
              ? error.message
              : "You could not be removed from this session.",
          "error",
      );
    } finally {
      setMembershipBusy(false);
    }
  }

  async function sendFriendRequest(
      receiverId: string,
  ) {
    if (
        !receiverId ||
        receiverId ===
        currentUserId ||
        buddyBusyIds.has(
            receiverId,
        )
    ) {
      return;
    }

    if (
        acceptedBuddyIds.has(
            receiverId,
        )
    ) {
      showAlert(
          "Already connected",
          "This student is already one of your study buddies.",
          "info",
      );
      return;
    }

    if (
        pendingBuddyIds.has(
            receiverId,
        )
    ) {
      showAlert(
          "Request pending",
          "A study-buddy request already exists between you and this student.",
          "info",
      );
      return;
    }

    setBuddyBusyIds(
        (current) => {
          const next =
              new Set(current);

          next.add(receiverId);

          return next;
        },
    );

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
            "You must be signed in to add a study buddy.",
        );
      }

      const {
        data: existing,
        error: checkError,
      } = await supabase
          .from("friendships")
          .select("id, status")
          .or(
              `and(requester_id.eq.${user.id},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${user.id})`,
          )
          .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existing) {
        if (
            existing.status ===
            "accepted"
        ) {
          setAcceptedBuddyIds(
              (current) => {
                const next =
                    new Set(current);

                next.add(receiverId);

                return next;
              },
          );
        } else {
          setPendingBuddyIds(
              (current) => {
                const next =
                    new Set(current);

                next.add(receiverId);

                return next;
              },
          );
        }

        showAlert(
            "Connection already exists",
            existing.status ===
            "accepted"
                ? "This student is already one of your study buddies."
                : "A study-buddy request is already pending.",
            "info",
        );

        return;
      }

      const { error } =
          await supabase
              .from("friendships")
              .insert({
                requester_id:
                user.id,
                receiver_id:
                receiverId,
                status: "pending",
              });

      if (error) {
        throw error;
      }

      setPendingBuddyIds(
          (current) => {
            const next =
                new Set(current);

            next.add(receiverId);

            return next;
          },
      );

      window.dispatchEvent(
          new Event(
              "buddy-requests-changed",
          ),
      );

      showAlert(
          "Request sent",
          "Your study-buddy request is on its way.",
          "success",
      );
    } catch (error) {
      showAlert(
          "Unable to send request",
          error instanceof Error
              ? error.message
              : "Your study-buddy request could not be sent.",
          "error",
      );
    } finally {
      setBuddyBusyIds(
          (current) => {
            const next =
                new Set(current);

            next.delete(
                receiverId,
            );

            return next;
          },
      );
    }
  }

  async function shareSession() {
    if (!session) {
      return;
    }

    const shareData = {
      title: session.title,
      text: `Join ${session.title} for ${session.course_code} on StudyGrouprr.`,
      url: window.location.href,
    };

    try {
      if (
          typeof navigator.share ===
          "function"
      ) {
        await navigator.share(
            shareData,
        );
        return;
      }

      if (!navigator.clipboard) {
        throw new Error(
            "Clipboard access is unavailable.",
        );
      }

      await navigator.clipboard.writeText(
          window.location.href,
      );

      showAlert(
          "Link copied",
          "The session link was copied to your clipboard.",
          "success",
      );
    } catch (error) {
      if (
          error instanceof DOMException &&
          error.name === "AbortError"
      ) {
        return;
      }

      showAlert(
          "Unable to share",
          error instanceof Error
              ? error.message
              : "The session link could not be shared.",
          "error",
      );
    }
  }

  function renderBuddyAction(
      personId: string,
  ): ReactNode {
    if (
        personId === currentUserId
    ) {
      return (
          <span
              className={styles.buddyState}
          >
          <Check size={14} />
          You
        </span>
      );
    }

    if (
        acceptedBuddyIds.has(
            personId,
        )
    ) {
      return (
          <Link
              href="/buddies"
              className={styles.buddyState}
          >
            <Check size={14} />
            Buddy
          </Link>
      );
    }

    if (
        pendingBuddyIds.has(
            personId,
        )
    ) {
      return (
          <span
              className={styles.buddyState}
          >
          <Clock3 size={14} />
          Pending
        </span>
      );
    }

    return (
        <button
            type="button"
            className={styles.addBuddyButton}
            disabled={buddyBusyIds.has(
                personId,
            )}
            onClick={() =>
                void sendFriendRequest(
                    personId,
                )
            }
        >
          <UserPlus size={14} />

          {buddyBusyIds.has(
              personId,
          )
              ? "Sending…"
              : "Add buddy"}
        </button>
    );
  }

  if (
      loading ||
      onboardingLoading
  ) {
    return <SessionLoading />;
  }

  if (!profile) {
    return (
        <main
            id="studygrouprr-session-details"
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

  if (
      notFound ||
      !session
  ) {
    return (
        <main
            id="studygrouprr-session-details"
            className={styles.loadingPage}
        >
          <div className={styles.notFoundCard}>
          <span
              className={styles.notFoundIcon}
          >
            <SearchX size={28} />
          </span>

            <h1>Session not found</h1>

            <p>
              It may have been removed, or the
              link may no longer be valid.
            </p>

            <Link href="/sessions">
              Browse campus sessions
              <ArrowRight size={16} />
            </Link>
          </div>
        </main>
    );
  }

  const stateClass =
      state === "live"
          ? styles.statusLive
          : state === "soon"
              ? styles.statusSoon
              : state === "completed"
                  ? styles.statusCompleted
                  : styles.statusUpcoming;

  return (
      <>
        <main
            id="studygrouprr-session-details"
            className={styles.page}
        >
          <div className={styles.shell}>
            <div className={styles.topBar}>
              <button
                  type="button"
                  onClick={() =>
                      router.back()
                  }
              >
                <ArrowLeft size={16} />
                Back
              </button>

              <div className={styles.topActions}>
                <button
                    type="button"
                    onClick={() =>
                        void shareSession()
                    }
                >
                  <Share2 size={16} />
                  Share
                </button>

                {isCreator &&
                    !isCompleted && (
                        <Link
                            href={`/sessions/${session.id}/edit`}
                        >
                          <Edit3 size={16} />
                          Edit session
                        </Link>
                    )}
              </div>
            </div>

            {loadError && (
                <div
                    className={styles.errorBanner}
                    role="alert"
                >
                  <div>
                    <strong>
                      Session data may be outdated
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

            <div className={styles.contentGrid}>
              <div className={styles.mainColumn}>
                <article
                    className={styles.sessionCard}
                >
                  <div
                      className={
                        styles.sessionHeading
                      }
                  >
                    <div
                        className={styles.badgeRow}
                    >
                    <span
                        className={[
                          styles.statusBadge,
                          stateClass,
                        ]
                            .filter(Boolean)
                            .join(" ")}
                    >
                      {isLive && (
                          <Radio size={13} />
                      )}

                      {getStateLabel(
                          state,
                      )}
                    </span>

                      <Link
                          href={`/courses/${encodeURIComponent(
                              session.course_code,
                          )}`}
                          className={
                            styles.courseBadge
                          }
                      >
                        <BookOpen size={13} />
                        {session.course_code}
                      </Link>
                    </div>

                    <span
                        className={
                          styles.relativeTime
                        }
                    >
                    <Clock3 size={15} />
                      {relativeTime}
                  </span>
                  </div>

                  <h1>{session.title}</h1>

                  <p
                      className={
                        styles.description
                      }
                  >
                    {session.description?.trim() ||
                        "The organizer has not added a detailed study plan yet."}
                  </p>

                  <div
                      className={
                        styles.detailsGrid
                      }
                  >
                    <DetailItem
                        icon={
                          <CalendarDays
                              size={18}
                          />
                        }
                        label="Date"
                        value={formatSessionDate(
                            session.start_time,
                        )}
                    />

                    <DetailItem
                        icon={
                          <Clock3 size={18} />
                        }
                        label="Time"
                        value={`${formatSessionTime(
                            session.start_time,
                        )} – ${formatSessionTime(
                            session.end_time,
                        )}`}
                    />

                    <DetailItem
                        icon={
                          <Clock3 size={18} />
                        }
                        label="Duration"
                        value={durationLabel}
                    />

                    <DetailItem
                        icon={
                          <MapPin size={18} />
                        }
                        label="Location"
                        value={
                          session.location_name
                        }
                    />
                  </div>

                  {session.identification?.trim() && (
                      <div
                          className={
                            styles.identification
                          }
                      >
                        <Eye size={18} />

                        <div>
                          <strong>
                            How to find the group
                          </strong>

                          <span>
                        {
                          session.identification
                        }
                      </span>
                        </div>
                      </div>
                  )}

                  <div
                      className={
                        styles.sessionFooter
                      }
                  >
                  <span>
                    <Users size={16} />

                    {attendees.length}{" "}
                    {attendees.length === 1
                        ? "student"
                        : "students"}{" "}
                    attending
                  </span>

                    <Link
                        href={`/courses/${encodeURIComponent(
                            session.course_code,
                        )}`}
                    >
                      Open course community
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                </article>

                <section
                    className={styles.attendeesCard}
                >
                  <div
                      className={styles.cardHeader}
                  >
                    <div>
                      <h2>Attendees</h2>

                      <p>
                        See who is joining and connect
                        before the meetup.
                      </p>
                    </div>

                    <span>
                    {attendees.length}
                  </span>
                  </div>

                  {attendees.length > 0 ? (
                      <div
                          className={styles.attendeeList}
                      >
                        {attendees.map(
                            (attendee) => {
                              const attendeeIsCreator =
                                  attendee.id ===
                                  session.creator_id;

                              return (
                                  <article
                                      key={attendee.id}
                                      className={
                                        styles.attendeeRow
                                      }
                                  >
                                    <div
                                        className={
                                          styles.avatar
                                        }
                                    >
                                      <SafeAvatar
                                          src={
                                            attendee.avatar_url
                                          }
                                          name={
                                            attendee.name
                                          }
                                      />
                                    </div>

                                    <div
                                        className={
                                          styles.attendeeIdentity
                                        }
                                    >
                                      <div>
                                        <strong>
                                          {attendee.name ||
                                              "Campus student"}
                                        </strong>

                                        {attendeeIsCreator && (
                                            <span>
                                    Organizer
                                  </span>
                                        )}
                                      </div>

                                      <p>
                                        {[
                                              attendee.major,
                                              attendee.year,
                                            ]
                                                .filter(
                                                    Boolean,
                                                )
                                                .join(
                                                    " · ",
                                                ) ||
                                            attendee.university ||
                                            "Student at your university"}
                                      </p>
                                    </div>

                                    <div
                                        className={
                                          styles.attendeeAction
                                        }
                                    >
                                      {renderBuddyAction(
                                          attendee.id,
                                      )}
                                    </div>
                                  </article>
                              );
                            },
                        )}
                      </div>
                  ) : (
                      <div
                          className={styles.emptyAttendees}
                      >
                        <Users size={22} />

                        <div>
                          <strong>
                            Nobody has joined yet
                          </strong>

                          <span>
                        Be the first student to let
                        the organizer know you are
                        coming.
                      </span>
                        </div>

                        {!isCompleted &&
                            !isCreator &&
                            !joined && (
                                <button
                                    type="button"
                                    disabled={
                                      membershipBusy
                                    }
                                    onClick={() =>
                                        void joinSession()
                                    }
                                >
                                  Join session
                                </button>
                            )}
                      </div>
                  )}
                </section>
              </div>

              <aside className={styles.sidebar}>
                <section
                    className={styles.actionCard}
                >
                  <div
                      className={[
                        styles.actionIcon,
                        isLive
                            ? styles.actionIconLive
                            : "",
                        isCompleted
                            ? styles.actionIconCompleted
                            : "",
                      ]
                          .filter(Boolean)
                          .join(" ")}
                  >
                    {isCompleted ? (
                        <CheckCircle2
                            size={23}
                        />
                    ) : isLive ? (
                        <Radio size={23} />
                    ) : (
                        <CalendarDays
                            size={23}
                        />
                    )}
                  </div>

                  <p>{getStateLabel(state)}</p>

                  <h2>
                    {isCompleted
                        ? "This meetup has ended"
                        : isCreator
                            ? "You’re hosting this session"
                            : joined
                                ? "You’re attending"
                                : "Join this study session"}
                  </h2>

                  <span>
                  {isCompleted
                      ? "Session membership can no longer be changed."
                      : isCreator
                          ? "Keep the details accurate so attendees know where to meet."
                          : joined
                              ? "The organizer can see that you plan to attend."
                              : "Joining adds you to the attendee list and lets the organizer know to expect you."}
                </span>

                  <div
                      className={
                        styles.primaryActionArea
                      }
                  >
                    {isCompleted ? (
                        <div
                            className={
                              styles.completedNotice
                            }
                        >
                          <Check size={16} />
                          Session completed
                        </div>
                    ) : isCreator ? (
                        <Link
                            href={`/sessions/${session.id}/edit`}
                            className={
                              styles.primaryAction
                            }
                        >
                          <Edit3 size={17} />
                          Edit session
                        </Link>
                    ) : joined ? (
                        <>
                          <div
                              className={
                                styles.joinedNotice
                              }
                          >
                            <Check size={16} />
                            Seat saved
                          </div>

                          <button
                              type="button"
                              className={
                                styles.leaveButton
                              }
                              disabled={
                                membershipBusy
                              }
                              onClick={() =>
                                  void leaveSession()
                              }
                          >
                            <X size={16} />

                            {membershipBusy
                                ? "Updating…"
                                : "Leave session"}
                          </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            className={
                              styles.primaryAction
                            }
                            disabled={
                              membershipBusy
                            }
                            onClick={() =>
                                void joinSession()
                            }
                        >
                          <Users size={17} />

                          {membershipBusy
                              ? "Joining…"
                              : "Join session"}
                        </button>
                    )}
                  </div>

                  <dl className={styles.quickFacts}>
                    <div>
                      <dt>Starts</dt>
                      <dd>
                        {formatSessionTime(
                            session.start_time,
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt>Duration</dt>
                      <dd>{durationLabel}</dd>
                    </div>

                    <div>
                      <dt>Attending</dt>
                      <dd>
                        {attendees.length}
                      </dd>
                    </div>
                  </dl>

                  <button
                      type="button"
                      className={styles.shareButton}
                      onClick={() =>
                          void shareSession()
                      }
                  >
                    <Share2 size={16} />
                    Invite a classmate
                  </button>
                </section>

                <section
                    className={styles.organizerCard}
                >
                  <div
                      className={
                        styles.organizerHeader
                      }
                  >
                    <div>
                      <p>Organizer</p>
                      <h2>Session host</h2>
                    </div>

                    <GraduationCap
                        size={18}
                    />
                  </div>

                  {creator ? (
                      <>
                        <div
                            className={
                              styles.organizerIdentity
                            }
                        >
                          <div
                              className={
                                styles.organizerAvatar
                              }
                          >
                            <SafeAvatar
                                src={
                                  creator.avatar_url
                                }
                                name={
                                  creator.name
                                }
                            />
                          </div>

                          <div>
                            <strong>
                              {creator.name ||
                                  "Campus student"}
                            </strong>

                            <span>
                          {[
                                creator.major,
                                creator.year,
                              ]
                                  .filter(
                                      Boolean,
                                  )
                                  .join(
                                      " · ",
                                  ) ||
                              "Session organizer"}
                        </span>
                          </div>
                        </div>

                        {creator.university && (
                            <p
                                className={
                                  styles.organizerUniversity
                                }
                            >
                              <GraduationCap
                                  size={14}
                              />
                              {creator.university}
                            </p>
                        )}

                        <div
                            className={
                              styles.organizerAction
                            }
                        >
                          {renderBuddyAction(
                              creator.id,
                          )}
                        </div>
                      </>
                  ) : (
                      <p
                          className={
                            styles.organizerUnavailable
                          }
                      >
                        Organizer information is
                        unavailable.
                      </p>
                  )}
                </section>

                <section
                    className={styles.moreCard}
                >
                  <h2>More for this course</h2>

                  <Link
                      href={`/courses/${encodeURIComponent(
                          session.course_code,
                      )}`}
                  >
                    <BookOpen size={16} />

                    <span>
                    <strong>
                      {session.course_code}
                    </strong>

                    <small>
                      Open course community
                    </small>
                  </span>

                    <ChevronRight size={16} />
                  </Link>

                  <Link href="/sessions">
                    <Users size={16} />

                    <span>
                    <strong>
                      Browse sessions
                    </strong>

                    <small>
                      Find another meetup
                    </small>
                  </span>

                    <ChevronRight size={16} />
                  </Link>
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
            onClose={() =>
                setAlertOpen(false)
            }
        />
      </>
  );
}

function DetailItem({
                      icon,
                      label,
                      value,
                    }: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
      <div className={styles.detailItem}>
      <span className={styles.detailIcon}>
        {icon}
      </span>

        <div>
          <small>{label}</small>
          <strong>{value}</strong>
        </div>
      </div>
  );
}

function SessionLoading() {
  return (
      <main
          id="studygrouprr-session-details"
          className={styles.loadingPage}
          role="status"
          aria-live="polite"
      >
        <div className={styles.loadingCard}>
          <strong>
            Loading session details…
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
