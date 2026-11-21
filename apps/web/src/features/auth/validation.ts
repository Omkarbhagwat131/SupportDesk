const MAX_PASSWORD_UTF8_BYTES = 72;

export function getLoginPasswordError(password: string): string | null {
  return new TextEncoder().encode(password).byteLength > MAX_PASSWORD_UTF8_BYTES
    ? "Password must not exceed 72 UTF-8 bytes."
    : null;
}

export function getRegistrationPasswordError(password: string): string | null {
  if (password.length < 12) return "Password must be at least 12 characters.";
  return getLoginPasswordError(password);
}
