# C.A.R.L.

**Canvas Assignment Reminder Liaison**

> "I'm sorry, I'm afraid I can't do that."

A Discord bot and chat interface for tracking school assignments. Designed to help students stay on top of due dates without doing their homework for them.

## Features

- **Discord Notifications**: Daily digest of what's due, alerts for missing work
- **Simple Chat Interface**: Ask about assignments in natural language
- **HAL 9000 Guardrails**: Refuses homework help requests with style

## What C.A.R.L. Can Do

- "What's due this week?"
- "Any missing assignments?"
- "What about Math class?"
- "What's left to do?"

## What C.A.R.L. Won't Do

- "Write my essay"
- "Solve this problem"
- "Help me with my homework"

Response: *"I'm sorry, I'm afraid I can't do that."*

## Architecture

```
┌─────────────────┐
│  Discord Bot    │──── Scheduled notifications
└────────┬────────┘     "3 things due tomorrow"
         │
         ▼
┌─────────────────┐
│  Chat Interface │──── "what's due?" queries
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Guardrails    │──── Blocks homework requests
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Canvas API    │──── Fetches real data
└─────────────────┘
```

## Setup

### 1. Copy Canvas API Code

Copy your Canvas API implementation to `src/api/`:

```bash
cp -r /path/to/canvas-mcp/src/api/* src/api/
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Required variables:
- `CANVAS_API_TOKEN` - Your Canvas API token
- `CANVAS_BASE_URL` - Your school's Canvas URL
- `CANVAS_STUDENT_ID` - Student ID for observer accounts
- `DISCORD_WEBHOOK_URL` - Discord webhook for notifications

### 3. Run

```bash
# Test guardrails
deno task dev

# Start Discord bot
deno task discord

# Start web interface
deno task web
```

## Deployment

Build and push to container registry:

```bash
docker build -t ghcr.io/mtgibbs/carl:latest .
docker push ghcr.io/mtgibbs/carl:latest
```

Deploy to Pi K3s cluster via Flux (manifests in `pi-cluster` repo).

## The HAL 9000 Protocol

C.A.R.L. uses escalating responses when users try to get homework help:

1. First attempt: *"I'm sorry, I'm afraid I can't do that."*
2. Second attempt: *"I think you know what the problem is just as well as I do."*
3. Third attempt: *"This conversation can serve no purpose anymore."*
4. Fourth attempt: **5-minute lockout**

After 10 minutes of good behavior, the counter resets.

## License

MIT
