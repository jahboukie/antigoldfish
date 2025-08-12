# Receipts Schema

AntiGoldfishMode emits local-only JSON receipts for most commands when `--json` is used and always writes a compact receipt file to the journal directory.

This document describes the fields so tools and scripts can consume them safely.

## Location

- Live print: add `--json` to any command to print the receipt to stdout
- Saved files: `.antigoldfishmode/journal/<YYYY-MM>/<receiptId>.json`

## Envelope

All receipts share the following envelope shape:

- `id` (string): Stable, unique receipt identifier (ULID-like)
- `cmd` (string): Command name (e.g., `status`, `index-code`)
- `args` (object): Canonicalized arguments used for execution
- `success` (boolean): True if the operation succeeded
- `timestamp` (string, ISO 8601): When the receipt was written
- `durationMs` (number): Optional measured duration in milliseconds
- `error` (string | undefined): Error message when `success=false`
- `result` (object): Command-specific output payload
- `meta` (object): Additional metadata (opaque and optional)
  - `resultSummary` (object | undefined): A short, human-friendly summary for quick UI
  - `digests` (object | undefined): Deterministic digests over inputs/outputs for integrity

## Command-specific result payloads

- `status`
  - `project.path` (string)
  - `project.dbPath` (string)
  - `memory.total` (number)
  - `memory.sizeMB` (number)

- `vector-status`
  - `backend` ("sqlite-vss" | "local-js")
  - `dimensions` (number)
  - `count` (number)
  - `note` (string | undefined)

- `remember`
  - `memoryId` (number)

- `recall`
  - `resultsCount` (number)

- `index-code`
  - `saved` (number)
  - `root` (string)
  - `fileCount` (number)
  - `digest` (string) — digest of the considered file list

- `search-code`
  - `count` (number)

- `export-context`
  - `outPath` (string)
  - `type` (string)
  - `count` (number)
  - `signed` (boolean)

- `import-context`
  - `verified` (boolean)
  - `schemaVersion` (number)
  - `type` (string)
  - `metadataRows` (number)
  - `vectors` (object | undefined) `{ rows: number, dim: number, backend?: string }`

## Examples

Minimal success:

```json
{
  "id": "01J123ABCDXYZ9PQRS7T8UVWX",
  "cmd": "status",
  "args": {},
  "success": true,
  "timestamp": "2025-08-10T12:34:56.789Z",
  "result": {
    "project": {"path": "C:/repo", "dbPath": "C:/repo/.antigoldfishmode/memory.db"},
    "memory": {"total": 42, "sizeMB": 1.23}
  }
}
```

Failure with error and digests:

```json
{
  "id": "01J123FAILXYZ9PQRS7T8UVWX",
  "cmd": "search-code",
  "args": {"query": "MemoryEngine", "topk": 20},
  "success": false,
  "timestamp": "2025-08-10T12:40:00.001Z",
  "error": "Failed to decrypt database - possible corruption or tampering",
  "meta": {
    "digests": {"resultDigest": "3f4b..."}
  }
}
```

## Stability and versioning

- Fields documented above are stable for the 1.x series.
- New fields may be added with default-null semantics.
- Breaking changes will bump major version and be noted in CHANGELOG.

If you build tooling on top of receipts, prefer defensive reads and treat unknown fields as optional.
