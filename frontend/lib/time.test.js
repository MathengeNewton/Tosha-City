import { describe, it, expect } from "vitest";
import { addDaysYmd, todayYmd, ymdInAppTz } from "./time.js";

describe("time", () => {
  it("todayYmd uses Nairobi calendar at UTC evening", () => {
    expect(ymdInAppTz(new Date("2025-05-04T22:00:00.000Z"))).toBe("2025-05-05");
  });

  it("todayYmd same day before Nairobi rollover", () => {
    expect(ymdInAppTz(new Date("2025-05-04T20:00:00.000Z"))).toBe("2025-05-04");
  });

  it("addDaysYmd shifts days", () => {
    expect(addDaysYmd("2025-05-04", -1)).toBe("2025-05-03");
    expect(addDaysYmd("2025-05-04", 1)).toBe("2025-05-05");
  });

  it("todayYmd returns a valid ISO date string", () => {
    expect(todayYmd()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
