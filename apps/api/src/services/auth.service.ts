import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { UserRole } from "../generated/prisma/client";
import { env } from "../config/env";
import { JWT_AUDIENCE, JWT_ISSUER } from "../config/jwt";
import { AppError } from "../errors/app-error";
import * as usersRepository from "../repositories/users.repository";
import type { LoginInput, RegisterInput } from "../validators/auth.schema";

const BCRYPT_WORK_FACTOR = 12;

type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

type LoginUser = PublicUser & { passwordHash: string | null };

export type AuthRepository = {
  findByEmail(email: string): Promise<{ id: string } | null>;
  findUserForLogin(email: string): Promise<LoginUser | null>;
  createUser(input: { name: string; email: string; passwordHash: string }): Promise<PublicUser>;
};
export type PasswordHasher = (password: string, rounds: number) => Promise<string>;
export type PasswordComparator = (password: string, hash: string) => Promise<boolean>;
export type AccessTokenSigner = (userId: string) => string;

function signAccessToken(userId: string): string {
  return jwt.sign({}, env.jwtSecret, {
    algorithm: "HS256",
    subject: userId,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    expiresIn: env.jwtExpiresInSeconds,
  });
}

export function createAuthService(
  repository: AuthRepository = usersRepository,
  hashPassword: PasswordHasher = bcrypt.hash,
  comparePassword: PasswordComparator = bcrypt.compare,
  createAccessToken: AccessTokenSigner = signAccessToken,
) {
  return {
    async register(input: RegisterInput) {
      const existingUser = await repository.findByEmail(input.email);
      if (existingUser) {
        throw new AppError(409, "EMAIL_ALREADY_REGISTERED", "An account with this email already exists.");
      }

      const passwordHash = await hashPassword(input.password, BCRYPT_WORK_FACTOR);
      return repository.createUser({
        name: input.name,
        email: input.email,
        passwordHash,
      });
    },
    async login(input: LoginInput) {
      const user = await repository.findUserForLogin(input.email);
      if (!user?.passwordHash || !(await comparePassword(input.password, user.passwordHash))) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
      }

      const safeUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
      return { user: safeUser, token: createAccessToken(user.id), tokenType: "Bearer" as const };
    },
  };
}

export const authService = createAuthService();
