"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import Link from "next/link";
import {
    ArrowRight,
    BookOpen,
    Check,
    ChevronRight,
    Clock3,
    GraduationCap,
    MapPin,
    Radio,
    Search,
    UserPlus,
    Users,
    X,
} from "lucide-react";

import AlertModal from "@/components/AlertModal";
import { useRequireOnboarding } from "@/hooks/useRequiredOnboarding";
import { supabase } from "@/lib/supabase";

import styles from "./buddies.module.css";

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
    name: string | null;
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

type BuddyFilter = "all" | "live" | "offline";

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
    return (
        name?.trim().charAt(0).toUpperCase() || "S"
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

    return minutes > 0
        ? `Live for ${hours}h ${minutes}m`
        : `Live for ${hours}h`;
}

function getRecommendationReason(
    recommendation: Recommendation,
): string {
    if (recommendation.sharedCourses.length > 0) {
        return recommendation.sharedCourses
            .slice(0, 2)
            .join(" · ");
    }

    if (recommendation.sameMajor) {
        return "Same major";
    }

    if (recommendation.sameYear) {
        return "Same academic year";
    }

    return "Student at your university";
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
            alt=""
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

    const [loading, setLoading] =
        useState(true);

    const [loadError, setLoadError] =
        useState<string | null>(null);

    const [
        incomingRequests,
        setIncomingRequests,
    ] = useState<FriendshipRequest[]>([]);

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
    const [buddyFilter, setBuddyFilter] =
        useState<BuddyFilter>("all");

    const [
        showAllRecommendations,
        setShowAllRecommendations,
    ] = useState(false);

    const [
        busyRequestIds,
        setBusyRequestIds,
    ] = useState<Set<string>>(new Set());

    const [
        busyRecommendationIds,
        setBusyRecommendationIds,
    ] = useState<Set<string>>(new Set());

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

    const profileId = profile?.id;
    const university = profile?.university;
    const profileMajor = profile?.major;
    const profileYear = profile?.year;

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
            if (!profileId) {
                return;
            }

            if (!university) {
                setLoadError(
                    "Add your university to your profile before viewing study buddies.",
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
                            university,
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

                const formattedRequests = requestRows
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

                const friendships =
                    (friendshipsResult.data ??
                        []) as Friendship[];

                const acceptedBuddyIds = friendships
                    .filter(
                        (friendship) =>
                            friendship.status === "accepted",
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
                    ).map(
                        (course) => course.course_code,
                    ),
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
                            .gte(
                                "created_at",
                                twoHoursAgo,
                            )
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
                        liveMap[status.user_id] = status;
                    });
                }

                const candidates =
                    campusProfiles.filter(
                        (candidate) =>
                            !excludedIds.has(candidate.id),
                    );

                const candidateIds = candidates.map(
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
                            .in(
                                "user_id",
                                candidateIds,
                            );

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

                const recommendations = candidates
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
                                profileMajor &&
                                candidate.major ===
                                profileMajor,
                            );

                            const sameYear = Boolean(
                                candidate.year &&
                                profileYear &&
                                candidate.year ===
                                profileYear,
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
                            second.score - first.score,
                    )
                    .slice(0, 20);

                setIncomingRequests(
                    formattedRequests,
                );

                setBuddies(buddyProfiles);
                setLiveStatuses(liveMap);
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
                        : "Your study buddies could not be loaded.",
                );
            } finally {
                if (showFullLoader) {
                    setLoading(false);
                }
            }
        },
        [
            profileId,
            profileMajor,
            profileYear,
            university,
        ],
    );

    useEffect(() => {
        if (!profileId) {
            return;
        }

        void loadData();
    }, [loadData, profileId]);

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

    const liveBuddyCount = useMemo(
        () =>
            buddies.filter((buddy) =>
                Boolean(
                    activeLiveStatuses[buddy.id],
                ),
            ).length,
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
                    buddyFilter === "all" ||
                    (buddyFilter === "live" &&
                        live) ||
                    (buddyFilter === "offline" &&
                        !live);

                const status =
                    activeLiveStatuses[buddy.id];

                const matchesSearch =
                    normalizedSearch.length === 0 ||
                    (buddy.name ?? "")
                        .toLowerCase()
                        .includes(normalizedSearch) ||
                    buddy.major
                        ?.toLowerCase()
                        .includes(normalizedSearch) ||
                    buddy.year
                        ?.toLowerCase()
                        .includes(normalizedSearch) ||
                    status?.course_code
                        .toLowerCase()
                        .includes(normalizedSearch) ||
                    status?.location_name
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

                return (first.name ?? "").localeCompare(
                    second.name ?? "",
                );
            });
    }, [
        activeLiveStatuses,
        buddies,
        buddyFilter,
        normalizedSearch,
    ]);

    const filteredRecommendations =
        useMemo(() => {
            return recommendedBuddies.filter(
                (recommendation) => {
                    return (
                        normalizedSearch.length === 0 ||
                        (recommendation.name ?? "")
                            .toLowerCase()
                            .includes(
                                normalizedSearch,
                            ) ||
                        recommendation.major
                            ?.toLowerCase()
                            .includes(
                                normalizedSearch,
                            ) ||
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
        showAllRecommendations
            ? filteredRecommendations
            : filteredRecommendations.slice(0, 5);

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
                "Study buddy added",
                "They are now part of your buddy list.",
                "success",
            );
        } catch (error) {
            showAlert(
                "Unable to accept request",
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
                "Unable to decline request",
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
        setBusyRecommendationIds(
            (current) => {
                const next = new Set(current);
                next.add(receiverId);
                return next;
            },
        );

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

            const {
                data: existing,
                error: checkError,
            } = await supabase
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
                setRecommendedBuddies(
                    (current) =>
                        current.filter(
                            (recommendation) =>
                                recommendation.id !==
                                receiverId,
                        ),
                );

                showAlert(
                    "Connection already exists",
                    "A pending or accepted connection already exists.",
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

            setRecommendedBuddies(
                (current) =>
                    current.filter(
                        (recommendation) =>
                            recommendation.id !==
                            receiverId,
                    ),
            );

            showAlert(
                "Request sent",
                "Your potential study buddy has been notified.",
                "success",
            );
        } catch (error) {
            showAlert(
                "Unable to send request",
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

    function clearSearchAndFilters() {
        setSearch("");
        setBuddyFilter("all");
    }

    if (
        onboardingLoading ||
        (profile && loading)
    ) {
        return <BuddiesLoading />;
    }

    if (!profile) {
        return (
            <main
                id="studygrouprr-buddies"
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
                id="studygrouprr-buddies"
                className={styles.page}
            >
                <div className={styles.shell}>
                    {loadError && (
                        <div
                            className={styles.errorBanner}
                            role="alert"
                        >
                            <div>
                                <strong>
                                    Buddies could not be loaded
                                </strong>

                                <span>{loadError}</span>
                            </div>

                            {profile.university ? (
                                <button
                                    type="button"
                                    onClick={() =>
                                        void loadData()
                                    }
                                >
                                    Try again
                                </button>
                            ) : (
                                <Link href="/profile">
                                    Update profile
                                </Link>
                            )}
                        </div>
                    )}

                    <header className={styles.header}>
                        <div className={styles.headerCopy}>
                            <p>
                                {profile.university ||
                                    "University required"}
                            </p>

                            <h1>Buddies</h1>

                            <span>
                Keep up with classmates you
                study well with.
              </span>
                        </div>

                        <div className={styles.headerActions}>
                            <Link
                                href="/sessions"
                                className={styles.primaryAction}
                            >
                                <Search size={17} />
                                Find people
                            </Link>

                            <Link
                                href="/live"
                                className={styles.secondaryAction}
                            >
                                <Radio size={17} />
                                Go live
                            </Link>
                        </div>
                    </header>

                    <section
                        className={styles.summary}
                        aria-label="Buddy summary"
                    >
                        <SummaryItem
                            icon={<Users size={17} />}
                            value={buddies.length}
                            label="Study buddies"
                        />

                        <SummaryItem
                            icon={<Radio size={17} />}
                            value={liveBuddyCount}
                            label="Studying now"
                        />

                        <SummaryItem
                            icon={<UserPlus size={17} />}
                            value={incomingRequests.length}
                            label="New requests"
                        />
                    </section>

                    <div className={styles.contentGrid}>
                        <section className={styles.buddiesPanel}>
                            <div className={styles.panelHeader}>
                                <div>
                                    <h2>My buddies</h2>

                                    <p>
                                        Live buddies appear first.
                                    </p>
                                </div>

                                <span>
                  {filteredBuddies.length}{" "}
                                    {filteredBuddies.length === 1
                                        ? "person"
                                        : "people"}
                </span>
                            </div>

                            <div className={styles.controls}>
                                <label
                                    className={styles.searchControl}
                                >
                                    <Search size={17} />

                                    <input
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Search name, major, course, or location"
                                        aria-label="Search buddies"
                                    />

                                    {search && (
                                        <button
                                            type="button"
                                            aria-label="Clear search"
                                            onClick={() =>
                                                setSearch("")
                                            }
                                        >
                                            <X size={15} />
                                        </button>
                                    )}
                                </label>

                                <div
                                    className={styles.filterControl}
                                    aria-label="Buddy availability"
                                >
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
                                                buddyFilter === value
                                                    ? styles.filterActive
                                                    : undefined
                                            }
                                            onClick={() =>
                                                setBuddyFilter(value)
                                            }
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {filteredBuddies.length > 0 ? (
                                <div className={styles.buddyList}>
                                    {filteredBuddies.map((buddy) => (
                                        <BuddyRow
                                            key={buddy.id}
                                            buddy={buddy}
                                            liveStatus={
                                                activeLiveStatuses[
                                                    buddy.id
                                                    ] ?? null
                                            }
                                            currentTime={currentTime}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.emptyState}>
                  <span
                      className={styles.emptyIcon}
                  >
                    <Users size={23} />
                  </span>

                                    <div>
                                        <h3>
                                            {buddies.length === 0
                                                ? "No study buddies yet"
                                                : "No buddies match these filters"}
                                        </h3>

                                        <p>
                                            {buddies.length === 0
                                                ? "Find students in your courses and send your first buddy request."
                                                : "Clear the search or availability filter."}
                                        </p>
                                    </div>

                                    {buddies.length === 0 ? (
                                        <Link href="/sessions">
                                            Find people
                                            <ArrowRight size={15} />
                                        </Link>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={
                                                clearSearchAndFilters
                                            }
                                        >
                                            Clear filters
                                        </button>
                                    )}
                                </div>
                            )}
                        </section>

                        <aside className={styles.sidebar}>
                            <section
                                className={styles.requestsCard}
                            >
                                <div
                                    className={styles.sideHeader}
                                >
                                    <div>
                                        <p>Requests</p>
                                        <h2>Pending requests</h2>
                                    </div>

                                    <span>
                    {incomingRequests.length}
                  </span>
                                </div>

                                {incomingRequests.length > 0 ? (
                                    <div
                                        className={styles.requestList}
                                    >
                                        {incomingRequests.map(
                                            (request) => (
                                                <RequestRow
                                                    key={request.id}
                                                    request={request}
                                                    busy={busyRequestIds.has(
                                                        request.id,
                                                    )}
                                                    onAccept={() =>
                                                        void acceptRequest(
                                                            request.id,
                                                        )
                                                    }
                                                    onDecline={() =>
                                                        void declineRequest(
                                                            request.id,
                                                        )
                                                    }
                                                />
                                            ),
                                        )}
                                    </div>
                                ) : (
                                    <div
                                        className={styles.compactEmpty}
                                    >
                                        <Check size={18} />

                                        <span>
                      You are caught up.
                    </span>
                                    </div>
                                )}
                            </section>

                            <section
                                className={styles.suggestionsCard}
                            >
                                <div
                                    className={styles.sideHeader}
                                >
                                    <div>
                                        <p>Suggested</p>
                                        <h2>People you may know</h2>
                                    </div>

                                    <GraduationCap size={19} />
                                </div>

                                {visibleRecommendations.length >
                                0 ? (
                                    <>
                                        <div
                                            className={
                                                styles.suggestionList
                                            }
                                        >
                                            {visibleRecommendations.map(
                                                (recommendation) => (
                                                    <SuggestionRow
                                                        key={
                                                            recommendation.id
                                                        }
                                                        recommendation={
                                                            recommendation
                                                        }
                                                        busy={busyRecommendationIds.has(
                                                            recommendation.id,
                                                        )}
                                                        onAdd={() =>
                                                            void sendBuddyRequest(
                                                                recommendation.id,
                                                            )
                                                        }
                                                    />
                                                ),
                                            )}
                                        </div>

                                        {filteredRecommendations.length >
                                            5 && (
                                                <button
                                                    type="button"
                                                    className={
                                                        styles.showMoreButton
                                                    }
                                                    onClick={() =>
                                                        setShowAllRecommendations(
                                                            (current) =>
                                                                !current,
                                                        )
                                                    }
                                                >
                                                    {showAllRecommendations
                                                        ? "Show fewer"
                                                        : `Show ${
                                                            filteredRecommendations.length -
                                                            5
                                                        } more`}
                                                </button>
                                            )}
                                    </>
                                ) : (
                                    <div
                                        className={styles.suggestionEmpty}
                                    >
                                        <p>
                                            No new course or profile
                                            matches right now.
                                        </p>

                                        <Link href="/sessions">
                                            Explore campus
                                            <ArrowRight size={15} />
                                        </Link>
                                    </div>
                                )}
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

function SummaryItem({
                         icon,
                         value,
                         label,
                     }: {
    icon: ReactNode;
    value: number;
    label: string;
}) {
    return (
        <div className={styles.summaryItem}>
      <span className={styles.summaryIcon}>
        {icon}
      </span>

            <div>
                <strong>{value}</strong>
                <span>{label}</span>
            </div>
        </div>
    );
}

function BuddyRow({
                      buddy,
                      liveStatus,
                      currentTime,
                  }: {
    buddy: BuddyProfile;
    liveStatus: LiveStatus | null;
    currentTime: number;
}) {
    return (
        <article
            className={[
                styles.buddyRow,
                liveStatus
                    ? styles.buddyRowLive
                    : "",
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <div className={styles.avatar}>
                <SafeAvatar
                    src={buddy.avatar_url}
                    name={buddy.name}
                />
            </div>

            <div className={styles.buddyIdentity}>
                <div className={styles.buddyTopline}>
                    <h3>
                        {buddy.name || "Campus student"}
                    </h3>

                    <span
                        className={
                            liveStatus
                                ? styles.liveStatus
                                : styles.offlineStatus
                        }
                    >
            {liveStatus
                ? "Studying now"
                : "Offline"}
          </span>
                </div>

                <p>
                    {[buddy.major, buddy.year]
                            .filter(Boolean)
                            .join(" · ") ||
                        buddy.university ||
                        "Study buddy"}
                </p>

                {liveStatus ? (
                    <div className={styles.liveDetails}>
                        <Link
                            href={`/courses/${encodeURIComponent(
                                liveStatus.course_code,
                            )}`}
                        >
                            <BookOpen size={13} />
                            {liveStatus.course_code}
                        </Link>

                        <span>
              <MapPin size={13} />
                            {liveStatus.location_name}
            </span>

                        <span>
              <Clock3 size={13} />
                            {formatLiveDuration(
                                liveStatus.created_at,
                                currentTime,
                            )}
            </span>
                    </div>
                ) : (
                    <span className={styles.offlineNote}>
            They will appear here when they
            go live.
          </span>
                )}

                {liveStatus?.description?.trim() && (
                    <p className={styles.liveDescription}>
                        {liveStatus.description}
                    </p>
                )}

                {liveStatus?.identification?.trim() && (
                    <p className={styles.identification}>
                        Find them:{" "}
                        {liveStatus.identification}
                    </p>
                )}
            </div>

            <div className={styles.buddyAction}>
                {liveStatus ? (
                    <Link href="/sessions">
                        Find them
                        <ChevronRight size={16} />
                    </Link>
                ) : (
                    <Link
                        href="/sessions"
                        aria-label={`Browse sessions with ${
                            buddy.name || "this buddy"
                        }`}
                    >
                        Sessions
                        <ChevronRight size={16} />
                    </Link>
                )}
            </div>
        </article>
    );
}

function RequestRow({
                        request,
                        busy,
                        onAccept,
                        onDecline,
                    }: {
    request: FriendshipRequest;
    busy: boolean;
    onAccept: () => void;
    onDecline: () => void;
}) {
    return (
        <article className={styles.requestRow}>
            <div className={styles.smallAvatar}>
                <SafeAvatar
                    src={
                        request.requester.avatar_url
                    }
                    name={request.requester.name}
                />
            </div>

            <div className={styles.requestIdentity}>
                <strong>
                    {request.requester.name ||
                        "Campus student"}
                </strong>

                <span>
          {[
                  request.requester.major,
                  request.requester.year,
              ]
                  .filter(Boolean)
                  .join(" · ") ||
              "Student at your university"}
        </span>
            </div>

            <div className={styles.requestActions}>
                <button
                    type="button"
                    className={styles.acceptButton}
                    disabled={busy}
                    onClick={onAccept}
                    aria-label={`Accept ${
                        request.requester.name ||
                        "buddy request"
                    }`}
                >
                    <Check size={15} />
                </button>

                <button
                    type="button"
                    className={styles.declineButton}
                    disabled={busy}
                    onClick={onDecline}
                    aria-label={`Decline ${
                        request.requester.name ||
                        "buddy request"
                    }`}
                >
                    <X size={15} />
                </button>
            </div>
        </article>
    );
}

function SuggestionRow({
                           recommendation,
                           busy,
                           onAdd,
                       }: {
    recommendation: Recommendation;
    busy: boolean;
    onAdd: () => void;
}) {
    return (
        <article
            className={styles.suggestionRow}
        >
            <div className={styles.smallAvatar}>
                <SafeAvatar
                    src={recommendation.avatar_url}
                    name={recommendation.name}
                />
            </div>

            <div
                className={styles.suggestionIdentity}
            >
                <strong>
                    {recommendation.name ||
                        "Campus student"}
                </strong>

                <span>
          {getRecommendationReason(
              recommendation,
          )}
        </span>

                {(recommendation.major ||
                    recommendation.year) && (
                    <small>
                        {[
                            recommendation.major,
                            recommendation.year,
                        ]
                            .filter(Boolean)
                            .join(" · ")}
                    </small>
                )}
            </div>

            <button
                type="button"
                disabled={busy}
                onClick={onAdd}
                aria-label={`Add ${
                    recommendation.name ||
                    "this student"
                } as a study buddy`}
            >
                <UserPlus size={15} />
            </button>
        </article>
    );
}

function BuddiesLoading() {
    return (
        <main
            id="studygrouprr-buddies"
            className={styles.loadingPage}
            role="status"
            aria-live="polite"
        >
            <div className={styles.loadingCard}>
                <strong>
                    Loading your study buddies…
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
