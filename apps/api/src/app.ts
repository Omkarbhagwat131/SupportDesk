import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import express from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { createCorsMiddleware } from "./middlewares/cors";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler";
import { requestLogger } from "./middlewares/request-logger";
import authRouter from "./routes/auth.routes";
import ticketsRouter from "./routes/tickets.routes";
import { sendSuccess } from "./utils/api-response";

const openApiDocument = JSON.parse(readFileSync(resolve(__dirname, "../openapi.json"), "utf8"));
export const app = express();

app.use(helmet());
app.use(createCorsMiddleware());
app.use(requestLogger);
app.use(express.json());
app.get("/health", (_req, res) => sendSuccess(res, 200, { status: "ok" }));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.use("/api/auth", authRouter);
app.use("/api/tickets", ticketsRouter);
app.use(notFoundHandler);
app.use(errorHandler);