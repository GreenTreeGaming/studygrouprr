import { describe, expect, it } from "vitest";
import {
    isValidCourseCode,
    normalizeCourseCode,
} from "./courseValidation";

describe("course validation", () => {
    it("normalizes lowercase spaced and hyphenated course codes before validation", () => {
        const input = " cs- 101 ";

        expect(normalizeCourseCode(input)).toBe("CS101");
        expect(isValidCourseCode(input)).toBe(true);
    });
});
