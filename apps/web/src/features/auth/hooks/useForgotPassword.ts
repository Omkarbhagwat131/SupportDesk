import { useState } from "react";
import { requestPasswordReset } from "../api/auth";

export function useForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(email: string): Promise<boolean> {
    setLoading(true);
    setError("");

    try {
      await requestPasswordReset(email);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to request a password reset.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { submit, loading, error };
}
