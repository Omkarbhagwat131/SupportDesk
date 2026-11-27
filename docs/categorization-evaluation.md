# Ticket categorization evaluation

This evaluator compares Gemini's predicted category with the human-labelled category for exactly 20 tickets.

## Input CSV

Use an anonymized CSV with these required columns:

```csv
id,subject,description,expected_category
case-01,Invoice total is wrong,The latest invoice is higher than expected,billing
```

`id` is optional. If omitted, the script uses `case-01` through `case-20`. The only accepted labels are `account`, `billing`, `technical`, `product`, and `other`. Do not include requester emails or other personal data. The Gemini client masks common email, phone, SSN, and payment-card patterns, but masking cannot find every kind of personal information.

## Run

From the repository root on Windows:

```powershell
npm --prefix apps/api run evaluate:categorization -- "C:\data\lead-tickets.csv" "C:\data\categorization-report.json"
```

The script makes 20 sequential Gemini categorization requests, spacing calls at least five seconds apart to reduce provider rate limiting. HTTP 429 responses are retried up to three times with increasing delays; provider quotas may still vary. The second path is optional; when supplied, the JSON report is created without overwriting an existing file. The report includes overall accuracy, whether the 80% target was met, and each incorrect/failed case by ID. It does not include the ticket text.

For a smoke evaluation with synthetic examples, the repository includes `apps/api/fixtures/categorization-evaluation-synthetic.csv`:

```powershell
$dataset = (Resolve-Path "apps/api/fixtures/categorization-evaluation-synthetic.csv").Path
npm --prefix apps/api run evaluate:categorization -- "$dataset" "C:\data\categorization-synthetic-report.json"
```

The synthetic set is not the lead's dataset and must not be presented as an evaluation of the lead's tickets. Its labels are illustrative expected categories for clear, invented scenarios.

### Synthetic smoke run — 27 November 2026

- Model: `gemini-3.5-flash-lite`.
- Result: **19/20 (95%)**, meeting the 80% target for this synthetic set.
- Failure: `case-18` expected `other`, predicted `product` (procurement request for an accessibility statement).
- The run completed all 20 requests without provider failures after adding request pacing and HTTP 429 retries.
- Machine-readable report: `apps/api/fixtures/categorization-evaluation-synthetic-report.json`.
- This is a smoke result on assistant-authored synthetic examples, not the lead's independently labelled tickets or proof of general model accuracy.

Invalid model JSON, unsupported category/priority values, missing fields, extra fields, and provider errors count as incorrect cases rather than being used as predictions. The script makes no ticket updates.

Automated tests use mocked responses to verify parsing and scoring; they do not measure Gemini accuracy. The lead's 20-ticket labelled dataset is not currently in the repository, so no accuracy result for those tickets can be reported until it is provided.
