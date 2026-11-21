import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env, validateEnv } from "../config/env";
import { errorHandler } from "../middlewares/error-handler";
import { UserRole } from "../generated/prisma/client";
import { AppError } from "../errors/app-error";
import { createRequireAuth, JWT_AUDIENCE, JWT_ISSUER } from "../middlewares/require-auth";
import { requireRole } from "../middlewares/require-role";
import { ticketAccessWhere, ticketListWhere } from "../repositories/tickets.repository";
import { createAuthService } from "../services/auth.service";
import { sendSuccess } from "../utils/api-response";
import { loginSchema, registerSchema } from "../validators/auth.schema";
import { listTicketsQuerySchema } from "../validators/tickets.schema";

const testSecret = "auth-middleware-test-secret-that-is-not-for-production";

test("registration schema normalizes email and rejects invalid or extra input", () => {
  const parsed = registerSchema.safeParse({
    name: " Asha Customer ",
    email: "  ASHA.CUSTOMER@example.test ",
    password: "ExampleOnly!234",
  });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.name, "Asha Customer");
    assert.equal(parsed.data.email, "asha.customer@example.test");
  }

  assert.equal(registerSchema.safeParse({
    name: "Asha",
    email: "not-an-email",
    password: "short",
  }).success, false);
  assert.equal(registerSchema.safeParse({
    name: "Asha",
    email: "asha@example.test",
    password: "ExampleOnly!234",
    role: "ADMIN",
  }).success, false);
});

test("login schema normalizes email and rejects invalid or extra input", () => {
  const parsed = loginSchema.safeParse({
    email: "  ASHA.CUSTOMER@example.test ",
    password: "ExampleOnly!234",
  });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.email, "asha.customer@example.test");
  }
  assert.equal(loginSchema.safeParse({ email: "bad-email", password: "password" }).success, false);
  assert.equal(loginSchema.safeParse({
    email: "asha@example.test",
    password: "ExampleOnly!234",
    role: "ADMIN",
  }).success, false);
  assert.equal(loginSchema.safeParse({
    email: "asha@example.test",
    password: "a".repeat(73),
  }).success, false);
});

test("environment validation requires a strong non-placeholder JWT secret", () => {
  const validEnvironment = {
    DATABASE_URL: "postgresql://test:test@localhost:5432/supportdesk_test",
    JWT_SECRET: testSecret,
  };
  assert.equal(validateEnv(validEnvironment).jwtSecret, testSecret);
  assert.deepEqual(validateEnv(validEnvironment).corsOrigins, ["http://localhost:5173"]);
  assert.equal(validateEnv({
    ...validEnvironment,
    CORS_ORIGINS: "https://support.example.test, https://admin.example.test",
    JWT_EXPIRES_IN: "15m",
  }).jwtExpiresInSeconds, 900);
  assert.throws(() => validateEnv({
    ...validEnvironment,
    CORS_ORIGINS: "https://support.example.test/path",
  }), /CORS_ORIGINS/);
  assert.throws(() => validateEnv({
    ...validEnvironment,
    JWT_EXPIRES_IN: "365d",
  }), /JWT_EXPIRES_IN/);
  assert.throws(() => validateEnv({
    ...validEnvironment,
    JWT_SECRET: "replace_with_secure_random_jwt_secret_key",
  }), /JWT_SECRET/);
  assert.throws(() => validateEnv({
    ...validEnvironment,
    JWT_SECRET: "too-short",
  }), /JWT_SECRET/);
});

test("registration hashes the password and persists only the hash", async () => {
  let storedPasswordHash = "";
  let hashRounds = 0;
  const service = createAuthService({
    async findByEmail() {
      return null;
    },
    async findUserForLogin() {
      return null;
    },
    async createUser(input) {
      storedPasswordHash = input.passwordHash;
      return { id: "user-1", name: input.name, email: input.email, role: UserRole.CUSTOMER };
    },
  }, async (password, rounds) => {
    assert.equal(password, "ExampleOnly!234");
    hashRounds = rounds;
    return "bcrypt-hash";
  });

  const result = await service.register({
    name: "Asha Customer",
    email: "asha@example.test",
    password: "ExampleOnly!234",
  });

  assert.equal(hashRounds, 12);
  assert.equal(storedPasswordHash, "bcrypt-hash");
  assert.deepEqual(result, {
    id: "user-1",
    name: "Asha Customer",
    email: "asha@example.test",
    role: UserRole.CUSTOMER,
  });
  assert.equal("passwordHash" in result, false);
});

