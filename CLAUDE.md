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
- Will use a 1-3B parameter model (Llama 3.2, Phi-3, or similar)
- Small enough that even if guardrails fail, it can't write coherent essays
- Only has access to Canvas tools - no general knowledge
- **Current**: Using keyword-based intent detection (no LLM yet)

### 3. Explicit Refusal Over Failure
- Pattern detection catches homework requests before they reach the LLM
- Clear "I can't do that" responses rather than hoping the model fails

## Architecture

```
┌─────────────────┐
│  Discord Bot    │──── Scheduled notifications ("3 things due tomorrow")
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Chat Web UI    │──── Natural language queries ("what's due?")
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Guardrails    │──── Pattern matching + HAL responses
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Intent Detection│──── Keyword-based (LLM optional via Ollama)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Canvas API    │──── Actual data fetching
└─────────────────┘
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Deno |
| Discord | Webhook notifications (no bot token needed) |
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

Current implementation uses keyword matching (no LLM required):

| Intent | Trigger Keywords |
|--------|------------------|
| `grades` | "grade", "score", "how am i doing" |
| `missing` | "missing", "overdue", "late", "forgot" |
| `due_soon` | "due", "upcoming", "this week", "tomorrow" |
| `help` | "help", "what can you" |
| `greeting` | "hi", "hello", "hey" |

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

Canvas credentials stored in 1Password `pi-cluster` vault, item `Canvas-API`:

| Field | Env Var |
|-------|---------|
| `token` | `CANVAS_API_TOKEN` |
| `base_url` | `CANVAS_BASE_URL` |
| `student_id` | `CANVAS_STUDENT_ID` |

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
- [x] Dockerfile with non-root user
- [x] GitHub Actions with multi-arch builds
- [x] Semver tagging support
- [x] Deployed to pi-cluster at carl.lab.mtgibbs.dev

### Next Steps
1. **Discord Bot**
   - Create Discord webhook in kid's server
   - Implement cron scheduling for daily digest
   - Add missing assignment alerts

2. **LLM Integration** (optional)
   - Deploy Ollama to cluster
   - Add intent classification layer
   - Improve natural language understanding

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
    ├── discord/
    │   └── bot.ts               # Discord webhook notifications
    ├── guardrails/
    │   ├── mod.ts               # Exports
    │   ├── patterns.ts          # Homework detection
    │   └── hal.ts               # HAL 9000 responses
    └── web/
        └── server.ts            # Chat UI server
```

## Development Commands

```bash
# Start web chat UI
deno task web

# Start Discord bot (needs Canvas API)
deno task discord

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
| `DISCORD_WEBHOOK_URL` | Discord webhook for notifications |
| `PORT` | Web server port (default: 8080) |
| `OLLAMA_URL` | Ollama API endpoint (optional) |
| `OLLAMA_MODEL` | Model to use (optional, e.g., llama3.2:1b) |

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
