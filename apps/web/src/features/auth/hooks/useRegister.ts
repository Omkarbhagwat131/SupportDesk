import { useState } from "react";
import { register, type RegistrationInput } from "../api/auth";

export function useRegister() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(input: RegistrationInput): Promise<boolean> {
    setLoading(true);
    setError("");

    try {
      await register(input);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Registration failed.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { submit, loading, error };
}
