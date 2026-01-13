# C.A.R.L. - Canvas Assignment Reminder Liaison
# Multi-stage Dockerfile for Deno application

# Build stage - type check and cache dependencies
FROM denoland/deno:2.1.9 AS builder

WORKDIR /app

# Copy source code
COPY deno.json ./
COPY src/ ./src/

# Cache dependencies and type check
RUN deno cache src/web/server.ts
RUN deno check src/**/*.ts

# Production stage - minimal runtime
FROM denoland/deno:2.1.9

WORKDIR /app

# Create non-root user
RUN groupadd --gid 1000 carl && \
    useradd --uid 1000 --gid carl --shell /bin/sh --create-home carl

# Copy source from builder
COPY --from=builder /app/deno.json ./
COPY --from=builder /app/src/ ./src/

# Set ownership and cache dependencies as non-root user
RUN chown -R carl:carl /app
USER carl

# Cache dependencies as carl user
RUN deno cache src/web/server.ts

# Expose web server port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD deno eval "const r = await fetch('http://localhost:8080/health'); if (!r.ok) Deno.exit(1);"

# Run the web server
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "src/web/server.ts"]
