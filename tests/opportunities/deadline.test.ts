import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  daysUntilDeadline,
  isDeadlinePast,
  isDeadlineUrgent,
  sortByDeadline,
  todayDate,
} from "@/lib/opportunities/deadline";

describe("deadline helpers", () => {
  test("a deadline before today has passed", () => {
    assert.equal(isDeadlinePast("2020-01-01"), true);
  });

  test("a deadline today has not passed", () => {
    assert.equal(isDeadlinePast(todayDate()), false);
  });

  test("a future deadline has not passed", () => {
    assert.equal(isDeadlinePast("2999-12-31"), false);
  });

  test("a missing deadline is not a passed deadline", () => {
    // "No deadline given" is different from "the deadline has passed" — the
    // first one is still open for applications.
    assert.equal(isDeadlinePast(null), false);
    assert.equal(isDeadlinePast(undefined), false);
    assert.equal(isDeadlinePast(""), false);
  });

  test("days until deadline counts whole days", () => {
    const now = new Date("2026-05-10T12:00:00Z");
    assert.equal(daysUntilDeadline("2026-05-10", now), 0);
    assert.equal(daysUntilDeadline("2026-05-11", now), 1);
    assert.equal(daysUntilDeadline("2026-05-13", now), 3);
    assert.equal(daysUntilDeadline("2026-05-09", now), -1);
    assert.equal(daysUntilDeadline(null, now), null);
  });

  test("only deadlines inside three days are urgent", () => {
    const now = new Date("2026-05-10T12:00:00Z");
    assert.equal(isDeadlineUrgent("2026-05-12", now), true);
    assert.equal(isDeadlineUrgent("2026-05-13", now), true);
    assert.equal(isDeadlineUrgent("2026-05-14", now), false);
    assert.equal(isDeadlineUrgent("2026-05-09", now), false);
    assert.equal(isDeadlineUrgent(null, now), false);
  });

  test("sorting by deadline puts the soonest first and undated ones last", () => {
    const sorted = sortByDeadline([
      { id: "c", deadline: "2026-07-01" },
      { id: "a", deadline: "2026-06-01" },
      { id: "d", deadline: null },
      { id: "b", deadline: "2026-08-01" },
    ]);

    assert.deepEqual(
      sorted.map((row) => row.id),
      ["a", "c", "b", "d"],
    );
  });

  test("sorting does not mutate the original array", () => {
    const original = [
      { id: "b", deadline: "2026-06-01" },
      { id: "a", deadline: "2026-05-01" },
    ];
    sortByDeadline(original);
    assert.equal(original[0].id, "b");
  });
});
