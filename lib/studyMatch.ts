export type MatchUser = {
    id: string;
    major: string | null;
    year: string | null;
    courses: string[];
    liveCourse?: string | null;
};

export function calculateMatchScore(
    currentUser: MatchUser,
    candidate: MatchUser
) {
    let score = 0;

    const sharedCourses = currentUser.courses.filter((course) =>
        candidate.courses.includes(course)
    );

    score += sharedCourses.length * 5;

    if (
        currentUser.major &&
        candidate.major &&
        currentUser.major === candidate.major
    ) {
        score += 3;
    }

    if (
        currentUser.year &&
        candidate.year &&
        currentUser.year === candidate.year
    ) {
        score += 2;
    }

    if (
        currentUser.liveCourse &&
        candidate.liveCourse &&
        currentUser.liveCourse === candidate.liveCourse
    ) {
        score += 4;
    }

    return {
        score,
        sharedCourses,
    };
}