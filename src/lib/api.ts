export const accountMode = import.meta.env.VITE_FINANCE_API === "1";
export interface AccountUser {
  id: string;
  email: string;
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: "same-origin",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/auth/"))
      window.dispatchEvent(new Event("finance-session-expired"));
    throw new Error(result.error || "The request could not be completed.");
  }
  return result;
}
