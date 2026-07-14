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
  Compass,
  Edit3,
  Eye,
  GraduationCap,
  MapPin,
  Radio,
  SearchX,
  Share2,
  Sparkles,
  UserPlus,
  Users,
  X,
  Zap,
} from "lucide-react";

import AlertModal from "@/components/AlertModal";
import { useRequireOnboarding } from "@/hooks/useRequiredOnboarding";
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

type SessionUrgency =
    | "live"
    | "soon"
    | "today"
    | "later"
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
  name: string;
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

type SafeAvatarProps = {
  src: string | null | undefined;
  name: string | null | undefined;
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

function getSessionUrgency(
    session: Session,
    now: Date,
): SessionUrgency {
  const start = new Date(
      session.start_time,
  );

  const end = new Date(
      session.end_time,
  );

  if (now > end) {
    return "completed";
  }

  if (
      now >= start &&
      now <= end
  ) {
    return "live";
  }

  const differenceMinutes =
      (start.getTime() -
          now.getTime()) /
      60_000;

  if (differenceMinutes <= 30) {
    return "soon";
  }

  if (differenceMinutes <= 120) {
    return "today";
  }

  return "later";
}

function getStatusLabel(
    urgency: SessionUrgency,
): string {
  switch (urgency) {
    case "completed":
      return "Session completed";

    case "live":
      return "Live right now";

    case "soon":
      return "Starting soon";

    case "today":
      return "Starting today";

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
    return "This meetup has ended";
  }

  if (
      now >= start &&
      now <= end
  ) {
    const remainingMinutes =
        Math.max(
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

  const differenceMinutes =
      Math.max(
          1,
          Math.ceil(
              (start.getTime() -
                  now.getTime()) /
              60_000,
          ),
      );

  if (differenceMinutes < 60) {
    return `Starts in ${differenceMinutes}m`;
  }

  if (differenceMinutes < 24 * 60) {
    const hours = Math.floor(
        differenceMinutes / 60,
    );

    const minutes =
        differenceMinutes % 60;

    return minutes
        ? `Starts in ${hours}h ${minutes}m`
        : `Starts in ${hours}h`;
  }

  const days = Math.ceil(
      differenceMinutes /
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

function calculateTimelineProgress(
    session: Session,
    now: Date,
): number {
  const start = new Date(
      session.start_time,
  ).getTime();

  const end = new Date(
      session.end_time,
  ).getTime();

  if (now.getTime() <= start) {
    return 0;
  }

  if (now.getTime() >= end) {
    return 100;
  }

  return Math.min(
      100,
      Math.max(
          0,
          ((now.getTime() - start) /
              (end - start)) *
          100,
      ),
  );
}

export default function SessionDetailsPage() {
  const params = useParams();
  const router = useRouter();

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

  const [acceptedBuddyIds, setAcceptedBuddyIds] =
      useState<Set<string>>(
          new Set(),
      );

  const [pendingBuddyIds, setPendingBuddyIds] =
      useState<Set<string>>(
          new Set(),
      );

  const [membershipBusy, setMembershipBusy] =
      useState(false);

  const [buddyBusyIds, setBuddyBusyIds] =
      useState<Set<string>>(
          new Set(),
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

              setSession(
                  typedSession,
              );

              const membersPromise =
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
                      );

              const creatorPromise =
                  supabase
                      .from("profiles")
                      .select(
                          "id, name, avatar_url, university, major, year",
                      )
                      .eq(
                          "id",
                          typedSession.creator_id,
                      )
                      .maybeSingle();

              const [
                membersResult,
                creatorResult,
              ] = await Promise.all([
                membersPromise,
                creatorPromise,
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

                        return first.name.localeCompare(
                            second.name,
                        );
                      },
                  );

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

  const urgency = useMemo(
      () =>
          session
              ? getSessionUrgency(
                  session,
                  now,
              )
              : "later",
      [now, session],
  );

  const isCompleted =
      urgency === "completed";

  const isLive =
      urgency === "live";

  const isCreator =
      Boolean(
          session &&
          currentUserId ===
          session.creator_id,
      );

  const relativeTime =
      useMemo(
          () =>
              session
                  ? getRelativeLabel(
                      session,
                      now,
                  )
                  : "",
          [now, session],
      );

  const durationLabel =
      useMemo(
          () =>
              session
                  ? getDurationLabel(
                      session,
                  )
                  : "",
          [session],
      );

  const timelineProgress =
      useMemo(
          () =>
              session
                  ? calculateTimelineProgress(
                      session,
                      now,
                  )
                  : 0,
          [now, session],
      );

  const attendeePreview =
      attendees.slice(0, 4);

  const otherAttendeeCount =
      Math.max(
          0,
          attendees.length -
          attendeePreview.length,
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
          "You’re In",
          "The organizer can now see that you’re attending.",
          "success",
      );
    } catch (error) {
      showAlert(
          "Unable to Join Session",
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
          "Session Left",
          "You are no longer listed as an attendee.",
          "success",
      );
    } catch (error) {
      showAlert(
          "Unable to Leave Session",
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
          "Already Connected",
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
          "Request Pending",
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
        setPendingBuddyIds(
            (current) => {
              const next =
                  new Set(current);

              next.add(receiverId);

              return next;
            },
        );

        showAlert(
            "Already Connected",
            "A pending or accepted connection already exists.",
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

      showAlert(
          "Request Sent",
          "Your study-buddy request is on its way.",
          "success",
      );
    } catch (error) {
      showAlert(
          "Unable to Send Request",
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

      await navigator.clipboard.writeText(
          window.location.href,
      );

      showAlert(
          "Link Copied",
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
          "Unable to Share",
          "The session link could not be shared.",
          "error",
      );
    }
  }

  function renderBuddyAction(
      personId: string,
      compact = false,
  ) {
    if (
        personId === currentUserId
    ) {
      return (
          <span
              className={
                compact
                    ? "sq-person-action sq-person-action--self sq-person-action--compact"
                    : "sq-person-action sq-person-action--self"
              }
          >
          <Check size={15} />
          That’s you
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
              className={
                compact
                    ? "sq-person-action sq-person-action--connected sq-person-action--compact"
                    : "sq-person-action sq-person-action--connected"
              }
          >
            <Check size={15} />
            Study buddy
          </Link>
      );
    }

    if (
        pendingBuddyIds.has(
            personId,
        )
    ) {
      return (
          <button
              type="button"
              className={
                compact
                    ? "sq-person-action sq-person-action--pending sq-person-action--compact"
                    : "sq-person-action sq-person-action--pending"
              }
              disabled
          >
            <Clock size={15} />
            Request pending
          </button>
      );
    }

    return (
        <button
            type="button"
            className={
              compact
                  ? "sq-person-action sq-person-action--add sq-person-action--compact"
                  : "sq-person-action sq-person-action--add"
            }
            disabled={
              buddyBusyIds.has(
                  personId,
              )
            }
            onClick={() =>
                void sendFriendRequest(
                    personId,
                )
            }
        >
          <UserPlus size={15} />

          {buddyBusyIds.has(
              personId,
          )
              ? "Sending…"
              : compact
                  ? "Add buddy"
                  : "Add study buddy"}
        </button>
    );
  }

  useEffect(() => {
    if (
        loading ||
        onboardingLoading ||
        !session ||
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
              ".sq-reveal",
              {
                opacity: 0,
                y: 25,
                duration: 0.68,
                stagger: 0.075,
                ease: "power3.out",
              },
          );

          gsap.from(
              ".sq-attendee-card",
              {
                opacity: 0,
                y: 18,
                rotate: -0.5,
                duration: 0.54,
                stagger: 0.055,
                delay: 0.18,
                ease: "power3.out",
              },
          );

          gsap.from(
              ".sq-pulse-ring",
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
    attendees.length,
    loading,
    onboardingLoading,
    session,
  ]);

  if (
      loading ||
      onboardingLoading
  ) {
    return (
        <>
          <style>
            {sessionStyles}
          </style>

          <main className="sq-loading">
            <div
                className="sq-loading-beacon"
                aria-hidden="true"
            >
              <span />
              <span />
              <Radio size={28} />
            </div>

            <p>
              Opening the meetup…
            </p>
          </main>
        </>
    );
  }

  if (
      notFound ||
      !session
  ) {
    return (
        <>
          <style>
            {sessionStyles}
          </style>

          <main className="sq-loading">
            <div className="sq-not-found">
              <div className="sq-not-found-icon">
                <SearchX size={38} />
              </div>

              <span className="sq-kicker">
              Signal missing
            </span>

              <h1>
                This session disappeared.
              </h1>

              <p>
                It may have been removed, or the
                link may no longer be valid.
              </p>

              <Link href="/sessions">
                Browse campus sessions
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
          {sessionStyles}
        </style>

        <main
            ref={rootRef}
            className="sq-root"
        >
          <div
              className="sq-background-grid"
              aria-hidden="true"
          />

          <div className="sq-glow sq-glow--one" />
          <div className="sq-glow sq-glow--two" />

          <div className="sq-canvas">
            <header className="sq-command-bar sq-reveal">
              <button
                  type="button"
                  className="sq-back-button"
                  onClick={() =>
                      router.back()
                  }
              >
                <ArrowLeft size={17} />
                Back
              </button>

              <div className="sq-command-title">
              <span className="sq-command-icon">
                <Compass size={18} />
              </span>

                <span>
                <strong>
                  Meetup Headquarters
                </strong>

                <small>
                  Everything you need before
                  heading over
                </small>
              </span>
              </div>

              <button
                  type="button"
                  className="sq-share-button"
                  onClick={() =>
                      void shareSession()
                  }
              >
                <Share2 size={17} />
                Share session
              </button>
            </header>

            {loadError && (
                <div
                    className="sq-error-banner"
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

            <section className="sq-primary-layout">
              <article className="sq-session-board sq-reveal">
                <div
                    className="sq-board-grid"
                    aria-hidden="true"
                />

                <span className="sq-board-orbit sq-board-orbit--one" />
                <span className="sq-board-orbit sq-board-orbit--two" />

                <div className="sq-board-top">
                  <div className="sq-status-group">
                  <span
                      className={`sq-status sq-status--${urgency}`}
                  >
                    {isLive && (
                        <span className="sq-live-dot" />
                    )}

                    {getStatusLabel(
                        urgency,
                    )}
                  </span>

                    <Link
                        href={`/courses/${encodeURIComponent(
                            session.course_code,
                        )}`}
                        className="sq-course-pill"
                    >
                      <BookOpen size={15} />
                      {session.course_code}
                    </Link>
                  </div>

                  <span className="sq-relative-time">
                  <Clock size={15} />
                    {relativeTime}
                </span>
                </div>

                <div className="sq-board-heading">
                <span className="sq-kicker sq-kicker--light">
                  <Sparkles size={15} />
                  Campus study meetup
                </span>

                  <h1>
                    {session.title}
                  </h1>

                  <p>
                    {session.description?.trim() ||
                        "The organizer has not added a detailed study plan yet."}
                  </p>
                </div>

                <div className="sq-route-board">
                  <div className="sq-route-stop">
                  <span className="sq-route-number">
                    01
                  </span>

                    <span className="sq-route-icon sq-route-icon--violet">
                    <CalendarDays size={20} />
                  </span>

                    <span>
                    <small>
                      Meet on
                    </small>

                    <strong>
                      {formatSessionDate(
                          session.start_time,
                      )}
                    </strong>

                    <p>
                      {formatSessionTime(
                          session.start_time,
                      )}{" "}
                      –{" "}
                      {formatSessionTime(
                          session.end_time,
                      )}
                    </p>
                  </span>
                  </div>

                  <span className="sq-route-connector" />

                  <div className="sq-route-stop">
                  <span className="sq-route-number">
                    02
                  </span>

                    <span className="sq-route-icon sq-route-icon--green">
                    <MapPin size={20} />
                  </span>

                    <span>
                    <small>
                      Meet at
                    </small>

                    <strong>
                      {session.location_name}
                    </strong>

                    <p>
                      Arrive a few minutes early
                      if the location is busy.
                    </p>
                  </span>
                  </div>
                </div>

                {session.identification?.trim() && (
                    <div className="sq-find-host-note">
                      <Eye size={19} />

                      <span>
                    <small>
                      How to find the group
                    </small>

                    <strong>
                      {session.identification}
                    </strong>
                  </span>
                    </div>
                )}

                <div
                    className="sq-session-timeline"
                    style={
                      {
                        "--sq-progress": `${timelineProgress}%`,
                      } as CSSProperties
                    }
                >
                  <div className="sq-timeline-top">
                  <span>
                    <Clock size={15} />
                    Session timeline
                  </span>

                    <strong>
                      {durationLabel}
                    </strong>
                  </div>

                  <div className="sq-timeline-track">
                    <span />
                    <i />
                  </div>

                  <div className="sq-timeline-labels">
                  <span>
                    {formatSessionTime(
                        session.start_time,
                    )}
                  </span>

                    <span>
                    {isCompleted
                        ? "Finished"
                        : isLive
                            ? "In progress"
                            : "Scheduled"}
                  </span>

                    <span>
                    {formatSessionTime(
                        session.end_time,
                    )}
                  </span>
                  </div>
                </div>

                <div className="sq-board-footer">
                  <div className="sq-attendee-preview">
                    <div className="sq-avatar-stack">
                      {attendeePreview.map(
                          (attendee) => (
                              <span
                                  key={
                                    attendee.id
                                  }
                                  title={
                                    attendee.name
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
                        </span>
                          ),
                      )}

                      {otherAttendeeCount >
                          0 && (
                              <span className="sq-avatar-more">
                        +
                                {
                                  otherAttendeeCount
                                }
                      </span>
                          )}
                    </div>

                    <span>
                    <strong>
                      {attendees.length} student
                      {attendees.length ===
                      1
                          ? ""
                          : "s"}{" "}
                      attending
                    </strong>

                    <small>
                      Including the organizer
                    </small>
                  </span>
                  </div>

                  <Link
                      href={`/courses/${encodeURIComponent(
                          session.course_code,
                      )}`}
                      className="sq-community-link"
                  >
                    Open course community
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </article>

              <aside className="sq-action-station sq-reveal">
                <div
                    className={`sq-pulse-console sq-pulse-console--${urgency}`}
                >
                  <span className="sq-pulse-ring sq-pulse-ring--one" />
                  <span className="sq-pulse-ring sq-pulse-ring--two" />
                  <span className="sq-pulse-ring sq-pulse-ring--three" />

                  <div className="sq-pulse-core">
                    {isCompleted ? (
                        <CheckCircle2
                            size={31}
                        />
                    ) : isLive ? (
                        <Radio size={31} />
                    ) : (
                        <CalendarDays
                            size={31}
                        />
                    )}
                  </div>

                  <span className="sq-pulse-label">
                  {relativeTime}
                </span>
                </div>

                <div className="sq-action-copy">
                <span className="sq-kicker">
                  <Zap size={15} />
                  Your next move
                </span>

                  <h2>
                    {isCompleted
                        ? "This meetup has wrapped."
                        : isCreator
                            ? "You’re running this table."
                            : joined
                                ? "Your seat is saved."
                                : "Claim your seat."}
                  </h2>

                  <p>
                    {isCompleted
                        ? "You can still review the session details and connect with attendees."
                        : isCreator
                            ? "Keep the details accurate so attendees know exactly where and when to meet."
                            : joined
                                ? "The organizer can see that you are attending. Leave if your plans change."
                                : "Joining lets the organizer know to expect you and adds you to the attendee list."}
                  </p>
                </div>

                {isCompleted ? (
                    <div className="sq-ended-note">
                      <CheckCircle2
                          size={19}
                      />

                      <span>
                    <strong>
                      Session completed
                    </strong>

                    <small>
                      Joining and leaving are no
                      longer available.
                    </small>
                  </span>
                    </div>
                ) : isCreator ? (
                    <Link
                        href={`/sessions/${session.id}/edit`}
                        className="sq-primary-action"
                    >
                  <span>
                    <Edit3 size={20} />
                  </span>

                      <span>
                    <small>
                      Organizer tools
                    </small>

                    <strong>
                      Edit session
                    </strong>
                  </span>

                      <ArrowRight size={19} />
                    </Link>
                ) : joined ? (
                    <>
                      <div className="sq-joined-banner">
                        <CheckCircle2
                            size={20}
                        />

                        <span>
                      <strong>
                        You’re attending
                      </strong>

                      <small>
                        The organizer is expecting
                        you.
                      </small>
                    </span>
                      </div>

                      <button
                          type="button"
                          className="sq-leave-action"
                          disabled={
                            membershipBusy
                          }
                          onClick={() =>
                              void leaveSession()
                          }
                      >
                        <X size={18} />

                        {membershipBusy
                            ? "Updating…"
                            : "Leave session"}
                      </button>
                    </>
                ) : (
                    <button
                        type="button"
                        className="sq-primary-action"
                        disabled={
                          membershipBusy
                        }
                        onClick={() =>
                            void joinSession()
                        }
                    >
                  <span>
                    <Users size={20} />
                  </span>

                      <span>
                    <small>
                      Let the organizer know
                    </small>

                    <strong>
                      {membershipBusy
                          ? "Joining…"
                          : "Join session"}
                    </strong>
                  </span>

                      <ArrowRight size={19} />
                    </button>
                )}

                <div className="sq-action-stats">
                  <div>
                  <span className="sq-stat-icon sq-stat-icon--violet">
                    <Users size={18} />
                  </span>

                    <span>
                    <strong>
                      {attendees.length}
                    </strong>

                    <small>
                      Attending
                    </small>
                  </span>
                  </div>

                  <div>
                  <span className="sq-stat-icon sq-stat-icon--green">
                    <Clock size={18} />
                  </span>

                    <span>
                    <strong>
                      {durationLabel}
                    </strong>

                    <small>
                      Duration
                    </small>
                  </span>
                  </div>
                </div>

                <button
                    type="button"
                    className="sq-secondary-share"
                    onClick={() =>
                        void shareSession()
                    }
                >
                  <Share2 size={17} />
                  Invite a classmate
                </button>
              </aside>
            </section>

            <section className="sq-content-layout">
              <section className="sq-attendee-station sq-reveal">
                <div className="sq-section-heading">
                  <div>
                  <span className="sq-kicker">
                    <Users size={15} />
                    The study table
                  </span>

                    <h2>
                      Meet the people showing up.
                    </h2>

                    <p>
                      Connect before the session so
                      the table feels familiar when
                      you arrive.
                    </p>
                  </div>

                  <span className="sq-heading-count">
                  {attendees.length}
                </span>
                </div>

                {attendees.length > 0 ? (
                    <div className="sq-attendee-grid">
                      {attendees.map(
                          (
                              attendee,
                              index,
                          ) => {
                            const attendeeIsCreator =
                                attendee.id ===
                                session.creator_id;

                            return (
                                <article
                                    key={
                                      attendee.id
                                    }
                                    className={`sq-attendee-card sq-attendee-card--${
                                        (index %
                                            4) +
                                        1
                                    } ${
                                        attendeeIsCreator
                                            ? "sq-attendee-card--creator"
                                            : ""
                                    }`}
                                >
                                  <div className="sq-attendee-card-top">
                                    <div className="sq-attendee-avatar">
                                      <SafeAvatar
                                          src={
                                            attendee.avatar_url
                                          }
                                          name={
                                            attendee.name
                                          }
                                      />

                                      {attendeeIsCreator && (
                                          <span className="sq-host-crown">
                                  <Sparkles
                                      size={12}
                                  />
                                </span>
                                      )}
                                    </div>

                                    <span
                                        className={
                                          attendeeIsCreator
                                              ? "sq-role-pill sq-role-pill--creator"
                                              : "sq-role-pill"
                                        }
                                    >
                              {attendeeIsCreator
                                  ? "Organizer"
                                  : "Attendee"}
                            </span>
                                  </div>

                                  <h3>
                                    {attendee.name}
                                  </h3>

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

                                  {renderBuddyAction(
                                      attendee.id,
                                      true,
                                  )}
                                </article>
                            );
                          },
                      )}
                    </div>
                ) : (
                    <div className="sq-attendee-empty">
                      <div className="sq-empty-orbit">
                        <Users size={33} />
                        <span />
                        <span />
                      </div>

                      <h3>
                        The table is still empty.
                      </h3>

                      <p>
                        Be the first student to join
                        and make the meetup feel real.
                      </p>

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
                                Join first
                                <ArrowRight
                                    size={16}
                                />
                              </button>
                          )}
                    </div>
                )}
              </section>

              <aside className="sq-host-column">
                <section className="sq-host-card sq-reveal">
                  <div className="sq-host-card-top">
                  <span className="sq-kicker sq-kicker--light">
                    <Sparkles size={15} />
                    Your organizer
                  </span>

                    <span className="sq-host-badge">
                    Host
                  </span>
                  </div>

                  {creator ? (
                      <>
                        <div className="sq-host-identity">
                          <div className="sq-host-avatar">
                            <SafeAvatar
                                src={
                                  creator.avatar_url
                                }
                                name={
                                  creator.name
                                }
                            />

                            <span />
                          </div>

                          <h2>
                            {creator.name}
                          </h2>

                          <p>
                            {[
                                  creator.major,
                                  creator.year,
                                ]
                                    .filter(Boolean)
                                    .join(" · ") ||
                                "Session organizer"}
                          </p>
                        </div>

                        <div className="sq-host-details">
                          {creator.university && (
                              <span>
                          <GraduationCap
                              size={16}
                          />
                                {
                                  creator.university
                                }
                        </span>
                          )}

                          {creator.major && (
                              <span>
                          <BookOpen
                              size={16}
                          />
                                {creator.major}
                        </span>
                          )}
                        </div>

                        {renderBuddyAction(
                            creator.id,
                        )}
                      </>
                  ) : (
                      <p className="sq-host-unavailable">
                        Organizer information is
                        unavailable.
                      </p>
                  )}
                </section>

                <section className="sq-arrival-card sq-reveal">
                <span className="sq-kicker">
                  <Compass size={15} />
                  Arrival checklist
                </span>

                  <h2>
                    Before heading over
                  </h2>

                  <div className="sq-arrival-list">
                    <div>
                    <span>
                      <CalendarDays
                          size={17}
                      />
                    </span>

                      <p>
                        Double-check the date and
                        start time.
                      </p>
                    </div>

                    <div>
                    <span>
                      <MapPin size={17} />
                    </span>

                      <p>
                        Read the exact location and
                        identification note.
                      </p>
                    </div>

                    <div>
                    <span>
                      <BookOpen size={17} />
                    </span>

                      <p>
                        Bring the materials you need
                        for {session.course_code}.
                      </p>
                    </div>
                  </div>
                </section>
              </aside>
            </section>

            <section className="sq-closing-callout sq-reveal">
              <div className="sq-closing-orbits">
                <span />
                <span />
                <span />
              </div>

              <div>
              <span className="sq-kicker sq-kicker--light">
                <BookOpen size={15} />
                Keep exploring
              </span>

                <h2>
                  Need another time, topic, or
                  location?
                </h2>

                <p>
                  Browse more sessions for{" "}
                  {session.course_code} or create a
                  meetup that fits your schedule.
                </p>
              </div>

              <div className="sq-closing-actions">
                <Link
                    href={`/courses/${encodeURIComponent(
                        session.course_code,
                    )}`}
                >
                  Course community
                  <ArrowRight size={16} />
                </Link>

                <Link href="/create-session">
                  Create another
                  <Zap size={16} />
                </Link>
              </div>
            </section>
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

const sessionStyles = `
  .sq-root,
  .sq-root *,
  .sq-loading,
  .sq-loading * {
    box-sizing: border-box;
  }

  .sq-root,
  .sq-loading {
    --sq-indigo: #1B1B3A;
    --sq-indigo-soft: #292953;
    --sq-violet: #7C3AED;
    --sq-violet-dark: #5B21B6;
    --sq-violet-light: #EDE9FE;
    --sq-violet-faint: #F5F3FF;
    --sq-lilac: #C4B5FD;
    --sq-green: #10B981;
    --sq-green-dark: #047857;
    --sq-green-light: #D1FAE5;
    --sq-amber: #F59E0B;
    --sq-amber-dark: #B45309;
    --sq-amber-light: #FEF3C7;
    --sq-red: #EF4444;
    --sq-red-light: #FEE2E2;
    --sq-blue: #0EA5E9;
    --sq-blue-light: #E0F2FE;
    --sq-cream: #FFF9E8;
    --sq-background: #F5F4FB;
    --sq-surface: #FFFFFF;
    --sq-border: #E4E2F0;
    --sq-text: #1B1B3A;
    --sq-muted: #64748B;
    --sq-faint: #94A3B8;
  }

  .sq-root {
    position: relative;
    min-height: 100vh;
    overflow: hidden;
    isolation: isolate;
    padding: 18px 20px 100px;
    color: var(--sq-text);
    background:
      radial-gradient(
        circle at 50% -8%,
        rgba(124, 58, 237, 0.2),
        transparent 30rem
      ),
      var(--sq-background);
  }

  .sq-background-grid {
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

  .sq-glow {
    position: absolute;
    z-index: -4;
    border-radius: 999px;
    pointer-events: none;
    filter: blur(7px);
  }

  .sq-glow--one {
    top: 520px;
    right: -230px;
    width: 460px;
    height: 460px;
    background:
      rgba(16, 185, 129, 0.1);
  }

  .sq-glow--two {
    top: 1150px;
    left: -280px;
    width: 520px;
    height: 520px;
    background:
      rgba(124, 58, 237, 0.1);
  }

  .sq-canvas {
    position: relative;
    z-index: 1;
    width: min(1220px, 100%);
    margin: 0 auto;
  }

  .sq-command-bar {
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
      1px solid var(--sq-border);
    border-radius: 16px;
    box-shadow:
      0 10px 30px
      rgba(27, 27, 58, 0.07);
    backdrop-filter: blur(16px);
  }

  .sq-back-button,
  .sq-share-button {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 11px;
    border-radius: 11px;
    font: inherit;
    font-size: 13px;
    font-weight: 750;
    cursor: pointer;
    transition:
      color 150ms ease,
      transform 150ms ease,
      border-color 150ms ease,
      background 150ms ease;
  }

  .sq-back-button {
    color: var(--sq-muted);
    background:
      var(--sq-background);
    border:
      1px solid var(--sq-border);
  }

  .sq-back-button:hover {
    color: var(--sq-violet);
    border-color: var(--sq-lilac);
    transform: translateX(-3px);
  }

  .sq-share-button {
    color: var(--sq-violet);
    background:
      var(--sq-violet-light);
    border:
      1px solid #DDD6FE;
  }

  .sq-share-button:hover {
    background: #DDD6FE;
    transform: translateY(-2px);
  }

  .sq-command-title {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 10px;
  }

  .sq-command-icon {
    display: grid;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    place-items: center;
    color: white;
    background:
      linear-gradient(
        145deg,
        var(--sq-violet),
        var(--sq-violet-dark)
      );
    border-radius: 12px;
    box-shadow:
      0 8px 18px
      rgba(91, 33, 182, 0.2);
  }

  .sq-command-title > span:last-child {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .sq-command-title strong {
    font-size: 14px;
  }

  .sq-command-title small {
    margin-top: 2px;
    color: var(--sq-muted);
    font-size: 12px;
  }

  .sq-error-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 16px;
    padding: 15px 18px;
    color: #991B1B;
    background: var(--sq-red-light);
    border: 1px solid #FCA5A5;
    border-radius: 16px;
  }

  .sq-error-banner > div {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .sq-error-banner strong {
    font-size: 14px;
  }

  .sq-error-banner span {
    font-size: 13px;
  }

  .sq-error-banner button {
    flex-shrink: 0;
    padding: 9px 13px;
    color: white;
    background: var(--sq-red);
    border: 0;
    border-radius: 10px;
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
  }

  .sq-primary-layout {
    display: grid;
    grid-template-columns:
      minmax(0, 1fr)
      minmax(310px, 0.42fr);
    gap: 20px;
    align-items: start;
  }

  .sq-session-board {
    position: relative;
    min-width: 0;
    overflow: hidden;
    padding: 28px;
    color: white;
    background:
      radial-gradient(
        circle at 88% 12%,
        rgba(124, 58, 237, 0.44),
        transparent 29%
      ),
      linear-gradient(
        140deg,
        #17172E,
        var(--sq-indigo-soft)
      );
    border:
      1px solid
      rgba(255, 255, 255, 0.09);
    border-radius:
      25px 46px 25px 46px;
    box-shadow:
      0 27px 67px
      rgba(27, 27, 58, 0.22),
      inset 0 1px
      rgba(255, 255, 255, 0.07);
  }

  .sq-board-grid {
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
        circle at 78% 18%,
        black,
        transparent 72%
      );
  }

  .sq-board-orbit {
    position: absolute;
    top: -120px;
    right: -80px;
    border:
      1px dashed
      rgba(196, 181, 253, 0.17);
    border-radius: 999px;
    pointer-events: none;
  }

  .sq-board-orbit--one {
    width: 330px;
    height: 330px;
  }

  .sq-board-orbit--two {
    top: -65px;
    right: -25px;
    width: 220px;
    height: 220px;
  }

  .sq-board-top,
  .sq-board-heading,
  .sq-route-board,
  .sq-find-host-note,
  .sq-session-timeline,
  .sq-board-footer {
    position: relative;
    z-index: 2;
  }

  .sq-board-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
  }

  .sq-status-group {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .sq-status,
  .sq-course-pill,
  .sq-relative-time {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 800;
  }

  .sq-status {
    padding: 7px 10px;
  }

  .sq-status--completed {
    color: rgba(255, 255, 255, 0.65);
    background:
      rgba(255, 255, 255, 0.08);
  }

  .sq-status--live {
    color: #FCA5A5;
    background:
      rgba(239, 68, 68, 0.14);
    border:
      1px solid
      rgba(252, 165, 165, 0.22);
  }

  .sq-status--soon {
    color: #FDE68A;
    background:
      rgba(245, 158, 11, 0.14);
    border:
      1px solid
      rgba(253, 230, 138, 0.2);
  }

  .sq-status--today {
    color: #BAE6FD;
    background:
      rgba(14, 165, 233, 0.14);
    border:
      1px solid
      rgba(186, 230, 253, 0.2);
  }

  .sq-status--later {
    color: #DDD6FE;
    background:
      rgba(124, 58, 237, 0.14);
    border:
      1px solid
      rgba(221, 214, 254, 0.19);
  }

  .sq-live-dot {
    position: relative;
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--sq-red);
  }

  .sq-live-dot::after {
    position: absolute;
    inset: -4px;
    content: "";
    border-radius: inherit;
    background: var(--sq-red);
    opacity: 0.3;
    animation:
      sq-live-pulse
      1.5s ease-out infinite;
  }

  .sq-course-pill {
    padding: 7px 10px;
    color: var(--sq-lilac);
    background:
      rgba(124, 58, 237, 0.16);
    border:
      1px solid
      rgba(196, 181, 253, 0.2);
    text-decoration: none;
  }

  .sq-relative-time {
    padding: 7px 10px;
    color:
      rgba(255, 255, 255, 0.68);
    background:
      rgba(255, 255, 255, 0.07);
  }

  .sq-kicker {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 11px;
    color: var(--sq-violet);
    font-size: 12px;
    font-weight: 850;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .sq-kicker--light {
    color: var(--sq-lilac);
  }

  .sq-board-heading {
    margin-top: 34px;
  }

  .sq-board-heading h1 {
    max-width: 850px;
    margin: 0;
    font-size:
      clamp(40px, 5.5vw, 68px);
    font-weight: 850;
    letter-spacing: -0.068em;
    line-height: 0.98;
  }

  .sq-board-heading > p {
    max-width: 790px;
    margin: 19px 0 0;
    color:
      rgba(255, 255, 255, 0.61);
    font-size: 15px;
    line-height: 1.7;
  }

  .sq-route-board {
    display: grid;
    grid-template-columns:
      minmax(0, 1fr)
      45px
      minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    margin-top: 28px;
    padding: 17px;
    color: var(--sq-text);
    background:
      rgba(255, 255, 255, 0.95);
    border:
      1px solid
      rgba(255, 255, 255, 0.72);
    border-radius: 17px;
    box-shadow:
      0 16px 36px
      rgba(0, 0, 0, 0.22);
    backdrop-filter: blur(14px);
  }

  .sq-route-stop {
    display: grid;
    grid-template-columns:
      auto auto minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .sq-route-number {
    color:
      rgba(27, 27, 58, 0.18);
    font-size: 12px;
    font-weight: 900;
  }

  .sq-route-icon {
    display: grid;
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    place-items: center;
    border-radius: 12px;
  }

  .sq-route-icon--violet {
    color: var(--sq-violet);
    background:
      var(--sq-violet-light);
  }

  .sq-route-icon--green {
    color: var(--sq-green-dark);
    background:
      var(--sq-green-light);
  }

  .sq-route-stop > span:last-child {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .sq-route-stop small {
    color: var(--sq-muted);
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .sq-route-stop strong {
    overflow: hidden;
    margin-top: 3px;
    font-size: 14px;
    line-height: 1.35;
    text-overflow: ellipsis;
  }

  .sq-route-stop p {
    margin: 3px 0 0;
    color: var(--sq-muted);
    font-size: 12px;
    line-height: 1.4;
  }

  .sq-route-connector {
    height: 1px;
    background:
      repeating-linear-gradient(
        to right,
        var(--sq-lilac) 0,
        var(--sq-lilac) 4px,
        transparent 4px,
        transparent 8px
      );
  }

  .sq-find-host-note {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-top: 13px;
    padding: 14px 16px;
    color: #78520B;
    background: var(--sq-cream);
    border: 1px dashed #FCD34D;
    border-radius: 8px 15px 15px 15px;
    transform: rotate(-0.25deg);
  }

  .sq-find-host-note > svg {
    flex-shrink: 0;
    margin-top: 1px;
    color: var(--sq-amber-dark);
  }

  .sq-find-host-note > span {
    display: flex;
    flex-direction: column;
  }

  .sq-find-host-note small {
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .sq-find-host-note strong {
    margin-top: 4px;
    font-size: 13px;
    line-height: 1.5;
  }

  .sq-session-timeline {
    --sq-progress: 0%;

    margin-top: 18px;
    padding: 15px;
    background:
      rgba(255, 255, 255, 0.07);
    border:
      1px solid
      rgba(255, 255, 255, 0.09);
    border-radius: 14px;
  }

  .sq-timeline-top,
  .sq-timeline-labels {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .sq-timeline-top > span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color:
      rgba(255, 255, 255, 0.66);
    font-size: 12px;
    font-weight: 750;
  }

  .sq-timeline-top strong {
    color: white;
    font-size: 13px;
  }

  .sq-timeline-track {
    position: relative;
    height: 8px;
    margin-top: 13px;
    background:
      rgba(255, 255, 255, 0.1);
    border-radius: 999px;
  }

  .sq-timeline-track > span {
    display: block;
    width: var(--sq-progress);
    height: 100%;
    background:
      linear-gradient(
        90deg,
        var(--sq-violet),
        var(--sq-green)
      );
    border-radius: inherit;
    transition: width 400ms ease;
  }

  .sq-timeline-track > i {
    position: absolute;
    top: 50%;
    left: var(--sq-progress);
    width: 14px;
    height: 14px;
    border: 3px solid white;
    border-radius: 999px;
    background: var(--sq-green);
    transform:
      translate(-50%, -50%);
    transition: left 400ms ease;
  }

  .sq-timeline-labels {
    margin-top: 8px;
    color:
      rgba(255, 255, 255, 0.45);
    font-size: 11px;
  }

  .sq-timeline-labels span:nth-child(2) {
    color: var(--sq-lilac);
    font-weight: 800;
  }

  .sq-board-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: 21px;
    padding-top: 18px;
    border-top:
      1px dashed
      rgba(255, 255, 255, 0.14);
  }

  .sq-attendee-preview {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 11px;
  }

  .sq-avatar-stack {
    display: flex;
    flex-shrink: 0;
    padding-left: 8px;
  }

  .sq-avatar-stack > span {
    display: grid;
    width: 38px;
    height: 38px;
    overflow: hidden;
    margin-left: -8px;
    place-items: center;
    color: white;
    background: var(--sq-violet);
    border: 3px solid var(--sq-indigo);
    border-radius: 999px;
    font-size: 12px;
    font-weight: 850;
  }

  .sq-avatar-stack img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .sq-avatar-more {
    background: var(--sq-green) !important;
  }

  .sq-attendee-preview > span:last-child {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .sq-attendee-preview strong {
    color: white;
    font-size: 13px;
  }

  .sq-attendee-preview small {
    margin-top: 3px;
    color:
      rgba(255, 255, 255, 0.45);
    font-size: 11px;
  }

  .sq-community-link {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: 6px;
    padding: 10px 12px;
    color: var(--sq-violet-dark);
    background: white;
    border-radius: 11px;
    font-size: 12px;
    font-weight: 850;
    text-decoration: none;
    transition: transform 150ms ease;
  }

  .sq-community-link:hover {
    transform: translateY(-2px);
  }

  .sq-action-station {
    position: sticky;
    top: 94px;
    min-width: 0;
    padding: 22px;
    background:
      rgba(255, 255, 255, 0.96);
    border:
      1px solid var(--sq-border);
    border-radius:
      19px 37px 19px 37px;
    box-shadow:
      0 20px 50px
      rgba(27, 27, 58, 0.11);
    backdrop-filter: blur(15px);
  }

  .sq-pulse-console {
    position: relative;
    display: grid;
    min-height: 180px;
    overflow: hidden;
    place-items: center;
    align-content: center;
    background:
      radial-gradient(
        circle,
        rgba(124, 58, 237, 0.16),
        transparent 66%
      ),
      var(--sq-indigo);
    border-radius: 15px 30px 15px 30px;
  }

  .sq-pulse-console--live {
    background:
      radial-gradient(
        circle,
        rgba(239, 68, 68, 0.2),
        transparent 66%
      ),
      #341927;
  }

  .sq-pulse-console--completed {
    background:
      radial-gradient(
        circle,
        rgba(148, 163, 184, 0.15),
        transparent 66%
      ),
      #272738;
  }

  .sq-pulse-ring {
    position: absolute;
    border:
      1px solid
      rgba(196, 181, 253, 0.2);
    border-radius: 999px;
  }

  .sq-pulse-ring--one {
    width: 155px;
    height: 155px;
  }

  .sq-pulse-ring--two {
    width: 112px;
    height: 112px;
  }

  .sq-pulse-ring--three {
    width: 72px;
    height: 72px;
  }

  .sq-pulse-core {
    position: relative;
    z-index: 3;
    display: grid;
    width: 72px;
    height: 72px;
    place-items: center;
    color: white;
    background:
      linear-gradient(
        145deg,
        var(--sq-violet),
        var(--sq-violet-dark)
      );
    border:
      7px solid
      rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    box-shadow:
      0 0 0 11px
      rgba(124, 58, 237, 0.08);
  }

  .sq-pulse-console--live
    .sq-pulse-core {
    background:
      linear-gradient(
        145deg,
        #F87171,
        #DC2626
      );
  }

  .sq-pulse-console--completed
    .sq-pulse-core {
    background:
      linear-gradient(
        145deg,
        #64748B,
        #475569
      );
  }

  .sq-pulse-label {
    position: relative;
    z-index: 3;
    margin-top: 20px;
    color:
      rgba(255, 255, 255, 0.68);
    font-size: 13px;
    font-weight: 800;
  }

  .sq-action-copy {
    margin-top: 20px;
  }

  .sq-action-copy h2 {
    margin: 0;
    font-size: 27px;
    letter-spacing: -0.05em;
    line-height: 1.05;
  }

  .sq-action-copy p {
    margin: 9px 0 0;
    color: var(--sq-muted);
    font-size: 13px;
    line-height: 1.6;
  }

  .sq-primary-action {
    display: grid;
    grid-template-columns:
      auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 11px;
    width: 100%;
    min-height: 66px;
    margin-top: 18px;
    padding: 10px 13px;
    color: white;
    background:
      linear-gradient(
        135deg,
        var(--sq-violet),
        var(--sq-violet-dark)
      );
    border: 0;
    border-radius: 14px;
    box-shadow:
      0 14px 30px
      rgba(91, 33, 182, 0.23);
    font: inherit;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      opacity 160ms ease;
  }

  .sq-primary-action:hover:not(:disabled) {
    transform: translateY(-3px);
    box-shadow:
      0 20px 38px
      rgba(91, 33, 182, 0.3);
  }

  .sq-primary-action:disabled {
    opacity: 0.52;
    cursor: not-allowed;
    box-shadow: none;
  }

  .sq-primary-action > span:first-child {
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    color: var(--sq-violet);
    background: white;
    border-radius: 12px;
  }

  .sq-primary-action > span:nth-child(2) {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .sq-primary-action small {
    color:
      rgba(255, 255, 255, 0.62);
    font-size: 11px;
  }

  .sq-primary-action strong {
    margin-top: 2px;
    font-size: 15px;
  }

  .sq-joined-banner,
  .sq-ended-note {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-top: 18px;
    padding: 14px;
    border-radius: 13px;
  }

  .sq-joined-banner {
    color: var(--sq-green-dark);
    background: var(--sq-green-light);
    border: 1px solid #A7F3D0;
  }

  .sq-ended-note {
    color: var(--sq-muted);
    background: var(--sq-background);
    border:
      1px solid var(--sq-border);
  }

  .sq-joined-banner > svg,
  .sq-ended-note > svg {
    flex-shrink: 0;
    margin-top: 1px;
  }

  .sq-joined-banner > span,
  .sq-ended-note > span {
    display: flex;
    flex-direction: column;
  }

  .sq-joined-banner strong,
  .sq-ended-note strong {
    font-size: 13px;
  }

  .sq-joined-banner small,
  .sq-ended-note small {
    margin-top: 3px;
    font-size: 12px;
    line-height: 1.45;
  }

  .sq-leave-action,
  .sq-secondary-share {
    display: inline-flex;
    width: 100%;
    min-height: 43px;
    align-items: center;
    justify-content: center;
    gap: 7px;
    margin-top: 10px;
    padding: 10px 12px;
    border-radius: 11px;
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
    transition:
      transform 150ms ease,
      background 150ms ease;
  }

  .sq-leave-action {
    color: #B91C1C;
    background: var(--sq-red-light);
    border: 1px solid #FCA5A5;
  }

  .sq-secondary-share {
    color: var(--sq-violet);
    background:
      var(--sq-violet-light);
    border: 1px solid #DDD6FE;
  }

  .sq-leave-action:hover:not(:disabled),
  .sq-secondary-share:hover {
    transform: translateY(-2px);
  }

  .sq-leave-action:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .sq-action-stats {
    display: grid;
    grid-template-columns:
      1fr 1fr;
    gap: 9px;
    margin-top: 15px;
  }

  .sq-action-stats > div {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 11px;
    background: var(--sq-background);
    border:
      1px solid var(--sq-border);
    border-radius: 11px;
  }

  .sq-stat-icon {
    display: grid;
    width: 34px;
    height: 34px;
    flex-shrink: 0;
    place-items: center;
    border-radius: 10px;
  }

  .sq-stat-icon--violet {
    color: var(--sq-violet);
    background:
      var(--sq-violet-light);
  }

  .sq-stat-icon--green {
    color: var(--sq-green-dark);
    background:
      var(--sq-green-light);
  }

  .sq-action-stats > div > span:last-child {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .sq-action-stats strong {
    font-size: 13px;
  }

  .sq-action-stats small {
    margin-top: 2px;
    color: var(--sq-muted);
    font-size: 11px;
  }

  .sq-content-layout {
    display: grid;
    grid-template-columns:
      minmax(0, 1fr)
      minmax(290px, 0.36fr);
    gap: 20px;
    margin-top: 22px;
    align-items: start;
  }

  .sq-attendee-station {
    min-width: 0;
    padding: 28px;
    background:
      rgba(255, 255, 255, 0.95);
    border:
      1px solid var(--sq-border);
    border-radius:
      39px 21px 39px 21px;
    box-shadow:
      0 19px 48px
      rgba(27, 27, 58, 0.09);
    backdrop-filter: blur(14px);
  }

  .sq-section-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 23px;
  }

  .sq-section-heading h2,
  .sq-arrival-card h2,
  .sq-closing-callout h2 {
    margin: 0;
    font-size:
      clamp(27px, 3.4vw, 40px);
    letter-spacing: -0.052em;
    line-height: 1.05;
  }

  .sq-section-heading p {
    max-width: 620px;
    margin: 8px 0 0;
    color: var(--sq-muted);
    font-size: 14px;
    line-height: 1.65;
  }

  .sq-heading-count {
    display: grid;
    width: 45px;
    height: 45px;
    flex-shrink: 0;
    place-items: center;
    color: var(--sq-violet);
    background:
      var(--sq-violet-light);
    border-radius: 14px;
    font-size: 15px;
    font-weight: 850;
    transform: rotate(4deg);
  }

  .sq-attendee-grid {
    display: grid;
    grid-template-columns:
      repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .sq-attendee-card {
    position: relative;
    display: flex;
    min-width: 0;
    min-height: 225px;
    flex-direction: column;
    padding: 17px;
    background:
      var(--sq-violet-faint);
    border: 1px solid #DDD6FE;
    border-radius: 16px;
    transition:
      transform 160ms ease,
      box-shadow 160ms ease;
  }

  .sq-attendee-card--1 {
    transform: rotate(-0.5deg);
  }

  .sq-attendee-card--2 {
    background: var(--sq-cream);
    border-color: #FDE68A;
    transform: rotate(0.6deg);
  }

  .sq-attendee-card--3 {
    background:
      var(--sq-green-light);
    border-color: #A7F3D0;
    transform: rotate(-0.35deg);
  }

  .sq-attendee-card--4 {
    background:
      var(--sq-blue-light);
    border-color: #BAE6FD;
    transform: rotate(0.45deg);
  }

  .sq-attendee-card--creator {
    box-shadow:
      inset 0 4px 0
      var(--sq-violet);
  }

  .sq-attendee-card:hover {
    z-index: 3;
    box-shadow:
      0 19px 38px
      rgba(27, 27, 58, 0.13);
    transform:
      translateY(-5px)
      rotate(0deg);
  }

  .sq-attendee-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }

  .sq-attendee-avatar {
    position: relative;
    display: grid;
    width: 58px;
    height: 58px;
    overflow: visible;
    place-items: center;
    color: white;
    background: var(--sq-violet);
    border: 3px solid white;
    border-radius: 17px;
    font-size: 19px;
    font-weight: 850;
    box-shadow:
      0 6px 16px
      rgba(27, 27, 58, 0.14);
  }

  .sq-attendee-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 14px;
  }

  .sq-host-crown {
    position: absolute;
    right: -5px;
    bottom: -5px;
    display: grid;
    width: 22px;
    height: 22px;
    place-items: center;
    color: white;
    background: var(--sq-violet);
    border: 3px solid white;
    border-radius: 999px;
  }

  .sq-role-pill {
    padding: 6px 9px;
    color: var(--sq-muted);
    background:
      rgba(255, 255, 255, 0.75);
    border-radius: 999px;
    font-size: 11px;
    font-weight: 800;
  }

  .sq-role-pill--creator {
    color: var(--sq-violet);
    background:
      var(--sq-violet-light);
  }

  .sq-attendee-card h3 {
    margin: 16px 0 0;
    font-size: 17px;
    letter-spacing: -0.025em;
  }

  .sq-attendee-card > p {
    margin: 5px 0 0;
    color: var(--sq-muted);
    font-size: 12px;
    line-height: 1.45;
  }

  .sq-person-action {
    display: inline-flex;
    width: 100%;
    min-height: 41px;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 15px;
    padding: 9px 11px;
    border-radius: 10px;
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    text-decoration: none;
  }

  .sq-person-action--compact {
    margin-top: auto;
  }

  .sq-person-action--add {
    color: white;
    background: var(--sq-violet);
    border: 0;
    cursor: pointer;
    transition:
      transform 150ms ease,
      background 150ms ease;
  }

  .sq-person-action--add:hover:not(:disabled) {
    background:
      var(--sq-violet-dark);
    transform: translateY(-2px);
  }

  .sq-person-action--add:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .sq-person-action--connected {
    color: var(--sq-green-dark);
    background: var(--sq-green-light);
    border: 1px solid #A7F3D0;
  }

  .sq-person-action--pending {
    color: var(--sq-muted);
    background: var(--sq-background);
    border:
      1px solid var(--sq-border);
  }

  .sq-person-action--self {
    color: var(--sq-violet);
    background:
      var(--sq-violet-light);
    border: 1px solid #DDD6FE;
  }

  .sq-attendee-empty {
    display: flex;
    min-height: 300px;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    padding: 30px;
    background:
      var(--sq-violet-faint);
    border: 2px dashed #DDD6FE;
    border-radius: 20px;
    text-align: center;
  }

  .sq-empty-orbit {
    position: relative;
    display: grid;
    width: 82px;
    height: 82px;
    place-items: center;
    color: var(--sq-violet);
    border: 1px dashed
      var(--sq-lilac);
    border-radius: 999px;
  }

  .sq-empty-orbit span {
    position: absolute;
    border:
      1px solid
      rgba(124, 58, 237, 0.13);
    border-radius: inherit;
  }

  .sq-empty-orbit span:nth-child(2) {
    inset: -12px;
  }

  .sq-empty-orbit span:nth-child(3) {
    inset: -26px;
  }

  .sq-attendee-empty h3 {
    margin: 27px 0 7px;
    font-size: 21px;
    letter-spacing: -0.035em;
  }

  .sq-attendee-empty p {
    max-width: 430px;
    margin: 0;
    color: var(--sq-muted);
    font-size: 13px;
    line-height: 1.6;
  }

  .sq-attendee-empty button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 18px;
    padding: 10px 13px;
    color: white;
    background: var(--sq-violet);
    border: 0;
    border-radius: 11px;
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
  }

  .sq-host-column {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 15px;
  }

  .sq-host-card {
    position: relative;
    overflow: hidden;
    padding: 22px;
    color: white;
    background:
      radial-gradient(
        circle at 83% 12%,
        rgba(124, 58, 237, 0.4),
        transparent 30%
      ),
      linear-gradient(
        145deg,
        #17172E,
        var(--sq-indigo-soft)
      );
    border:
      1px solid
      rgba(255, 255, 255, 0.09);
    border-radius:
      20px 38px 20px 38px;
    box-shadow:
      0 20px 48px
      rgba(27, 27, 58, 0.19);
  }

  .sq-host-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .sq-host-badge {
    padding: 6px 9px;
    color: var(--sq-lilac);
    background:
      rgba(124, 58, 237, 0.16);
    border:
      1px solid
      rgba(196, 181, 253, 0.2);
    border-radius: 999px;
    font-size: 11px;
    font-weight: 850;
  }

  .sq-host-identity {
    display: flex;
    align-items: center;
    flex-direction: column;
    margin-top: 20px;
    text-align: center;
  }

  .sq-host-avatar {
    position: relative;
    display: grid;
    width: 94px;
    height: 94px;
    overflow: visible;
    place-items: center;
    color: white;
    background: var(--sq-violet);
    border:
      6px solid
      rgba(255, 255, 255, 0.09);
    border-radius: 999px;
    font-size: 29px;
    font-weight: 850;
    box-shadow:
      0 0 0 11px
      rgba(124, 58, 237, 0.08),
      0 18px 39px
      rgba(0, 0, 0, 0.28);
  }

  .sq-host-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: inherit;
  }

  .sq-host-avatar > span:last-child {
    position: absolute;
    right: 1px;
    bottom: 6px;
    width: 18px;
    height: 18px;
    border: 4px solid var(--sq-indigo);
    border-radius: 999px;
    background: var(--sq-green);
  }

  .sq-host-identity h2 {
    margin: 22px 0 0;
    font-size: 23px;
    letter-spacing: -0.04em;
  }

  .sq-host-identity p {
    margin: 6px 0 0;
    color:
      rgba(255, 255, 255, 0.52);
    font-size: 12px;
  }

  .sq-host-details {
    display: flex;
    align-items: stretch;
    gap: 8px;
    margin-top: 19px;
    flex-direction: column;
  }

  .sq-host-details > span {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px;
    color:
      rgba(255, 255, 255, 0.68);
    background:
      rgba(255, 255, 255, 0.07);
    border:
      1px solid
      rgba(255, 255, 255, 0.08);
    border-radius: 11px;
    font-size: 12px;
  }

  .sq-host-card
    .sq-person-action {
    margin-top: 13px;
  }

  .sq-host-unavailable {
    color:
      rgba(255, 255, 255, 0.55);
    font-size: 13px;
  }

  .sq-arrival-card {
    padding: 21px;
    background:
      rgba(255, 255, 255, 0.95);
    border:
      1px solid var(--sq-border);
    border-radius:
      30px 17px 30px 17px;
    box-shadow:
      0 16px 39px
      rgba(27, 27, 58, 0.08);
  }

  .sq-arrival-card h2 {
    font-size: 25px;
  }

  .sq-arrival-list {
    display: flex;
    flex-direction: column;
    gap: 9px;
    margin-top: 17px;
  }

  .sq-arrival-list > div {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    padding: 11px;
    background: var(--sq-background);
    border:
      1px solid var(--sq-border);
    border-radius: 11px;
  }

  .sq-arrival-list > div > span {
    display: grid;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    place-items: center;
    color: var(--sq-violet);
    background: white;
    border-radius: 9px;
  }

  .sq-arrival-list p {
    margin: 3px 0 0;
    color: var(--sq-muted);
    font-size: 12px;
    line-height: 1.5;
  }

  .sq-closing-callout {
    position: relative;
    display: grid;
    grid-template-columns:
      minmax(0, 1fr) auto;
    align-items: center;
    gap: 25px;
    overflow: hidden;
    margin-top: 22px;
    padding: 34px;
    color: white;
    background:
      radial-gradient(
        circle at 82% 28%,
        rgba(16, 185, 129, 0.17),
        transparent 27%
      ),
      linear-gradient(
        135deg,
        var(--sq-indigo),
        #27275B
      );
    border-radius:
      22px 47px 22px 47px;
    box-shadow:
      0 22px 55px
      rgba(27, 27, 58, 0.18);
  }

  .sq-closing-callout > div:not(.sq-closing-orbits) {
    position: relative;
    z-index: 2;
  }

  .sq-closing-callout h2 {
    font-size:
      clamp(28px, 4vw, 42px);
  }

  .sq-closing-callout p {
    max-width: 720px;
    margin: 10px 0 0;
    color:
      rgba(255, 255, 255, 0.54);
    font-size: 14px;
    line-height: 1.65;
  }

  .sq-closing-actions {
    display: flex;
    position: relative;
    z-index: 2;
    gap: 9px;
    flex-wrap: wrap;
  }

  .sq-closing-actions a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 11px 13px;
    border-radius: 11px;
    font-size: 12px;
    font-weight: 850;
    text-decoration: none;
    transition: transform 150ms ease;
  }

  .sq-closing-actions a:first-child {
    color: var(--sq-violet-dark);
    background: white;
  }

  .sq-closing-actions a:last-child {
    color: #A7F3D0;
    background:
      rgba(16, 185, 129, 0.13);
    border:
      1px solid
      rgba(110, 231, 183, 0.2);
  }

  .sq-closing-actions a:hover {
    transform: translateY(-2px);
  }

  .sq-closing-orbits {
    position: absolute;
    top: -125px;
    right: -55px;
    width: 300px;
    height: 300px;
    border:
      1px solid
      rgba(196, 181, 253, 0.13);
    border-radius: 999px;
  }

  .sq-closing-orbits span {
    position: absolute;
    border:
      1px solid
      rgba(196, 181, 253, 0.1);
    border-radius: inherit;
  }

  .sq-closing-orbits span:nth-child(1) {
    inset: 32px;
  }

  .sq-closing-orbits span:nth-child(2) {
    inset: 70px;
  }

  .sq-closing-orbits span:nth-child(3) {
    inset: 112px;
    background:
      rgba(124, 58, 237, 0.15);
  }

  .sq-loading {
    display: flex;
    min-height: 75vh;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 19px;
    padding: 24px;
    color: var(--sq-muted);
    background: var(--sq-background);
    font-size: 14px;
  }

  .sq-loading-beacon {
    position: relative;
    display: grid;
    width: 88px;
    height: 88px;
    place-items: center;
    color: var(--sq-violet);
    background:
      var(--sq-violet-faint);
    border-radius: 999px;
  }

  .sq-loading-beacon > span {
    position: absolute;
    border:
      1px solid var(--sq-lilac);
    border-radius: inherit;
    animation:
      sq-loading-wave
      1.8s ease-out infinite;
  }

  .sq-loading-beacon > span:nth-child(1) {
    inset: 8px;
  }

  .sq-loading-beacon > span:nth-child(2) {
    inset: -13px;
    animation-delay: 0.55s;
  }

  .sq-not-found {
    display: flex;
    width: min(450px, 100%);
    align-items: center;
    flex-direction: column;
    padding: 34px;
    background: white;
    border:
      1px solid var(--sq-border);
    border-radius:
      24px 42px 24px 42px;
    box-shadow:
      0 20px 52px
      rgba(27, 27, 58, 0.12);
    text-align: center;
  }

  .sq-not-found-icon {
    display: grid;
    width: 80px;
    height: 80px;
    margin-bottom: 24px;
    place-items: center;
    color: var(--sq-violet);
    background:
      var(--sq-violet-light);
    border-radius: 999px;
  }

  .sq-not-found h1 {
    margin: 0;
    font-size: 29px;
    letter-spacing: -0.045em;
  }

  .sq-not-found p {
    margin: 9px 0 0;
    color: var(--sq-muted);
    font-size: 14px;
    line-height: 1.6;
  }

  .sq-not-found a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 20px;
    padding: 11px 14px;
    color: white;
    background: var(--sq-violet);
    border-radius: 11px;
    font-size: 13px;
    font-weight: 800;
    text-decoration: none;
  }

  .sq-root a:focus-visible,
  .sq-root button:focus-visible,
  .sq-loading a:focus-visible {
    outline:
      3px solid
      rgba(124, 58, 237, 0.35);
    outline-offset: 3px;
  }

  @keyframes sq-live-pulse {
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

  @keyframes sq-loading-wave {
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
    .sq-primary-layout {
      grid-template-columns:
        minmax(0, 1fr) 310px;
    }

    .sq-content-layout {
      grid-template-columns:
        minmax(0, 1fr) 280px;
    }

    .sq-attendee-grid {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 900px) {
    .sq-primary-layout,
    .sq-content-layout {
      grid-template-columns: 1fr;
    }

    .sq-action-station {
      position: relative;
      top: auto;
      display: grid;
      grid-template-columns:
        215px minmax(0, 1fr);
      gap: 18px;
    }

    .sq-pulse-console {
      grid-row: span 5;
    }

    .sq-host-column {
      display: grid;
      grid-template-columns:
        1fr 1fr;
    }
  }

  @media (max-width: 720px) {
    .sq-root {
      padding:
        10px 12px 70px;
    }

    .sq-command-bar {
      grid-template-columns:
        auto minmax(0, 1fr);
    }

    .sq-share-button {
      grid-column: 1 / -1;
      justify-content: center;
    }

    .sq-session-board {
      padding: 22px 17px;
      border-radius:
        29px 29px 18px 29px;
    }

    .sq-board-heading {
      margin-top: 27px;
    }

    .sq-board-heading h1 {
      font-size:
        clamp(38px, 13vw, 56px);
    }

    .sq-board-heading > p {
      font-size: 14px;
    }

    .sq-route-board {
      grid-template-columns: 1fr;
    }

    .sq-route-connector {
      width: 1px;
      height: 22px;
      margin-left: 19px;
      background:
        repeating-linear-gradient(
          to bottom,
          var(--sq-lilac) 0,
          var(--sq-lilac) 4px,
          transparent 4px,
          transparent 8px
        );
    }

    .sq-board-footer {
      align-items: flex-start;
      flex-direction: column;
    }

    .sq-community-link {
      width: 100%;
      justify-content: center;
    }

    .sq-action-station {
      display: block;
      padding: 18px;
    }

    .sq-pulse-console {
      min-height: 165px;
    }

    .sq-attendee-station {
      padding: 23px 17px;
    }

    .sq-section-heading {
      flex-direction: column;
    }

    .sq-heading-count {
      transform: none;
    }

    .sq-attendee-grid {
      grid-template-columns: 1fr;
    }

    .sq-attendee-card {
      min-height: 210px;
      transform: none;
    }

    .sq-host-column {
      display: flex;
    }

    .sq-closing-callout {
      grid-template-columns: 1fr;
      padding: 28px 22px;
    }

    .sq-closing-actions {
      align-items: stretch;
      flex-direction: column;
    }

    .sq-closing-actions a {
      justify-content: center;
    }
  }

  @media (max-width: 470px) {
    .sq-command-title small {
      display: none;
    }

    .sq-board-top {
      align-items: flex-start;
      flex-direction: column;
    }

    .sq-relative-time {
      align-self: flex-start;
    }

    .sq-route-stop {
      grid-template-columns:
        auto minmax(0, 1fr);
    }

    .sq-route-number {
      display: none;
    }

    .sq-action-stats {
      grid-template-columns: 1fr;
    }

    .sq-timeline-labels {
      font-size: 10px;
    }
  }

  @media (
    prefers-reduced-motion:
    reduce
  ) {
    .sq-root *,
    .sq-loading * {
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