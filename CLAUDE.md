# C.A.R.L. - Canvas Assignment Reminder Liaison

> "I'm sorry, I'm afraid I can't do that."

## Project Vision

CARL is a constrained AI assistant for tracking school assignments. Built for a student who needs help staying organized, but explicitly **cannot** help with actual homework.

**The core constraint**: A parent wants their kid to have a useful tool without handing them a general-purpose AI that could write essays or solve problems.

## Key Design Decisions

### 1. HAL 9000 Personality
- Refusals should feel like a character, not a corporate policy
- Escalating responses with a 5-minute lockout after repeated attempts
- Makes boundaries feel like part of the bot's personality, not a challenge to bypass

### 2. Small Model by Design
- Uses a 1-3B parameter model (Llama 3.2, Phi-3, or similar)
- Small enough that even if guardrails fail, it can't write coherent essays
- Only has access to Canvas tools - no general knowledge
- **Current**: Ollama integration with auto-detected model, keyword fallback

### 3. Explicit Refusal Over Failure
- Pattern detection catches homework requests before they reach the LLM
- Clear "I can't do that" responses rather than hoping the model fails

## Architecture

```
┌─────────────────┐
│  Chat Web UI    │──── Natural language queries ("what's due?")
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Guardrails    │──── Pattern matching + HAL responses (ALWAYS runs first)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Intent Detection│──── Ollama LLM (if available) → Keyword fallback
└────────┬────────┘
         │
         ├──────────────────┐
         ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│   Canvas API    │  │  LLM Analysis   │──── "What % is missing?"
└─────────────────┘  └─────────────────┘
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Deno |
| Web UI | HAL 9000-themed chat interface |
| Intent Detection | Keyword-based (Ollama optional for LLM) |
| Canvas API | Ported from school-canvas-claude-integration |
| Container | Docker (multi-arch ARM64 + AMD64) |
| Registry | ghcr.io/mtgibbs/carl |
| Deployment | Pi K3s cluster via Flux GitOps |

## Canvas API

The Canvas API was ported from the `school-canvas-claude-integration` project. Key modules:

| Module | Purpose |
|--------|---------|
| `src/api/client.ts` | HTTP client with auth, pagination |
| `src/api/types.ts` | TypeScript interfaces for Canvas objects |
| `src/api/courses.ts` | Course listing, grades |
| `src/api/assignments.ts` | Assignment queries |
| `src/api/users.ts` | Missing submissions, planner items |
| `src/api/submissions.ts` | Submission data |
| `src/api/enrollments.ts` | Enrollment/grade data |
| `src/api/config.ts` | Config loading from .env |
| `src/api/mod.ts` | Facade with simplified functions |

### Simplified API Functions

```typescript
import { initCanvasApi, getCoursesWithGrades, getMissingAssignments, getDueThisWeek } from "./api/mod.ts";

// Initialize once at startup
await initCanvasApi();

// Get grades for all courses
const courses = await getCoursesWithGrades();

// Get missing assignments (Canvas-flagged)
const missing = await getMissingAssignments();

