import { describe, expect, it } from "vitest";
import {
  BOOKING_ACTION_STATUS,
  buildBookingQuickReply,
  resolveStatusForAction,
} from "./status-actions";

describe("booking status actions", () => {
  it("maps actions to statuses", () => {
    expect(resolveStatusForAction("confirm")).toBe("confirmed");
    expect(resolveStatusForAction("reschedule")).toBe("rescheduled");
    expect(resolveStatusForAction("cancel")).toBe("cancelled");
    expect(resolveStatusForAction("complete")).toBe("completed");
    expect(resolveStatusForAction("reply")).toBeNull();
    expect(BOOKING_ACTION_STATUS.confirm).toBe("confirmed");
  });

  it("builds confirm preset with customer name and slot", () => {
    const reply = buildBookingQuickReply(
      "confirm",
      { name: "سارة", date: "2026-08-10", time: "14:30:00" },
      "Boutique"
    );
    expect(reply.subject).toMatch(/تأكيد/);
    expect(reply.body).toContain("سارة");
    expect(reply.body).toContain("14:30");
    expect(reply.body).toContain("Boutique");
  });
});