test("registration produces a bcrypt hash at the selected work factor", async () => {
  let storedPasswordHash = "";
  const service = createAuthService({
    async findByEmail() {
      return null;
    },
    async findUserForLogin() {
      return null;
    },
    async createUser(input) {
      storedPasswordHash = input.passwordHash;
      return { id: "user-2", name: input.name, email: input.email, role: UserRole.CUSTOMER };
    },
  });

  await service.register({
    name: "Asha Customer",
    email: "asha@example.test",
    password: "ExampleOnly!234",
  });

  assert.notEqual(storedPasswordHash, "ExampleOnly!234");
  assert.equal(await bcrypt.compare("ExampleOnly!234", storedPasswordHash), true);
});

test("registration rejects duplicate addresses before hashing", async () => {
  let hashCalled = false;
  const service = createAuthService({
    async findByEmail() {
      return { id: "existing-user" };
    },
    async findUserForLogin() {
      return null;
    },
    async createUser() {
      throw new Error("must not create a duplicate user");
    },
  }, async () => {
    hashCalled = true;
    return "unused";
  });

  await assert.rejects(
    service.register({ name: "Asha", email: "asha@example.test", password: "ExampleOnly!234" }),
    (error: unknown) => error instanceof AppError && error.statusCode === 409,
  );
  assert.equal(hashCalled, false);
});

test("login compares the password and returns a bearer token without the stored hash", async () => {
  let comparedPassword = "";
  let comparedHash = "";
  let signedUserId = "";
  const service = createAuthService({
    async findByEmail() {
      return null;
    },
    async findUserForLogin(email) {
      assert.equal(email, "asha@example.test");
      return {
        id: "user-1",
        name: "Asha Customer",
        email,
        passwordHash: "bcrypt-hash",
        role: UserRole.CUSTOMER,
      };
    },
    async createUser() {
      throw new Error("must not create a user during login");
    },
  }, undefined, async (password, hash) => {
    comparedPassword = password;
    comparedHash = hash;
    return true;
  }, (userId) => {
    signedUserId = userId;
    return "signed-token";
  });

  const result = await service.login({ email: "asha@example.test", password: "ExampleOnly!234" });

  assert.equal(comparedPassword, "ExampleOnly!234");
  assert.equal(comparedHash, "bcrypt-hash");
  assert.equal(signedUserId, "user-1");
  assert.deepEqual(result, {
    user: {
      id: "user-1",
      name: "Asha Customer",
      email: "asha@example.test",
      role: UserRole.CUSTOMER,
    },
    token: "signed-token",
    tokenType: "Bearer",
  });
  assert.equal("passwordHash" in result.user, false);
});

test("login gives the same error for unknown users, passwordless users, and wrong passwords", async () => {
  for (const loginUser of [null, {
    id: "user-no-password",
    name: "Asha Customer",
    email: "asha@example.test",
    passwordHash: null,
    role: UserRole.CUSTOMER,
  }]) {
    const service = createAuthService({
      async findByEmail() {
        return null;
      },
      async findUserForLogin() {
        return loginUser;
      },
      async createUser() {
        throw new Error("must not create a user during login");
      },
    }, undefined, async () => false, () => "unused-token");

    await assert.rejects(
      service.login({ email: "asha@example.test", password: "wrong-password" }),
      (error: unknown) => error instanceof AppError
        && error.statusCode === 401
        && error.code === "INVALID_CREDENTIALS",
    );
  }
});

