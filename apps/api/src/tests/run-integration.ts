import { execFileSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { config } from "dotenv";

config({ path: resolve(__dirname, "../../../../.env") });

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL must point to the isolated supportdesk_test database.");
}

const testDatabase = new URL(testDatabaseUrl);
if (
  testDatabase.protocol !== "postgresql:"
  || !["localhost", "127.0.0.1"].includes(testDatabase.hostname)
  || testDatabase.port !== "5433"
  || decodeURIComponent(testDatabase.pathname) !== "/supportdesk_test"
) {
  throw new Error("Integration tests require localhost:5433/supportdesk_test; refusing to use another database.");
}

process.env.DATABASE_URL = testDatabaseUrl;
process.env.JWT_SECRET = "integration-test-only-secret-never-used-outside-tests";

const apiRoot = resolve(__dirname, "../..");
execFileSync(process.execPath, [
  resolve(apiRoot, "node_modules/prisma/build/index.js"),
  "migrate",
  "deploy",
], {
  cwd: apiRoot,
  env: process.env,
  stdio: "inherit",
});

const integrationResult = spawnSync(process.execPath, [
  "--import",
  "tsx",
  "--test",
  resolve(__dirname, "comments.integration.test.ts"),
  resolve(__dirname, "password-reset.integration.test.ts"),
  resolve(__dirname, "ticket-workflow.integration.test.ts"),
], {
  cwd: apiRoot,
  env: process.env,
  stdio: "inherit",
});

if (integrationResult.error) throw integrationResult.error;
if (integrationResult.status !== 0) {
  process.exitCode = integrationResult.status ?? 1;
}
