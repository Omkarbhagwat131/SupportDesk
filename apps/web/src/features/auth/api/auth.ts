import { apiRequest } from "../../../lib/api";
import type { AuthUser, LoginResponse } from "../../../lib/auth";

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegistrationInput = {
  name: string;
  email: string;
  password: string;
};

export type PasswordResetInput = {
  token: string;
  password: string;
};

type RegistrationResponse = {
  user: AuthUser;
};

type MessageResponse = {
  message: string;
};

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  return response.data;
}

export async function register(input: RegistrationInput): Promise<RegistrationResponse> {
  const response = await apiRequest<RegistrationResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function requestPasswordReset(email: string): Promise<MessageResponse> {
  const response = await apiRequest<MessageResponse>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return response.data;
}

export async function resetPassword(input: PasswordResetInput): Promise<MessageResponse> {
  const response = await apiRequest<MessageResponse>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.data;
}
