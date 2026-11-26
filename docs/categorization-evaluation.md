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

The script makes 20 sequential Gemini categorization requests. The second path is optional; when supplied, the JSON report is created without overwriting an existing file. The report includes overall accuracy, whether the 80% target was met, and each incorrect/failed case by ID. It does not include the ticket text.

Invalid model JSON, unsupported category/priority values, missing fields, extra fields, and provider errors count as incorrect cases rather than being used as predictions. The script makes no ticket updates.

Automated tests use mocked responses to verify parsing and scoring; they do not measure Gemini accuracy. The supplied 20-ticket labelled dataset is not currently in the repository, so no real accuracy result can be reported until it is provided.
