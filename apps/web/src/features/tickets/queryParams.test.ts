import { describe, expect, it } from "vitest";
import { parseTicketListQuery, serializeTicketListQuery } from "./queryParams";

describe("ticket list query parameters", () => {
  it("parses supported URL filters using backend defaults", () => {
    expect(parseTicketListQuery("?page=2&status=open&priority=P1&search=login")).toEqual({
      page: 2,
      limit: 10,
      status: "OPEN",
      priority: "P1",
      search: "login",
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  });

  it("falls back to defaults for invalid query values", () => {
    expect(parseTicketListQuery("?page=0&limit=101")).toEqual({
      page: 1,
      limit: 10,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  });

  it("omits empty optional filters when serializing", () => {
    const params = serializeTicketListQuery({
      page: 1,
      limit: 10,
      search: "",
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    expect(params.toString()).toBe("page=1&limit=10&sortBy=createdAt&sortOrder=desc");
  });
});