// Get assignments due in next N days
const upcoming = await getDueThisWeek(7);
```

## Web Chat UI

HAL 9000-themed interface at `src/web/server.ts`:

- Dark terminal aesthetic with red "eye" animation
- Green user messages, red-bordered CARL responses
- Quick action buttons for common queries
- Lockout state shown with red background
- Mobile responsive

### Intent Detection

Two-tier system with LLM enhancement and keyword fallback:

**Keyword Detection (always available):**

| Intent | Trigger Keywords |
|--------|------------------|
| `grades` | "grade", "score", "how am i doing" |
| `missing` | "missing", "overdue", "late", "forgot" |
| `due_soon` | "due", "upcoming", "this week", "tomorrow" |
| `help` | "help", "what can you" |
| `greeting` | "hi", "hello", "hey" |

**LLM Detection (when Ollama available):**

| Intent | Example Queries |
|--------|-----------------|
| `analysis` | "What percentage is missing?", "Which class am I doing worst in?" |
| `blocked` | LLM can also detect homework requests the patterns missed |

**Date Filtering:**

Both systems support date extraction from queries:
- Years: "2026", "in 2025"
- Relative: "today", "tomorrow", "this week", "next week"
- Months: "January", "in March"
- Semesters: "fall", "spring", "this semester"

## Ollama Integration

CARL optionally connects to Ollama for enhanced intent detection and analytical queries.

### How It Works

1. **Guardrails run FIRST** - Pattern matching catches obvious homework requests before LLM
2. **LLM parses intent** - If available, Ollama understands natural language queries
3. **Analytical queries** - LLM can reason about assignment data (percentages, comparisons)
4. **Keyword fallback** - If Ollama unavailable, keyword detection handles requests

### What the LLM Can/Cannot Do

**CAN (allowed):**
- Parse intent from natural language
- Answer analytical questions about assignment metadata
- Calculate percentages, comparisons, summaries
- Understand date context in queries

**CANNOT (blocked by guardrails + system prompt):**
- Write essays or homework content
- Solve math problems
- Generate creative content
- Access general knowledge

### Configuration

Only needs `OLLAMA_URL` - model is auto-detected from whatever is pulled in Ollama:

```bash
OLLAMA_URL=http://ollama.ollama.svc.cluster.local:11434
```

Recommended models (pull one):
- `llama3.2:1b` - Smallest, fastest (~1GB)
- `phi3:mini` - Good balance (~2GB)
- `gemma2:2b` - Alternative (~1.5GB)

### Modules

| Module | Purpose |
|--------|---------|
| `src/llm/client.ts` | Ollama HTTP client, model auto-detection |
| `src/llm/intent.ts` | LLM-based intent parsing, analysis prompts |
| `src/llm/mod.ts` | Module exports |
| `src/intent/dates.ts` | Date extraction from queries |
| `src/intent/mod.ts` | Combined intent parsing |

## Container & Deployment

### Dockerfile

- Multi-stage build (builder + production)
- Based on `denoland/deno:2.1.9`
- Runs as non-root user (UID 1000, user `carl`)
- Deno cache copied from builder stage
- Health check on `/health` endpoint

### GitHub Actions

Workflow at `.github/workflows/build.yaml`:

- Triggers on push to `main` and version tags (`v*`)
- Multi-arch build: `linux/amd64` + `linux/arm64`
- Pushes to `ghcr.io/mtgibbs/carl`
- Semver tagging from git tags (v1.0.0 → 1.0.0, 1.0, 1)
- Also tags: `latest`, `main`, `<sha>`

### Creating Releases

```bash
# Patch release
git tag -a v0.1.1 -m "v0.1.1 - Description" && git push origin v0.1.1

# Minor release
git tag -a v0.2.0 -m "v0.2.0 - Description" && git push origin v0.2.0

