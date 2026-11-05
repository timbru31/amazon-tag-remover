import type { ServiceWorker } from "@playwright/test";

// Served by the local TLS fixture (global-setup.ts). The DNR rule under test
// rewrites the URL in the browser's network stack, so the request the fixture
// server receives already carries the stripped URL.
export const AMAZON_URL = "https://www.amazon.de/dp/B001";
export const FIXTURE_TITLE = "Tag Remover for Amazon — test fixture";

export type NotificationCall = {
  id: string;
  options: Record<string, unknown>;
};

export async function getStorage(serviceWorker: ServiceWorker): Promise<Record<string, unknown>> {
  return serviceWorker.evaluate(() => browser.storage.sync.get(null));
}

export async function setStorage(serviceWorker: ServiceWorker, values: Record<string, unknown>): Promise<void> {
  await serviceWorker.evaluate((values) => browser.storage.sync.set(values), values);
}

export async function getDynamicRules(serviceWorker: ServiceWorker): Promise<chrome.declarativeNetRequest.Rule[]> {
  return serviceWorker.evaluate(() => browser.declarativeNetRequest.getDynamicRules());
}

// background.ts calls browser.notifications.create at navigation time, so a
// monkey-patch installed in the service worker observes the real call without
// touching the extension source. Headless Chrome may reject notification
// creation; the spy swallows the rejection because only the call itself is
// under test.
export async function installNotificationSpy(serviceWorker: ServiceWorker): Promise<void> {
  await serviceWorker.evaluate(() => {
    const globals = globalThis as { __notificationCalls?: unknown[][]; __notificationSpyInstalled?: boolean };
    if (globals.__notificationSpyInstalled) {
      return;
    }
    const notifications = browser.notifications as unknown as { create: (...args: unknown[]) => Promise<unknown> };
    const originalCreate = notifications.create.bind(notifications);
    notifications.create = (...args: unknown[]) => {
      globals.__notificationCalls ??= [];
      globals.__notificationCalls.push(args);
      const promise = originalCreate(...args);
      void promise.catch(() => {});
      return promise;
    };
    globals.__notificationSpyInstalled = true;
  });
}

export async function getNotificationCalls(serviceWorker: ServiceWorker): Promise<NotificationCall[]> {
  const calls = await serviceWorker.evaluate(() => (globalThis as { __notificationCalls?: unknown[][] }).__notificationCalls ?? []);
  return calls.map((call) => ({ id: call[0] as string, options: call[1] as Record<string, unknown> }));
}
