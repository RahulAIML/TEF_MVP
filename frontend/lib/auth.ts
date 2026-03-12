export function getAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem("tef_token");
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem("tef_token", token);
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem("tef_token");
}
