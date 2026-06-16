export function normalizeCourseCode(input: string) {
    return input
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");
}

export const COURSE_CODE_REGEX =
    /^[A-Z]{2,5}\d{3,4}$/;

export function isValidCourseCode(
    input: string
) {
    return COURSE_CODE_REGEX.test(
        normalizeCourseCode(input)
    );
}