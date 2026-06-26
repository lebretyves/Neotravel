import { describe, expect, it } from "vitest";

import {
  PAX_MAX,
  isPastDate,
  isPaxBelowMin,
  isPaxOverMax,
  isReturnBeforeDeparture,
  isValidDateString,
} from "./leadValidators";

const today = new Date("2026-06-26T12:00:00");

describe("isValidDateString", () => {
  it("accepts a well-formed date", () => {
    expect(isValidDateString("2027-06-11")).toBe(true);
  });

  it("rejects empty / null / wrong shape", () => {
    expect(isValidDateString(null)).toBe(false);
    expect(isValidDateString("")).toBe(false);
    expect(isValidDateString("06-11")).toBe(false);
    expect(isValidDateString("11 juin")).toBe(false);
  });

  it("rejects impossible calendar dates", () => {
    expect(isValidDateString("2027-02-30")).toBe(false);
    expect(isValidDateString("2027-13-01")).toBe(false);
  });
});

describe("isPastDate", () => {
  it("flags a date before today", () => {
    expect(isPastDate("2025-06-11", today)).toBe(true);
  });

  it("does not flag today or the future", () => {
    expect(isPastDate("2026-06-26", today)).toBe(false);
    expect(isPastDate("2027-01-01", today)).toBe(false);
  });

  it("returns false for invalid input (handled elsewhere)", () => {
    expect(isPastDate("pas une date", today)).toBe(false);
  });
});

describe("isReturnBeforeDeparture", () => {
  it("flags a return earlier than departure", () => {
    expect(isReturnBeforeDeparture("2027-06-11", "2027-06-10")).toBe(true);
  });

  it("accepts return on/after departure", () => {
    expect(isReturnBeforeDeparture("2027-06-11", "2027-06-12")).toBe(false);
    expect(isReturnBeforeDeparture("2027-06-11", "2027-06-11")).toBe(false);
  });

  it("returns false if either date is invalid", () => {
    expect(isReturnBeforeDeparture("2027-06-11", null)).toBe(false);
    expect(isReturnBeforeDeparture(null, "2027-06-10")).toBe(false);
  });
});

describe("isPaxBelowMin", () => {
  it("flags 0, negatives and non-integers", () => {
    expect(isPaxBelowMin(0)).toBe(true);
    expect(isPaxBelowMin(-3)).toBe(true);
    expect(isPaxBelowMin(4.5)).toBe(true);
  });

  it("accepts a valid count and absent value", () => {
    expect(isPaxBelowMin(45)).toBe(false);
    expect(isPaxBelowMin(null)).toBe(false);
  });
});

describe("isPaxOverMax", () => {
  it("flags counts above the ceiling", () => {
    expect(isPaxOverMax(PAX_MAX + 1)).toBe(true);
    expect(isPaxOverMax(95)).toBe(true);
  });

  it("accepts counts at or below the ceiling and absent value", () => {
    expect(isPaxOverMax(PAX_MAX)).toBe(false);
    expect(isPaxOverMax(45)).toBe(false);
    expect(isPaxOverMax(null)).toBe(false);
  });
});
