import { useState } from "react";
import { resetPassword, type PasswordResetInput } from "../api/auth";

export function useResetPassword() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(input: PasswordResetInput): Promise<boolean> {
    setLoading(true);
    setError("");

    try {
      await resetPassword(input);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to reset the password.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { submit, loading, error };
}
