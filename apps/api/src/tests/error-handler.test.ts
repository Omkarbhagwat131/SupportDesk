import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import express from "express";
import { AppError } from "../errors/app-error";
import { errorHandler, notFoundHandler } from "../middlewares/error-handler";

test("central error handling returns safe 400, 404, and 500 response envelopes", async () => {
  const app = express();
  app.get("/bad-request", () => {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid request.");
  });
  app.get("/internal-error", () => {
    throw new Error("Database URL contains a confidential test value.");
  });
  app.use(notFoundHandler);
  app.use(errorHandler);

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  const originalError = console.error;
  const loggedMessages: string[] = [];
  console.error = (...values: unknown[]) => {
    loggedMessages.push(values.join(" "));
  };

  try {
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const badRequest = await fetch(`${baseUrl}/bad-request`);
    assert.equal(badRequest.status, 400);
    assert.deepEqual(await badRequest.json(), {
      data: null,
      error: { code: "VALIDATION_ERROR", message: "Invalid request." },
      meta: {},
    });

    const notFound = await fetch(`${baseUrl}/missing-route`);
    assert.equal(notFound.status, 404);
    assert.deepEqual(await notFound.json(), {
      data: null,
      error: { code: "NOT_FOUND", message: "Route not found." },
      meta: {},
    });

    const internalError = await fetch(`${baseUrl}/internal-error`);
    assert.equal(internalError.status, 500);
    const internalErrorBody = await internalError.json();
    assert.deepEqual(internalErrorBody, {
      data: null,
      error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error." },
      meta: {},
    });
    assert.doesNotMatch(JSON.stringify(internalErrorBody), /Database URL|confidential/);
    assert.deepEqual(loggedMessages, ["Unhandled API error."]);
  } finally {
    console.error = originalError;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
