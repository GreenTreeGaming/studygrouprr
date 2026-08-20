import { describe, expect, it } from "vitest";
import {
    isValidCourseCode,
    normalizeCourseCode,
} from "./courseValidation";

describe("course code validation", () => {
    it("canonicalizes lower-case course codes with spaces and hyphens before validation", () => {
        const input = "  cs - 101  ";

        expect(normalizeCourseCode(input)).toBe("CS101");
        expect(isValidCourseCode(input)).toBe(true);
    });
});
