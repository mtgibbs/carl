/**
 * C.A.R.L. Web Chat Interface
 *
 * Simple chat UI for assignment queries.
 * "What's due this week?" -> Shows the list.
 * "Write my essay" -> "I'm sorry, I'm afraid I can't do that."
 */

import { isHomeworkRequest, handleHomeworkRequest } from "../guardrails/mod.ts";

const PORT = parseInt(Deno.env.get("PORT") || "8080");

interface ChatRequest {
  userId: string;
  message: string;
}

interface ChatResponse {
  message: string;
  assignments?: unknown[];
  lockedOut?: boolean;
}

async function handleChat(req: ChatRequest): Promise<ChatResponse> {
  const { userId, message } = req;

  // Check guardrails first
  if (isHomeworkRequest(message)) {
    const { response, lockedOut } = handleHomeworkRequest(userId);
    return { message: response, lockedOut };
  }

  // TODO: Pass to LLM for intent detection
  // TODO: Call Canvas API based on intent
  // For now, just acknowledge

  return {
    message: "I heard you. Canvas API integration coming soon.",
  };
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // CORS headers for local development
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check
  if (url.pathname === "/health") {
    return new Response(JSON.stringify({ status: "operational", name: "C.A.R.L." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Chat endpoint
  if (url.pathname === "/chat" && req.method === "POST") {
    try {
      const body: ChatRequest = await req.json();
      const response = await handleChat(body);
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Serve static UI (placeholder)
  if (url.pathname === "/" || url.pathname === "/index.html") {
    return new Response(PLACEHOLDER_HTML, {
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  }

  return new Response("Not found", { status: 404, headers: corsHeaders });
}

const PLACEHOLDER_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>C.A.R.L.</title>
  <style>
    body {
      font-family: monospace;
      background: #1a1a1a;
      color: #00ff00;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
    }
    .container {
      text-align: center;
      border: 1px solid #00ff00;
      padding: 2rem;
      max-width: 600px;
    }
    h1 { margin-bottom: 0; }
    .subtitle { color: #888; margin-top: 0.5rem; }
    .status { margin-top: 2rem; color: #ff0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>C.A.R.L.</h1>
    <p class="subtitle">Canvas Assignment Reminder Liaison</p>
    <p>"I'm sorry, I'm afraid I can't do that."</p>
    <p class="status">[ SYSTEM INITIALIZING ]</p>
  </div>
</body>
</html>`;

if (import.meta.main) {
  console.log("C.A.R.L. Web Interface");
  console.log("=".repeat(40));
  console.log(`Starting server on http://localhost:${PORT}`);

  Deno.serve({ port: PORT }, handler);
}
