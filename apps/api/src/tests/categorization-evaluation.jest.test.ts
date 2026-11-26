import {
  evaluateCategorization,
  parseEvaluationCsv,
  formatEvaluationReport,
  type EvaluationTicket,
} from "../ai/categorization-evaluation";

function createTickets(expectedCategories: EvaluationTicket["expectedCategory"][]): EvaluationTicket[] {
  return expectedCategories.map((expectedCategory, index) => ({
    id: `ticket-${index + 1}`,
    subject: `Ticket subject ${index + 1}`,
    description: `Ticket description ${index + 1}`,
    expectedCategory,
  }));
}

describe("categorization evaluation", () => {
  test("parses exactly 20 labeled rows and assigns stable IDs when none are supplied", () => {
    const rows = Array.from({ length: 20 }, (_, index) =>
      `Subject ${index + 1},Description ${index + 1},${["account", "billing", "technical", "product", "other"][index % 5]}`,
    );
    const tickets = parseEvaluationCsv([
      "subject,description,expected_category",
      ...rows,
    ].join("\n"));

    expect(tickets).toHaveLength(20);
    expect(tickets[0]).toEqual({
      id: "case-01",
      subject: "Subject 1",
      description: "Description 1",
      expectedCategory: "account",
    });
  });

  test("rejects a missing row, unsupported label, and unexpected CSV column", () => {
    const nineteenRows = [
      "subject,description,expected_category",
      ...Array.from({ length: 19 }, (_, index) => `Subject ${index},Description ${index},account`),
    ].join("\n");
    expect(() => parseEvaluationCsv(nineteenRows)).toThrow("exactly 20 valid rows");

    const invalidLabel = [
      "subject,description,expected_category",
      "Issue,Description,security",
      ...Array.from({ length: 19 }, (_, index) => `Subject ${index},Description ${index},account`),
    ].join("\n");
    expect(() => parseEvaluationCsv(invalidLabel)).toThrow("exactly 20 valid rows");

    const unexpectedColumn = [
      "subject,description,expected_category,priority",
      ...Array.from({ length: 20 }, (_, index) => `Subject ${index},Description ${index},account,P2`),
    ].join("\n");
    expect(() => parseEvaluationCsv(unexpectedColumn)).toThrow("exactly 20 valid rows");
  });

  test("counts category mismatches and invalid model output as incorrect without retaining ticket text", async () => {
    const tickets = createTickets(["billing", "technical", "account", "product", "other"]);
    const categorize = jest.fn<Promise<string>, [{ subject: string; description: string }]>()
      .mockResolvedValueOnce('{"category":"billing","priority":"P3"}')
      .mockResolvedValueOnce('{"category":"account","priority":"P3"}')
      .mockResolvedValueOnce("not JSON")
      .mockResolvedValueOnce('{"category":"billing","priority":"P0"}')
      .mockRejectedValueOnce(new Error("provider failure"));

    const report = await evaluateCategorization(tickets, categorize);

    expect(report).toMatchObject({
      total: 5,
      correct: 1,
      incorrect: 4,
      accuracyPercent: 20,
      meetsTarget: false,
    });
    expect(report.incorrectPredictions.map((result) => result.failure)).toEqual([
      null,
      "malformed_json",
      "invalid_output",
      "provider_error",
    ]);
    expect(JSON.stringify(report)).not.toContain("Ticket description");
    expect(formatEvaluationReport(report)).toContain("Accuracy: 20.00% (1/5)");
    expect(formatEvaluationReport(report)).toContain("Target (80%): FAIL");
  });

  test("passes the target at exactly 80 percent", async () => {
    const tickets = createTickets(["billing", "billing", "billing", "billing", "technical"]);
    const categorize = jest.fn<Promise<string>, [{ subject: string; description: string }]>()
      .mockResolvedValue('{"category":"billing","priority":"P3"}');

    const report = await evaluateCategorization(tickets, categorize);

    expect(report.accuracyPercent).toBe(80);
    expect(report.meetsTarget).toBe(true);
    expect(formatEvaluationReport(report)).toContain("Target (80%): PASS");
  });
});