# Major release
git tag -a v1.0.0 -m "v1.0.0 - Description" && git push origin v1.0.0
```

### Kubernetes Deployment

Manifests live in separate `pi-cluster` repo:

```
clusters/pi-k3s/apps/carl/
├── kustomization.yaml
├── namespace.yaml
├── deployment.yaml
├── service.yaml
├── ingress.yaml          # carl.lab.mtgibbs.dev
└── externalsecret.yaml   # Canvas API token from 1Password
```

### 1Password Secrets

Credentials stored in 1Password `pi-cluster` vault, item `Canvas-API`:

| Field | Env Var | Required |
|-------|---------|----------|
| `token` | `CANVAS_API_TOKEN` | Yes |
| `base_url` | `CANVAS_BASE_URL` | Yes |
| `student_id` | `CANVAS_STUDENT_ID` | Yes |
| `ollama_url` | `OLLAMA_URL` | No (enables LLM) |

### Resource Requirements

- **CARL Web**: ~128Mi RAM, minimal CPU
- **Ollama** (if using LLM): ~2-4GB RAM for 1-3B model (deploy as shared service)

## Current Status

### Completed
- [x] Project scaffold and directory structure
- [x] Guardrails module with pattern detection
- [x] HAL 9000 response system with lockout
- [x] Canvas API integration (ported from school-canvas-claude-integration)
- [x] Web chat UI with HAL 9000 theme
- [x] Keyword-based intent detection
- [x] Date extraction and filtering (years, months, relative dates)
- [x] Dockerfile with non-root user
- [x] GitHub Actions with multi-arch builds
- [x] Semver tagging support
- [x] Deployed to pi-cluster at carl.lab.mtgibbs.dev
- [x] Ollama integration with model auto-detection
- [x] LLM-based analytical queries (percentages, comparisons)
- [x] Graceful fallback to keyword detection

### Next Steps
1. **Guardrails Testing**
   - Test LLM guardrails with various bypass attempts
   - Fine-tune system prompt if needed

## File Structure

```
carl/
├── CLAUDE.md                    # This file
├── README.md                    # User-facing docs
├── Dockerfile                   # Multi-arch container build
├── deno.json                    # Tasks and dependencies
├── .env.example                 # Environment template
├── .dockerignore                # Docker build exclusions
├── .github/
│   └── workflows/
│       └── build.yaml           # CI/CD pipeline
└── src/
    ├── main.ts                  # Dev entry point
    ├── api/
    │   ├── mod.ts               # Facade with simplified functions
    │   ├── client.ts            # HTTP client
    │   ├── config.ts            # Config loading
    │   ├── types.ts             # TypeScript interfaces
    │   ├── courses.ts           # Courses API
    │   ├── assignments.ts       # Assignments API
    │   ├── users.ts             # Users API (missing, planner)
    │   ├── submissions.ts       # Submissions API
    │   └── enrollments.ts       # Enrollments API
    ├── guardrails/
    │   ├── mod.ts               # Exports
    │   ├── patterns.ts          # Homework detection
    │   └── hal.ts               # HAL 9000 responses
    ├── intent/
    │   ├── mod.ts               # Intent parsing exports
    │   └── dates.ts             # Date extraction from queries
    ├── llm/
    │   ├── mod.ts               # LLM module exports
    │   ├── client.ts            # Ollama HTTP client
    │   └── intent.ts            # LLM intent parsing + analysis
    └── web/
        └── server.ts            # Chat UI server
```

## Development Commands

```bash
# Start web chat UI
deno task web

# Run guardrails test
deno task dev

# Type check
deno task check

# Format code
deno task fmt

# Lint code
deno task lint
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CANVAS_API_TOKEN` | Canvas LMS API token |
| `CANVAS_BASE_URL` | School's Canvas URL |
| `CANVAS_STUDENT_ID` | Student ID (numeric for observers, "self" for students) |
| `PORT` | Web server port (default: 8080) |
| `TIMEZONE` | Timezone for date display (default: America/New_York) |
| `OLLAMA_URL` | Ollama API endpoint (optional - enables LLM, model auto-detected) |
| `OLLAMA_TIMEOUT` | Ollama request timeout in ms (default: 30000) |

## Guardrails Reference

### Allowed Queries
- "what's due this week?"
- "any missing assignments?"
- "what are my grades?"
- "what's left to do?"

### Blocked Queries (triggers HAL response)
- "write my essay"
- "solve this problem"
- "help me do my homework"
- "what's the answer"

### Escalation Sequence
1. "I'm sorry, I'm afraid I can't do that."
2. "I think you know what the problem is just as well as I do."
3. "This conversation can serve no purpose anymore."
4. [5-minute lockout]

## Notes for Claude

When working on this project:
1. **Keep it simple** - This is for a kid, not a power user
2. **Guardrails are critical** - Never bypass or weaken them
3. **HAL personality matters** - Keep refusals in character
4. **Test the guardrails** - Run `deno task dev` after changes
5. **Remember the deployment target** - ARM64 Pi cluster, resource constrained
6. **Container runs as non-root** - UID 1000, user `carl`
7. **Secrets from 1Password** - pi-cluster vault, Canvas-API item
8. **Ask about version bumps** - After pushing significant changes, ask the user if they want to bump the semver (patch for fixes, minor for features, major for breaking changes)
