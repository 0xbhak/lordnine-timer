const STORAGE_KEY = "lordnine-boss-timers";
const TIMERS_API_PATH = "/api/timers";
const SYNC_INTERVAL_MS = 15 * 1000;
export const REMINDER_OFFSETS = Object.freeze([
  Object.freeze({ minutes: 10, label: "10-minute", ms: 10 * 60 * 1000 }),
  Object.freeze({ minutes: 5, label: "5-minute", ms: 5 * 60 * 1000 })
]);
const NOTIFIED_REMINDERS_KEY = `${STORAGE_KEY}-notified-reminders`;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const FIXED_EVENT_SCHEDULES = [
  { id: "solo-arena", name: "Solo Arena", world: "Scheduled Event", days: [1, 3, 5], start: "19:30", end: "20:30" },
  { id: "coop-arena", name: "Co-op Arena", world: "Scheduled Event", days: [2, 4, 6], start: "19:30", end: "20:30" },
  { id: "guild-round", name: "Guild Round", world: "Guild Event", days: [5, 6], start: "19:25", end: "20:00" },
  { id: "guild-boss-monstercorp", name: "Guild Boss MonsterCorp", world: "Guild Event", days: [6], start: "20:00" },
  { id: "world-boss-1000", name: "World Boss", world: "Scheduled Event", days: [0, 1, 2, 3, 4, 5, 6], start: "10:00" },
  { id: "world-boss-1900", name: "World Boss", world: "Scheduled Event", days: [0, 1, 2, 3, 4, 5, 6], start: "19:00" }
];

const SAMPLE_INPUT = `📋 All Boss Timers
1. Shuliar - KARAKAZA
⏰ Cooling down
Wednesday, 20 May 2026 08:07
2. Larba - KARAKAZA
⏰ Cooling down
Wednesday, 20 May 2026 08:09
3. Venatus - CORRUPT.XT
⏰ Cooling down
Wednesday, 20 May 2026 08:13`;

const MONTHS = new Map([
  ["january", 0], ["jan", 0],
  ["february", 1], ["feb", 1],
  ["march", 2], ["mar", 2],
  ["april", 3], ["apr", 3],
  ["may", 4],
  ["june", 5], ["jun", 5],
  ["july", 6], ["jul", 6],
  ["august", 7], ["aug", 7],
  ["september", 8], ["sep", 8], ["sept", 8],
  ["october", 9], ["oct", 9],
  ["november", 10], ["nov", 10],
  ["december", 11], ["dec", 11]
]);

const BOSS_LOCATIONS = new Map([
  ["clemantis", "Corrupted Basin"],
  ["venatus", "Corrupted Basin"],
  ["viorent", "Crescent Lake"],
  ["shapirus", "Crescent Lake"],
  ["saphirus", "Crescent Lake"],
  ["thymele", "Twilight Hill"],
  ["dalia", "Twilight Hill"],
  ["lady dalia", "Twilight Hill"],
  ["libitina", "Volcano Dracas"],
  ["rakajeth", "Volcano Dracas"],
  ["ego", "Ulan Canyon"],
  ["livera", "Protector's Ruin"],
  ["neutro", "Desert of the Screaming"],
  ["araneo", "Tomb of Tyriosa 1F"],
  ["general", "Tomb of Tyriosa 2F"],
  ["general aquleus", "Tomb of Tyriosa 2F"],
  ["milavy", "Tomb of Tyriosa 3F"],
  ["amentis", "Land of Glory"],
  ["baron braudmore", "Battlefield of Templar"],
  ["baron", "Battlefield of Templar"],
  ["ringor", "Battlefield of Templar"],
  ["duplican", "Plateu of Revolution"],
  ["wannitas", "Plateu of Revolution"],
  ["metus", "Plateu of Revolution"],
  ["shuliar", "Ruins of the War"],
  ["larba", "Ruins of the War"],
  ["chaiflok", "Silvergrass Field"],
  ["secreta", "Silvergrass Field"],
  ["ordo", "Silvergrass Field"],
  ["asta", "Silvergrass Field"],
  ["supore", "Silvergrass Field"],
  ["benji", "Barbas"],
  ["gareth", "Deadman's Land Distrik 1F"],
  ["titore", "Deadman's Land Distrik 2F"],
  ["catena", "Deadman's Land Distrik 3F"],
  ["nevaeh", "Kransia Fallen Wasteland"],
  ["icaruthia", "Kransia Fallen Wasteland"],
  ["motti", "Kransia Fallen Wasteland"],
  ["lucus", "Kransia Heart of Volcanca"],
  ["roderick", "Garbana 1F"],
  ["auraq", "Garbana 2F"],
  ["tumier", "Garbana 3F"],
  ["undomiel", "Secret Laboratory"]
]);

