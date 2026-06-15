"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useRequireOnboarding } from "@/hooks/useRequiredOnboarding";

import {
    Users,
    UserPlus,
    Check,
    X,
    Radio,
    MapPin,
    BookOpen,
    Search,
} from "lucide-react";

type FriendshipRequest = {
    id: string;
    requester_id: string;
    receiver_id: string;
    status: string;
    requester: {
        id: string;
        name: string;
        avatar_url: string;
    };
};

type Buddy = {
    id: string;
    name: string;
    avatar_url: string;
    university: string | null;
    major: string | null;
};

type LiveStatus = {
    user_id: string;
    course_code: string;
    location_name: string;
    description: string | null;
    identification: string | null;
};

export default function BuddiesPage() {
    const { profile, loading: onboardingLoading } =
        useRequireOnboarding();

    const [loading, setLoading] = useState(true);

    const [incomingRequests, setIncomingRequests] =
        useState<FriendshipRequest[]>([]);

    const [buddies, setBuddies] =
        useState<Buddy[]>([]);

    const [liveStatuses, setLiveStatuses] =
        useState<Record<string, LiveStatus>>({});

    useEffect(() => {
        if (!profile) return;
        loadData();
    }, [profile]);

    async function loadData() {
        setLoading(true);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        /* Incoming requests */

        const { data: requests } = await supabase
            .from("friendships")
            .select(`
        *,
        requester:profiles!friendships_requester_id_fkey (
          id,
          name,
          avatar_url
        )
      `)
            .eq("receiver_id", user.id)
            .eq("status", "pending");

        setIncomingRequests(
            (requests as FriendshipRequest[]) || []
        );

        /* Accepted friendships */

        const { data: accepted } = await supabase
            .from("friendships")
            .select("*")
            .eq("status", "accepted")
            .or(
                `requester_id.eq.${user.id},receiver_id.eq.${user.id}`
            );

        const buddyIds =
            accepted?.map((friendship) =>
                friendship.requester_id === user.id
                    ? friendship.receiver_id
                    : friendship.requester_id
            ) || [];

        if (buddyIds.length > 0) {
            const { data: buddyProfiles } = await supabase
                .from("profiles")
                .select("*")
                .in("id", buddyIds);

            setBuddies((buddyProfiles as Buddy[]) || []);

            const twoHoursAgo = new Date(
                Date.now() - 2 * 60 * 60 * 1000
            ).toISOString();

            const { data: liveData } = await supabase
                .from("live_study_status")
                .select("*")
                .gte("created_at", twoHoursAgo)
                .in("user_id", buddyIds);

            const liveMap: Record<string, LiveStatus> = {};

            liveData?.forEach((status: any) => {
                liveMap[status.user_id] = status;
            });

            setLiveStatuses(liveMap);
        } else {
            setBuddies([]);
            setLiveStatuses({});
        }

        setLoading(false);
    }

    async function acceptRequest(id: string) {
        await supabase
            .from("friendships")
            .update({
                status: "accepted",
            })
            .eq("id", id);

        loadData();
    }

    async function declineRequest(id: string) {
        await supabase
            .from("friendships")
            .delete()
            .eq("id", id);

        loadData();
    }

    if (loading || onboardingLoading) {
        return (
            <>
                <style>{buddyStyles}</style>
                <main className="loading-screen">
                    <div className="loading-spinner" />
                    <p className="loading-text">Loading study buddies…</p>
                </main>
            </>
        );
    }

    const liveCount = buddies.filter((buddy) => liveStatuses[buddy.id]).length;

    return (
        <>
            <style>{buddyStyles}</style>

            <main className="buddy-root">

                {/* ── Hero Bar ── */}
                <header className="hero-bar">
                    <div className="hero-inner">

                        <div className="hero-left">
                            <img
                                src={profile?.avatar_url}
                                alt={profile?.name}
                                className="avatar"
                            />

                            <div>
                                <p className="hero-eyebrow">
                                    Study Network
                                </p>

                                <h1 className="hero-name">
                                    Study Buddies
                                </h1>

                                <p className="hero-meta">
                                    {profile?.university && (
                                        <span>{profile.university}</span>
                                    )}

                                    {profile?.major && (
                                        <>
                                            <span className="dot-sep">·</span>
                                            <span>{profile.major}</span>
                                        </>
                                    )}

                                    <span className="dot-sep">·</span>

                                    <span>
                                        {buddies.length} study buddy
                                        {buddies.length !== 1 ? "ies" : ""}
                                    </span>
                                </p>
                            </div>
                        </div>

                        {liveCount > 0 && (
                            <div className="live-badge">
                                <span>
                                    {liveCount} buddy
                                    {liveCount > 1 ? "ies" : ""} studying now
                                </span>
                            </div>
                        )}

                    </div>
                </header>

                <div className="page-body">

                    {/* ── Stat Row ── */}
                    <div className="stat-row">
                        <div className="stat-card">
                            <Users size={18} className="stat-icon" />
                            <div>
                                <p className="stat-value">{buddies.length}</p>
                                <p className="stat-label">Study Buddies</p>
                            </div>
                        </div>

                        <div className="stat-card">
                            <UserPlus size={18} className="stat-icon" />
                            <div>
                                <p className="stat-value">{incomingRequests.length}</p>
                                <p className="stat-label">Requests</p>
                            </div>
                        </div>

                        <div className="stat-card stat-card--accent">
                            <Radio size={18} className="stat-icon stat-icon--accent" />
                            <div>
                                <p className="stat-value stat-value--accent">{liveCount}</p>
                                <p className="stat-label">Live Now</p>
                            </div>
                        </div>
                    </div>

                    {/* ── Quick Actions ── */}
                    <div className="actions-row">
                        <Link href="/sessions" className="action-primary">
                            <Search size={20} strokeWidth={2} />
                            <span>Browse Students</span>
                        </Link>
                    </div>

                    {/* ── Incoming Requests ── */}
                    <section className="card">
                        <div className="card-header">
                            <h2 className="card-title">Incoming Requests</h2>
                        </div>

                        {incomingRequests.length === 0 ? (
                            <p className="muted-note">No pending requests.</p>
                        ) : (
                            <ul className="session-list">
                                {incomingRequests.map((request) => (
                                    <li key={request.id}>
                                        <div className="session-row request-row">
                                            <img
                                                src={request.requester.avatar_url}
                                                className="buddy-avatar"
                                            />

                                            <div className="session-info">
                                                <p className="session-title">
                                                    {request.requester.name}
                                                </p>
                                                <span className="session-loc">
                                                    Wants to be your study buddy
                                                </span>
                                            </div>

                                            <div className="buddy-actions">
                                                <button
                                                    className="buddy-accept"
                                                    onClick={() =>
                                                        acceptRequest(request.id)
                                                    }
                                                >
                                                    <Check size={15} />
                                                    Accept
                                                </button>

                                                <button
                                                    className="buddy-decline"
                                                    onClick={() =>
                                                        declineRequest(request.id)
                                                    }
                                                >
                                                    <X size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* ── My Study Buddies ── */}
                    <section className="card">
                        <div className="card-header">
                            <h2 className="card-title">My Study Buddies</h2>
                        </div>

                        {buddies.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">
                                    <UserPlus size={36} strokeWidth={1.75} />
                                </div>
                                <p className="empty-heading">No Study Buddies Yet</p>
                                <p className="empty-sub">
                                    Add classmates from the Sessions page and see
                                    when they are studying.
                                </p>
                                <Link href="/sessions" className="empty-cta">
                                    Browse Students
                                </Link>
                            </div>
                        ) : (
                            <div className="buddy-grid">
                                {buddies.map((buddy) => {
                                    const live = liveStatuses[buddy.id];

                                    return (
                                        <div
                                            key={buddy.id}
                                            className={`buddy-profile-card ${
                                                live ? "buddy-profile-live" : ""
                                            }`}
                                        >

                                            <img
                                                src={buddy.avatar_url}
                                                className="buddy-profile-avatar"
                                            />

                                            <div className="buddy-profile-info">
                                                <p className="session-title">{buddy.name}</p>
                                                <span className="tag tag--muted">
                                                    {buddy.major || "Student"}
                                                </span>

                                                {live ? (
                                                    <div className="buddy-live-info">
                                                        <span className="session-time session-time--live">
                                                            Studying now
                                                        </span>

                                                        <span className="session-loc">
                                                            <BookOpen size={12} />
                                                            {live.course_code}
                                                        </span>

                                                        <span className="session-loc">
                                                            <MapPin size={12} />
                                                            {live.location_name}
                                                        </span>

                                                        {live.identification && (
                                                            <span className="session-loc">
                                                                👋 {live.identification}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="session-time session-time--later">
                                                        Offline
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                </div>
            </main>
        </>
    );
}

const buddyStyles = `

  /* ── Reset / tokens ── */
  .buddy-root * { box-sizing: border-box; }
  .buddy-root {
    --indigo:      #1B1B3A;
    --violet:      #7C3AED;
    --violet-lt:   #EDE9FE;
    --violet-mid:  #A78BFA;
    --amber:       #F59E0B;
    --amber-lt:    #FEF3C7;
    --green:       #10B981;
    --green-lt:    #D1FAE5;
    --red:         #EF4444;
    --red-lt:      #FEE2E2;
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

  /* ── Loading ── */
  .loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 16px;
    background: var(--bg, #F5F4FB);
  }
  .loading-spinner {
    width: 36px; height: 36px;
    border: 3px solid #E4E2F0;
    border-top-color: #7C3AED;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-text { color: #64748B; font-size: 14px; }

  /* ── Hero ── */
  .hero-bar {
    background: var(--indigo);
    padding: 40px 24px 36px;
  }
  .hero-inner {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .hero-left {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .avatar {
    width: 72px; height: 72px;
    border-radius: 50%;
    border: 3px solid rgba(255,255,255,0.15);
    object-fit: cover;
    flex-shrink: 0;
  }
  .hero-eyebrow {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--violet-mid);
    margin: 0 0 4px;
  }
  .hero-name {
    font-size: 36px;
    font-weight: 700;
    color: #FFFFFF;
    margin: 0 0 6px;
    line-height: 1.1;
  }
  .hero-meta {
    font-size: 14px;
    color: rgba(255,255,255,0.5);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .dot-sep { color: rgba(255,255,255,0.25); }

  /* Live badge */
  .live-badge {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(16,185,129,0.15);
    border: 1px solid rgba(16,185,129,0.3);
    border-radius: 100px;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 600;
    color: #A7F3D0;
  }
  .live-pulse {
    width: 10px; height: 10px;
    border-radius: 50%;
    background: var(--green);
    position: relative;
    flex-shrink: 0;
  }
  .live-pulse::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: var(--green);
    opacity: 0.4;
    animation: pulse 1.4s ease-out infinite;
  }
  @keyframes pulse {
    0%   { transform: scale(1); opacity: 0.4; }
    70%  { transform: scale(2); opacity: 0; }
    100% { transform: scale(1); opacity: 0; }
  }

  /* ── Page body ── */
  .page-body {
    max-width: 1100px;
    margin: 0 auto;
    padding: 32px 24px 64px;
  }

  /* ── Stat row ── */
  .stat-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }
  .stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .stat-card--accent {
    background: var(--green-lt);
    border-color: #A7F3D0;
  }
  .stat-icon { color: var(--muted); }
  .stat-icon--accent { color: var(--green); }
  .stat-value {
    font-size: 28px;
    font-weight: 700;
    line-height: 1;
    margin: 0 0 2px;
  }
  .stat-value--accent { color: var(--green); }
  .stat-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 0;
  }

  /* ── Action buttons ── */
  .actions-row {
    display: flex;
    gap: 12px;
    margin-bottom: 28px;
    flex-wrap: wrap;
  }
  .action-primary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--violet);
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    padding: 12px 22px;
    border-radius: 12px;
    text-decoration: none;
    transition: background 0.15s, transform 0.1s;
  }
  .action-primary:hover { background: #6D28D9; transform: translateY(-1px); }

  /* ── Cards ── */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 24px;
    margin-bottom: 20px;
  }
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .card-title {
    font-size: 18px;
    font-weight: 700;
    margin: 0;
  }

  /* ── Empty state ── */
  .empty-state {
    text-align: center;
    padding: 40px 24px;
    border: 2px dashed var(--border);
    border-radius: 16px;
  }
  .empty-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--violet-mid);
    margin-bottom: 12px;
  }
  .empty-heading {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 6px;
  }
  .empty-sub {
    font-size: 14px;
    color: var(--muted);
    margin: 0 0 20px;
  }
  .empty-cta {
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
  .empty-cta:hover { background: #6D28D9; }

  /* ── Session / request list ── */
  .session-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .session-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    border: 1px solid var(--border);
    border-radius: 14px;
    text-decoration: none;
    color: inherit;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .request-row:hover {
    border-color: var(--violet-mid);
    box-shadow: 0 2px 12px rgba(124,58,237,0.08);
  }

  .session-info { flex: 1; min-width: 0; }
  .session-title {
    font-size: 15px;
    font-weight: 600;
    margin: 0 0 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .session-loc {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--faint);
  }
  .tag--muted {
    background: var(--bg);
    color: var(--muted);
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 100px;
    display: inline-block;
    margin: 4px 0 6px;
  }

  .muted-note { font-size: 14px; color: var(--muted); }

  /* ── Avatars ── */
  .buddy-avatar {
    width: 52px; height: 52px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }
  .buddy-profile-avatar {
    width: 56px; height: 56px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }

  /* ── Request actions ── */
  .buddy-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }
  .buddy-accept {
    background: var(--green);
    color: #fff;
    border: none;
    border-radius: 10px;
    padding: 8px 14px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  .buddy-accept:hover { background: #0EA371; }
  .buddy-decline {
    background: var(--red-lt);
    color: var(--red);
    border: none;
    border-radius: 10px;
    padding: 8px 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    transition: background 0.15s;
  }
  .buddy-decline:hover { background: #FECACA; }

  /* ── Buddy grid ── */
  .buddy-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 14px;
  }
  .buddy-profile-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 18px;
    overflow: hidden;
  }
  .buddy-profile-live {
    background: var(--green-lt);
    border-color: #A7F3D0;
  }
  .profile-urgency {
    position: absolute;
    top: 0; left: 0;
    width: 100%;
    height: 4px;
    min-height: 0;
    border-radius: 0;
  }
  .buddy-profile-info {
    display: flex;
    flex-direction: column;
    width: 100%;
  }
  .buddy-live-info {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 6px;
  }

  /* ── Time / live indicators ── */
  .session-time {
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
  }
  .session-time--live { color: var(--green); }
  .session-time--later { color: var(--faint); font-weight: 400; }

  .mini-pulse {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--green);
    animation: pulse 1.4s ease-out infinite;
  }

  /* ── Responsive ── */
  @media (max-width: 860px) {
    .stat-row { grid-template-columns: repeat(3, 1fr); }
    .hero-name { font-size: 28px; }
  }
  @media (max-width: 700px) {
    .stat-row { grid-template-columns: 1fr; }
  }
  @media (max-width: 520px) {
    .hero-bar { padding: 28px 16px; }
    .page-body { padding: 20px 16px 48px; }
    .request-row {
      flex-wrap: wrap;
    }
    .buddy-actions { width: 100%; justify-content: flex-end; }
  }

  @media (prefers-reduced-motion: reduce) {
    .live-pulse::after, .mini-pulse { animation: none; }
    .action-primary:hover { transform: none; }
  }
`;