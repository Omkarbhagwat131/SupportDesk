import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import { AppError } from "../errors/app-error";
import * as passwordResetRepository from "../repositories/password-reset.repository";

const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
const BCRYPT_WORK_FACTOR = 12;

type PasswordResetRepository = {
  findUserIdByEmail(email: string): Promise<string | null>;
  createResetToken(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  hasValidResetToken(tokenHash: string, now: Date): Promise<boolean>;
  consumeResetToken(input: { tokenHash: string; passwordHash: string; now: Date }): Promise<boolean>;
};

type PasswordHasher = (password: string, rounds: number) => Promise<string>;
type TokenGenerator = () => string;

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createPasswordResetService(
  repository: PasswordResetRepository = passwordResetRepository,
  hashPassword: PasswordHasher = bcrypt.hash,
  generateToken: TokenGenerator = () => randomBytes(32).toString("hex"),
) {
  return {
    async requestReset(email: string): Promise<string | null> {
      const userId = await repository.findUserIdByEmail(email);
      if (!userId) return null;

      const token = generateToken();
      await repository.createResetToken({
        userId,
        tokenHash: hashResetToken(token),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      });
      return token;
    },

    async resetPassword(token: string, password: string): Promise<void> {
      const tokenHash = hashResetToken(token);
      const now = new Date();
      if (!await repository.hasValidResetToken(tokenHash, now)) {
        throw new AppError(400, "INVALID_RESET_TOKEN", "This reset link is invalid or expired.");
      }

      const passwordHash = await hashPassword(password, BCRYPT_WORK_FACTOR);
      const consumed = await repository.consumeResetToken({
        tokenHash,
        passwordHash,
        now: new Date(),
      });
      if (!consumed) {
        throw new AppError(400, "INVALID_RESET_TOKEN", "This reset link is invalid or expired.");
      }
    },
  };
}

export const passwordResetService = createPasswordResetService();
