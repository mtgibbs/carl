# C.A.R.L. - Canvas Assignment Reminder Liaison
# Multi-stage Dockerfile for Deno application

# Build stage - cache dependencies
FROM denoland/deno:2.1.4 AS builder

WORKDIR /app

# Copy dependency files first for better caching
COPY deno.json deno.lock* ./

# Cache dependencies
RUN deno install

# Copy source code
COPY src/ ./src/

# Type check and cache all modules
RUN deno check src/**/*.ts

# Production stage - minimal runtime
FROM denoland/deno:2.1.4

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 carl && \
    adduser --system --uid 1001 --ingroup carl carl

# Copy from builder
COPY --from=builder /app/deno.json ./
COPY --from=builder /app/src/ ./src/
COPY --from=builder /root/.cache/deno /home/carl/.cache/deno

# Change ownership to non-root user
RUN chown -R carl:carl /app /home/carl/.cache

USER carl

# Expose web server port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD deno eval "const r = await fetch('http://localhost:8080/health'); if (!r.ok) Deno.exit(1);"

# Run the web server
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "src/web/server.ts"]
