"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import { useRequireOnboarding } from "@/hooks/useRequiredOnboarding";

import {
  MapPin,
  CalendarDays,
  Users,
  ArrowLeft,
  GraduationCap,
  Pencil,
} from "lucide-react";
import AlertModal from "@/components/AlertModal";

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

type Creator = {
  id: string;
  name: string;
  avatar_url: string;
  university: string;
  major: string;
  year: string;
};

type Attendee = {
  id: string;
  name: string;
  avatar_url: string;
};

export default function SessionDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const { loading: onboardingLoading } = useRequireOnboarding();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [attendees, setAttendees] = useState<Attendee[]>([]);

  const [alertOpen, setAlertOpen] = useState(false);

  const [alertConfig, setAlertConfig] = useState({
    title: "",
    message: "",
    type: "info" as
        | "success"
        | "error"
        | "warning"
        | "info",
  });

  function showAlert(
      title: string,
      message: string,
      type:
          | "success"
          | "error"
          | "warning"
          | "info" = "info"
  ) {
    setAlertConfig({
      title,
      message,
      type,
    });

    setAlertOpen(true);
  }

  const id = params.id as string;

  useEffect(() => {
    loadSession();
  }, [id]);

  function getUrgency(session: Session): "live" | "soon" | "today" | "later" | "completed" {
    const now = new Date();
    const start = new Date(session.start_time);
    const end = new Date(session.end_time);

    if (now > end) return "completed";
    if (now >= start && now <= end) return "live";

    const diffMin = (start.getTime() - now.getTime()) / 60000;
    if (diffMin <= 30) return "soon";
    if (diffMin <= 120) return "today";
    return "later";
  }

  function getStatusLabel(urgency: ReturnType<typeof getUrgency>) {
    switch (urgency) {
      case "completed":
        return "Completed";
      case "live":
        return "Live now";
      case "soon":
        return "Starting soon";
      case "today":
        return "Today";
      default:
        return "Upcoming";
    }
  }

  async function loadSession() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setCurrentUserId(user?.id ?? null);

    if (user) {
      const { data: friendships } = await supabase
        .from("friendships")
        .select("*")
        .eq("status", "accepted")
        .or(
          `requester_id.eq.${user.id},receiver_id.eq.${user.id}`
        );

      const ids = new Set<string>();

      friendships?.forEach((friendship) => {
        if (friendship.requester_id === user.id) {
          ids.add(friendship.receiver_id);
        } else {
          ids.add(friendship.requester_id);
        }
      });

      setBuddyIds(ids);
    }

    if (user) {
      const { data: membership } = await supabase
        .from("session_members")
        .select("*")
        .eq("session_id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      setJoined(!!membership);
    }

    const { data: sessionData, error } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !sessionData) {
      setLoading(false);
      return;
    }

    setSession(sessionData);

    const { data: members } = await supabase
      .from("session_members")
      .select(`
        user_id,
        profiles (
          id,
          name,
          avatar_url
        )
      `)
      .eq("session_id", id);

    if (members) {
      const formatted = members.map((member: any) => member.profiles).filter(Boolean);
      setAttendees(formatted);
    }

    const { data: creatorData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", sessionData.creator_id)
      .single();

    if (creatorData) {
      setCreator(creatorData);
    }

    setLoading(false);
  }

  const [buddyIds, setBuddyIds] = useState<Set<string>>(
    new Set()
  );

  async function joinSession() {
    if (session && new Date(session.end_time) < new Date()) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase

        .from("session_members")

        .insert({

          session_id: id,

          user_id: user.id,

        });

    if (error) {

      showAlert(

          "Unable to Join Session",

          error.message,

          "error"

      );

      return;

    }

    if (!error) {
      setJoined(true);
      loadSession();
    }
  }

  async function leaveSession() {
    if (session && new Date(session.end_time) < new Date()) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
        .from("session_members")
        .delete()
        .eq("session_id", id)
        .eq("user_id", user.id);

    if (error) {
      showAlert(
          "Unable to Leave Session",
          error.message,
          "error"
      );
      return;
    }

    if (!error) {
      setJoined(false);
      loadSession();
    }
  }

  async function sendFriendRequest(receiverId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    if (user.id === receiverId) {
      return;
    }

    const { data: existing } = await supabase
      .from("friendships")
      .select("id")
      .or(
        `and(requester_id.eq.${user.id},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${user.id})`
      )
      .maybeSingle();

    if (existing) {
      showAlert(
          "Already Connected",
          "You already have a pending or existing study buddy relationship.",
          "warning"
      );
      return;
    }

    const { error } = await supabase
      .from("friendships")
      .insert({
        requester_id: user.id,
        receiver_id: receiverId,
        status: "pending",
      });

    if (error) {
      showAlert(
          "Unable to Send Request",
          error.message,
          "error"
      );
      return;
    }

    showAlert(
        "Request Sent",
        "Your study buddy request has been sent.",
        "success"
    );
  }

  if (loading || onboardingLoading) {
    return (
      <>
        <style>{sdStyles}</style>
        <main className="sd-loading-screen">
          <div className="sd-loading-spinner" />
          <p className="sd-loading-text">Loading session…</p>
        </main>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <style>{sdStyles}</style>
        <main className="sd-loading-screen">
          <div className="sd-notfound-card">
            <p className="sd-notfound-emoji">🔍</p>
            <h1 className="sd-notfound-title">Session not found</h1>
            <p className="sd-notfound-sub">This study session doesn't exist or was removed.</p>
            <Link href="/dashboard" className="sd-notfound-cta">
              Back to dashboard
            </Link>
          </div>
        </main>
      </>
    );
  }

  const urgency = getUrgency(session);
  const isCompleted = urgency === "completed";
  const isLive = urgency === "live";

  return (
    <>
      <style>{sdStyles}</style>
      <main className="sd-root">
        {/* Hero */}
        <header className="sd-hero-bar">
          <div className="sd-hero-inner">
            <div className="sd-hero-top">
              <span className={`sd-status sd-status--${urgency}`}>
                {getStatusLabel(urgency)}
              </span>
              <Link
                href={`/courses/${encodeURIComponent(session.course_code)}`}
                className="sd-course-link"
              >
                {session.course_code}
              </Link>
            </div>

            <h1 className="sd-hero-title">{session.title}</h1>

            <div className="sd-hero-meta">
              <span className="sd-meta-item">
                <MapPin size={14} />
                {session.location_name}
              </span>
              <span className="sd-dot-sep">·</span>
              <span className="sd-meta-item">
                <CalendarDays size={14} />
                {new Date(session.start_time).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
              <span className="sd-dot-sep">·</span>
              <span className="sd-meta-item">
                Ends{" "}
                {new Date(session.end_time).toLocaleString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </header>

        <div className="sd-page-body">
          <button onClick={() => router.back()} className="sd-back-btn">
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="sd-two-col">
            {/* Main column */}
            <div className="sd-main-col">
              {/* Description */}
              <section className="sd-card">
                <div className="sd-card-header">
                  <h2 className="sd-card-title">Description</h2>
                </div>
                <p className="sd-description">
                  {session.description?.trim() || "No description provided."}
                </p>
              </section>

              {/* Attendees */}
              <section className="sd-card">
                <div className="sd-card-header">
                  <h2 className="sd-card-title">
                    <Users size={18} className="sd-card-title-icon" />
                    Attendees
                  </h2>
                  <span className="sd-attendee-count">
                    {attendees.length} attendee{attendees.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {attendees.length === 0 ? (
                  <div className="sd-empty-state">
                    <div className="sd-empty-icon">👥</div>
                    <p className="sd-empty-heading">No attendees yet</p>
                    <p className="sd-empty-sub">Be the first to join this session.</p>
                  </div>
                ) : (
                  <ul className="sd-attendee-list">
                    {attendees.map((attendee) => (
                      <li key={attendee.id} className="sd-attendee-row">
                        <img
                          src={attendee.avatar_url}
                          alt={attendee.name}
                          className="sd-attendee-avatar"
                        />

                        <div className="sd-attendee-info">
                          <p className="sd-attendee-name">
                            {attendee.name}
                          </p>

                          <p className="sd-attendee-role">
                            {attendee.id === session.creator_id
                              ? "Session creator"
                              : "Attendee"}
                          </p>
                        </div>

                        {attendee.id !== currentUserId && (
                          <div className="sd-attendee-actions">
                            {buddyIds.has(attendee.id) ? (
                              <Link
                                href="/buddies"
                                className="sd-buddy-added"
                              >
                                ✓ Study Buddy
                              </Link>
                            ) : (
                              <button
                                className="sd-buddy-btn"
                                onClick={() =>
                                  sendFriendRequest(attendee.id)
                                }
                              >
                                Add Buddy
                              </button>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {/* Right column */}
            <div className="sd-right-col">
              {/* Creator */}
              <section className="sd-card">
                <div className="sd-card-header">
                  <h2 className="sd-card-title">Created by</h2>
                </div>

                {creator && (
                  <div className="sd-creator">
                    <img src={creator.avatar_url} alt={creator.name} className="sd-creator-avatar" />
                    <h3 className="sd-creator-name">{creator.name}</h3>
                    {creator.id !== currentUserId && (
                      buddyIds.has(creator.id) ? (
                        <Link
                          href="/buddies"
                          className="sd-buddy-added"
                        >
                          ✓ Study Buddy
                        </Link>
                      ) : (
                        <button
                          className="sd-buddy-btn"
                          onClick={() =>
                            sendFriendRequest(creator.id)
                          }
                        >
                          Add Study Buddy
                        </button>
                      )
                    )}
                    <div className="sd-creator-chips">
                      {creator.university && (
                        <span className="sd-chip">
                          <GraduationCap size={12} />
                          {creator.university}
                        </span>
                      )}
                      {creator.major && <span className="sd-chip sd-chip--green">{creator.major}</span>}
                      {creator.year && <span className="sd-chip sd-chip--muted">{creator.year}</span>}
                    </div>
                  </div>
                )}
              </section>

              {/* Actions */}
              <section className="sd-card">
                {isCompleted ? (
                  <div className="sd-ended-note">This session has ended.</div>
                ) : currentUserId === session.creator_id ? (
                  <>
                    <Link href={`/sessions/${session.id}/edit`} className="sd-action-primary">
                      <Pencil size={16} />
                      Edit session
                    </Link>
                    <p className="sd-action-note">
                      You created this session and are automatically attending.
                    </p>
                  </>
                ) : (
                  <>
                    {joined ? (
                      <button onClick={leaveSession} className="sd-action-destructive">
                        Leave session
                      </button>
                    ) : (
                      <button onClick={joinSession} className="sd-action-primary">
                        Join session
                      </button>
                    )}
                    <p className="sd-action-note">
                      {joined
                        ? "You're attending this session. Leave if your plans change."
                        : "Join this session to let the organizer know you're attending."}
                    </p>
                  </>
                )}
              </section>
            </div>
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

const sdStyles = `
  .sd-root * { box-sizing: border-box; }
  .sd-root {
    --indigo:      #1B1B3A;
    --violet:      #7C3AED;
    --violet-lt:   #EDE9FE;
    --violet-mid:  #A78BFA;
    --green:       #10B981;
    --green-lt:    #ECFDF5;
    --amber:       #F59E0B;
    --amber-lt:    #FEF3C7;
    --red:         #EF4444;
    --red-lt:      #FEF2F2;
    --sky:         #38BDF8;
    --bg:          #F5F4FB;
    --surface:     #FFFFFF;
    --border:      #E4E2F0;
    --text:        #1B1B3A;
    --muted:       #64748B;
    --faint:       #94A3B8;
    background: var(--bg);
    min-height: 100vh;
    color: var(--text);
  }

  /* Loading / not found */
  .sd-loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 16px;
    background: var(--bg);
    padding: 24px;
  }
  .sd-loading-spinner {
    width: 36px; height: 36px;
    border: 3px solid var(--border);
    border-top-color: var(--violet);
    border-radius: 50%;
    animation: sd-spin 0.7s linear infinite;
  }
  .sd-loading-text { font-size: 14px; color: var(--muted); }
  @keyframes sd-spin { to { transform: rotate(360deg); } }

  .sd-notfound-card {
    text-align: center;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 40px 32px;
    box-shadow: 0 4px 24px rgba(27,27,58,0.08);
    max-width: 360px;
  }
  .sd-notfound-emoji { font-size: 36px; margin-bottom: 12px; }
  .sd-notfound-title { font-size: 20px; font-weight: 700; margin: 0 0 6px; }
  .sd-notfound-sub { font-size: 14px; color: var(--muted); margin: 0 0 20px; }
  .sd-notfound-cta {
    display: inline-flex;
    background: var(--violet);
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    padding: 10px 20px;
    border-radius: 10px;
    text-decoration: none;
    transition: background 0.15s;
  }
  .sd-notfound-cta:hover { background: #6D28D9; }

  /* Hero */
  .sd-hero-bar {
    background: var(--indigo);
    padding: 24px 24px 36px;
  }
  .sd-hero-inner {
    max-width: 1100px;
    margin: 0 auto;
  }
  .sd-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--muted);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  margin-bottom: 20px;
  transition: color 0.15s;
}
.sd-back-btn:hover { color: var(--violet); }

  .sd-hero-top {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
    flex-wrap: wrap;
  }
  .sd-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 100px;
  }
  .sd-status--completed { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); }
  .sd-status--live { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #FCA5A5; }
  .sd-status--soon { background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.3); color: #FCD34D; }
  .sd-status--today { background: rgba(56,189,248,0.15); border: 1px solid rgba(56,189,248,0.3); color: #7DD3FC; }
  .sd-status--later { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); }

  .sd-live-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--red);
    animation: sd-pulse 1.4s ease-out infinite;
  }
  @keyframes sd-pulse {
    0%   { transform: scale(1); opacity: 0.6; }
    70%  { transform: scale(2.2); opacity: 0; }
    100% { transform: scale(1); opacity: 0; }
  }

  .sd-course-link {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--violet-mid);
    text-decoration: none;
  }
  .sd-course-link:hover { text-decoration: underline; }

  .sd-hero-title {
    font-size: 36px;
    font-weight: 700;
    color: #fff;
    margin: 0 0 12px;
    line-height: 1.1;
  }

  .sd-hero-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    font-size: 14px;
    color: rgba(255,255,255,0.55);
  }
  .sd-meta-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .sd-dot-sep { color: rgba(255,255,255,0.25); }

  /* Page body */
  .sd-page-body {
    max-width: 1100px;
    margin: 0 auto;
    padding: 32px 24px 64px;
  }
    .sd-attendee-actions {
  margin-left: auto;
}

.sd-buddy-btn {
  border: none;
  background: var(--violet);
  color: white;

  padding: 8px 12px;
  border-radius: 10px;

  font-size: 12px;
  font-weight: 600;

  cursor: pointer;

  transition: background 0.15s ease;
}

.sd-buddy-added {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  padding: 8px 12px;

  border-radius: 10px;

  text-decoration: none;

  background: #DCFCE7;
  color: #166534;

  font-size: 12px;
  font-weight: 600;

  border: 1px solid #86EFAC;
}

.sd-buddy-btn:hover {
  background: #6D28D9;
}
  .sd-two-col {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 20px;
    align-items: start;
  }
  .sd-main-col, .sd-right-col {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* Cards */
  .sd-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 4px 24px rgba(27,27,58,0.08);
  }
  .sd-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  .sd-card-title {
    font-size: 18px;
    font-weight: 700;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .sd-card-title-icon { color: var(--violet); }

  .sd-description {
    font-size: 14px;
    line-height: 1.6;
    color: var(--text);
    white-space: pre-wrap;
    margin: 0;
  }

  /* Attendees */
  .sd-attendee-count {
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
  }
  .sd-attendee-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .sd-attendee-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 1px solid var(--border);
    border-radius: 14px;
    transition: border-color 0.15s;
  }
  .sd-attendee-row:hover { border-color: var(--violet-mid); }
  .sd-attendee-avatar {
    width: 40px; height: 40px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }
  .sd-attendee-name { font-size: 14px; font-weight: 600; margin: 0; }
  .sd-attendee-role { font-size: 12px; color: var(--faint); margin: 2px 0 0; }

  /* Empty state */
  .sd-empty-state {
    text-align: center;
    padding: 32px 24px;
    border: 2px dashed var(--border);
    border-radius: 16px;
  }
  .sd-empty-icon { font-size: 32px; margin-bottom: 10px; }
  .sd-empty-heading { font-size: 15px; font-weight: 600; margin: 0 0 4px; }
  .sd-empty-sub { font-size: 13px; color: var(--muted); margin: 0; }

  /* Creator card */
  .sd-creator {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 10px;
  }
  .sd-creator-avatar {
    width: 80px; height: 80px;
    border-radius: 50%;
    border: 3px solid var(--violet-lt);
    object-fit: cover;
  }
  .sd-creator-name { font-size: 18px; font-weight: 700; margin: 0; }
  .sd-creator-chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
  }
  .sd-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: var(--violet-lt);
    color: var(--violet);
    font-size: 11px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 100px;
  }
  .sd-chip--green { background: var(--green-lt); color: var(--green); }
  .sd-chip--muted { background: var(--bg); color: var(--muted); border: 1px solid var(--border); }

  /* Actions */
  .sd-action-primary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    background: var(--violet);
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    padding: 12px 22px;
    border-radius: 12px;
    border: none;
    text-decoration: none;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }
  .sd-action-primary:hover { background: #6D28D9; transform: translateY(-1px); }

  .sd-action-destructive {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    background: var(--red-lt);
    color: var(--red);
    border: 1px solid #FECACA;
    font-size: 15px;
    font-weight: 600;
    padding: 12px 22px;
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }
  .sd-action-destructive:hover { background: #FEE2E2; transform: translateY(-1px); }

  .sd-action-note {
    text-align: center;
    font-size: 13px;
    color: var(--muted);
    margin: 12px 0 0;
  }

  .sd-ended-note {
    text-align: center;
    font-size: 14px;
    color: var(--muted);
    background: var(--bg);
    border-radius: 12px;
    padding: 14px;
  }

  /* Responsive */
  @media (max-width: 860px) {
    .sd-two-col { grid-template-columns: 1fr; }
    .sd-right-col { order: -1; }
    .sd-hero-title { font-size: 28px; }
  }
  @media (max-width: 520px) {
    .sd-hero-bar { padding: 20px 16px 28px; }
    .sd-page-body { padding: 20px 16px 48px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .sd-live-dot { animation: none; }
    .sd-action-primary:hover, .sd-action-destructive:hover { transform: none; }
  }
`;