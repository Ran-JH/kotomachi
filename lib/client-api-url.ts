/**
 * Build an app-local API URL from current browser origin.
 * This avoids accidental hard-coded localhost ports in client requests.
 */
export function buildClientApiUrl(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error(`API path must start with "/": ${path}`);
  }
  if (typeof window === "undefined") {
    return path;
  }
  return new URL(path, window.location.origin).toString();
}
