// HTTP transport for backend commands. Drop-in replacement for Tauri's
// `invoke()` from `@tauri-apps/api/core`: same call signature and the same
// reject-with-error-string behaviour, but it talks to the local Express server
// (server/server.js) over HTTP instead of Tauri IPC. Command names and argument
// shapes are unchanged, so call sites only swap their import.

export async function invoke<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/invoke/${command}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args ?? {}),
    });
  } catch (e) {
    // Network/connection failure (e.g. server not running).
    throw `Could not reach Hermes server: ${e}`;
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw (body && body.error) || `Request failed: ${command}`;
  }
  return body as T;
}
