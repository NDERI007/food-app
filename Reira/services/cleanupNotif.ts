import { notificationService } from "./notification";

export function startNotificationCleanup(intervalMs = 1000 * 60 * 60 * 6) {
  // Default: every 6 hours
  setInterval(async () => {
    console.log("🧭 Running notification cleanup job...");
    await notificationService.trimManually(1000);
  }, intervalMs);
}
