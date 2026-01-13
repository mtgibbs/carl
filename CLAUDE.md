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
│  Small LLM      │──── Intent parsing only (Ollama)
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
| Web UI | Simple Deno HTTP server |
| LLM | Ollama with Llama 3.2 1B or 3B |
| Canvas API | Ported from parent's existing MCP |
| Container | Docker (multi-arch for ARM64) |
| Deployment | Pi K3s cluster via Flux GitOps |

## Deployment Plan

CARL will be deployed to a Pi K3s cluster running at home.

### Container Registry
- Push images to GitHub Container Registry (ghcr.io)
- GitHub Actions builds on push to main
- Multi-arch build for ARM64 (Pi 5)

### Kubernetes Deployment
- Deployment manifests live in separate `pi-cluster` repo
- Flux watches for image updates and auto-deploys
- ExternalSecrets pulls Canvas API token from 1Password

### Expected Manifests (in pi-cluster repo)
```
clusters/pi-k3s/apps/carl/
├── kustomization.yaml
├── namespace.yaml
├── deployment.yaml
├── service.yaml
├── ingress.yaml          # carl.local or similar
├── externalsecret.yaml   # Canvas API token
└── configmap.yaml        # Non-secret config
```

### Resource Requirements
- **CARL Web/Discord**: Minimal (~128Mi RAM)
- **Ollama sidecar or separate deployment**: ~2-4GB RAM for 1-3B model
- Likely deploy Ollama as a shared service, not per-app

## Current Status

### Completed
- [x] Project scaffold and directory structure
- [x] Guardrails module with pattern detection
- [x] HAL 9000 response system with lockout
- [x] Discord bot placeholder
- [x] Web server placeholder with chat endpoint
- [x] Basic HTML landing page

### Next Steps
1. **Canvas API Integration**
   - Copy API code from existing canvas-mcp project
   - Wire up to Discord bot for real notifications
   - Wire up to chat endpoint for queries

2. **Discord Bot**
   - Create Discord webhook in kid's server
   - Implement cron scheduling for daily digest
   - Add missing assignment alerts

3. **LLM Integration**
   - Deploy Ollama to cluster (or run locally for dev)
   - Add intent classification layer
   - Map intents to Canvas API calls

4. **Containerization**
   - Create Dockerfile
   - Set up GitHub Actions for builds
   - Push to ghcr.io

5. **Cluster Deployment**
   - Create Kubernetes manifests in pi-cluster repo
   - Set up ExternalSecret for Canvas token
   - Configure ingress

## File Structure

```
carl/
├── CLAUDE.md           # This file
├── README.md           # User-facing docs
├── deno.json           # Tasks and dependencies
├── .env.example        # Environment template
├── src/
│   ├── main.ts         # Dev entry point
│   ├── api/
│   │   └── mod.ts      # Canvas API (needs implementation)
│   ├── discord/
│   │   └── bot.ts      # Discord webhook notifications
│   ├── guardrails/
│   │   ├── mod.ts      # Exports
│   │   ├── patterns.ts # Homework detection
│   │   └── hal.ts      # HAL 9000 responses
│   └── web/
│       └── server.ts   # Chat UI server
└── (future)
    ├── Dockerfile
    └── .github/workflows/build.yaml
```

## Development Commands

```bash
# Run guardrails test
deno task dev

# Start Discord bot (needs Canvas API)
deno task discord

# Start web chat UI
deno task web

# Type check
deno task check
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CANVAS_API_TOKEN` | Canvas LMS API token |
| `CANVAS_BASE_URL` | School's Canvas URL |
| `CANVAS_STUDENT_ID` | Student ID for observer accounts |
| `DISCORD_WEBHOOK_URL` | Discord webhook for notifications |
| `PORT` | Web server port (default: 8080) |
| `OLLAMA_URL` | Ollama API endpoint |
| `OLLAMA_MODEL` | Model to use (e.g., llama3.2:1b) |

## Guardrails Reference

### Allowed Queries
- "what's due this week?"
- "any missing assignments?"
- "what about math class?"
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

## Parent's Canvas MCP

The parent has a separate Canvas MCP/CLI tool for their own use with Claude. That tool:
- Lives in a separate local repo (not yet on GitHub)
- Provides full Canvas API access
- Used for nuanced queries ("why is Science at a C+?")

CARL shares the same Canvas API code but has a constrained interface.

## Notes for Claude

When working on this project:
1. **Keep it simple** - This is for a kid, not a power user
2. **Guardrails are critical** - Never bypass or weaken them
3. **HAL personality matters** - Keep refusals in character
4. **Test the guardrails** - Run `deno task dev` after changes
5. **Remember the deployment target** - ARM64 Pi cluster, resource constrained
