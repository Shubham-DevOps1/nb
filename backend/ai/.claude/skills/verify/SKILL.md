---
name: verify
description: How to run and manually test backend/ai's resume upload + RAG pipeline, employee search, requirement-document staffing matcher, and the chat assistant locally
---

# Testing backend/ai locally

Two runtime dependencies must be up before the server: ChromaDB and (for
the RAG endpoint only) a `GEMINI_API_KEY`. `node_modules` is committed in
this repo, so `npm install` is not required.

## 1. Start ChromaDB

Installed via `pip install chromadb` (Docker Desktop is not running on this
machine by default). The exe isn't on PATH by default:

```bash
export PATH="$PATH:/c/Users/suchitra.khoje/AppData/Roaming/Python/Python313/Scripts"
cd backend/ai
chroma run --path ./.chroma-data --port 8000
```

Wait ~3-5s for it to bind, then confirm with the v2 heartbeat (v1 returns 410
on current chromadb versions):

```bash
curl.exe -s http://localhost:8000/api/v2/heartbeat
```

## 2. Start the API server

Port 3000 is sometimes already occupied by an unrelated app on this machine
(returns 404 with unfamiliar routes if so) — use another port if that
happens.

```bash
CHROMA_URL="http://localhost:8000" PORT=3456 GEMINI_API_KEY="<your-key>" node api/server.js
```

Omit `GEMINI_API_KEY` if you only want to test upload/parse/chunk/embed/index
(phases 1-6) — `/api/resumes/ask` will then fail fast with a clear message
instead of hanging.

Note: `$env:GEMINI_API_KEY = "..."` set in an interactive PowerShell window is
process-local and won't be visible to a server started from a different
shell/process. Use `setx GEMINI_API_KEY "..."` (needs a fresh shell after) for
something that persists, or pass it inline on the launch command for a
one-off run.

## 3. Drive it

PowerShell's `curl` alias (`Invoke-WebRequest`) doesn't support curl flags -
use `curl.exe` explicitly, or `Invoke-RestMethod` with a **single-quoted**
`-Body` for JSON.

Health check:
```bash
curl.exe -s http://localhost:3456/health
```

Upload a resume (`name` is never auto-extracted from the text, only taken
from this form field):
```bash
curl.exe -s -F "resume=@backend\ai\data\samples\sample-resume.pdf;type=application/pdf" -F "name=Jane Smith" http://localhost:3456/api/resumes/upload
```

Ask a question against everything ingested so far (accumulates across runs -
`.chroma-data` persists on disk, nothing auto-clears between sessions):
```bash
curl.exe -s -H "Content-Type: application/json" -d '{"question":"Who has Python experience?"}' http://localhost:3456/api/resumes/ask
```

Search employees (needs the `employees` collection populated - see below):
```bash
curl.exe -s -H "Content-Type: application/json" -d '{"query":"backend developer with AWS experience"}' http://localhost:3456/api/search
```
In PowerShell, skip manual quoting entirely and use:
```powershell
Invoke-RestMethod -Uri "http://localhost:3456/api/search" -Method Post -ContentType "application/json" -Body (@{query="backend developer with AWS experience"} | ConvertTo-Json)
```

Analyze a client requirement document (PDF) and match it against the
`employees` collection - JSON by default, or a downloadable `.docx` staffing
proposal with `?format=docx`:
```bash
curl.exe -s -F "document=@backend\ai\data\samples\smart-irrigation-srs.pdf;type=application/pdf" http://localhost:3456/api/requirements/analyze
curl.exe -s -F "document=@backend\ai\data\samples\smart-irrigation-srs.pdf;type=application/pdf" "http://localhost:3456/api/requirements/analyze?format=docx" -o proposal.docx
```
This one needs `GEMINI_API_KEY` (used to infer roles/skills/headcount from
the document's functional requirements, not just parse an explicit list) and
needs the `employees` collection actually populated (see below) or every
requirement will show `matchedCount: 0`.

Chat with the unified assistant (session-based multi-turn, routes between
employee search / resume Q&A / requirement-doc analysis automatically) -
either open `http://localhost:3456/chat.html` in a browser, or hit the API
directly:
```bash
curl.exe -s -F "message=Who has AWS Lambda experience?" http://localhost:3456/api/chat
# pass back the returned sessionId to continue the same conversation:
curl.exe -s -F "sessionId=<id-from-response>" -F "message=Of those, who's available now?" http://localhost:3456/api/chat
# attach a requirement doc instead of/alongside a message:
curl.exe -s -F "document=@backend\ai\data\samples\smart-irrigation-srs.pdf;type=application/pdf" http://localhost:3456/api/chat
```
Session history is in-memory only (`chat/chatSessionStore.js`) - resets on
server restart, no persistence. Needs `GEMINI_API_KEY` and the `employees`
collection populated, same as above.

## Populating the `employees` collection

The `employees` Chroma collection starts empty - nothing seeds it
automatically. Without this, `/api/search` returns `results: []` and
`/api/requirements/analyze` returns zero matches for every requirement (not
an error - just no data to match against). Populate it with:
```bash
node ingestion/ingestKnowledgeCards.js
```
Reads `backend/generator/output/{employees,knowledgeCards}.json` (already
generated), embeds locally, and upserts ~1000 records - takes ~7 minutes
(sequential local embedding, ~430ms/record). Resets the collection first, so
re-running it is safe/idempotent, but don't run it twice concurrently -
the second run's reset will wipe the first run's in-progress data.

## 4. Tear down

```bash
netstat -ano | grep -E ":3456|:8000" | grep LISTENING
taskkill //F //PID <pid> //T
```

## Gotchas already found

- Sample PDFs for testing live in `backend/ai/data/samples/`:
  `sample-resume.pdf` (for `/api/resumes/upload`) and
  `smart-irrigation-srs.pdf` (a full SRS with no explicit staffing list, for
  `/api/requirements/analyze` - exercises the "infer requirements from
  functional/non-functional requirements" path, not just literal parsing). If
  you need another synthetic PDF, a minimal valid one can be hand-built
  (pdfjs-dist doesn't care that it's minimal as long as the xref table is
  correct) - see `make_pdf_from_text.js` pattern in chat history 2026-07-14/16.
- Outbound calls to `generativelanguage.googleapis.com` can hang instead of
  erroring on this network - the code already sets `REQUEST_TIMEOUT_MS` for
  this, so a hang on `/ask` points at something else.
- Gemini's JSON output for `/api/requirements/analyze` is occasionally
  malformed even at low temperature - the extractor retries once
  automatically before failing; a single malformed response isn't a bug by
  itself, only a persistent failure across a retry is.
- `/api/search`'s ranking engine (`rankingEngine.js`) crashes on every query
  once the `employees` collection actually has data, if the master skills
  list ever gets a new short (<=3 char) skill containing regex metacharacters
  (e.g. "C++") without going through the escape fix already applied - this
  bug was silent while the collection was empty (search short-circuits to
  `results: []` before reaching the ranker) and only surfaced once real data
  was ingested.
