/**
 * Tiny in-memory TTL cache for server-side provider responses.
 *
 * Keeps us within third-party rate limits and lets us serve last-good data on
 * a provider error (CLAUDE.md §2.1). Per-instance only; swap for Upstash Redis
 * in Phase 6 for cross-instance durability.
 */

interface Entry<T> {
  value: T;
  expires: number;
  storedAt: number;
}

const store = new Map<string, Entry<unknown>>();

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<{ value: T; stale: boolean; storedAt: number }> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;

  if (hit && hit.expires > now) {
    return { value: hit.value, stale: false, storedAt: hit.storedAt };
  }

  try {
    const value = await loader();
    store.set(key, { value, expires: now + ttlSeconds * 1000, storedAt: now });
    return { value, stale: false, storedAt: now };
  } catch (err) {
    // Serve last-good data rather than blanking the widget.
    if (hit) {
      return { value: hit.value, stale: true, storedAt: hit.storedAt };
    }
    throw err;
  }
}

export function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  return fetchWith(url, init).then((r) => r.json() as Promise<T>);
}

export async function fetchWith(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      // Yahoo and several feeds reject the default fetch UA.
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Accept: "application/json,text/plain,*/*",
      ...(init?.headers ?? {}),
    },
    // Provider responses are cached by our own TTL layer.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Upstream ${res.status} for ${url}`);
  }
  return res;
}
