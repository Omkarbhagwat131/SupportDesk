import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "../errors/app-error";
import { createPasswordResetService, hashResetToken } from "../services/password-reset.service";

const resetToken = "a".repeat(64);

test("password reset requests store only a hash and expire after 30 minutes", async () => {
  const storedTokens: Array<{ userId: string; tokenHash: string; expiresAt: Date }> = [];
  const before = Date.now();
  const service = createPasswordResetService({
    async findUserIdByEmail(email) {
      assert.equal(email, "customer@example.test");
      return "user-1";
    },
    async createResetToken(input) {
      storedTokens.push(input);
    },
    async hasValidResetToken() {
      return false;
    },
    async consumeResetToken() {
      return false;
    },
  }, undefined, () => resetToken);

  const returnedToken = await service.requestReset("customer@example.test");
  const storedToken = storedTokens[0];

  assert.equal(returnedToken, resetToken);
  assert.ok(storedToken);
  assert.notEqual(storedToken.tokenHash, resetToken);
  assert.equal(storedToken.tokenHash, hashResetToken(resetToken));
  assert.equal(storedToken.userId, "user-1");
  assert.ok(storedToken.expiresAt.getTime() >= before + 30 * 60 * 1000);
  assert.ok(storedToken.expiresAt.getTime() <= Date.now() + 30 * 60 * 1000);
});

test("password reset requests do not create tokens for unknown emails", async () => {
  let tokenCreated = false;
  const service = createPasswordResetService({
    async findUserIdByEmail() {
      return null;
    },
    async createResetToken() {
      tokenCreated = true;
    },
    async hasValidResetToken() {
      return false;
    },
    async consumeResetToken() {
      return false;
    },
  });

  assert.equal(await service.requestReset("unknown@example.test"), null);
  assert.equal(tokenCreated, false);
});

test("password reset hashes the new password and consumes the token", async () => {
  let consumedTokenHash = "";
  let storedPasswordHash = "";
  const service = createPasswordResetService({
    async findUserIdByEmail() {
      return "user-1";
    },
    async createResetToken() {},
    async hasValidResetToken(tokenHash) {
      return tokenHash === hashResetToken(resetToken);
    },
    async consumeResetToken(input) {
      consumedTokenHash = input.tokenHash;
      storedPasswordHash = input.passwordHash;
      return true;
    },
  }, async (password, rounds) => {
    assert.equal(password, "new-password-123");
    assert.equal(rounds, 12);
    return "bcrypt-hash";
  });

  await service.resetPassword(resetToken, "new-password-123");

  assert.equal(consumedTokenHash, hashResetToken(resetToken));
  assert.equal(storedPasswordHash, "bcrypt-hash");
});

test("password reset rejects expired or previously consumed tokens", async () => {
  let hashCalled = false;
  const service = createPasswordResetService({
    async findUserIdByEmail() {
      return "user-1";
    },
    async createResetToken() {},
    async hasValidResetToken() {
      return false;
    },
    async consumeResetToken() {
      return false;
    },
  }, async () => {
    hashCalled = true;
    return "unused";
  });

  await assert.rejects(
    service.resetPassword(resetToken, "new-password-123"),
    (error: unknown) => error instanceof AppError && error.code === "INVALID_RESET_TOKEN",
  );
  assert.equal(hashCalled, false);
});
