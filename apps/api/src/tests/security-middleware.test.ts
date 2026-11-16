import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import express from "express";
import helmet from "helmet";
import authRouter from "../routes/auth.routes";
import ticketsRouter from "../routes/tickets.routes";
import { createCorsMiddleware } from "../middlewares/cors";
import { createLoginRateLimiter } from "../middlewares/login-rate-limit";
import { errorHandler } from "../middlewares/error-handler";

async function listen(app: express.Express): Promise<{ server: ReturnType<typeof createServer>; baseUrl: string }> {
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("The test server did not bind to a TCP port.");
  }
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

test("Helmet sets standard security headers", async () => {
  const app = express();
  app.use(helmet());
  app.get("/", (_req, res) => res.sendStatus(200));
  const { server, baseUrl } = await listen(app);

  try {
    const response = await fetch(baseUrl);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), "SAMEORIGIN");
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

test("CORS allows configured origins and omits the allow header for other origins", async () => {
  const app = express();
  app.use(createCorsMiddleware(["http://localhost:5173"]));
  app.get("/", (_req, res) => res.sendStatus(200));
  const { server, baseUrl } = await listen(app);

  try {
    const allowed = await fetch(baseUrl, { headers: { origin: "http://localhost:5173" } });
    assert.equal(allowed.headers.get("access-control-allow-origin"), "http://localhost:5173");

    const blocked = await fetch(baseUrl, { headers: { origin: "https://untrusted.example.test" } });
    assert.equal(blocked.status, 200);
    assert.equal(blocked.headers.get("access-control-allow-origin"), null);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

test("login rate limiter blocks the eleventh request with the standard error envelope", async () => {
  const app = express();
  app.post("/api/auth/login", createLoginRateLimiter(), (_req, res) => res.sendStatus(200));
  const { server, baseUrl } = await listen(app);

  try {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await fetch(`${baseUrl}/api/auth/login`, { method: "POST" });
      assert.equal(response.status, 200);
    }

    const limited = await fetch(`${baseUrl}/api/auth/login`, { method: "POST" });
    assert.equal(limited.status, 429);
    assert.deepEqual(await limited.json(), {
      data: null,
      error: {
        code: "RATE_LIMITED",
        message: "Too many login attempts. Please try again later.",
      },
      meta: {},
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

test("auth routes validate login input and ticket routes reject anonymous requests", async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRouter);
  app.use("/api/tickets", ticketsRouter);
  app.use(errorHandler);
  const { server, baseUrl } = await listen(app);

  try {
    const invalidLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "bad-email", password: "x" }),
    });
    assert.equal(invalidLogin.status, 400);
    assert.deepEqual(await invalidLogin.json(), {
      data: null,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid login data.",
        details: [
          { path: ["email"], message: "Invalid email address" },
        ],
      },
      meta: {},
    });

    const anonymousTickets = await fetch(`${baseUrl}/api/tickets`);
    assert.equal(anonymousTickets.status, 401);
    assert.deepEqual(await anonymousTickets.json(), {
      data: null,
      error: {
        code: "UNAUTHORIZED",
        message: "A valid bearer token is required.",
      },
      meta: {},
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
