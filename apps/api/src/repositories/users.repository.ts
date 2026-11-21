import { prisma } from "../config/database";
import { AppError } from "../errors/app-error";

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === "P2002";
}

export function findByEmail(email: string) {
  return prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
}

export function findUserForLogin(email: string) {
  return prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, name: true, email: true, passwordHash: true, role: true },
  });
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}) {
  try {
    return await prisma.user.create({
      data: { ...input, role: "CUSTOMER" },
      select: { id: true, name: true, email: true, role: true },
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new AppError(409, "EMAIL_ALREADY_REGISTERED", "An account with this email already exists.");
    }
    throw error;
  }
}

export function findAuthUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true },
  });
}