test("login signs a short-lived JWT without role or secret claims", async () => {
  const service = createAuthService({
    async findByEmail() {
      return null;
    },
    async findUserForLogin(email) {
      return {
        id: "user-1",
        name: "Asha Customer",
        email,
        passwordHash: "bcrypt-hash",
        role: UserRole.CUSTOMER,
      };
    },
    async createUser() {
      throw new Error("must not create a user during login");
    },
  }, undefined, async () => true);

  const result = await service.login({ email: "asha@example.test", password: "ExampleOnly!234" });
  const payload = jwt.verify(result.token, env.jwtSecret, {
    algorithms: ["HS256"],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
  assert.equal(typeof payload, "object");
  if (typeof payload !== "string") {
    assert.equal(payload.sub, "user-1");
    assert.equal(payload.iss, JWT_ISSUER);
    assert.equal(payload.aud, JWT_AUDIENCE);
    assert.equal(typeof payload.exp, "number");
    assert.equal("role" in payload, false);
  }
});

test("auth middleware verifies bearer JWTs and role middleware checks the database role", async () => {
  const app = express();
  const signedToken = jwt.sign(
    { sub: "user-1" },
    testSecret,
    { algorithm: "HS256", expiresIn: "1h", issuer: JWT_ISSUER, audience: JWT_AUDIENCE },
  );
  const middleware = createRequireAuth(async (id) => ({
    id,
    email: "asha@example.test",
    role: UserRole.CUSTOMER,
  }), testSecret);

  app.get("/protected", middleware, requireRole(UserRole.CUSTOMER), (req, res) => {
    sendSuccess(res, 200, { id: req.authUser?.id });
  });
  app.get("/agent-only", middleware, requireRole(UserRole.AGENT), (_req, res) => {
    sendSuccess(res, 200, { ok: true });
  });

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const success = await fetch(`${baseUrl}/protected`, {
      headers: { authorization: `Bearer ${signedToken}` },
    });
    assert.equal(success.status, 200);
    assert.deepEqual(await success.json(), {
      data: { id: "user-1" },
      error: null,
      meta: {},
    });

    const missing = await fetch(`${baseUrl}/protected`);
    assert.equal(missing.status, 401);

    const forbidden = await fetch(`${baseUrl}/agent-only`, {
      headers: { authorization: `Bearer ${signedToken}` },
    });
    assert.equal(forbidden.status, 403);

    const invalid = await fetch(`${baseUrl}/protected`, {
      headers: { authorization: "Bearer not-a-valid-token" },
    });
    assert.equal(invalid.status, 401);

    const expiredToken = jwt.sign(
      { sub: "user-1" },
      testSecret,
      { algorithm: "HS256", expiresIn: -1, issuer: JWT_ISSUER, audience: JWT_AUDIENCE },
    );
    const expired = await fetch(`${baseUrl}/protected`, {
      headers: { authorization: `Bearer ${expiredToken}` },
    });
    assert.equal(expired.status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

test("auth middleware rejects malformed tokens and forwards lookup errors", async () => {
  const app = express();
  const token = jwt.sign(
    { sub: "user-1" },
    testSecret,
    { algorithm: "HS256", expiresIn: "1h", issuer: JWT_ISSUER, audience: JWT_AUDIENCE },
  );
  app.get("/protected", createRequireAuth(async () => {
    throw new Error("database lookup failed");
  }, testSecret));
  app.use(errorHandler);

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const malformed = await fetch(`${baseUrl}/protected`, {
      headers: { authorization: ["Bearer", "token", "with", "spaces"].join(" ") },
    });
    assert.equal(malformed.status, 401);

    const lookupError = await fetch(`${baseUrl}/protected`, {
      headers: { authorization: ["Bearer", token].join(" ") },
    });
    assert.equal(lookupError.status, 500);
    assert.deepEqual(await lookupError.json(), {
      data: null,
      error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error." },
      meta: {},
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

test("ticket data scope restricts customers to their own requester ID", () => {
  assert.deepEqual(ticketAccessWhere({
    id: "customer-1",
    email: "customer@example.test",
    role: UserRole.CUSTOMER,
  }), { requesterId: "customer-1" });
});

test("agents and admins receive unfiltered ticket data scope", () => {
  assert.deepEqual(ticketAccessWhere({
    id: "agent-1",
    email: "agent@example.test",
    role: UserRole.AGENT,
  }), {});
  assert.deepEqual(ticketAccessWhere({
    id: "admin-1",
    email: "admin@example.test",
    role: UserRole.ADMIN,
  }), {});
});

test("ticket list query applies defaults, normalizes status, and validates pagination and sorting", () => {
  assert.deepEqual(listTicketsQuerySchema.parse({}), {
    page: 1,
    limit: 10,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  assert.deepEqual(listTicketsQuerySchema.parse({
    page: "2",
    limit: "25",
    status: "open",
    priority: "P1",
    sortBy: "subject",
    sortOrder: "asc",
  }), {
    page: 2,
    limit: 25,
    status: "OPEN",
    priority: "P1",
    sortBy: "subject",
    sortOrder: "asc",
  });
  assert.equal(listTicketsQuerySchema.safeParse({ page: "0" }).success, false);
  assert.equal(listTicketsQuerySchema.safeParse({ limit: "101" }).success, false);
  assert.equal(listTicketsQuerySchema.safeParse({ status: "unknown" }).success, false);
  assert.equal(listTicketsQuerySchema.safeParse({ sortBy: "id;DROP TABLE tickets" }).success, false);
});

test("ticket list filters preserve customer ownership scope", () => {
  const query = listTicketsQuerySchema.parse({
    status: "open",
    priority: "P1",
    assigneeId: "agent-1",
    search: " payment ",
  });
  assert.deepEqual(ticketListWhere({
    id: "customer-1",
    email: "customer@example.test",
    role: UserRole.CUSTOMER,
  }, query), {
    requesterId: "customer-1",
    status: "OPEN",
    priority: "P1",
    assigneeId: "agent-1",
    OR: [
      { subject: { contains: "payment", mode: "insensitive" } },
      { description: { contains: "payment", mode: "insensitive" } },
      { requesterEmail: { contains: "payment", mode: "insensitive" } },
    ],
  });
});

test("malformed JSON uses the standard validation response envelope", async () => {
  const app = express();
  app.use(express.json());
  app.post("/", (_req, res) => sendSuccess(res, 200, {}));
  app.use(errorHandler);

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid",
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      data: null,
      error: { code: "VALIDATION_ERROR", message: "Request body must contain valid JSON." },
      meta: {},
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
