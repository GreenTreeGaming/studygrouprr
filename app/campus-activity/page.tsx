"use client";

import { useEffect, useState } from "react";
import { Flame, MapPin, BookOpen, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRequireOnboarding } from "@/hooks/useRequiredOnboarding";

type LiveStudent = {
    user_id: string;
    course_code: string;
    location_name: string;
};

export default function CampusActivityPage() {
    const { profile, loading: onboardingLoading } =
        useRequireOnboarding();

    const [loading, setLoading] = useState(true);

    const [totalStudents, setTotalStudents] =
        useState(0);

    const [topLocations, setTopLocations] =
        useState<{ name: string; count: number }[]>([]);

    const [topCourses, setTopCourses] =
        useState<{ course: string; count: number }[]>([]);

    useEffect(() => {
        if (!profile?.university) return;

        loadActivity();
    }, [profile]);

    async function loadActivity() {
        setLoading(true);

        const twoHoursAgo = new Date(
            Date.now() - 2 * 60 * 60 * 1000
        ).toISOString();

        const now = new Date().toISOString();

        const [{ data: liveData }, { data: sessions }, { data: members }] =
            await Promise.all([
                supabase
                    .from("live_study_status")
                    .select(`
        user_id,
        course_code,
        location_name
      `),

                supabase
                    .from("study_sessions")
                    .select(`
        id,
        course_code,
        location_name,
        creator_id
      `)
                    .lte("start_time", now)
                    .gte("end_time", now),

                supabase
                    .from("session_members")
                    .select(`
        session_id,
        user_id
      `),
            ]);

        const activityRows: LiveStudent[] = [
            ...(liveData || []),
        ];

        if (!activityRows.length) {

            setTotalStudents(0);

            setTopLocations([]);

            setTopCourses([]);

            setLoading(false);

            return;

        }

        members?.forEach((member) => {
            const session = sessions?.find(
                (s) => s.id === member.session_id
            );

            if (!session) return;
            activityRows.push({
                user_id: member.user_id,
                course_code: session.course_code,
                location_name: session.location_name,
            });
        });

        const userIds = activityRows.map(
            (s) => s.user_id
        );

        const { data: profiles } = await supabase
            .from("profiles")
            .select("id, university")
            .in("id", userIds);

        const allowedUsers = new Set(
            (profiles || [])
                .filter(
                    (p) =>
                        p.university === profile?.university
                )
                .map((p) => p.id)
        );

        const liveStudents = activityRows.filter(
            (s) => allowedUsers.has(s.user_id)
        );

        const uniqueStudents = new Set(
            liveStudents.map((s) => s.user_id)
        );

        setTotalStudents(uniqueStudents.size);

        const locationCounts = new Map<
            string,
            number
        >();

        const courseCounts = new Map<
            string,
            number
        >();

        liveStudents.forEach((student) => {
            const location =
                student.location_name ||
                "Unknown Location";

            const course =
                student.course_code ||
                "Unknown Course";

            locationCounts.set(
                location,
                (locationCounts.get(location) || 0) + 1
            );

            courseCounts.set(
                course,
                (courseCounts.get(course) || 0) + 1
            );
        });

        setTopLocations(
            [...locationCounts.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([name, count]) => ({
                    name,
                    count,
                }))
        );

        setTopCourses(
            [...courseCounts.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([course, count]) => ({
                    course,
                    count,
                }))
        );

        setLoading(false);
    }

    if (loading || onboardingLoading) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <p>Loading campus activity...</p>
            </main>
        );
    }

    return (
        <>
            <style>{campusActivityStyles}</style>

            <main className="campus-root">

                <header className="hero-bar">
                    <div className="hero-inner">

                        <div>
                            <div className="hero-label">
                                <Flame size={14} />
                                <span>LIVE CAMPUS</span>
                            </div>

                            <h1 className="hero-name">
                                {profile?.university}
                            </h1>

                            <p className="hero-meta">
                                See where students are studying right now
                            </p>
                        </div>

                        <div className="live-badge">
                            <Flame size={14} />
                            <span>
              {totalStudents} studying now
            </span>
                        </div>

                    </div>
                </header>

                <div className="page-body">

                    <div className="stat-row">

                        <div className="stat-card">
                            <Users size={18} className="stat-icon" />
                            <div>
                                <p className="stat-value">
                                    {totalStudents}
                                </p>
                                <p className="stat-label">
                                    Live Students
                                </p>
                            </div>
                        </div>

                        <div className="stat-card">
                            <MapPin size={18} className="stat-icon" />
                            <div>
                                <p className="stat-value">
                                    {topLocations.length}
                                </p>
                                <p className="stat-label">
                                    Locations
                                </p>
                            </div>
                        </div>

                        <div className="stat-card stat-card--accent">
                            <BookOpen
                                size={18}
                                className="stat-icon stat-icon--accent"
                            />
                            <div>
                                <p className="stat-value stat-value--accent">
                                    {topCourses.length}
                                </p>
                                <p className="stat-label">
                                    Courses
                                </p>
                            </div>
                        </div>

                    </div>

                    <div className="two-col">

                        <section className="card">
                            <div className="card-header">
                                <div className="card-title-wrap">
                                    <MapPin size={18} className="card-title-icon" />
                                    <h2 className="card-title">
                                        Hot Study Spots
                                    </h2>
                                </div>
                            </div>

                            {topLocations.length === 0 ? (
                                <div className="empty-state">
                                    <MapPin size={36} />

                                    <p className="empty-heading">
                                        No activity yet
                                    </p>

                                    <p className="empty-sub">
                                        Be the first student to go live.
                                    </p>
                                </div>
                            ) : (
                                <div className="activity-list">
                                    {topLocations.map(
                                        (location, index) => (
                                            <div
                                                key={location.name}
                                                className="activity-row"
                                            >
                                                <div>
                                                    <p className="activity-rank">
                                                        #{index + 1}
                                                    </p>

                                                    <p className="activity-name">
                                                        {location.name}
                                                    </p>
                                                </div>

                                                <div className="activity-pill">
                                                    <Users size={12} />
                                                    {location.count}
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </section>

                        <section className="card">
                            <div className="card-header">
                                <div className="card-title-wrap">
                                    <BookOpen
                                        size={18}
                                        className="card-title-icon"
                                    />

                                    <h2 className="card-title">
                                        Active Courses
                                    </h2>
                                </div>
                            </div>

                            {topCourses.length === 0 ? (
                                <div className="empty-state">
                                    <BookOpen size={36} />

                                    <p className="empty-heading">
                                        No courses active
                                    </p>

                                    <p className="empty-sub">
                                        Course activity will appear here.
                                    </p>
                                </div>
                            ) : (
                                <div className="activity-list">
                                    {topCourses.map(
                                        (course, index) => (
                                            <div
                                                key={course.course}
                                                className="activity-row"
                                            >
                                                <div>
                                                    <p className="activity-rank">
                                                        #{index + 1}
                                                    </p>

                                                    <p className="activity-name">
                                                        {course.course}
                                                    </p>
                                                </div>

                                                <div className="activity-pill activity-pill--green">
                                                    <Users size={12} />
                                                    {course.count}
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </section>

                    </div>
                </div>
            </main>
        </>
    );
}

const campusActivityStyles = `
.campus-root * {
  box-sizing: border-box;
}

.campus-root {
  --indigo: #1B1B3A;
  --violet: #7C3AED;
  --violet-lt: #EDE9FE;
  --violet-mid: #A78BFA;
  --amber: #F59E0B;
  --green: #10B981;
  --bg: #F5F4FB;
  --surface: #FFFFFF;
  --border: #E4E2F0;
  --text: #1B1B3A;
  --muted: #64748B;
  --faint: #94A3B8;

  background: var(--bg);
  min-height: 100vh;
  color: var(--text);
}

/* Hero */

.hero-bar {
  background: var(--indigo);
  padding: 40px 24px 36px;
}

.hero-inner {
  max-width: 1100px;
  margin: 0 auto;

  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;

  flex-wrap: wrap;
}

.hero-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;

  color: var(--violet-mid);

  font-size: 12px;
  font-weight: 700;

  letter-spacing: .12em;
  text-transform: uppercase;

  margin-bottom: 8px;
}

.card-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-title-icon {
  color: var(--violet);
  flex-shrink: 0;
}

.hero-name {
  font-size: 36px;
  font-weight: 700;

  color: white;

  margin: 0 0 8px;
}

.hero-meta {
  color: rgba(255,255,255,.65);
  font-size: 15px;
  margin: 0;
}

/* Live badge */

.live-badge {
  display: flex;
  align-items: center;
  gap: 10px;

  background: rgba(239,68,68,.15);

  border: 1px solid rgba(239,68,68,.25);

  color: #FCA5A5;

  border-radius: 999px;

  padding: 10px 16px;

  font-size: 13px;
  font-weight: 700;
}

/* Page */

.page-body {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 24px 64px;
}

/* Stats */

.stat-row {
  display: grid;
  grid-template-columns: repeat(3,1fr);

  gap: 12px;

  margin-bottom: 24px;
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

.activity-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  background: var(--violet-lt);
  color: var(--violet);

  font-size: 13px;
  font-weight: 700;

  padding: 6px 12px;
  border-radius: 999px;
}

.stat-card--accent {
  background: var(--violet-lt);
  border-color: #C4B5FD;
}

.stat-icon {
  color: var(--muted);
}

.stat-icon--accent {
  color: var(--violet);
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
}

.stat-value--accent {
  color: var(--violet);
}

.stat-label {
  font-size: 12px;

  text-transform: uppercase;

  letter-spacing: .08em;

  color: var(--muted);

  margin: 4px 0 0;
}

/* Layout */

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

/* Cards */

.card {
  background: var(--surface);

  border: 1px solid var(--border);

  border-radius: 20px;

  padding: 24px;
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

/* Empty */

.empty-state {
  text-align: center;

  padding: 40px 24px;

  border: 2px dashed var(--border);

  border-radius: 16px;

  color: var(--muted);
}

.empty-heading {
  font-size: 16px;
  font-weight: 600;

  color: var(--text);

  margin: 12px 0 6px;
}

.empty-sub {
  margin: 0;
  font-size: 14px;
}

/* Responsive */

@media (max-width: 860px) {
  .two-col {
    grid-template-columns: 1fr;
  }

  .hero-name {
    font-size: 28px;
  }
}

@media (max-width: 520px) {
  .stat-row {
    grid-template-columns: 1fr;
  }

  .page-body {
    padding: 20px 16px 48px;
  }

  .hero-bar {
    padding: 28px 16px;
  }
}

    .activity-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.activity-row {
  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 14px;

  border: 1px solid var(--border);
  border-radius: 14px;

  transition: all .15s ease;
}

.activity-row:hover {
  border-color: var(--violet-mid);
  box-shadow: 0 2px 12px rgba(124,58,237,.08);
}

.activity-rank {
  font-size: 12px;
  color: var(--muted);
  margin: 0 0 4px;
}

.activity-name {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
}

.activity-pill {
  background: var(--violet-lt);
  color: var(--violet);

  font-size: 13px;
  font-weight: 700;

  padding: 6px 12px;
  border-radius: 999px;
}

.activity-pill--green {
  background: #D1FAE5;
  color: #10B981;
}
`