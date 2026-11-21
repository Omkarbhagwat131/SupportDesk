import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import express from "express";
import { requestLogger } from "../middlewares/request-logger";

test("logs method, path, status, and duration without sensitive request values", async () => {
  const app = express();
  app.use(requestLogger);
  app.use(express.json());
  app.post("/test", (_req, res) => {
    res.status(201).json({ ok: true });
  });

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  const originalLog = console.log;
  const logs: string[] = [];
  console.log = (...values: unknown[]) => {
    logs.push(values.join(" "));
  };

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/test?token=query-secret`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer header-secret",
      },
      body: JSON.stringify({ password: "body-secret" }),
    });
    assert.equal(response.status, 201);

    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(logs.length, 1);
    assert.match(logs[0], /^POST \/test 201 \d+\.\d+ms$/);
    assert.doesNotMatch(logs[0], /query-secret|header-secret|body-secret|authorization|password/i);
  } finally {
    console.log = originalLog;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
