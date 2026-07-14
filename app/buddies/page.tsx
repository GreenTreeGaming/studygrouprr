"use client";

import Link from "next/link";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
} from "react";
import { gsap } from "gsap";
import {
    ArrowRight,
    BookOpen,
    Check,
    CheckCircle2,
    Clock,
    Compass,
    GraduationCap,
    MapPin,
    Radio,
    Radar,
    Search,
    Sparkles,
    UserPlus,
    Users,
    Waves,
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

type BuddyProfile = {
    id: string;
    name: string;
    avatar_url: string | null;
    university: string | null;
    major: string | null;
    year: string | null;
};

type Friendship = {
    id: string;
    requester_id: string;
    receiver_id: string;
    status: string;
};

type FriendshipRequestRow = Friendship & {
    requester:
        | BuddyProfile
        | BuddyProfile[]
        | null;
};

type FriendshipRequest = Friendship & {
    requester: BuddyProfile;
};

type LiveStatus = {
    id: string;
    user_id: string;
    course_code: string;
    location_name: string;
    description: string | null;
    identification: string | null;
    created_at: string;
};

type UserCourse = {
    user_id: string;
    course_code: string;
};

type Recommendation = BuddyProfile & {
    score: number;
    sharedCourses: string[];
    sameMajor: boolean;
    sameYear: boolean;
};

type CrewFilter = "all" | "live" | "offline";

const LIVE_STATUS_DURATION_MS =
    2 * 60 * 60 * 1000;

function normalizeRelation<T>(
    relation: T | T[] | null,
): T | null {
    if (Array.isArray(relation)) {
        return relation[0] ?? null;
    }

    return relation;
}

function getInitial(
    name: string | null | undefined,
): string {
    return name?.trim().charAt(0).toUpperCase() || "S";
}

function calculateMatchPercent(
    recommendation: Recommendation,
): number {
    const rawPercentage = Math.round(
        (recommendation.score / 15) * 100,
    );

    return Math.min(
        99,
        Math.max(45, rawPercentage),
    );
}

function formatLiveDuration(
    createdAt: string,
    now: number,
): string {
    const elapsedMinutes = Math.max(
        0,
        Math.floor(
            (now - new Date(createdAt).getTime()) /
            60_000,
        ),
    );

    if (elapsedMinutes < 1) {
        return "Just went live";
    }

    if (elapsedMinutes < 60) {
        return `Live for ${elapsedMinutes}m`;
    }

    const hours = Math.floor(
        elapsedMinutes / 60,
    );
    const minutes = elapsedMinutes % 60;

    return `Live for ${hours}h ${minutes}m`;
}

type SafeAvatarProps = {
    src: string | null | undefined;
    name: string | null | undefined;
};

function SafeAvatar({
                        src,
                        name,
                    }: SafeAvatarProps) {
    const [imageFailed, setImageFailed] =
        useState(false);

    const validSource =
        typeof src === "string" &&
        src.trim().length > 0 &&
        !imageFailed;

    if (!validSource) {
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

export default function BuddiesPage() {
    const {
        profile,
        loading: onboardingLoading,
    } = useRequireOnboarding();

    const rootRef = useRef<HTMLElement>(null);

    const [loading, setLoading] =
        useState(true);
    const [loadError, setLoadError] =
        useState<string | null>(null);

    const [incomingRequests, setIncomingRequests] =
        useState<FriendshipRequest[]>([]);

    const [buddies, setBuddies] = useState<
        BuddyProfile[]
    >([]);

    const [liveStatuses, setLiveStatuses] =
        useState<Record<string, LiveStatus>>({});

    const [
        recommendedBuddies,
        setRecommendedBuddies,
    ] = useState<Recommendation[]>([]);

    const [search, setSearch] = useState("");
    const [crewFilter, setCrewFilter] =
        useState<CrewFilter>("all");
    const [showAllMatches, setShowAllMatches] =
        useState(false);

    const [busyRequestIds, setBusyRequestIds] =
        useState<Set<string>>(new Set());

    const [
        busyRecommendationIds,
        setBusyRecommendationIds,
    ] = useState<Set<string>>(new Set());

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
        }, 60_000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, []);

    const loadData = useCallback(
        async (showFullLoader = true) => {
            if (!profile) {
                return;
            }

            if (!profile.university) {
                setLoadError(
                    "Add your university to your profile before building your study circle.",
                );
                setLoading(false);
                return;
            }

            if (showFullLoader) {
                setLoading(true);
            }

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
                    throw new Error(
                        "You must be signed in to view study buddies.",
                    );
                }

                const [
                    requestsResult,
                    friendshipsResult,
                    coursesResult,
                    campusProfilesResult,
                ] = await Promise.all([
                    supabase
                        .from("friendships")
                        .select(`
              id,
              requester_id,
              receiver_id,
              status,
              requester:profiles!friendships_requester_id_fkey (
                id,
                name,
                avatar_url,
                university,
                major,
                year
              )
            `)
                        .eq("receiver_id", user.id)
                        .eq("status", "pending"),

                    supabase
                        .from("friendships")
                        .select(
                            "id, requester_id, receiver_id, status",
                        )
                        .or(
                            `requester_id.eq.${user.id},receiver_id.eq.${user.id}`,
                        ),

                    supabase
                        .from("user_courses")
                        .select("user_id, course_code")
                        .eq("user_id", user.id),

                    supabase
                        .from("profiles")
                        .select(
                            "id, name, avatar_url, university, major, year",
                        )
                        .eq(
                            "university",
                            profile.university,
                        )
                        .neq("id", user.id),
                ]);

                const initialError =
                    requestsResult.error ||
                    friendshipsResult.error ||
                    coursesResult.error ||
                    campusProfilesResult.error;

                if (initialError) {
                    throw initialError;
                }

                const requestRows =
                    (requestsResult.data ??
                        []) as unknown as FriendshipRequestRow[];

                const formattedRequests =
                    requestRows
                        .map((request) => {
                            const requester =
                                normalizeRelation(
                                    request.requester,
                                );

                            if (!requester) {
                                return null;
                            }

                            return {
                                id: request.id,
                                requester_id:
                                request.requester_id,
                                receiver_id:
                                request.receiver_id,
                                status: request.status,
                                requester,
                            };
                        })
                        .filter(
                            (
                                request,
                            ): request is FriendshipRequest =>
                                request !== null,
                        );

                setIncomingRequests(
                    formattedRequests,
                );

                const friendships =
                    (friendshipsResult.data ??
                        []) as Friendship[];

                const acceptedBuddyIds =
                    friendships
                        .filter(
                            (friendship) =>
                                friendship.status ===
                                "accepted",
                        )
                        .map((friendship) =>
                            friendship.requester_id === user.id
                                ? friendship.receiver_id
                                : friendship.requester_id,
                        );

                const excludedIds = new Set<string>();

                friendships.forEach((friendship) => {
                    const otherUserId =
                        friendship.requester_id === user.id
                            ? friendship.receiver_id
                            : friendship.requester_id;

                    excludedIds.add(otherUserId);
                });

                const myCourseCodes = new Set(
                    (
                        (coursesResult.data ??
                            []) as UserCourse[]
                    ).map((course) => course.course_code),
                );

                const campusProfiles =
                    (campusProfilesResult.data ??
                        []) as BuddyProfile[];

                let buddyProfiles: BuddyProfile[] = [];
                let liveMap: Record<
                    string,
                    LiveStatus
                > = {};

                if (acceptedBuddyIds.length > 0) {
                    const twoHoursAgo = new Date(
                        Date.now() -
                        LIVE_STATUS_DURATION_MS,
                    ).toISOString();

                    const [
                        buddyProfilesResult,
                        liveResult,
                    ] = await Promise.all([
                        supabase
                            .from("profiles")
                            .select(
                                "id, name, avatar_url, university, major, year",
                            )
                            .in("id", acceptedBuddyIds),

                        supabase
                            .from("live_study_status")
                            .select("*")
                            .gte("created_at", twoHoursAgo)
                            .in(
                                "user_id",
                                acceptedBuddyIds,
                            ),
                    ]);

                    if (buddyProfilesResult.error) {
                        throw buddyProfilesResult.error;
                    }

                    if (liveResult.error) {
                        throw liveResult.error;
                    }

                    buddyProfiles =
                        (buddyProfilesResult.data ??
                            []) as BuddyProfile[];

                    (
                        (liveResult.data ??
                            []) as LiveStatus[]
                    ).forEach((status) => {
                        liveMap[status.user_id] =
                            status;
                    });
                }

                setBuddies(buddyProfiles);
                setLiveStatuses(liveMap);

                const candidates =
                    campusProfiles.filter(
                        (candidate) =>
                            !excludedIds.has(candidate.id),
                    );

                const candidateIds =
                    candidates.map(
                        (candidate) => candidate.id,
                    );

                let candidateCourses: UserCourse[] =
                    [];

                if (candidateIds.length > 0) {
                    const candidateCoursesResult =
                        await supabase
                            .from("user_courses")
                            .select(
                                "user_id, course_code",
                            )
                            .in("user_id", candidateIds);

                    if (candidateCoursesResult.error) {
                        throw candidateCoursesResult.error;
                    }

                    candidateCourses =
                        (candidateCoursesResult.data ??
                            []) as UserCourse[];
                }

                const coursesByUser =
                    new Map<string, string[]>();

                candidateCourses.forEach((course) => {
                    const existingCourses =
                        coursesByUser.get(
                            course.user_id,
                        ) ?? [];

                    existingCourses.push(
                        course.course_code,
                    );

                    coursesByUser.set(
                        course.user_id,
                        existingCourses,
                    );
                });

                const recommendations =
                    candidates
                        .map(
                            (
                                candidate,
                            ): Recommendation => {
                                const sharedCourses = (
                                    coursesByUser.get(
                                        candidate.id,
                                    ) ?? []
                                ).filter((courseCode) =>
                                    myCourseCodes.has(
                                        courseCode,
                                    ),
                                );

                                const sameMajor = Boolean(
                                    candidate.major &&
                                    profile.major &&
                                    candidate.major ===
                                    profile.major,
                                );

                                const sameYear = Boolean(
                                    candidate.year &&
                                    profile.year &&
                                    candidate.year ===
                                    profile.year,
                                );

                                const score =
                                    sharedCourses.length * 5 +
                                    (sameMajor ? 3 : 0) +
                                    (sameYear ? 2 : 0);

                                return {
                                    ...candidate,
                                    score,
                                    sharedCourses,
                                    sameMajor,
                                    sameYear,
                                };
                            },
                        )
                        .filter(
                            (recommendation) =>
                                recommendation.score > 0,
                        )
                        .sort(
                            (first, second) =>
                                second.score -
                                first.score,
                        )
                        .slice(0, 20);

                setRecommendedBuddies(
                    recommendations,
                );
            } catch (error) {
                console.error(
                    "Unable to load study buddies:",
                    error,
                );

                setLoadError(
                    error instanceof Error
                        ? error.message
                        : "Your study circle could not be loaded.",
                );
            } finally {
                if (showFullLoader) {
                    setLoading(false);
                }
            }
        },
        [
            profile?.id,
            profile?.major,
            profile?.university,
            profile?.year,
        ],
    );

    useEffect(() => {
        if (!profile) {
            return;
        }

        void loadData();
    }, [loadData, profile]);

    const activeLiveStatuses = useMemo(() => {
        const activeStatuses: Record<
            string,
            LiveStatus
        > = {};

        Object.values(liveStatuses).forEach(
            (status) => {
                const statusAge =
                    currentTime -
                    new Date(
                        status.created_at,
                    ).getTime();

                if (
                    statusAge <
                    LIVE_STATUS_DURATION_MS
                ) {
                    activeStatuses[status.user_id] =
                        status;
                }
            },
        );

        return activeStatuses;
    }, [currentTime, liveStatuses]);

    const liveBuddies = useMemo(
        () =>
            buddies.filter(
                (buddy) =>
                    Boolean(
                        activeLiveStatuses[buddy.id],
                    ),
            ),
        [activeLiveStatuses, buddies],
    );

    const normalizedSearch = search
        .trim()
        .toLowerCase();

    const filteredBuddies = useMemo(() => {
        return buddies
            .filter((buddy) => {
                const live = Boolean(
                    activeLiveStatuses[buddy.id],
                );

                const matchesFilter =
                    crewFilter === "all" ||
                    (crewFilter === "live" && live) ||
                    (crewFilter === "offline" &&
                        !live);

                const matchesSearch =
                    normalizedSearch.length === 0 ||
                    buddy.name
                        .toLowerCase()
                        .includes(normalizedSearch) ||
                    buddy.major
                        ?.toLowerCase()
                        .includes(normalizedSearch) ||
                    activeLiveStatuses[
                        buddy.id
                        ]?.course_code
                        .toLowerCase()
                        .includes(normalizedSearch);

                return (
                    matchesFilter && matchesSearch
                );
            })
            .sort((first, second) => {
                const firstLive = Boolean(
                    activeLiveStatuses[first.id],
                );
                const secondLive = Boolean(
                    activeLiveStatuses[second.id],
                );

                if (firstLive && !secondLive) {
                    return -1;
                }

                if (!firstLive && secondLive) {
                    return 1;
                }

                return first.name.localeCompare(
                    second.name,
                );
            });
    }, [
        activeLiveStatuses,
        buddies,
        crewFilter,
        normalizedSearch,
    ]);

    const filteredRecommendations =
        useMemo(() => {
            return recommendedBuddies.filter(
                (recommendation) => {
                    return (
                        normalizedSearch.length === 0 ||
                        recommendation.name
                            .toLowerCase()
                            .includes(normalizedSearch) ||
                        recommendation.major
                            ?.toLowerCase()
                            .includes(normalizedSearch) ||
                        recommendation.sharedCourses.some(
                            (course) =>
                                course
                                    .toLowerCase()
                                    .includes(
                                        normalizedSearch,
                                    ),
                        )
                    );
                },
            );
        }, [
            normalizedSearch,
            recommendedBuddies,
        ]);

    const visibleRecommendations =
        showAllMatches
            ? filteredRecommendations
            : filteredRecommendations.slice(0, 8);

    const orbitBuddies =
        liveBuddies.length > 0
            ? liveBuddies.slice(0, 4)
            : buddies.slice(0, 4);

    async function acceptRequest(
        friendshipId: string,
    ) {
        setBusyRequestIds((current) => {
            const next = new Set(current);
            next.add(friendshipId);
            return next;
        });

        try {
            const { error } = await supabase
                .from("friendships")
                .update({
                    status: "accepted",
                })
                .eq("id", friendshipId);

            if (error) {
                throw error;
            }

            window.dispatchEvent(
                new CustomEvent(
                    "buddy-requests-changed",
                ),
            );

            await loadData(false);

            showAlert(
                "Study Buddy Added",
                "Your study circle just got stronger.",
                "success",
            );
        } catch (error) {
            showAlert(
                "Unable to Accept Request",
                error instanceof Error
                    ? error.message
                    : "The request could not be accepted.",
                "error",
            );
        } finally {
            setBusyRequestIds((current) => {
                const next = new Set(current);
                next.delete(friendshipId);
                return next;
            });
        }
    }

    async function declineRequest(
        friendshipId: string,
    ) {
        setBusyRequestIds((current) => {
            const next = new Set(current);
            next.add(friendshipId);
            return next;
        });

        try {
            const { error } = await supabase
                .from("friendships")
                .delete()
                .eq("id", friendshipId);

            if (error) {
                throw error;
            }

            window.dispatchEvent(
                new CustomEvent(
                    "buddy-requests-changed",
                ),
            );

            setIncomingRequests((current) =>
                current.filter(
                    (request) =>
                        request.id !== friendshipId,
                ),
            );
        } catch (error) {
            showAlert(
                "Unable to Decline Request",
                error instanceof Error
                    ? error.message
                    : "The request could not be declined.",
                "error",
            );
        } finally {
            setBusyRequestIds((current) => {
                const next = new Set(current);
                next.delete(friendshipId);
                return next;
            });
        }
    }

    async function sendBuddyRequest(
        receiverId: string,
    ) {
        setBusyRecommendationIds((current) => {
            const next = new Set(current);
            next.add(receiverId);
            return next;
        });

        try {
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError) {
                throw userError;
            }

            if (!user) {
                throw new Error(
                    "You must be signed in to add a study buddy.",
                );
            }

            const { data: existing, error: checkError } =
                await supabase
                    .from("friendships")
                    .select("id")
                    .or(
                        `and(requester_id.eq.${user.id},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${user.id})`,
                    )
                    .maybeSingle();

            if (checkError) {
                throw checkError;
            }

            if (existing) {
                setRecommendedBuddies((current) =>
                    current.filter(
                        (recommendation) =>
                            recommendation.id !==
                            receiverId,
                    ),
                );

                showAlert(
                    "Already Connected",
                    "A pending or accepted connection already exists.",
                    "info",
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
                throw error;
            }

            setRecommendedBuddies((current) =>
                current.filter(
                    (recommendation) =>
                        recommendation.id !==
                        receiverId,
                ),
            );

            showAlert(
                "Request Sent",
                "Your potential study buddy has been notified.",
                "success",
            );
        } catch (error) {
            showAlert(
                "Unable to Send Request",
                error instanceof Error
                    ? error.message
                    : "Your buddy request could not be sent.",
                "error",
            );
        } finally {
            setBusyRecommendationIds(
                (current) => {
                    const next = new Set(current);
                    next.delete(receiverId);
                    return next;
                },
            );
        }
    }

    useEffect(() => {
        if (
            loading ||
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
            gsap.from(".bc-reveal", {
                opacity: 0,
                y: 27,
                duration: 0.7,
                stagger: 0.075,
                ease: "power3.out",
            });

            gsap.from(".bc-orbit-person", {
                opacity: 0,
                scale: 0.72,
                duration: 0.65,
                stagger: 0.1,
                delay: 0.2,
                ease: "back.out(1.55)",
            });
        }, rootRef);

        return () => {
            context.revert();
        };
    }, [
        buddies.length,
        incomingRequests.length,
        loading,
        onboardingLoading,
        recommendedBuddies.length,
    ]);

    useEffect(() => {
        const root = rootRef.current;

        if (!root || loading) {
            return;
        }

        let animationFrameId = 0;

        const updateConnectionTrail = () => {
            animationFrameId = 0;

            const bounds =
                root.getBoundingClientRect();

            const travelDistance =
                root.offsetHeight +
                window.innerHeight * 0.3;

            const distanceScrolled =
                window.innerHeight - bounds.top;

            const progress = Math.min(
                1,
                Math.max(
                    0,
                    distanceScrolled /
                    travelDistance,
                ),
            );

            root.style.setProperty(
                "--bc-progress",
                progress.toFixed(4),
            );
        };

        const requestUpdate = () => {
            if (animationFrameId === 0) {
                animationFrameId =
                    window.requestAnimationFrame(
                        updateConnectionTrail,
                    );
            }
        };

        updateConnectionTrail();

        window.addEventListener(
            "scroll",
            requestUpdate,
            {
                passive: true,
            },
        );

        window.addEventListener(
            "resize",
            requestUpdate,
        );

        return () => {
            window.removeEventListener(
                "scroll",
                requestUpdate,
            );

            window.removeEventListener(
                "resize",
                requestUpdate,
            );

            if (animationFrameId !== 0) {
                window.cancelAnimationFrame(
                    animationFrameId,
                );
            }
        };
    }, [
        buddies.length,
        incomingRequests.length,
        loading,
        recommendedBuddies.length,
    ]);

    if (loading || onboardingLoading) {
        return (
            <>
                <style>{buddyStyles}</style>

                <main className="bc-loading">
                    <div
                        className="bc-loading-constellation"
                        aria-hidden="true"
                    >
                        <span className="bc-loading-ring bc-loading-ring--one" />
                        <span className="bc-loading-ring bc-loading-ring--two" />

                        <Users size={29} />

                        <i className="bc-loading-star bc-loading-star--one" />
                        <i className="bc-loading-star bc-loading-star--two" />
                        <i className="bc-loading-star bc-loading-star--three" />
                    </div>

                    <p>
                        Connecting your study circle…
                    </p>
                </main>
            </>
        );
    }

    if (!profile) {
        return (
            <>
                <style>{buddyStyles}</style>

                <main className="bc-loading">
                    <p>
                        We could not find your
                        StudyGrouprr profile.
                    </p>

                    <Link
                        href="/login"
                        className="bc-loading-link"
                    >
                        Return to login
                    </Link>
                </main>
            </>
        );
    }

    return (
        <>
            <style>{buddyStyles}</style>

            <main ref={rootRef} className="bc-root">
                <div
                    className="bc-background-grid"
                    aria-hidden="true"
                />

                <div className="bc-glow bc-glow--one" />
                <div className="bc-glow bc-glow--two" />

                <svg
                    className="bc-connection-trail"
                    viewBox="0 0 1200 2100"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                >
                    <path
                        className="bc-trail-shadow"
                        d="M70 40C390 170 85 410 315 575C545 740 1050 600 1000 900C950 1200 350 1080 430 1390C510 1700 1080 1580 1090 2060"
                    />

                    <path
                        className="bc-trail-path"
                        pathLength="1"
                        d="M70 40C390 170 85 410 315 575C545 740 1050 600 1000 900C950 1200 350 1080 430 1390C510 1700 1080 1580 1090 2060"
                    />
                </svg>

                <div className="bc-canvas">
                    {loadError && (
                        <div
                            className="bc-error-banner"
                            role="alert"
                        >
                            <div>
                                <strong>
                                    Connection interrupted
                                </strong>
                                <span>{loadError}</span>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    void loadData()
                                }
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    <section className="bc-hero bc-reveal">
                        <div
                            className="bc-hero-grid"
                            aria-hidden="true"
                        />

                        <div className="bc-hero-copy">
              <h1>
                                Your people are
                                <span>closer than you think.</span>
                            </h1>

                            <p>
                                Keep track of the classmates you
                                study well with, catch them when
                                they go live, and discover the
                                people already moving through the
                                same semester.
                            </p>

                            <div className="bc-hero-actions">
                                <Link
                                    href="/sessions"
                                    className="bc-primary-action"
                                >
                                    <Search size={18} />
                                    Find more people
                                    <ArrowRight size={17} />
                                </Link>

                                <Link
                                    href="/live"
                                    className="bc-secondary-action"
                                >
                                    <Radio size={18} />
                                    Go live
                                </Link>
                            </div>
                        </div>

                        <div className="bc-constellation">
                            <span className="bc-orbit-ring bc-orbit-ring--outer" />
                            <span className="bc-orbit-ring bc-orbit-ring--middle" />
                            <span className="bc-orbit-ring bc-orbit-ring--inner" />

                            <div className="bc-constellation-core">
                                <SafeAvatar
                                    src={profile.avatar_url}
                                    name={profile.name}
                                />

                                <i className="bc-core-status" />
                            </div>

                            {orbitBuddies.length > 0 ? (
                                orbitBuddies.map(
                                    (buddy, index) => {
                                        const live =
                                            activeLiveStatuses[
                                                buddy.id
                                                ];

                                        return (
                                            <div
                                                key={buddy.id}
                                                className={`bc-orbit-person bc-orbit-person--${
                                                    index + 1
                                                } ${
                                                    live
                                                        ? "bc-orbit-person--live"
                                                        : ""
                                                }`}
                                            >
                                                <div className="bc-orbit-avatar">
                                                    <SafeAvatar
                                                        src={buddy.avatar_url}
                                                        name={buddy.name}
                                                    />

                                                    {live && (
                                                        <i className="bc-orbit-live-dot" />
                                                    )}
                                                </div>

                                                <div>
                                                    <strong>
                                                        {buddy.name}
                                                    </strong>

                                                    <span>
                            {live
                                ? live.course_code
                                : buddy.major ||
                                "Study buddy"}
                          </span>
                                                </div>
                                            </div>
                                        );
                                    },
                                )
                            ) : (
                                <>
                                    <div className="bc-ghost-node bc-ghost-node--one">
                                        <BookOpen size={17} />
                                        Same course
                                    </div>

                                    <div className="bc-ghost-node bc-ghost-node--two">
                                        <GraduationCap
                                            size={17}
                                        />
                                        Same campus
                                    </div>

                                    <div className="bc-ghost-node bc-ghost-node--three">
                                        <Users size={17} />
                                        Your future crew
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="bc-network-readout">
                            <div>
                <span className="bc-readout-icon bc-readout-icon--violet">
                  <Users size={18} />
                </span>

                                <span>
                  <strong>
                    {buddies.length}
                  </strong>
                  <small>
                    Study buddies
                  </small>
                </span>
                            </div>

                            <span className="bc-readout-divider" />

                            <div>
                <span className="bc-readout-icon bc-readout-icon--green">
                  <Radio size={18} />
                </span>

                                <span>
                  <strong>
                    {liveBuddies.length}
                  </strong>
                  <small>
                    Studying now
                  </small>
                </span>
                            </div>

                            <span className="bc-readout-divider" />

                            <div>
                <span className="bc-readout-icon bc-readout-icon--amber">
                  <UserPlus size={18} />
                </span>

                                <span>
                  <strong>
                    {
                        incomingRequests.length
                    }
                  </strong>
                  <small>
                    New requests
                  </small>
                </span>
                            </div>

                            <span className="bc-readout-divider" />

                            <div>
                <span className="bc-readout-icon bc-readout-icon--blue">
                  <Compass size={18} />
                </span>

                                <span>
                  <strong>
                    {
                        recommendedBuddies.length
                    }
                  </strong>
                  <small>
                    Strong matches
                  </small>
                </span>
                            </div>
                        </div>
                    </section>

                    <section className="bc-crew-wall bc-reveal">
                        <div className="bc-crew-heading">
                            <div>
                <span className="bc-section-kicker">
                  <Users size={15} />
                  Your study crew
                </span>

                                <h2>
                                    The people in your corner.
                                </h2>

                                <p>
                                    Live buddies rise to the top so
                                    you never miss a chance to join
                                    them.
                                </p>
                            </div>

                            <div className="bc-crew-filter">
                                {(
                                    [
                                        ["all", "Everyone"],
                                        ["live", "Live now"],
                                        ["offline", "Offline"],
                                    ] as const
                                ).map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        className={
                                            crewFilter === value
                                                ? "bc-crew-filter-active"
                                                : ""
                                        }
                                        onClick={() =>
                                            setCrewFilter(value)
                                        }
                                    >
                                        {value === "live" && (
                                            <span />
                                        )}

                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {filteredBuddies.length > 0 ? (
                            <div className="bc-crew-grid">
                                {filteredBuddies.map(
                                    (buddy, index) => {
                                        const live =
                                            activeLiveStatuses[
                                                buddy.id
                                                ];

                                        return (
                                            <article
                                                key={buddy.id}
                                                className={`bc-crew-card bc-crew-card--${
                                                    (index % 4) + 1
                                                } ${
                                                    live
                                                        ? "bc-crew-card--live"
                                                        : ""
                                                }`}
                                            >
                                                <div className="bc-crew-card-top">
                                                    <div className="bc-crew-avatar">
                                                        {buddy.avatar_url ? (
                                                            <img
                                                                src={
                                                                    buddy.avatar_url
                                                                }
                                                                alt=""
                                                            />
                                                        ) : (
                                                            <span>
                                {getInitial(
                                    buddy.name,
                                )}
                              </span>
                                                        )}

                                                        {live && (
                                                            <i className="bc-crew-live-dot" />
                                                        )}
                                                    </div>

                                                    <span
                                                        className={
                                                            live
                                                                ? "bc-status-pill bc-status-pill--live"
                                                                : "bc-status-pill"
                                                        }
                                                    >
                            {live
                                ? "Studying now"
                                : "Offline"}
                          </span>
                                                </div>

                                                <h3>{buddy.name}</h3>

                                                <p className="bc-crew-meta">
                                                    {[
                                                            buddy.major,
                                                            buddy.year,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(" · ") ||
                                                        buddy.university ||
                                                        "Study buddy"}
                                                </p>

                                                {live ? (
                                                    <div className="bc-crew-live-details">
                                                        <Link
                                                            href={`/courses/${encodeURIComponent(
                                                                live.course_code,
                                                            )}`}
                                                        >
                                                            <BookOpen
                                                                size={15}
                                                            />
                                                            {
                                                                live.course_code
                                                            }
                                                        </Link>

                                                        <span>
                              <MapPin size={15} />
                                                            {
                                                                live.location_name
                                                            }
                            </span>

                                                        <small>
                                                            {formatLiveDuration(
                                                                live.created_at,
                                                                currentTime,
                                                            )}
                                                        </small>
                                                    </div>
                                                ) : (
                                                    <div className="bc-offline-note">
                                                        <Clock size={16} />
                                                        Waiting for their next
                                                        study signal
                                                    </div>
                                                )}
                                            </article>
                                        );
                                    },
                                )}
                            </div>
                        ) : (
                            <div className="bc-crew-empty">
                                <div className="bc-crew-empty-orbit">
                                    <UserPlus size={33} />
                                    <span />
                                    <span />
                                </div>

                                <h3>
                                    {buddies.length === 0
                                        ? "Your study crew starts here."
                                        : "No buddies match this filter."}
                                </h3>

                                <p>
                                    {buddies.length === 0
                                        ? "Find students from your courses and start building a reliable campus study circle."
                                        : "Try another filter or clear your search."}
                                </p>

                                {buddies.length === 0 ? (
                                    <Link href="/sessions">
                                        Find your first buddy
                                        <ArrowRight size={16} />
                                    </Link>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearch("");
                                            setCrewFilter("all");
                                        }}
                                    >
                                        Clear filters
                                    </button>
                                )}
                            </div>
                        )}
                    </section>

                    {incomingRequests.length > 0 && (
                        <section className="bc-request-runway bc-reveal">
                            <div className="bc-section-heading">
                                <div>
                  <span className="bc-section-kicker">
                    <UserPlus size={15} />
                    New connections
                  </span>

                                    <h2>
                                        Someone wants a seat at your
                                        table.
                                    </h2>

                                    <p>
                                        Accept the people you recognize
                                        or want to study with.
                                    </p>
                                </div>

                                <span className="bc-heading-count">
                  {incomingRequests.length}
                </span>
                            </div>

                            <div className="bc-request-deck">
                                {incomingRequests.map(
                                    (request, index) => {
                                        const busy =
                                            busyRequestIds.has(
                                                request.id,
                                            );

                                        return (
                                            <article
                                                key={request.id}
                                                className={`bc-request-card bc-request-card--${
                                                    (index % 3) + 1
                                                }`}
                                            >
                                                <span className="bc-request-pin" />

                                                <div className="bc-request-avatar">
                                                    <SafeAvatar
                                                        src={request.requester.avatar_url}
                                                        name={request.requester.name}
                                                    />
                                                </div>

                                                <div className="bc-request-copy">
                          <span>
                            Study buddy request
                          </span>

                                                    <h3>
                                                        {
                                                            request.requester
                                                                .name
                                                        }
                                                    </h3>

                                                    <p>
                                                        {[
                                                                request.requester
                                                                    .major,
                                                                request.requester
                                                                    .year,
                                                            ]
                                                                .filter(Boolean)
                                                                .join(" · ") ||
                                                            "Student at your university"}
                                                    </p>
                                                </div>

                                                <div className="bc-request-actions">
                                                    <button
                                                        type="button"
                                                        className="bc-accept-button"
                                                        disabled={busy}
                                                        onClick={() =>
                                                            void acceptRequest(
                                                                request.id,
                                                            )
                                                        }
                                                    >
                                                        <Check size={17} />

                                                        {busy
                                                            ? "Working…"
                                                            : "Accept"}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="bc-decline-button"
                                                        disabled={busy}
                                                        aria-label={`Decline ${request.requester.name}'s request`}
                                                        onClick={() =>
                                                            void declineRequest(
                                                                request.id,
                                                            )
                                                        }
                                                    >
                                                        <X size={17} />
                                                    </button>
                                                </div>
                                            </article>
                                        );
                                    },
                                )}
                            </div>
                        </section>
                    )}

                    <section className="bc-live-board bc-reveal">
                        <div className="bc-section-heading bc-section-heading--light">
                            <div>
                <span className="bc-section-kicker">
  <Users size={15} />
  Your study buddies
</span>

                                <h2>
                                    Your people, right up front.
                                </h2>

                                <p>
                                    See who is available, who is studying now,
                                    and where your buddies are locked in.
                                </p>
                            </div>

                            <Link
                                href="/sessions"
                                className="bc-light-link"
                            >
                                Open campus radar
                                <ArrowRight size={16} />
                            </Link>
                        </div>

                        {liveBuddies.length > 0 ? (
                            <div className="bc-live-deck">
                                {liveBuddies.map(
                                    (buddy, index) => {
                                        const live =
                                            activeLiveStatuses[
                                                buddy.id
                                                ];

                                        return (
                                            <article
                                                key={buddy.id}
                                                className={`bc-live-card bc-live-card--${
                                                    (index % 4) + 1
                                                }`}
                                            >
                                                <div className="bc-live-card-top">
                          <span className="bc-live-label">
                            <span />
                            LIVE
                          </span>

                                                    <span className="bc-live-duration">
                            {formatLiveDuration(
                                live.created_at,
                                currentTime,
                            )}
                          </span>
                                                </div>

                                                <div className="bc-live-person">
                                                    <div className="bc-live-avatar">
                                                        {buddy.avatar_url ? (
                                                            <img
                                                                src={
                                                                    buddy.avatar_url
                                                                }
                                                                alt=""
                                                            />
                                                        ) : (
                                                            <span>
                                {getInitial(
                                    buddy.name,
                                )}
                              </span>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <h3>
                                                            {buddy.name}
                                                        </h3>

                                                        <p>
                                                            {[
                                                                    buddy.major,
                                                                    buddy.year,
                                                                ]
                                                                    .filter(Boolean)
                                                                    .join(" · ") ||
                                                                "Study buddy"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <Link
                                                    href={`/courses/${encodeURIComponent(
                                                        live.course_code,
                                                    )}`}
                                                    className="bc-live-course"
                                                >
                                                    <BookOpen size={16} />
                                                    {live.course_code}
                                                    <ArrowRight size={14} />
                                                </Link>

                                                <div className="bc-live-location">
                                                    <MapPin size={17} />

                                                    <span>
                            <small>
                              Studying at
                            </small>

                            <strong>
                              {
                                  live.location_name
                              }
                            </strong>
                          </span>
                                                </div>

                                                {live.description && (
                                                    <div className="bc-live-message">
                                                        <small>
                                                            Working on
                                                        </small>

                                                        <p>
                                                            {live.description}
                                                        </p>
                                                    </div>
                                                )}

                                                {live.identification && (
                                                    <div className="bc-find-note">
                                                        <Sparkles
                                                            size={15}
                                                        />
                                                        {
                                                            live.identification
                                                        }
                                                    </div>
                                                )}

                                                <Link
                                                    href="/sessions"
                                                    className="bc-find-button"
                                                >
                                                    Find them on campus
                                                    <ArrowRight size={16} />
                                                </Link>
                                            </article>
                                        );
                                    },
                                )}
                            </div>
                        ) : (
                            <div className="bc-live-empty">
                                <div className="bc-empty-radar">
                                    <span />
                                    <span />
                                    <Radio size={32} />
                                </div>

                                <div>
                                    <h3>
                                        Your circle is quiet right now.
                                    </h3>

                                    <p>
                                        Start a live study signal and
                                        give your buddies something to
                                        join.
                                    </p>
                                </div>

                                <Link href="/live">
                                    Go live
                                    <Radio size={17} />
                                </Link>
                            </div>
                        )}
                    </section>

                    <section className="bc-discovery-console bc-reveal">
                        <div className="bc-search-zone">
                            <div>
                <span className="bc-section-kicker">
                  <Search size={15} />
                  Search your network
                </span>

                                <h2>
                                    Find the right person faster.
                                </h2>
                            </div>

                            <label className="bc-search-box">
                                <Search size={19} />

                                <input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Name, major, or course…"
                                />

                                {search && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSearch("")
                                        }
                                        aria-label="Clear search"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </label>
                        </div>

                        <div className="bc-console-links">
                            <Link href="/sessions">
                                <Radar size={18} />

                                <span>
                  <strong>
                    Explore campus
                  </strong>
                  <small>
                    Discover students studying now
                  </small>
                </span>

                                <ArrowRight size={17} />
                            </Link>

                            <Link href="/live">
                                <Waves size={18} />

                                <span>
                  <strong>
                    Broadcast yourself
                  </strong>
                  <small>
                    Let potential buddies find you
                  </small>
                </span>

                                <ArrowRight size={17} />
                            </Link>
                        </div>
                    </section>

                    <section className="bc-match-zone bc-reveal">
                        <div className="bc-section-heading">
                            <div>
                <span className="bc-section-kicker">
                  <Compass size={15} />
                  Potential study chemistry
                </span>

                                <h2>
                                    People you might click with.
                                </h2>

                                <p>
                                    Matches are based on shared
                                    courses, major, and academic year.
                                </p>
                            </div>

                            <span className="bc-heading-count bc-heading-count--green">
                {
                    filteredRecommendations.length
                }
              </span>
                        </div>

                        {visibleRecommendations.length >
                        0 ? (
                            <>
                                <div className="bc-match-grid">
                                    {visibleRecommendations.map(
                                        (match, index) => {
                                            const matchPercent =
                                                calculateMatchPercent(
                                                    match,
                                                );

                                            const busy =
                                                busyRecommendationIds.has(
                                                    match.id,
                                                );

                                            return (
                                                <article
                                                    key={match.id}
                                                    className={`bc-match-card bc-match-card--${
                                                        (index % 4) + 1
                                                    }`}
                                                >
                                                    <div
                                                        className="bc-match-meter"
                                                        style={
                                                            {
                                                                "--bc-match-angle": `${matchPercent * 3.6}deg`,
                                                            } as CSSProperties
                                                        }
                                                    >
                            <span>
                              <strong>
                                {matchPercent}%
                              </strong>
                              <small>
                                match
                              </small>
                            </span>
                                                    </div>

                                                    <div className="bc-match-person">
                                                        <div className="bc-match-avatar">
                                                            {match.avatar_url ? (
                                                                <img
                                                                    src={
                                                                        match.avatar_url
                                                                    }
                                                                    alt=""
                                                                />
                                                            ) : (
                                                                <span>
                                  {getInitial(
                                      match.name,
                                  )}
                                </span>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <h3>
                                                                {match.name}
                                                            </h3>

                                                            <p>
                                                                {[
                                                                        match.major,
                                                                        match.year,
                                                                    ]
                                                                        .filter(Boolean)
                                                                        .join(" · ") ||
                                                                    "Student at your university"}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="bc-match-reasons">
                                                        {match.sharedCourses
                                                            .slice(0, 3)
                                                            .map((course) => (
                                                                <Link
                                                                    key={course}
                                                                    href={`/courses/${encodeURIComponent(
                                                                        course,
                                                                    )}`}
                                                                    className="bc-match-reason bc-match-reason--course"
                                                                >
                                                                    <BookOpen
                                                                        size={14}
                                                                    />
                                                                    {course}
                                                                </Link>
                                                            ))}

                                                        {match.sameMajor && (
                                                            <span className="bc-match-reason bc-match-reason--major">
                                <GraduationCap
                                    size={14}
                                />
                                Same major
                              </span>
                                                        )}

                                                        {match.sameYear && (
                                                            <span className="bc-match-reason bc-match-reason--year">
                                <Sparkles
                                    size={14}
                                />
                                Same year
                              </span>
                                                        )}
                                                    </div>

                                                    <button
                                                        type="button"
                                                        className="bc-add-match-button"
                                                        disabled={busy}
                                                        onClick={() =>
                                                            void sendBuddyRequest(
                                                                match.id,
                                                            )
                                                        }
                                                    >
                                                        <UserPlus
                                                            size={17}
                                                        />

                                                        {busy
                                                            ? "Sending…"
                                                            : "Add study buddy"}
                                                    </button>
                                                </article>
                                            );
                                        },
                                    )}
                                </div>

                                {filteredRecommendations.length >
                                    8 && (
                                        <button
                                            type="button"
                                            className="bc-show-more"
                                            onClick={() =>
                                                setShowAllMatches(
                                                    (current) => !current,
                                                )
                                            }
                                        >
                                            {showAllMatches
                                                ? "Show fewer matches"
                                                : `Show ${
                                                    filteredRecommendations.length -
                                                    8
                                                } more matches`}
                                        </button>
                                    )}
                            </>
                        ) : (
                            <div className="bc-match-empty">
                                <div className="bc-match-empty-icon">
                                    <Compass size={31} />
                                </div>

                                <h3>
                                    No new matches on this signal.
                                </h3>

                                <p>
                                    Add courses to your profile or
                                    browse live students around
                                    campus.
                                </p>

                                <Link href="/sessions">
                                    Explore campus
                                    <ArrowRight size={16} />
                                </Link>
                            </div>
                        )}
                    </section>

                    <section className="bc-closing-callout bc-reveal">
                        <div className="bc-closing-orbits">
                            <span />
                            <span />
                            <span />
                        </div>

                        <div>
              <span className="bc-section-kicker bc-section-kicker--light">
                <Zap size={15} />
                Strong circles start small
              </span>

                            <h2>
                                One good study buddy can change
                                your entire semester.
                            </h2>

                            <p>
                                Find someone taking the same
                                course, meet once, and see whether
                                the study chemistry works.
                            </p>
                        </div>

                        <Link href="/sessions">
                            Find someone today
                            <ArrowRight size={17} />
                        </Link>
                    </section>
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

const buddyStyles = `
  .bc-root,
  .bc-root *,
  .bc-loading,
  .bc-loading * {
    box-sizing: border-box;
  }

  .bc-root,
  .bc-loading {
    --bc-indigo: #1B1B3A;
    --bc-indigo-soft: #292953;
    --bc-violet: #7C3AED;
    --bc-violet-dark: #5B21B6;
    --bc-violet-light: #EDE9FE;
    --bc-violet-faint: #F5F3FF;
    --bc-lilac: #C4B5FD;
    --bc-green: #10B981;
    --bc-green-dark: #047857;
    --bc-green-light: #D1FAE5;
    --bc-amber: #F59E0B;
    --bc-amber-dark: #B45309;
    --bc-amber-light: #FEF3C7;
    --bc-red: #EF4444;
    --bc-red-light: #FEE2E2;
    --bc-blue: #0EA5E9;
    --bc-blue-light: #E0F2FE;
    --bc-cream: #FFF9E8;
    --bc-background: #F5F4FB;
    --bc-surface: #FFFFFF;
    --bc-border: #E4E2F0;
    --bc-text: #1B1B3A;
    --bc-muted: #64748B;
    --bc-faint: #94A3B8;
  }

  .bc-root {
    --bc-progress: 0;

    position: relative;
    min-height: 100vh;
    overflow: hidden;
    isolation: isolate;
    padding: 20px 20px 100px;
    color: var(--bc-text);
    background:
      radial-gradient(
        circle at 50% -9%,
        rgba(124, 58, 237, 0.2),
        transparent 31rem
      ),
      var(--bc-background);
  }

  .bc-background-grid {
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
        black 7%,
        black 92%,
        transparent
      );
  }

  .bc-glow {
    position: absolute;
    z-index: -4;
    border-radius: 999px;
    pointer-events: none;
    filter: blur(6px);
  }

  .bc-glow--one {
    top: 720px;
    right: -230px;
    width: 470px;
    height: 470px;
    background: rgba(16, 185, 129, 0.1);
  }

  .bc-glow--two {
    top: 1580px;
    left: -290px;
    width: 540px;
    height: 540px;
    background: rgba(124, 58, 237, 0.1);
  }

  .bc-connection-trail {
    position: absolute;
    z-index: -2;
    top: 40px;
    left: 50%;
    width: min(1320px, 116vw);
    height: calc(100% - 80px);
    min-height: 2050px;
    overflow: visible;
    pointer-events: none;
    transform: translateX(-50%);
  }

  .bc-trail-shadow,
  .bc-trail-path {
    fill: none;
    vector-effect: non-scaling-stroke;
    stroke-linecap: round;
  }

  .bc-trail-shadow {
    stroke: rgba(124, 58, 237, 0.07);
    stroke-width: 7;
  }

  .bc-trail-path {
    stroke: rgba(124, 58, 237, 0.42);
    stroke-width: 2;
    stroke-dasharray: 1;
    stroke-dashoffset:
      calc(1 - var(--bc-progress));
  }

  .bc-canvas {
    position: relative;
    z-index: 1;
    width: min(1180px, 100%);
    margin: 0 auto;
  }

  .bc-error-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 18px;
    padding: 15px 18px;
    color: #991B1B;
    background: var(--bc-red-light);
    border: 1px solid #FCA5A5;
    border-radius: 17px;
  }

  .bc-error-banner > div {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .bc-error-banner strong {
    font-size: 14px;
  }

  .bc-error-banner span {
    font-size: 13px;
  }

  .bc-error-banner button {
    flex-shrink: 0;
    padding: 9px 13px;
    color: white;
    background: var(--bc-red);
    border: 0;
    border-radius: 10px;
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
  }

  .bc-hero {
    position: relative;
    min-height: 505px;
    overflow: hidden;
    padding: 55px 50px 112px;
    color: white;
    background:
      radial-gradient(
        circle at 74% 43%,
        rgba(124, 58, 237, 0.42),
        transparent 28%
      ),
      linear-gradient(
        135deg,
        #17172E 0%,
        var(--bc-indigo) 48%,
        #292953 100%
      );
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 48px 48px 24px 48px;
    box-shadow:
      0 30px 80px rgba(27, 27, 58, 0.23),
      inset 0 1px rgba(255, 255, 255, 0.07);
  }

  .bc-hero-grid {
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
        circle at 72% 45%,
        black,
        transparent 68%
      );
  }

  .bc-hero-copy {
    position: relative;
    z-index: 3;
    width: min(56%, 620px);
  }

  .bc-eyebrow,
  .bc-section-kicker {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 13px;
    color: var(--bc-violet);
    font-size: 12px;
    font-weight: 850;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .bc-eyebrow {
    color: var(--bc-lilac);
  }

  .bc-hero-copy h1 {
    margin: 0;
    font-size: clamp(51px, 6.8vw, 84px);
    font-weight: 850;
    letter-spacing: -0.075em;
    line-height: 0.9;
  }

  .bc-hero-copy h1 span {
    display: block;
    margin-top: 9px;
    color: var(--bc-lilac);
  }

  .bc-hero-copy > p {
    max-width: 570px;
    margin: 27px 0 0;
    color: rgba(255, 255, 255, 0.62);
    font-size: 16px;
    line-height: 1.75;
  }

  .bc-hero-actions {
    display: flex;
    align-items: center;
    gap: 11px;
    margin-top: 26px;
    flex-wrap: wrap;
  }

  .bc-primary-action,
  .bc-secondary-action {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 47px;
    padding: 11px 15px;
    border-radius: 13px;
    font-size: 13px;
    font-weight: 800;
    text-decoration: none;
    transition:
      transform 160ms ease,
      background 160ms ease,
      box-shadow 160ms ease;
  }

  .bc-primary-action {
    color: var(--bc-violet-dark);
    background: white;
    box-shadow: 0 13px 30px rgba(0, 0, 0, 0.24);
  }

  .bc-primary-action:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 37px rgba(0, 0, 0, 0.3);
  }

  .bc-secondary-action {
    color: #6EE7B7;
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(110, 231, 183, 0.25);
  }

  .bc-secondary-action:hover {
    background: rgba(16, 185, 129, 0.2);
    transform: translateY(-3px);
  }

  .bc-constellation {
    position: absolute;
    z-index: 2;
    top: 31px;
    right: 38px;
    width: 440px;
    height: 395px;
  }

  .bc-orbit-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    border: 1px solid rgba(196, 181, 253, 0.21);
    border-radius: 999px;
    transform: translate(-50%, -50%);
  }

  .bc-orbit-ring--outer {
    width: 365px;
    height: 365px;
    border-style: dashed;
    animation: bc-orbit-spin 35s linear infinite;
  }

  .bc-orbit-ring--middle {
    width: 275px;
    height: 275px;
    animation: bc-orbit-spin-reverse 28s linear infinite;
  }

  .bc-orbit-ring--inner {
    width: 180px;
    height: 180px;
  }

  .bc-constellation-core {
    position: absolute;
    z-index: 6;
    top: 50%;
    left: 50%;
    display: grid;
    width: 126px;
    height: 126px;
    overflow: visible;
    place-items: center;
    color: white;
    background:
      radial-gradient(
        circle at 35% 28%,
        #A78BFA,
        var(--bc-violet) 56%,
        var(--bc-violet-dark)
      );
    border: 8px solid rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    box-shadow:
      0 0 0 14px rgba(124, 58, 237, 0.08),
      0 24px 55px rgba(0, 0, 0, 0.34);
    transform: translate(-50%, -50%);
  }

  .bc-constellation-core img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: inherit;
  }

  .bc-constellation-core > span {
    font-size: 38px;
    font-weight: 850;
  }

  .bc-core-status {
    position: absolute;
    right: 0;
    bottom: 7px;
    width: 24px;
    height: 24px;
    border: 5px solid var(--bc-indigo);
    border-radius: 999px;
    background: var(--bc-green);
  }

  .bc-orbit-person {
    position: absolute;
    z-index: 7;
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 180px;
    padding: 9px 11px;
    color: var(--bc-text);
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.72);
    border-radius: 13px;
    box-shadow: 0 14px 31px rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(10px);
  }

  .bc-orbit-person--1 {
    top: 24px;
    left: 5px;
    transform: rotate(-3deg);
  }

  .bc-orbit-person--2 {
    top: 76px;
    right: -6px;
    transform: rotate(3deg);
  }

  .bc-orbit-person--3 {
    bottom: 36px;
    left: 9px;
    transform: rotate(2deg);
  }

  .bc-orbit-person--4 {
    right: -1px;
    bottom: 27px;
    transform: rotate(-2deg);
  }

  .bc-orbit-person--live {
    border-color: #6EE7B7;
  }

  .bc-orbit-avatar {
    position: relative;
    display: grid;
    width: 38px;
    height: 38px;
    overflow: visible;
    flex-shrink: 0;
    place-items: center;
    color: white;
    background: var(--bc-violet);
    border-radius: 11px;
    font-size: 13px;
    font-weight: 850;
  }

  .bc-orbit-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: inherit;
  }

  .bc-orbit-live-dot {
    position: absolute;
    right: -3px;
    bottom: -3px;
    width: 12px;
    height: 12px;
    border: 3px solid white;
    border-radius: 999px;
    background: var(--bc-green);
  }

  .bc-orbit-person > div:last-child {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .bc-orbit-person strong {
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bc-orbit-person span {
    overflow: hidden;
    margin-top: 2px;
    color: var(--bc-muted);
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bc-ghost-node {
    position: absolute;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 12px;
    color: rgba(255, 255, 255, 0.48);
    background: rgba(255, 255, 255, 0.05);
    border: 1px dashed rgba(255, 255, 255, 0.17);
    border-radius: 12px;
    font-size: 12px;
    font-weight: 700;
  }

  .bc-ghost-node--one {
    top: 35px;
    left: 12px;
    transform: rotate(-3deg);
  }

  .bc-ghost-node--two {
    top: 74px;
    right: 4px;
    transform: rotate(3deg);
  }

  .bc-ghost-node--three {
    bottom: 39px;
    left: 25px;
    transform: rotate(2deg);
  }

  .bc-network-readout {
    position: absolute;
    z-index: 8;
    right: 28px;
    bottom: 25px;
    left: 28px;
    display: grid;
    grid-template-columns:
      1fr auto 1fr auto 1fr auto 1fr;
    align-items: center;
    min-height: 78px;
    padding: 13px 18px;
    color: var(--bc-text);
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid rgba(255, 255, 255, 0.77);
    border-radius: 18px;
    box-shadow: 0 15px 38px rgba(0, 0, 0, 0.23);
    backdrop-filter: blur(15px);
  }

  .bc-network-readout > div {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 11px;
  }

  .bc-network-readout > div > span:last-child {
    display: flex;
    flex-direction: column;
  }

  .bc-network-readout strong {
    font-size: 21px;
    line-height: 1;
  }

  .bc-network-readout small {
    margin-top: 4px;
    color: var(--bc-muted);
    font-size: 11px;
  }

  .bc-readout-icon {
    display: grid;
    width: 37px;
    height: 37px;
    flex-shrink: 0;
    place-items: center;
    border-radius: 12px;
  }

  .bc-readout-icon--violet {
    color: var(--bc-violet);
    background: var(--bc-violet-light);
  }

  .bc-readout-icon--green {
    color: var(--bc-green-dark);
    background: var(--bc-green-light);
  }

  .bc-readout-icon--amber {
    color: var(--bc-amber-dark);
    background: var(--bc-amber-light);
  }

  .bc-readout-icon--blue {
    color: #0369A1;
    background: var(--bc-blue-light);
  }

  .bc-readout-divider {
    width: 1px;
    height: 37px;
    background: var(--bc-border);
  }

  .bc-request-runway,
  .bc-match-zone,
  .bc-crew-wall {
    margin-top: 24px;
    padding: 29px;
    background: rgba(255, 255, 255, 0.93);
    border: 1px solid var(--bc-border);
    border-radius: 38px 21px 38px 21px;
    box-shadow: 0 19px 48px rgba(27, 27, 58, 0.09);
    backdrop-filter: blur(13px);
  }

  .bc-section-heading,
  .bc-crew-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 23px;
  }

  .bc-section-heading h2,
  .bc-crew-heading h2,
  .bc-search-zone h2,
  .bc-closing-callout h2 {
    margin: 0;
    font-size: clamp(27px, 3.3vw, 39px);
    letter-spacing: -0.052em;
    line-height: 1.05;
  }

  .bc-section-heading p,
  .bc-crew-heading p {
    max-width: 570px;
    margin: 8px 0 0;
    color: var(--bc-muted);
    font-size: 14px;
    line-height: 1.65;
  }

  .bc-heading-count {
    display: grid;
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    place-items: center;
    color: var(--bc-violet);
    background: var(--bc-violet-light);
    border-radius: 14px;
    font-size: 15px;
    font-weight: 850;
    transform: rotate(4deg);
  }

  .bc-heading-count--green {
    color: var(--bc-green-dark);
    background: var(--bc-green-light);
    transform: rotate(-4deg);
  }

  .bc-request-deck {
    display: grid;
    grid-template-columns:
      repeat(3, minmax(0, 1fr));
    gap: 13px;
  }

  .bc-request-card {
    position: relative;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 13px;
    padding: 19px;
    background: var(--bc-cream);
    border: 1px solid #FDE68A;
    border-radius: 8px 18px 18px 18px;
    box-shadow: 0 12px 28px rgba(120, 82, 8, 0.1);
    transition:
      transform 160ms ease,
      box-shadow 160ms ease;
  }

  .bc-request-card--1 {
    transform: rotate(-0.8deg);
  }

  .bc-request-card--2 {
    background: var(--bc-violet-faint);
    border-color: #DDD6FE;
    transform: rotate(0.7deg);
  }

  .bc-request-card--3 {
    background: #ECFDF5;
    border-color: #A7F3D0;
    transform: rotate(-0.4deg);
  }

  .bc-request-card:hover {
    box-shadow: 0 20px 38px rgba(27, 27, 58, 0.14);
    transform: translateY(-5px) rotate(0deg);
  }

  .bc-request-pin {
    position: absolute;
    top: -7px;
    left: 50%;
    width: 14px;
    height: 14px;
    border: 3px solid white;
    border-radius: 999px;
    background: var(--bc-amber);
    transform: translateX(-50%);
  }

  .bc-request-avatar {
    display: grid;
    width: 53px;
    height: 53px;
    overflow: hidden;
    place-items: center;
    color: white;
    background: var(--bc-violet);
    border: 3px solid white;
    border-radius: 16px;
    font-size: 18px;
    font-weight: 850;
    box-shadow: 0 6px 16px rgba(27, 27, 58, 0.13);
  }

  .bc-request-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .bc-request-copy {
    min-width: 0;
  }

  .bc-request-copy > span {
    color: var(--bc-violet);
    font-size: 11px;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .bc-request-copy h3 {
    margin: 5px 0 0;
    font-size: 17px;
    letter-spacing: -0.025em;
  }

  .bc-request-copy p {
    margin: 4px 0 0;
    color: var(--bc-muted);
    font-size: 12px;
    line-height: 1.45;
  }

  .bc-request-actions {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px;
    margin-top: 5px;
  }

  .bc-accept-button,
  .bc-decline-button {
    display: inline-flex;
    min-height: 40px;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border-radius: 11px;
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
    transition:
      transform 150ms ease,
      background 150ms ease;
  }

  .bc-accept-button {
    color: white;
    background: var(--bc-violet);
    border: 0;
  }

  .bc-decline-button {
    width: 42px;
    color: #B91C1C;
    background: var(--bc-red-light);
    border: 1px solid #FCA5A5;
  }

  .bc-accept-button:hover:not(:disabled),
  .bc-decline-button:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  .bc-accept-button:disabled,
  .bc-decline-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .bc-live-board {
    position: relative;
    overflow: hidden;
    margin-top: 24px;
    padding: 30px;
    color: white;
    background:
      radial-gradient(
        circle at 86% 18%,
        rgba(16, 185, 129, 0.18),
        transparent 28%
      ),
      linear-gradient(
        145deg,
        #17172D,
        var(--bc-indigo-soft)
      );
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 23px 45px 23px 45px;
    box-shadow: 0 22px 55px rgba(27, 27, 58, 0.17);
  }

  .bc-live-board::before {
    position: absolute;
    top: -145px;
    right: -105px;
    width: 355px;
    height: 355px;
    content: "";
    border: 1px dashed rgba(110, 231, 183, 0.13);
    border-radius: 999px;
  }

  .bc-section-heading--light {
    position: relative;
    z-index: 2;
  }

  .bc-section-heading--light h2 {
    color: white;
  }

  .bc-section-heading--light p {
    color: rgba(255, 255, 255, 0.52);
  }

  .bc-section-heading--light .bc-section-kicker,
  .bc-section-kicker--light {
    color: var(--bc-lilac);
  }

  .bc-light-link {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: 6px;
    padding: 10px 12px;
    color: white;
    background: rgba(255, 255, 255, 0.09);
    border-radius: 12px;
    font-size: 12px;
    font-weight: 800;
    text-decoration: none;
    transition:
      background 150ms ease,
      transform 150ms ease;
  }

  .bc-light-link:hover {
    background: rgba(255, 255, 255, 0.16);
    transform: translateX(2px);
  }

  .bc-live-deck {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns:
      repeat(3, minmax(0, 1fr));
    gap: 13px;
  }

  .bc-live-card {
    display: flex;
    min-width: 0;
    min-height: 360px;
    flex-direction: column;
    padding: 18px;
    color: var(--bc-text);
    background: white;
    border: 1px solid rgba(255, 255, 255, 0.73);
    border-radius: 17px;
    box-shadow: 0 17px 39px rgba(0, 0, 0, 0.25);
    transition:
      transform 170ms ease,
      box-shadow 170ms ease;
  }

  .bc-live-card--1 {
    transform: rotate(-1deg);
  }

  .bc-live-card--2 {
    background: var(--bc-cream);
    transform: rotate(1deg);
  }

  .bc-live-card--3 {
    background: #ECFDF5;
    transform: rotate(-0.5deg);
  }

  .bc-live-card--4 {
    background: var(--bc-violet-faint);
    transform: rotate(0.8deg);
  }

  .bc-live-card:hover {
    z-index: 3;
    box-shadow: 0 26px 52px rgba(0, 0, 0, 0.33);
    transform: translateY(-7px) rotate(0deg);
  }

  .bc-live-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .bc-live-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--bc-red);
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.1em;
  }

  .bc-live-label > span {
    position: relative;
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--bc-red);
  }

  .bc-live-label > span::after {
    position: absolute;
    inset: -4px;
    content: "";
    border-radius: inherit;
    background: var(--bc-red);
    opacity: 0.28;
    animation: bc-live-pulse 1.5s ease-out infinite;
  }

  .bc-live-duration {
    color: var(--bc-muted);
    font-size: 11px;
    font-weight: 750;
  }

  .bc-live-person {
    display: flex;
    align-items: center;
    gap: 11px;
    margin-top: 18px;
  }

  .bc-live-avatar {
    display: grid;
    width: 51px;
    height: 51px;
    overflow: hidden;
    flex-shrink: 0;
    place-items: center;
    color: white;
    background: var(--bc-violet);
    border: 3px solid white;
    border-radius: 16px;
    font-size: 18px;
    font-weight: 850;
    box-shadow: 0 6px 16px rgba(27, 27, 58, 0.14);
  }

  .bc-live-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .bc-live-person h3 {
    margin: 0;
    font-size: 17px;
    letter-spacing: -0.025em;
  }

  .bc-live-person p {
    margin: 4px 0 0;
    color: var(--bc-muted);
    font-size: 12px;
  }

  .bc-live-course {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-top: 17px;
    padding: 10px 11px;
    color: var(--bc-violet);
    background: var(--bc-violet-light);
    border-radius: 11px;
    font-size: 13px;
    font-weight: 850;
    text-decoration: none;
  }

  .bc-live-course svg:last-child {
    margin-left: auto;
  }

  .bc-live-location {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-top: 10px;
    padding: 11px;
    color: var(--bc-green-dark);
    background: var(--bc-green-light);
    border: 1px solid #A7F3D0;
    border-radius: 11px;
  }

  .bc-live-location > span {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .bc-live-location small {
    font-size: 11px;
  }

  .bc-live-location strong {
    overflow: hidden;
    margin-top: 2px;
    color: var(--bc-text);
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bc-live-message {
    margin-top: 10px;
    padding: 11px;
    background: rgba(124, 58, 237, 0.07);
    border-radius: 11px;
  }

  .bc-live-message small {
    color: var(--bc-violet);
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .bc-live-message p {
    display: -webkit-box;
    overflow: hidden;
    margin: 5px 0 0;
    color: var(--bc-muted);
    font-size: 12px;
    line-height: 1.5;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .bc-find-note {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    margin-top: 9px;
    padding: 10px;
    color: #78520B;
    background: var(--bc-amber-light);
    border: 1px dashed #FCD34D;
    border-radius: 10px;
    font-size: 12px;
    line-height: 1.45;
  }

  .bc-find-note svg {
    flex-shrink: 0;
    margin-top: 1px;
  }

  .bc-find-button {
    display: inline-flex;
    width: 100%;
    min-height: 41px;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: auto;
    padding: 10px;
    color: white;
    background: var(--bc-violet);
    border-radius: 11px;
    font-size: 12px;
    font-weight: 800;
    text-decoration: none;
    transition:
      transform 150ms ease,
      background 150ms ease;
  }

  .bc-find-button:hover {
    background: var(--bc-violet-dark);
    transform: translateY(-2px);
  }

  .bc-live-empty {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 19px;
    padding: 24px;
    background: rgba(255, 255, 255, 0.055);
    border: 1px dashed rgba(255, 255, 255, 0.17);
    border-radius: 18px;
  }

  .bc-empty-radar {
    position: relative;
    display: grid;
    width: 78px;
    height: 78px;
    place-items: center;
    color: var(--bc-lilac);
    border: 1px dashed rgba(196, 181, 253, 0.37);
    border-radius: 999px;
  }

  .bc-empty-radar span {
    position: absolute;
    border: 1px solid rgba(196, 181, 253, 0.17);
    border-radius: inherit;
  }

  .bc-empty-radar span:nth-child(1) {
    inset: 11px;
  }

  .bc-empty-radar span:nth-child(2) {
    inset: 23px;
  }

  .bc-live-empty h3 {
    margin: 0 0 5px;
    color: white;
    font-size: 18px;
  }

  .bc-live-empty p {
    margin: 0;
    color: rgba(255, 255, 255, 0.5);
    font-size: 13px;
    line-height: 1.55;
  }

  .bc-live-empty > a {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 11px 14px;
    color: var(--bc-green-dark);
    background: var(--bc-green-light);
    border-radius: 11px;
    font-size: 12px;
    font-weight: 850;
    text-decoration: none;
  }

  .bc-discovery-console {
    display: grid;
    grid-template-columns:
      minmax(0, 1fr) minmax(390px, 0.75fr);
    align-items: center;
    gap: 23px;
    margin-top: 24px;
    padding: 25px;
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid var(--bc-border);
    border-radius: 20px 37px 20px 37px;
    box-shadow: 0 17px 43px rgba(27, 27, 58, 0.09);
    backdrop-filter: blur(13px);
  }

  .bc-search-zone h2 {
    font-size: 27px;
  }

  .bc-search-box {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-top: 16px;
    padding: 13px 14px;
    background: var(--bc-background);
    border: 1px solid var(--bc-border);
    border-radius: 13px;
    transition:
      border-color 150ms ease,
      box-shadow 150ms ease;
  }

  .bc-search-box:focus-within {
    border-color: var(--bc-lilac);
    box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.08);
  }

  .bc-search-box > svg {
    flex-shrink: 0;
    color: var(--bc-violet);
  }

  .bc-search-box input {
    width: 100%;
    min-width: 0;
    color: var(--bc-text);
    background: transparent;
    border: 0;
    outline: none;
    font: inherit;
    font-size: 14px;
  }

  .bc-search-box input::placeholder {
    color: var(--bc-faint);
  }

  .bc-search-box button {
    display: grid;
    flex-shrink: 0;
    padding: 3px;
    place-items: center;
    color: var(--bc-muted);
    background: transparent;
    border: 0;
    cursor: pointer;
  }

  .bc-console-links {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .bc-console-links > a {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 10px;
    min-width: 0;
    padding: 15px;
    color: var(--bc-text);
    background: var(--bc-violet-faint);
    border: 1px solid #DDD6FE;
    border-radius: 14px;
    text-decoration: none;
    transition:
      transform 150ms ease,
      box-shadow 150ms ease;
  }

  .bc-console-links > a:last-child {
    background: var(--bc-green-light);
    border-color: #A7F3D0;
  }

  .bc-console-links > a:hover {
    box-shadow: 0 13px 27px rgba(27, 27, 58, 0.11);
    transform: translateY(-4px);
  }

  .bc-console-links > a > svg:first-child {
    color: var(--bc-violet);
  }

  .bc-console-links > a:last-child > svg:first-child {
    color: var(--bc-green-dark);
  }

  .bc-console-links span {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .bc-console-links strong {
    font-size: 13px;
  }

  .bc-console-links small {
    margin-top: 3px;
    color: var(--bc-muted);
    font-size: 11px;
    line-height: 1.4;
  }

  .bc-match-grid {
    display: grid;
    grid-template-columns:
      repeat(4, minmax(0, 1fr));
    gap: 13px;
  }

  .bc-match-card {
    position: relative;
    display: flex;
    min-width: 0;
    min-height: 330px;
    flex-direction: column;
    padding: 18px;
    background: var(--bc-violet-faint);
    border: 1px solid #DDD6FE;
    border-radius: 17px;
    transition:
      transform 170ms ease,
      box-shadow 170ms ease;
  }

  .bc-match-card--1 {
    transform: rotate(-0.7deg);
  }

  .bc-match-card--2 {
    background: var(--bc-cream);
    border-color: #FDE68A;
    transform: rotate(0.8deg);
  }

  .bc-match-card--3 {
    background: #ECFDF5;
    border-color: #A7F3D0;
    transform: rotate(-0.4deg);
  }

  .bc-match-card--4 {
    background: var(--bc-blue-light);
    border-color: #BAE6FD;
    transform: rotate(0.6deg);
  }

  .bc-match-card:hover {
    z-index: 3;
    box-shadow: 0 21px 42px rgba(27, 27, 58, 0.14);
    transform: translateY(-6px) rotate(0deg);
  }

  .bc-match-meter {
    --bc-match-angle: 0deg;

    position: absolute;
    top: 14px;
    right: 14px;
    display: grid;
    width: 58px;
    height: 58px;
    padding: 4px;
    place-items: center;
    background:
      conic-gradient(
        var(--bc-violet)
          var(--bc-match-angle),
        rgba(124, 58, 237, 0.13)
          var(--bc-match-angle)
      );
    border-radius: 999px;
  }

  .bc-match-meter > span {
    display: grid;
    width: 100%;
    height: 100%;
    place-items: center;
    align-content: center;
    background: white;
    border-radius: inherit;
  }

  .bc-match-meter strong {
    font-size: 13px;
    line-height: 1;
  }

  .bc-match-meter small {
    margin-top: 2px;
    color: var(--bc-muted);
    font-size: 10px;
    font-weight: 750;
  }

  .bc-match-person {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-right: 61px;
  }

  .bc-match-avatar {
    display: grid;
    width: 48px;
    height: 48px;
    overflow: hidden;
    flex-shrink: 0;
    place-items: center;
    color: white;
    background: var(--bc-violet);
    border: 3px solid white;
    border-radius: 15px;
    font-size: 17px;
    font-weight: 850;
    box-shadow: 0 6px 15px rgba(27, 27, 58, 0.13);
  }

  .bc-match-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .bc-match-person h3 {
    margin: 0;
    font-size: 15px;
    letter-spacing: -0.02em;
  }

  .bc-match-person p {
    margin: 4px 0 0;
    color: var(--bc-muted);
    font-size: 11px;
    line-height: 1.4;
  }

  .bc-match-reasons {
    display: flex;
    align-content: flex-start;
    gap: 7px;
    margin-top: 20px;
    flex-wrap: wrap;
  }

  .bc-match-reason {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 7px 9px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 750;
  }

  .bc-match-reason--course {
    color: var(--bc-violet);
    background: white;
    border: 1px solid #DDD6FE;
    text-decoration: none;
  }

  .bc-match-reason--major {
    color: var(--bc-green-dark);
    background: var(--bc-green-light);
  }

  .bc-match-reason--year {
    color: var(--bc-amber-dark);
    background: var(--bc-amber-light);
  }

  .bc-add-match-button {
    display: inline-flex;
    width: 100%;
    min-height: 41px;
    align-items: center;
    justify-content: center;
    gap: 7px;
    margin-top: auto;
    padding: 10px;
    color: white;
    background: var(--bc-violet);
    border: 0;
    border-radius: 11px;
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
    transition:
      transform 150ms ease,
      background 150ms ease;
  }

  .bc-add-match-button:hover:not(:disabled) {
    background: var(--bc-violet-dark);
    transform: translateY(-2px);
  }

  .bc-add-match-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .bc-show-more {
    display: block;
    margin: 19px auto 0;
    padding: 10px 14px;
    color: var(--bc-violet);
    background: var(--bc-violet-light);
    border: 0;
    border-radius: 11px;
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
  }

  .bc-match-empty,
  .bc-crew-empty {
    display: flex;
    min-height: 300px;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    padding: 30px;
    background: var(--bc-violet-faint);
    border: 2px dashed #DDD6FE;
    border-radius: 21px;
    text-align: center;
  }

  .bc-match-empty-icon {
    display: grid;
    width: 77px;
    height: 77px;
    place-items: center;
    color: var(--bc-violet);
    border: 1px dashed var(--bc-lilac);
    border-radius: 999px;
  }

  .bc-match-empty h3,
  .bc-crew-empty h3 {
    margin: 20px 0 7px;
    font-size: 21px;
    letter-spacing: -0.035em;
  }

  .bc-match-empty p,
  .bc-crew-empty p {
    max-width: 460px;
    margin: 0;
    color: var(--bc-muted);
    font-size: 13px;
    line-height: 1.6;
  }

  .bc-match-empty a,
  .bc-crew-empty a,
  .bc-crew-empty button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 18px;
    padding: 10px 13px;
    color: white;
    background: var(--bc-violet);
    border: 0;
    border-radius: 11px;
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    text-decoration: none;
    cursor: pointer;
  }

  .bc-crew-heading {
    align-items: center;
  }

  .bc-crew-filter {
    display: flex;
    flex-shrink: 0;
    gap: 4px;
    padding: 4px;
    background: var(--bc-background);
    border: 1px solid var(--bc-border);
    border-radius: 12px;
  }

  .bc-crew-filter button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 8px 10px;
    color: var(--bc-muted);
    background: transparent;
    border: 0;
    border-radius: 9px;
    font: inherit;
    font-size: 11px;
    font-weight: 800;
    cursor: pointer;
  }

  .bc-crew-filter button > span {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--bc-green);
  }

  .bc-crew-filter .bc-crew-filter-active {
    color: var(--bc-violet);
    background: white;
    box-shadow: 0 4px 11px rgba(27, 27, 58, 0.08);
  }

  .bc-crew-grid {
    display: grid;
    grid-template-columns:
      repeat(3, minmax(0, 1fr));
    gap: 13px;
  }

  .bc-crew-card {
    position: relative;
    min-width: 0;
    padding: 18px;
    background: var(--bc-surface);
    border: 1px solid var(--bc-border);
    border-radius: 17px;
    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      border-color 160ms ease;
  }

  .bc-crew-card--1 {
    transform: rotate(-0.4deg);
  }

  .bc-crew-card--2 {
    background: var(--bc-violet-faint);
    transform: rotate(0.5deg);
  }

  .bc-crew-card--3 {
    background: var(--bc-cream);
    transform: rotate(-0.3deg);
  }

  .bc-crew-card--4 {
    background: var(--bc-blue-light);
    transform: rotate(0.4deg);
  }

  .bc-crew-card--live {
    background: #ECFDF5;
    border-color: #6EE7B7;
    box-shadow:
      inset 0 4px 0 var(--bc-green),
      0 8px 22px rgba(27, 27, 58, 0.06);
  }

  .bc-crew-card:hover {
    z-index: 2;
    border-color: var(--bc-lilac);
    box-shadow: 0 18px 36px rgba(27, 27, 58, 0.12);
    transform: translateY(-5px) rotate(0deg);
  }

  .bc-crew-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }

  .bc-crew-avatar {
    position: relative;
    display: grid;
    width: 55px;
    height: 55px;
    overflow: visible;
    place-items: center;
    color: white;
    background: var(--bc-violet);
    border: 3px solid white;
    border-radius: 17px;
    font-size: 19px;
    font-weight: 850;
    box-shadow: 0 6px 16px rgba(27, 27, 58, 0.14);
  }

  .bc-crew-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 14px;
  }

  .bc-crew-live-dot {
    position: absolute;
    right: -4px;
    bottom: -4px;
    width: 15px;
    height: 15px;
    border: 3px solid white;
    border-radius: 999px;
    background: var(--bc-green);
  }

  .bc-status-pill {
    padding: 6px 9px;
    color: var(--bc-muted);
    background: var(--bc-background);
    border-radius: 999px;
    font-size: 11px;
    font-weight: 800;
  }

  .bc-status-pill--live {
    color: var(--bc-green-dark);
    background: var(--bc-green-light);
  }

  .bc-crew-card > h3 {
    margin: 15px 0 0;
    font-size: 17px;
    letter-spacing: -0.025em;
  }

  .bc-crew-meta {
    margin: 5px 0 0;
    color: var(--bc-muted);
    font-size: 12px;
  }

  .bc-crew-live-details {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-top: 15px;
    flex-direction: column;
  }

  .bc-crew-live-details a,
  .bc-crew-live-details > span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--bc-text);
    font-size: 12px;
  }

  .bc-crew-live-details a {
    color: var(--bc-violet);
    font-weight: 800;
    text-decoration: none;
  }

  .bc-crew-live-details small {
    color: var(--bc-green-dark);
    font-size: 11px;
    font-weight: 750;
  }

  .bc-offline-note {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-top: 15px;
    padding: 10px;
    color: var(--bc-muted);
    background: rgba(255, 255, 255, 0.68);
    border: 1px solid var(--bc-border);
    border-radius: 10px;
    font-size: 11px;
    line-height: 1.45;
  }

  .bc-crew-empty-orbit {
    position: relative;
    display: grid;
    width: 85px;
    height: 85px;
    place-items: center;
    color: var(--bc-violet);
    border: 1px dashed var(--bc-lilac);
    border-radius: 999px;
  }

  .bc-crew-empty-orbit span {
    position: absolute;
    border: 1px solid rgba(124, 58, 237, 0.14);
    border-radius: inherit;
  }

  .bc-crew-empty-orbit span:nth-child(2) {
    inset: -12px;
  }

  .bc-crew-empty-orbit span:nth-child(3) {
    inset: -26px;
  }

  .bc-closing-callout {
    position: relative;
    display: grid;
    grid-template-columns:
      minmax(0, 1fr) auto;
    gap: 25px;
    overflow: hidden;
    margin-top: 24px;
    padding: 39px;
    color: white;
    background:
      radial-gradient(
        circle at 82% 30%,
        rgba(16, 185, 129, 0.17),
        transparent 27%
      ),
      linear-gradient(
        135deg,
        var(--bc-indigo),
        #27275B
      );
    border-radius: 22px 48px 22px 48px;
    box-shadow: 0 22px 55px rgba(27, 27, 58, 0.18);
  }

  .bc-closing-callout > div:not(.bc-closing-orbits) {
    position: relative;
    z-index: 2;
    max-width: 750px;
  }

  .bc-closing-callout h2 {
    font-size: clamp(29px, 4vw, 44px);
  }

  .bc-closing-callout p {
    margin: 11px 0 0;
    color: rgba(255, 255, 255, 0.54);
    font-size: 14px;
    line-height: 1.65;
  }

  .bc-closing-callout > a {
    position: relative;
    z-index: 2;
    display: inline-flex;
    align-self: center;
    align-items: center;
    gap: 7px;
    padding: 12px 15px;
    color: var(--bc-violet-dark);
    background: white;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 850;
    text-decoration: none;
    transition: transform 150ms ease;
  }

  .bc-closing-callout > a:hover {
    transform: translateY(-3px);
  }

  .bc-closing-orbits {
    position: absolute;
    top: -125px;
    right: -55px;
    width: 300px;
    height: 300px;
    border: 1px solid rgba(196, 181, 253, 0.13);
    border-radius: 999px;
  }

  .bc-closing-orbits span {
    position: absolute;
    border: 1px solid rgba(196, 181, 253, 0.1);
    border-radius: inherit;
  }

  .bc-closing-orbits span:nth-child(1) {
    inset: 32px;
  }

  .bc-closing-orbits span:nth-child(2) {
    inset: 70px;
  }

  .bc-closing-orbits span:nth-child(3) {
    inset: 112px;
    background: rgba(124, 58, 237, 0.15);
  }

  .bc-loading {
    display: flex;
    min-height: 75vh;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 20px;
    color: var(--bc-muted);
    background: var(--bc-background);
    font-size: 14px;
  }

  .bc-loading-constellation {
    position: relative;
    display: grid;
    width: 88px;
    height: 88px;
    place-items: center;
    color: var(--bc-violet);
    background: var(--bc-violet-faint);
    border-radius: 999px;
  }

  .bc-loading-ring {
    position: absolute;
    border: 1px solid var(--bc-lilac);
    border-radius: inherit;
    animation:
      bc-loading-wave 1.8s ease-out infinite;
  }

  .bc-loading-ring--one {
    inset: 7px;
  }

  .bc-loading-ring--two {
    inset: -13px;
    animation-delay: 0.6s;
  }

  .bc-loading-star {
    position: absolute;
    width: 9px;
    height: 9px;
    border: 2px solid white;
    border-radius: 999px;
    background: var(--bc-green);
  }

  .bc-loading-star--one {
    top: 3px;
    right: 14px;
  }

  .bc-loading-star--two {
    bottom: 5px;
    left: 8px;
    background: var(--bc-amber);
  }

  .bc-loading-star--three {
    right: -5px;
    bottom: 27px;
    background: var(--bc-violet);
  }

  .bc-loading-link {
    color: var(--bc-violet);
    font-weight: 800;
    text-decoration: none;
  }

  .bc-root a:focus-visible,
  .bc-root button:focus-visible,
  .bc-root input:focus-visible,
  .bc-loading a:focus-visible {
    outline: 3px solid rgba(124, 58, 237, 0.35);
    outline-offset: 3px;
  }

  @keyframes bc-orbit-spin {
    to {
      transform:
        translate(-50%, -50%)
        rotate(360deg);
    }
  }

  @keyframes bc-orbit-spin-reverse {
    to {
      transform:
        translate(-50%, -50%)
        rotate(-360deg);
    }
  }

  @keyframes bc-live-pulse {
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

  @keyframes bc-loading-wave {
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
    .bc-constellation {
      right: 17px;
      width: 405px;
    }

    .bc-request-deck {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

    .bc-live-deck,
    .bc-crew-grid {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

    .bc-match-grid {
      grid-template-columns:
        repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 880px) {
    .bc-hero {
      min-height: 725px;
    }

    .bc-hero-copy {
      width: 100%;
      max-width: calc(100% - 345px);
    }

    .bc-constellation {
      top: 255px;
      left: 50%;
      width: 430px;
      transform: translateX(-50%);
    }

    .bc-network-readout {
      grid-template-columns: 1fr 1fr;
    }

    .bc-readout-divider {
      display: none;
    }

    .bc-network-readout > div {
      justify-content: flex-start;
      padding: 6px 11px;
    }

    .bc-discovery-console {
      grid-template-columns: 1fr;
    }

    .bc-match-grid {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 680px) {
    .bc-root {
      padding: 10px 12px 70px;
    }

    .bc-hero {
      min-height: 830px;
      padding: 35px 23px 140px;
      border-radius: 31px 31px 18px 31px;
    }

    .bc-hero-copy {
      max-width: none;
    }

    .bc-hero-copy h1 {
      font-size:
        clamp(48px, 16vw, 69px);
    }

    .bc-hero-copy > p {
      font-size: 15px;
    }

    .bc-constellation {
      top: 390px;
      width: 335px;
      height: 350px;
    }

    .bc-orbit-ring--outer {
      width: 300px;
      height: 300px;
    }

    .bc-orbit-ring--middle {
      width: 225px;
      height: 225px;
    }

    .bc-orbit-ring--inner {
      width: 150px;
      height: 150px;
    }

    .bc-constellation-core {
      width: 108px;
      height: 108px;
    }

    .bc-orbit-person {
      max-width: 145px;
      padding: 8px 9px;
    }

    .bc-orbit-person--2,
    .bc-orbit-person--4 {
      right: 0;
    }

    .bc-network-readout {
      right: 15px;
      bottom: 15px;
      left: 15px;
      padding: 9px;
    }

    .bc-network-readout small {
      font-size: 10px;
    }

    .bc-request-runway,
    .bc-match-zone,
    .bc-crew-wall,
    .bc-live-board {
      padding: 23px 17px;
    }

    .bc-section-heading,
    .bc-crew-heading {
      align-items: flex-start;
      flex-direction: column;
    }

    .bc-request-deck,
    .bc-live-deck,
    .bc-match-grid,
    .bc-crew-grid {
      grid-template-columns: 1fr;
    }

    .bc-request-card,
    .bc-live-card,
    .bc-match-card,
    .bc-crew-card {
      transform: none;
    }

    .bc-live-empty {
      grid-template-columns: 1fr;
      text-align: center;
    }

    .bc-empty-radar,
    .bc-live-empty > a {
      margin: 0 auto;
    }

    .bc-console-links {
      grid-template-columns: 1fr;
    }

    .bc-crew-filter {
      width: 100%;
    }

    .bc-crew-filter button {
      flex: 1;
      justify-content: center;
    }

    .bc-closing-callout {
      grid-template-columns: 1fr;
      padding: 30px 23px;
    }

    .bc-closing-callout > a {
      justify-self: flex-start;
    }
  }

  @media (max-width: 430px) {
    .bc-hero {
      min-height: 880px;
    }

    .bc-constellation {
      top: 435px;
      width: 305px;
    }

    .bc-orbit-person--4 {
      display: none;
    }

    .bc-network-readout strong {
      font-size: 18px;
    }

    .bc-network-readout small {
      font-size: 9px;
    }

    .bc-section-heading h2,
    .bc-crew-heading h2 {
      font-size: 28px;
    }

    .bc-request-actions {
      grid-template-columns: 1fr;
    }

    .bc-decline-button {
      width: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .bc-root *,
    .bc-loading * {
      scroll-behavior: auto !important;
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
    }

    .bc-trail-path {
      stroke-dashoffset: 0;
    }
  }
  
    /* ─────────────────────────────────────────────
     BUDDIES-FIRST LAYOUT
  ───────────────────────────────────────────── */

  .bc-hero {
    min-height: 335px;
    padding: 40px 44px 103px;
    border-radius: 34px 34px 20px 34px;
  }

  .bc-hero-copy {
    width: min(60%, 660px);
  }

  .bc-hero-copy h1 {
    max-width: 650px;
    font-size: clamp(40px, 5.5vw, 65px);
    line-height: 0.94;
  }

  .bc-hero-copy > p {
    max-width: 590px;
    margin-top: 18px;
    font-size: 14px;
    line-height: 1.65;
  }

  .bc-hero-actions {
    margin-top: 18px;
  }

  .bc-constellation {
    top: 13px;
    right: 34px;
    width: 310px;
    height: 245px;
  }

  .bc-orbit-ring--outer {
    width: 235px;
    height: 235px;
  }

  .bc-orbit-ring--middle {
    width: 175px;
    height: 175px;
  }

  .bc-orbit-ring--inner {
    width: 115px;
    height: 115px;
  }

  .bc-constellation-core {
    width: 86px;
    height: 86px;
    border-width: 6px;
    box-shadow:
      0 0 0 10px rgba(124, 58, 237, 0.08),
      0 18px 40px rgba(0, 0, 0, 0.3);
  }

  .bc-constellation-core > span {
    font-size: 27px;
  }

  .bc-core-status {
    right: -1px;
    bottom: 3px;
    width: 19px;
    height: 19px;
    border-width: 4px;
  }

  .bc-orbit-person {
    max-width: 150px;
    padding: 7px 9px;
  }

  .bc-orbit-avatar {
    width: 33px;
    height: 33px;
    border-radius: 10px;
  }

  .bc-orbit-person strong {
    font-size: 11px;
  }

  .bc-orbit-person span {
    font-size: 10px;
  }

  .bc-orbit-person--1 {
    top: 5px;
    left: -4px;
  }

  .bc-orbit-person--2 {
    top: 38px;
    right: -8px;
  }

  .bc-orbit-person--3 {
    bottom: 8px;
    left: 4px;
  }

  .bc-orbit-person--4 {
    right: -5px;
    bottom: 2px;
  }

  .bc-network-readout {
    min-height: 67px;
    bottom: 18px;
    padding: 10px 15px;
  }

  .bc-network-readout strong {
    font-size: 19px;
  }

  .bc-network-readout small {
    font-size: 10px;
  }

  .bc-readout-icon {
    width: 33px;
    height: 33px;
  }

  /* Make the actual buddy list feel like the page's main stage */

  .bc-crew-wall {
    position: relative;
    margin-top: 20px;
    padding: 34px;
    background:
      radial-gradient(
        circle at 92% 5%,
        rgba(124, 58, 237, 0.09),
        transparent 24%
      ),
      rgba(255, 255, 255, 0.97);
    border: 1px solid #d8d1ff;
    border-radius: 25px 46px 25px 46px;
    box-shadow:
      0 25px 65px rgba(27, 27, 58, 0.13),
      inset 0 4px 0 var(--bc-violet);
  }

  .bc-crew-heading {
    margin-bottom: 28px;
  }

  .bc-crew-heading h2 {
    font-size: clamp(32px, 4vw, 48px);
  }

  .bc-crew-heading p {
    max-width: 660px;
    font-size: 15px;
  }

  .bc-crew-grid {
    grid-template-columns:
      repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .bc-crew-card {
    min-height: 245px;
    padding: 21px;
    border-radius: 19px;
    box-shadow: 0 9px 25px rgba(27, 27, 58, 0.07);
  }

  .bc-crew-card--live {
    box-shadow:
      inset 0 5px 0 var(--bc-green),
      0 15px 34px rgba(16, 185, 129, 0.13);
  }

  .bc-crew-avatar {
    width: 65px;
    height: 65px;
    border-radius: 19px;
    font-size: 22px;
  }

  .bc-crew-avatar img {
    border-radius: 16px;
  }

  .bc-crew-card > h3 {
    margin-top: 19px;
    font-size: 20px;
  }

  .bc-crew-meta {
    font-size: 14px;
  }

  .bc-status-pill {
    padding: 7px 11px;
    font-size: 12px;
  }

  .bc-crew-live-details {
    margin-top: 18px;
  }

  .bc-crew-live-details a,
  .bc-crew-live-details > span {
    font-size: 13px;
  }

  .bc-crew-live-details small {
    font-size: 12px;
  }

  .bc-offline-note {
    margin-top: 19px;
    padding: 12px;
    font-size: 13px;
  }

  /* The later sections are supporting content now */

  .bc-live-board,
  .bc-request-runway,
  .bc-match-zone,
  .bc-discovery-console {
    margin-top: 20px;
  }

  @media (max-width: 880px) {
    .bc-hero {
      min-height: 470px;
    }

    .bc-hero-copy {
      width: 100%;
      max-width: calc(100% - 280px);
    }

    .bc-constellation {
      top: 155px;
      left: auto;
      right: 23px;
      width: 280px;
      transform: none;
    }
  }

  @media (max-width: 680px) {
    .bc-hero {
      min-height: 680px;
      padding: 32px 22px 136px;
    }

    .bc-hero-copy {
      max-width: none;
    }

    .bc-hero-copy h1 {
      font-size: clamp(43px, 14vw, 60px);
    }

    .bc-constellation {
      top: 320px;
      right: auto;
      left: 50%;
      width: 300px;
      transform: translateX(-50%);
    }

    .bc-crew-wall {
      padding: 25px 17px;
    }

    .bc-crew-grid {
      grid-template-columns: 1fr;
    }

    .bc-crew-card {
      min-height: 220px;
      transform: none;
    }
  }
`;