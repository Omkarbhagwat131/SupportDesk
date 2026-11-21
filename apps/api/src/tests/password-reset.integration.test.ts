import assert from "node:assert/strict";
import { after, test } from "node:test";
import { prisma } from "../config/database";
import { AppError } from "../errors/app-error";
import { authService } from "../services/auth.service";
import { hashResetToken, passwordResetService } from "../services/password-reset.service";

const email = `password-reset-${process.pid}-${Date.now()}@example.test`;
let userId: string | null = null;

after(async () => {
  try {
    if (userId) {
      await prisma.passwordResetToken.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  } finally {
    await prisma.$disconnect();
  }
});

test("a local password reset changes the password and consumes its token", async () => {
  const originalPassword = "original-password-123";
  const newPassword = "replacement-password-456";
  const user = await authService.register({
    name: "Password Reset Integration",
    email,
    password: originalPassword,
  });
  userId = user.id;

  const token = await passwordResetService.requestReset(email);
  assert.ok(token);

  const savedToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
  });
  assert.ok(savedToken);
  assert.notEqual(savedToken.tokenHash, token);
  assert.ok(savedToken.expiresAt.getTime() > Date.now());

  await passwordResetService.resetPassword(token, newPassword);
  const login = await authService.login({ email, password: newPassword });
  assert.equal(login.user.id, user.id);
  assert.equal(
    await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashResetToken(token) } }),
    null,
  );
  await assert.rejects(
    passwordResetService.resetPassword(token, "another-password-789"),
    (error: unknown) => error instanceof AppError && error.code === "INVALID_RESET_TOKEN",
  );
  await assert.rejects(
    authService.login({ email, password: originalPassword }),
    (error: unknown) => error instanceof AppError && error.code === "INVALID_CREDENTIALS",
  );
});
