import { apiRequest } from "../../../lib/api";

export type Agent = {
  id: string;
  name: string;
  email: string;
};

export async function listAgents(): Promise<Agent[]> {
  const response = await apiRequest<Agent[]>("/api/users/agents");
  return response.data;
}
