import { expect, test } from "bun:test";
import { REMINDER_OFFSETS, formatRemaining, getBossLocation, getDueReminderOffsets, getFixedEventTimers, getNextWibOccurrence, getNotifiedReminderTimerId, getReminderNotificationId, parseBossDate, parseBossTimers } from "../src/app.js";

const sample = `📋 All Boss Timers
1. Shuliar - KARAKAZA
⏰ Cooling down
Wednesday, 20 May 2026 08:07
2. Larba - KARAKAZA
⏰ Cooling down
Wednesday, 20 May 2026 08:09
3. Venatus - CORRUPT.XT
⏰ Cooling down
Wednesday, 20 May 2026 08:13`;

test("parses numbered boss cooldown entries", () => {
  const timers = parseBossTimers(sample);
  expect(timers).toHaveLength(3);
  expect(timers.map((timer) => timer.name)).toEqual(["Shuliar", "Larba", "Venatus"]);
  expect(timers[0].world).toBe("KARAKAZA");
  expect(timers[0].location).toBe("Ruins of the War");
  expect(timers[1].location).toBe("Ruins of the War");
  expect(timers[2].location).toBe("Corrupted Basin");
});

test("detects boss locations by name", () => {
  expect(getBossLocation("Ego")).toBe("Ulan Canyon");
  expect(getBossLocation("General Aquleus")).toBe("Tomb of Tyriosa 2F");
  expect(getBossLocation("unknown boss")).toBeNull();
});

test("detects locations for pasted boss names", () => {
  const pastedBosses = new Map([
    ["Ego", "Ulan Canyon"],
    ["Titore", "Deadman's Land Distrik 2F"],
    ["Thymele", "Twilight Hill"],
    ["Venatus", "Corrupted Basin"],
    ["Viorent", "Crescent Lake"],
    ["Libitina", "Volcano Dracas"],
    ["Gareth", "Deadman's Land Distrik 1F"],
    ["Baron", "Battlefield of Templar"],
    ["Dalia", "Twilight Hill"],
    ["Saphirus", "Crescent Lake"],
    ["Undomiel", "Secret Laboratory"],
    ["Livera", "Protector's Ruin"],
    ["Araneo", "Tomb of Tyriosa 1F"],
    ["Neutro", "Desert of the Screaming"],
    ["Amentis", "Land of Glory"],
    ["General", "Tomb of Tyriosa 2F"],
    ["Shuliar", "Ruins of the War"],
    ["Larba", "Ruins of the War"],
    ["Catena", "Deadman's Land Distrik 3F"],
    ["Icaruthia", "Kransia Fallen Wasteland"],
    ["Rakajeth", "Volcano Dracas"],
    ["Asta", "Silvergrass Field"],
    ["Ordo", "Silvergrass Field"],
    ["Secreta", "Silvergrass Field"],
    ["Supore", "Silvergrass Field"]
  ]);

  for (const [bossName, location] of pastedBosses) {
    expect(getBossLocation(bossName)).toBe(location);
  }
});

test("sorts timers by target time", () => {
  const timers = parseBossTimers(`2. Later - A
Wednesday, 20 May 2026 08:30
1. Earlier - B
Wednesday, 20 May 2026 08:05`);
  expect(timers.map((timer) => timer.name)).toEqual(["Earlier", "Later"]);
});

test("rejects invalid dates", () => {
  expect(parseBossDate("Wednesday, 32 May 2026 08:07")).toBeNull();
  expect(parseBossDate("Wednesday, 20 Wrong 2026 08:07")).toBeNull();
});

test("formats countdowns and ready state", () => {
  const now = new Date(2026, 4, 20, 8, 0, 0).getTime();
  expect(formatRemaining(new Date(2026, 4, 20, 8, 7, 0).getTime(), now)).toBe("00:07:00");
  expect(formatRemaining(now - 1000, now)).toBe("READY");
});

test("generates fixed event timers from WIB schedules", () => {
  const now = Date.UTC(2026, 4, 18, 12, 20); // Monday 19:20 WIB
  const events = getFixedEventTimers(now);
  const soloArena = events.find((timer) => timer.name === "Solo Arena");
  const worldBoss = events.find((timer) => timer.id.startsWith("fixed:world-boss-1900"));

  expect(events).toHaveLength(6);
  expect(soloArena.location).toBe("19:30-20:30 WIB");
  expect(soloArena.targetTime).toBe(Date.UTC(2026, 4, 18, 12, 30));
  expect(soloArena.endTime).toBe(Date.UTC(2026, 4, 18, 13, 30));
  expect(worldBoss.location).toBe("19:00 WIB");
  expect(worldBoss.targetTime).toBe(Date.UTC(2026, 4, 19, 12, 0));
});

test("keeps duration events on the current occurrence until their WIB end time", () => {
  const schedule = { days: [1, 3, 5], start: "19:30", end: "20:30" };
  const duringEvent = Date.UTC(2026, 4, 18, 12, 45); // Monday 19:45 WIB
  const afterEvent = Date.UTC(2026, 4, 18, 13, 31); // Monday 20:31 WIB

  expect(getNextWibOccurrence(schedule, duringEvent).startTime).toBe(Date.UTC(2026, 4, 18, 12, 30));
  expect(getNextWibOccurrence(schedule, afterEvent).startTime).toBe(Date.UTC(2026, 4, 20, 12, 30));
});

test("tracks separate 10-minute and 5-minute reminder notifications per timer", () => {
  const timerId = "fixed:world-boss-1900:2026-05-19";
  const tenMinuteId = getReminderNotificationId(timerId, REMINDER_OFFSETS[0]);
  const fiveMinuteId = getReminderNotificationId(timerId, REMINDER_OFFSETS[1]);

  expect(REMINDER_OFFSETS.map((offset) => offset.label)).toEqual(["10-minute", "5-minute"]);
  expect(tenMinuteId).not.toBe(fiveMinuteId);
  expect(getNotifiedReminderTimerId(tenMinuteId)).toBe(timerId);
  expect(getDueReminderOffsets(9 * 60 * 1000, timerId, []).map((offset) => offset.label)).toEqual(["10-minute"]);
  expect(getDueReminderOffsets(9 * 60 * 1000, timerId, [timerId])).toEqual([]);
  expect(getDueReminderOffsets(4 * 60 * 1000, timerId, [tenMinuteId]).map((offset) => offset.label)).toEqual(["5-minute"]);
  expect(getDueReminderOffsets(4 * 60 * 1000, timerId, [timerId]).map((offset) => offset.label)).toEqual(["5-minute"]);
  expect(getDueReminderOffsets(4 * 60 * 1000, timerId, [tenMinuteId, fiveMinuteId])).toEqual([]);
});
