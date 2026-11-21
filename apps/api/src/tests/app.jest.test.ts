import request from "supertest";
import { app } from "../app";

describe("public API documentation and health endpoint", () => {
  test("health reports the API as available", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { status: "ok" }, error: null, meta: {} });
  });

  test("serves the interactive OpenAPI UI at /docs", async () => {
    const response = await request(app).get("/docs/");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Swagger UI");
  });
});
