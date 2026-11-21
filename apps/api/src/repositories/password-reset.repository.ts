import { prisma } from "../config/database";

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function createResetToken(input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    await transaction.passwordResetToken.deleteMany({ where: { userId: input.userId } });
    await transaction.passwordResetToken.create({ data: input });
  });
}

export async function hasValidResetToken(tokenHash: string, now: Date): Promise<boolean> {
  const token = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, expiresAt: { gt: now } },
    select: { id: true },
  });
  return token !== null;
}

export async function consumeResetToken(input: {
  tokenHash: string;
  passwordHash: string;
  now: Date;
}): Promise<boolean> {
  return prisma.$transaction(async (transaction) => {
    const resetToken = await transaction.passwordResetToken.findFirst({
      where: { tokenHash: input.tokenHash, expiresAt: { gt: input.now } },
      select: { id: true, userId: true },
    });
    if (!resetToken) return false;

    const consumed = await transaction.passwordResetToken.deleteMany({
      where: { id: resetToken.id, expiresAt: { gt: input.now } },
    });
    if (consumed.count !== 1) return false;

    await transaction.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash: input.passwordHash },
    });
    await transaction.passwordResetToken.deleteMany({ where: { userId: resetToken.userId } });
    return true;
  });
}