export function parseBossTimers(input) {
  const lines = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const timers = [];

  for (let index = 0; index < lines.length; index += 1) {
    const bossMatch = lines[index].match(/^\d+[.)]\s*(.+?)\s+-\s+(.+)$/);
    if (!bossMatch) continue;

    const dateLine = findDateLine(lines, index + 1);
    if (!dateLine) continue;

    const targetDate = parseBossDate(dateLine);
    if (!targetDate) continue;

    const name = bossMatch[1].trim();
    const world = bossMatch[2].trim();

    timers.push({
      id: `${bossMatch[1]}-${bossMatch[2]}-${targetDate.getTime()}`,
      name,
      world,
      location: getBossLocation(name),
      targetTime: targetDate.getTime()
    });
  }

  return timers.sort((left, right) => left.targetTime - right.targetTime || left.name.localeCompare(right.name));
}

function findDateLine(lines, startIndex) {
  for (let index = startIndex; index < Math.min(lines.length, startIndex + 4); index += 1) {
    if (parseBossDate(lines[index])) return lines[index];
  }
  return "";
}

export function parseBossDate(value) {
  const cleaned = value.replace(/^[^,]+,\s*/, "");
  const match = cleaned.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = MONTHS.get(match[2].toLowerCase());
  const year = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (month === undefined || day < 1 || day > 31 || hour > 23 || minute > 59) return null;

  const date = new Date(year, month, day, hour, minute, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
  return date;
}

export function formatRemaining(targetTime, now = Date.now()) {
  const diff = targetTime - now;
  if (diff <= 0) return "READY";

  const totalSeconds = Math.ceil(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const time = [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
  return days > 0 ? `${days}d ${time}` : time;
}

export function getBossLocation(name) {
  return BOSS_LOCATIONS.get(name.trim().toLowerCase()) || null;
}

export function getFixedEventTimers(now = Date.now()) {
  return FIXED_EVENT_SCHEDULES.map((schedule) => {
    const occurrence = getNextWibOccurrence(schedule, now);
    const range = schedule.end ? `${schedule.start}-${schedule.end} WIB` : `${schedule.start} WIB`;

    return {
      id: `fixed:${schedule.id}:${occurrence.startTime}`,
      name: schedule.name,
      world: schedule.world,
      location: range,
      targetTime: occurrence.startTime,
      endTime: occurrence.endTime,
      type: "fixed-event"
    };
  });
}

export function getNextWibOccurrence(schedule, now = Date.now()) {
  const wibNow = new Date(now + WIB_OFFSET_MS);
  const todayWibMidnight = Date.UTC(wibNow.getUTCFullYear(), wibNow.getUTCMonth(), wibNow.getUTCDate());

  for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
    const candidateDay = new Date(todayWibMidnight + dayOffset * DAY_MS);
    if (!schedule.days.includes(candidateDay.getUTCDay())) continue;

    const startTime = getWibTimestamp(candidateDay, schedule.start);
    const endTime = schedule.end ? getWibTimestamp(candidateDay, schedule.end) : startTime;
    const expireTime = schedule.end ? endTime : startTime + 3600 * 1000;
    if (now < expireTime) return { startTime, endTime };
  }

  const fallbackDay = new Date(todayWibMidnight + 7 * DAY_MS);
  const startTime = getWibTimestamp(fallbackDay, schedule.start);
  return { startTime, endTime: schedule.end ? getWibTimestamp(fallbackDay, schedule.end) : startTime };
}

export function mergeTimers(bossTimers, fixedTimers) {
  return [...bossTimers, ...fixedTimers].sort((left, right) => left.targetTime - right.targetTime || left.name.localeCompare(right.name));
}

function getWibTimestamp(day, time) {
  const [hour, minute] = time.split(":").map(Number);
  return Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour, minute) - WIB_OFFSET_MS;
}

function initApp() {
  const input = document.querySelector("#timer-input");
  const parseButton = document.querySelector("#parse-button");
  const clearButton = document.querySelector("#clear-button");
  const pasteButton = document.querySelector("#paste-button");
  const sampleButton = document.querySelector("#load-sample");
  const status = document.querySelector("#parse-status");
  const list = document.querySelector("#timer-list");
  const emptyState = document.querySelector("#empty-state");
  const timerCount = document.querySelector("#timer-count");
  const currentTime = document.querySelector("#current-time");
  const notificationButton = document.querySelector("#notification-button");
  const testNotificationButton = document.querySelector("#test-notification-button");
  const installButton = document.querySelector("#install-button");
  const reminderStatus = document.querySelector("#reminder-status");
  const syncStatus = document.querySelector("#sync-status");
  const lastUpdate = document.querySelector("#last-update");
  const pinModal = document.querySelector("#pin-modal");
  const pinForm = document.querySelector("#pin-form");
  const pinModalTitle = document.querySelector("#pin-modal-title");
  const pinModalCopy = document.querySelector("#pin-modal-copy");
  const pinInput = document.querySelector("#pin-input");
  const pinFeedback = document.querySelector("#pin-modal-feedback");
  const pinConfirm = document.querySelector("#pin-confirm");
  const pinCancelControls = pinModal.querySelectorAll("[data-pin-cancel]");
  const toast = document.querySelector("#app-toast");
  const toastTitle = document.querySelector("#app-toast-title");
  const toastMessage = document.querySelector("#app-toast-message");
  let timers = loadTimers();
  let notifiedReminderIds = loadNotifiedReminderIds();
  let deferredInstallPrompt = null;
  let activePinRequest = null;
  let pendingWriteAction = null;
  let toastTimeout = null;
  let hasLoadedGlobalTimers = false;
  let lastGlobalUpdatedAt = null;

  input.value = localStorage.getItem(`${STORAGE_KEY}-input`) || "";
  updateNotificationControls();
  updateSyncStatus("pending", "Sync pending", lastGlobalUpdatedAt);
  render();
  refreshGlobalTimers();
  setInterval(render, 1000);
  setInterval(refreshGlobalTimers, SYNC_INTERVAL_MS);

  parseButton.addEventListener("click", async () => {
    const parsedTimers = parseBossTimers(input.value);
    if (parsedTimers.length === 0) {
      setStatus("No valid boss timers found. Check the pasted format.", "error");
      return;
    }

    const pin = await requestGlobalWritePin("Set shared timers");
    if (!pin) return;

    timers = parsedTimers;
    pendingWriteAction = "set";
    setStatus(`Set ${timers.length} timer${timers.length === 1 ? "" : "s"}. Syncing globally...`);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
    localStorage.setItem(`${STORAGE_KEY}-input`, input.value);
    pruneNotifiedReminders();
    render();
    await saveGlobalTimers(pin);
  });

  clearButton.addEventListener("click", async () => {
    const pin = await requestGlobalWritePin("Clear shared timers");
    if (!pin) return;

    timers = [];
    pendingWriteAction = "clear";
    input.value = "";
    setStatus("Timers cleared. Syncing globally...");
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(`${STORAGE_KEY}-input`);
    notifiedReminderIds = [];
    saveNotifiedReminderIds();
    render();
    await saveGlobalTimers(pin);
  });

  notificationButton.addEventListener("click", async () => {
    if (!isNotificationSupported()) {
      setReminderStatus("Notifications are not supported in this browser.", true);
      updateNotificationControls();
      return;
    }

    if (!window.isSecureContext) {
      setReminderStatus("Deploy over HTTPS before enabling reminders on mobile or desktop.", true);
      return;
    }

    if (Notification.permission === "granted") {
      setReminderStatus("Reminders are already enabled. Keep the app open for 10-minute and 5-minute warnings.", false);
      updateNotificationControls();
      return;
    }

    if (Notification.permission === "denied") {
      setReminderStatus("Notifications are blocked. Enable them in this browser's site settings.", true);
      updateNotificationControls();
      return;
    }

    const permission = await Notification.requestPermission();
    setReminderStatus(
      permission === "granted"
        ? "Reminders enabled. You will receive 10-minute and 5-minute warnings before each active timer ends."
        : "Notifications were not enabled. Reminders cannot alert you yet.",
      permission !== "granted"
    );
    updateNotificationControls();
  });

  testNotificationButton.addEventListener("click", async () => {
    if (!canShowNotifications()) {
      updateNotificationControls();
      return;
    }

    try {
      await showReminderNotification({ id: `test-${Date.now()}`, name: "Test reminder", world: "Lordnine Timer", targetTime: Date.now() + REMINDER_OFFSETS[0].ms }, REMINDER_OFFSETS[0]);
      setReminderStatus("Test reminder sent. If you did not see it, check OS/browser notification settings for this site.", false);
    } catch (error) {
      setReminderStatus("Test reminder failed. Use HTTPS, allow site notifications, and reload the installed PWA after deploy.", true);
    }
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installButton.hidden = false;
    installButton.disabled = false;
    installButton.textContent = "Install app";
  });

  installButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      setReminderStatus("Browser install prompt is unavailable here. Use the browser menu to install this app.", false);
      return;
    }

    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    if (choice.outcome === "accepted") {
      installButton.textContent = "Installed";
      installButton.disabled = true;
    }
    setReminderStatus(
      choice.outcome === "accepted" ? "App installed. Open it like a normal app for the best reminder experience." : "Install was dismissed. You can install later from the browser menu.",
      false
    );
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    installButton.textContent = "Installed";
    installButton.disabled = true;
    setReminderStatus("App installed. Enable reminders here if you have not already.", false);
  });

  pasteButton.addEventListener("click", async () => {
    if (!navigator.clipboard || typeof navigator.clipboard.readText !== "function") {
      setStatus("Clipboard paste is unavailable here. Focus the text box and paste manually.", "error");
      input.focus();
      return;
    }

    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText) {
        setStatus("Clipboard is empty. Copy boss data, then try Paste again.", "error");
        input.focus();
        return;
      }

      input.value = clipboardText;
      localStorage.setItem(`${STORAGE_KEY}-input`, input.value);
      setStatus("Pasted clipboard text. Tap Set timers.");
    } catch (error) {
      setStatus("Clipboard access was blocked. Focus the text box and paste manually.", "error");
      input.focus();
    }
  });

  sampleButton.addEventListener("click", () => {
    input.value = SAMPLE_INPUT;
    setStatus("Sample loaded. Tap Set timers.");
  });

  async function refreshGlobalTimers() {
    try {
      const response = await fetch(TIMERS_API_PATH, { cache: "no-store" });
      if (!response.ok) throw new Error(`Sync failed with ${response.status}`);

      const state = await response.json();
      timers = hydrateTimers(Array.isArray(state.timers) ? state.timers : []);
      lastGlobalUpdatedAt = typeof state.updatedAt === "string" ? state.updatedAt : null;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
      pruneNotifiedReminders();
      updateSyncStatus("synced", "Synced", lastGlobalUpdatedAt);
      render();

      if (!hasLoadedGlobalTimers) {
        setStatus(timers.length > 0 ? `Loaded ${timers.length} shared timer${timers.length === 1 ? "" : "s"}.` : "No shared timers yet. Paste on any device to sync globally.");
      }
      hasLoadedGlobalTimers = true;
    } catch (error) {
      if (!hasLoadedGlobalTimers) {
        setStatus("Global sync is unavailable. Using this device's saved timers for now.", "error");
      }
      updateSyncStatus("failed", "Sync failed", lastGlobalUpdatedAt);
    }
  }

  async function saveGlobalTimers(pin) {
    try {
      const response = await fetch(TIMERS_API_PATH, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ timers, pin })
      });
      if (response.status === 403) throw new Error("Invalid PIN");
      if (!response.ok) throw new Error(`Sync failed with ${response.status}`);

      const state = await response.json();
      timers = hydrateTimers(Array.isArray(state.timers) ? state.timers : timers);
      lastGlobalUpdatedAt = typeof state.updatedAt === "string" ? state.updatedAt : null;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
      setStatus(timers.length > 0 ? `Synced ${timers.length} timer${timers.length === 1 ? "" : "s"} to all devices.` : "Shared timers cleared on all devices.", "success");
      showToast(
        "success",
        pendingWriteAction === "clear" ? "Clear success" : "Set timers success",
        pendingWriteAction === "clear" ? "Shared timers were cleared on all devices." : "Shared timers were saved on all devices."
      );
      updateSyncStatus("synced", "Synced", lastGlobalUpdatedAt);
      hasLoadedGlobalTimers = true;
      render();
    } catch (error) {
      setStatus(error.message === "Invalid PIN" ? "Wrong PIN. Shared timers were not changed." : "Could not sync globally. This device kept the latest timers locally.", "error");
      if (error.message === "Invalid PIN") showToast("error", "PIN is wrong", "Nothing was saved or cleared.");
      updateSyncStatus("failed", error.message === "Invalid PIN" ? "PIN failed" : "Sync failed", lastGlobalUpdatedAt);
    } finally {
      pendingWriteAction = null;
    }
  }

  function render() {
    const now = Date.now();
    const visibleTimers = mergeTimers(timers, getFixedEventTimers(now));
    currentTime.textContent = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(now);
    checkReminderNotifications(now, visibleTimers);
    timerCount.textContent = `${visibleTimers.length} timer${visibleTimers.length === 1 ? "" : "s"} including fixed events`;
    emptyState.hidden = visibleTimers.length > 0;
    list.replaceChildren(...visibleTimers.map((timer) => createTimerItem(timer, now)));
  }

  function checkReminderNotifications(now, activeTimers) {
    if (!isNotificationSupported() || Notification.permission !== "granted") return;

    for (const timer of activeTimers) {
      const remaining = timer.targetTime - now;
      const dueOffsets = getDueReminderOffsets(remaining, timer.id, notifiedReminderIds);

      for (const offset of dueOffsets) {
        notifiedReminderIds.push(getReminderNotificationId(timer.id, offset));
        saveNotifiedReminderIds();
        showReminderNotification(timer, offset).catch((error) => {
          console.warn("Unable to show reminder notification", error);
          setReminderStatus(`${offset.label} warning was due, but the browser could not show the notification.`, true);
        });
      }
    }
  }

  async function showReminderNotification(timer, offset = REMINDER_OFFSETS[0]) {
    const title = `${timer.name}: ${offset.label} warning`;
    const body = `${timer.world} is ready at ${new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(timer.targetTime)}.`;
    const options = {
      body,
      tag: `lordnine-reminder-${getReminderNotificationId(timer.id, offset)}`,
      renotify: true,
      requireInteraction: true,
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url: "/" }
    };

    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
      setReminderStatus(`${offset.label} warning sent for ${timer.name}.`, false);
      return;
    }

    new Notification(title, options);
    setReminderStatus(`${offset.label} warning sent for ${timer.name}.`, false);
  }

  function updateNotificationControls() {
    if (!isNotificationSupported()) {
      notificationButton.disabled = true;
      testNotificationButton.disabled = true;
      notificationButton.textContent = "Reminders unavailable";
      setReminderStatus("Notifications are not supported in this browser.", true);
      return;
    }

    if (!window.isSecureContext) {
      notificationButton.disabled = true;
      testNotificationButton.disabled = true;
      setReminderStatus("Notifications need HTTPS on VPS. Localhost works, but a deployed IP/HTTP URL will not.", true);
      return;
    }

    notificationButton.disabled = Notification.permission === "denied";
    testNotificationButton.disabled = Notification.permission !== "granted";
    notificationButton.textContent = Notification.permission === "granted" ? "Reminders enabled" : "Enable reminders";
    if (Notification.permission === "granted") {
      setReminderStatus("Reminders are enabled. Use Test reminder after VPS deploy; keep the app/PWA running for 10-minute and 5-minute warnings.", false);
    } else if (Notification.permission === "denied") {
      setReminderStatus("Notifications are blocked. Enable them in site settings to receive reminders.", true);
    }
  }

  function canShowNotifications() {
    if (!isNotificationSupported()) {
      setReminderStatus("Notifications are not supported in this browser.", true);
      return false;
    }

    if (!window.isSecureContext) {
      setReminderStatus("Notifications need HTTPS on VPS. Open the app from a valid HTTPS domain, not plain HTTP/IP.", true);
      return false;
    }

    if (Notification.permission !== "granted") {
      setReminderStatus("Enable reminders first, then run Test reminder.", true);
      return false;
    }

    return true;
  }

  function setReminderStatus(message, isError) {
    reminderStatus.textContent = message;
    reminderStatus.classList.toggle("error", isError);
  }

  function setStatus(message, kind = "neutral") {
    status.textContent = message;
    status.classList.toggle("error", kind === "error");
    status.classList.toggle("success", kind === "success");
  }

  function showToast(kind, title, message) {
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    toast.className = `app-toast ${kind}`;
    toast.hidden = false;
    toastTimeout = setTimeout(() => {
      toast.hidden = true;
      toastTimeout = null;
    }, 4200);
  }

  function requestGlobalWritePin(action) {
    if (activePinRequest) return activePinRequest;

    const focusTarget = document.activeElement && typeof document.activeElement.focus === "function" ? document.activeElement : null;
    const isClearAction = action.toLowerCase().includes("clear");
    pinModalTitle.textContent = action;
    pinModalCopy.textContent = isClearAction
      ? "Enter the shared PIN before clearing timers on this device and across synced devices."
      : "Enter the shared PIN before saving these timers across synced devices.";
    pinConfirm.textContent = isClearAction ? "Clear timers" : "Set timers";
    pinInput.value = "";
    pinFeedback.textContent = "";
    pinFeedback.classList.remove("error");
    pinModal.hidden = false;
    document.body.classList.add("modal-open");
    pinInput.focus();

    activePinRequest = new Promise((resolve) => {
      let isSettled = false;

      const finish = (pin) => {
        if (isSettled) return;
        isSettled = true;
        pinForm.removeEventListener("submit", handleSubmit);
        pinModal.removeEventListener("keydown", handleKeydown);
        for (const control of pinCancelControls) control.removeEventListener("click", handleCancel);
        pinModal.hidden = true;
        document.body.classList.remove("modal-open");
        activePinRequest = null;
        if (focusTarget && focusTarget.isConnected) focusTarget.focus();
        resolve(pin);
      };

      const handleCancel = () => {
        setStatus("Shared timer change cancelled.");
        finish(null);
      };

      const handleKeydown = (event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        handleCancel();
      };

      const handleSubmit = (event) => {
        event.preventDefault();
        const pin = pinInput.value.trim();
        
        if (!pin) {
          pinInput.focus();
          return;
        }

        finish(pin);
      };

      pinForm.addEventListener("submit", handleSubmit);
      pinModal.addEventListener("keydown", handleKeydown);
      for (const control of pinCancelControls) control.addEventListener("click", handleCancel);
    });

    return activePinRequest;
  }

  function updateSyncStatus(kind, label, updatedAt) {
    syncStatus.textContent = label;
    syncStatus.className = `sync-pill sync-${kind}`;
    lastUpdate.textContent = updatedAt ? `Last update: ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(updatedAt))}` : "Last update: never";
  }

  function pruneNotifiedReminders() {
    const activeIds = new Set(mergeTimers(timers, getFixedEventTimers(Date.now())).map((timer) => timer.id));
    notifiedReminderIds = notifiedReminderIds.filter((id) => activeIds.has(getNotifiedReminderTimerId(id)));
    saveNotifiedReminderIds();
  }

  function saveNotifiedReminderIds() {
    localStorage.setItem(NOTIFIED_REMINDERS_KEY, JSON.stringify(notifiedReminderIds));
  }
}

