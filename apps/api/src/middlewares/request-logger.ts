import type { RequestHandler } from "express";
import { performance } from "node:perf_hooks";

export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = performance.now();

  res.once("finish", () => {
    const durationMs = (performance.now() - startedAt).toFixed(1);
    console.log(`${req.method} ${req.path} ${res.statusCode} ${durationMs}ms`);
  });

  next();
};