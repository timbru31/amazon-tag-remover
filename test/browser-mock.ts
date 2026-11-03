import { vi } from "vitest";

export interface StorageMock {
  get: (keys?: string | string[]) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (keys: string | string[]) => Promise<void>;
  data: Record<string, unknown>;
}

export function createStorageMock(initial: Record<string, unknown> = {}): StorageMock {
  const data: Record<string, unknown> = { ...initial };
  return {
    data,
    get(keys?: string | string[]) {
      let result: Record<string, unknown>;
      if (keys === undefined) result = { ...data };
      else if (typeof keys === "string") result = { [keys]: data[keys] };
      else result = Object.fromEntries(keys.map((key) => [key, data[key]]));
      return Promise.resolve(result);
    },
    set(items: Record<string, unknown>) {
      Object.assign(data, items);
      return Promise.resolve();
    },
    remove(keys: string | string[]) {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key];
      return Promise.resolve();
    },
  };
}

export type Listener = (...args: never[]) => unknown;

export interface ListenerMock {
  addListener: (listener: Listener) => void;
  removeListener: (listener: Listener) => void;
  listeners: Listener[];
  emit: (...args: never[]) => void;
}

export function createListenerMock(): ListenerMock {
  const listeners: Listener[] = [];
  return {
    listeners,
    addListener: (listener) => listeners.push(listener),
    removeListener: (listener) => {
      const index = listeners.indexOf(listener);
      if (index !== -1) listeners.splice(index, 1);
    },
    emit: (...args) => {
      for (const listener of listeners) listener(...args);
    },
  };
}

export interface BrowserMockOptions {
  syncStorage?: boolean;
  notifications?: boolean;
  initial?: Record<string, unknown>;
}

export interface BrowserMock {
  storage: { sync?: StorageMock; local: StorageMock; onChanged: ListenerMock };
  declarativeNetRequest: {
    getDynamicRules: ReturnType<typeof vi.fn>;
    updateDynamicRules: ReturnType<typeof vi.fn>;
  };
  webNavigation: {
    onBeforeNavigate: ListenerMock;
    onCompleted: ListenerMock;
  };
  runtime: {
    onInstalled: ListenerMock;
    getURL: (path: string) => string;
  };
  notifications?: { create: ReturnType<typeof vi.fn> };
}

export function createBrowserMock(options: BrowserMockOptions = {}): BrowserMock {
  const initial = options.initial ?? {};
  const local = createStorageMock(initial);
  const sync = options.syncStorage === false ? undefined : createStorageMock(initial);
  const onChanged = createListenerMock();
  const browserMock: BrowserMock = {
    storage: sync === undefined ? { local, onChanged } : { local, sync, onChanged },
    declarativeNetRequest: {
      getDynamicRules: vi.fn(async () => []),
      updateDynamicRules: vi.fn(async () => undefined),
    },
    webNavigation: {
      onBeforeNavigate: createListenerMock(),
      onCompleted: createListenerMock(),
    },
    runtime: {
      onInstalled: createListenerMock(),
      getURL: (path) => path,
    },
  };
  if (options.notifications !== false) {
    browserMock.notifications = { create: vi.fn(async () => "amazonTagRemoverNotification") };
  }
  return browserMock;
}

/** Stubs the global `browser` WebExtension API with a fresh mock. */
export function installBrowserMock(options: BrowserMockOptions = {}): BrowserMock {
  const browserMock = createBrowserMock(options);
  vi.stubGlobal("browser", browserMock);
  return browserMock;
}
