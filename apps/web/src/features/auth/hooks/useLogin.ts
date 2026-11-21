import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { login, type LoginCredentials } from "../api/auth";
import { storeAuth } from "../../../lib/auth";

export function useLogin() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(credentials: LoginCredentials): Promise<boolean> {
    setLoading(true);
    setError("");

    try {
      const response = await login(credentials);
      queryClient.clear();
      storeAuth(response);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Login failed.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { submit, loading, error };
}
