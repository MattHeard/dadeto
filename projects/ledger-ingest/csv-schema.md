# Ledger Ingest CSV Schema

This document describes the semicolon-delimited transaction export shape that can be adapted into `ImportTransactionsInput` for the ledger-ingest toy.

The CSV is treated as a raw adapter format. The parser should convert each row into a JSON record before the existing import core runs.

## File Shape

- Encoding: UTF-8
- Delimiter: semicolon (`;`)
- Header row: required
- Record row: one transaction record per line
- Quoting: standard CSV quoting rules should be supported
- Empty lines: may be ignored if they do not contain data

## Column Schema

| Column name | Type | Required | Description | Normalization notes |
| --- | --- | --- | --- | --- |
| `Booking date` | date string | yes | Date the transaction was booked in the account ledger. | Parse as a calendar date in day-month-year order. Preserve as a raw string in the adapter input, then normalize into a canonical `postedDate`. |
| `Value date` | date string | yes | Date the transaction became effective for settlement purposes. | Parse as a calendar date in day-month-year order. Keep as metadata unless the adapter needs it for source-specific rules. |
| `Transaction type` | categorical text | yes | Bank-provided transaction class or posting category. | Preserve as a raw string. Treat as source metadata unless a source-specific mapping needs it. |
| `Booking text` | free-form text | yes | Main narrative text associated with the transaction. | Preserve as text. The adapter can derive canonical description text from it. |
| `Amount` | signed decimal text | yes | Monetary value of the transaction. | Parse into a number. Support comma decimals and signed values. |
| `Currency` | currency code text | yes | Currency for the transaction amount. | Normalize to canonical upper-case ISO-style code. |
| `Account IBAN` | account identifier text | yes | Account identifier for the source account. | Preserve as text so the adapter can identify the source account. |
| `Category` | categorical text | yes | Higher-level user or bank categorization. | Preserve as text. It may remain metadata or become a downstream classification input. |

## Parsed Record Contract

Each CSV row should be converted into a JSON object with the raw row fields preserved under explicit keys before the import core runs.

Recommended intermediate JSON shape:

```ts
{
  bookingDate: string;
  valueDate: string;
  transactionType: string;
  bookingText: string;
  amount: string;
  currency: string;
  accountIban: string;
  category: string;
}
```

This is still an adapter shape, not the final ledger-ingest core shape.

## Adapter Mapping Goals

The CSV-to-JSON adapter should transform rows into the existing import core without changing the core contract.

Expected adapter responsibilities:

- parse the CSV into one JSON object per row
- preserve the source account identifier and category as raw metadata
- normalize dates and amounts into canonical representations
- map the booking narrative into the canonical description field
- provide the raw row as audit metadata if the import core needs it

## Validation Rules

- The header row must contain the required columns.
- Each record row must have the same number of columns as the header.
- Required fields must not be empty after trimming.
- Amount values must be parseable as signed decimals.
- Dates must be parseable as calendar dates in the expected locale format.
- Currency values must be present for every row.

## Not Yet Specified

The following decisions are still adapter policy choices rather than fixed schema rules:

- whether `Booking date` or `Value date` becomes the canonical posting date
- whether `Transaction type` participates in duplicate detection
- whether `Category` remains metadata or becomes a normalization signal
- whether the adapter should treat the CSV source as a single account or allow multi-account imports

