import type { Request, Response } from "express";
import * as usersService from "../services/users.service";
import { sendSuccess } from "../utils/api-response";

export async function listAgents(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, 200, await usersService.listAgents());
}
