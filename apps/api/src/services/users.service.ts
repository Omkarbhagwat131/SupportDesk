import * as usersRepository from "../repositories/users.repository";

export function listAgents() {
  return usersRepository.findAgents();
}
