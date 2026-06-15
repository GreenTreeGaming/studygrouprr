export function isEduEmail(
    email?: string | null
): boolean {
    return !!email &&
        email.toLowerCase().endsWith(".edu");
}