function createTimerItem(timer, now) {
  const item = document.createElement("li");
  item.className = `timer-item${timer.targetTime <= now ? " ready" : ""}`;

  const details = document.createElement("div");
  const title = document.createElement("p");
  title.className = "timer-name";
  title.textContent = timer.name;
  if (timer.type === "fixed-event") {
    const badge = document.createElement("span");
    badge.className = "event-badge";
    badge.textContent = "Fixed";
    title.append(" ", badge);
  }
  const world = document.createElement("span");
  world.className = "timer-world";
  world.textContent = timer.world;
  const meta = document.createElement("div");
  meta.className = "timer-meta";
  meta.append(world);
  if (timer.location) {
    const location = document.createElement("span");
    location.className = "timer-location";
    location.textContent = timer.location;
    meta.append(location);
  }
  const date = document.createElement("p");
  date.className = "timer-date";
  date.textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(timer.targetTime);
  details.append(title, meta, date);

  const countdown = document.createElement("strong");
  countdown.className = "countdown";
  countdown.textContent = formatRemaining(timer.targetTime, now);

  item.append(details, countdown);
  return item;
}

function loadTimers() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return hydrateTimers(parsed);
  } catch {
    return [];
  }
}

function hydrateTimers(value) {
  const now = Date.now();
  return Array.isArray(value)
    ? value
      .filter((timer) => typeof timer.id === "string" && typeof timer.name === "string" && typeof timer.world === "string" && Number.isFinite(timer.targetTime))
      .filter((timer) => now <= timer.targetTime + 3600 * 1000)
      .map((timer) => ({ ...timer, location: typeof timer.location === "string" ? timer.location : getBossLocation(timer.name) }))
    : [];
}

export function getDueReminderOffsets(remainingMs, timerId, notifiedIds) {
  if (remainingMs <= 0) return [];
  return REMINDER_OFFSETS.filter((offset) => remainingMs <= offset.ms && !hasNotifiedReminder(notifiedIds, timerId, offset));
}

export function getReminderNotificationId(timerId, offset) {
  return `${timerId}:${offset.minutes}m`;
}

export function getNotifiedReminderTimerId(notifiedId) {
  const separatorIndex = notifiedId.lastIndexOf(":");
  if (separatorIndex === -1) return notifiedId;

  const suffix = notifiedId.slice(separatorIndex + 1);
  return REMINDER_OFFSETS.some((offset) => suffix === `${offset.minutes}m`) ? notifiedId.slice(0, separatorIndex) : notifiedId;
}

function hasNotifiedReminder(notifiedIds, timerId, offset) {
  if (notifiedIds.includes(getReminderNotificationId(timerId, offset))) return true;
  return offset.minutes === 10 && notifiedIds.includes(timerId);
}

function loadNotifiedReminderIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(NOTIFIED_REMINDERS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function isNotificationSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

if (typeof document !== "undefined") {
  initApp();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  }
}
