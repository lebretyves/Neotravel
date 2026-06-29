import { describe, expect, it, vi } from "vitest";

import { getFollowupDelays, resolvePostFollowupOutcome } from "./scheduleFollowups";

describe("followup scheduling rules", () => {
  it("uses J+3 then J+7 for standard quote followups", () => {
    vi.stubEnv("DEMO_FAST_FOLLOWUP", "false");

    const delays = getFollowupDelays({});

    expect(delays.map((delay) => delay.label)).toEqual(["STANDARD_J3", "STANDARD_J7"]);
  });

  it("uses a single J+2 followup for urgent quote followups", () => {
    vi.stubEnv("DEMO_FAST_FOLLOWUP", "false");

    const delays = getFollowupDelays({ isUrgent: true });

    expect(delays.map((delay) => delay.label)).toEqual(["URGENT_J2"]);
  });

  it("closes leads after two unanswered followups", () => {
    expect(resolvePostFollowupOutcome({ sentFollowupsWithoutResponse: 1 })).toBe("PENDING");
    expect(resolvePostFollowupOutcome({ sentFollowupsWithoutResponse: 2 })).toBe("CLOSED");
  });
});
