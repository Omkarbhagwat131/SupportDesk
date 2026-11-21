export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "AGENT" | "ADMIN";
};

export type LoginResponse = {
  user: AuthUser;
  token: string;
  tokenType: "Bearer";
};

export function getStoredUser(): AuthUser | null {
  const value = localStorage.getItem("supportdesk_user");
  return value ? JSON.parse(value) as AuthUser : null;
}

export function storeAuth(response: LoginResponse): void {
  localStorage.setItem("supportdesk_token", response.token);
  localStorage.setItem("supportdesk_user", JSON.stringify(response.user));
}

export function clearAuth(): void {
  localStorage.removeItem("supportdesk_token");
  localStorage.removeItem("supportdesk_user");
}
