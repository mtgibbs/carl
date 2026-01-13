/**
 * C.A.R.L. Web Chat Interface
 *
 * HAL 9000-themed chat UI for assignment queries.
 * "What's due this week?" -> Shows the list.
 * "Write my essay" -> "I'm sorry, I'm afraid I can't do that."
 */

import { isHomeworkRequest, handleHomeworkRequest, isLockedOut } from "../guardrails/mod.ts";
import {
  initCanvasApi,
  getCoursesWithGrades,
  getMissingAssignments,
  getUnsubmittedPastDue,
  getDueThisWeek,
  type SimpleCourse,
  type SimpleAssignment,
  type SimpleTodoItem,
} from "../api/mod.ts";

const PORT = parseInt(Deno.env.get("PORT") || "8080");

interface ChatRequest {
  userId: string;
  message: string;
}

interface ChatResponse {
  message: string;
  data?: {
    type: "courses" | "assignments" | "todo";
    items: unknown[];
  };
  lockedOut?: boolean;
  error?: boolean;
}

// Simple intent detection based on keywords
type Intent =
  | "grades"
  | "missing"
  | "due_soon"
  | "help"
  | "greeting"
  | "unknown";

function detectIntent(message: string): Intent {
  const lower = message.toLowerCase();

  // Grades queries
  if (
    lower.includes("grade") ||
    lower.includes("score") ||
    lower.includes("how am i doing") ||
    lower.includes("my classes")
  ) {
    return "grades";
  }

  // Missing assignments
  if (
    lower.includes("missing") ||
    lower.includes("overdue") ||
    lower.includes("late") ||
    lower.includes("haven't submitted") ||
    lower.includes("forgot")
  ) {
    return "missing";
  }

  // Due soon / upcoming
  if (
    lower.includes("due") ||
    lower.includes("upcoming") ||
    lower.includes("this week") ||
    lower.includes("tomorrow") ||
    lower.includes("today") ||
    lower.includes("what's left") ||
    lower.includes("to do") ||
    lower.includes("todo")
  ) {
    return "due_soon";
  }

  // Help
  if (
    lower.includes("help") ||
    lower.includes("what can you") ||
    lower.includes("how do i")
  ) {
    return "help";
  }

  // Greetings
  if (
    lower.match(/^(hi|hello|hey|sup|yo|greetings)/i) ||
    lower === "hi" ||
    lower === "hello"
  ) {
    return "greeting";
  }

  return "unknown";
}

function formatDate(date: Date | null): string {
  if (!date) return "No due date";
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === now.toDateString()) {
    return `Today at ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow at ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  }
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatGradesResponse(courses: SimpleCourse[]): ChatResponse {
  if (courses.length === 0) {
    return { message: "I don't see any active courses." };
  }

  const lines = courses.map((c) => {
    const grade = c.grade || "N/A";
    const score = c.score !== null ? ` (${c.score.toFixed(1)}%)` : "";
    return `• ${c.name}: ${grade}${score}`;
  });

  return {
    message: `Here are your current grades:\n\n${lines.join("\n")}`,
    data: { type: "courses", items: courses },
  };
}

function formatMissingResponse(assignments: SimpleAssignment[]): ChatResponse {
  if (assignments.length === 0) {
    return { message: "Good news - I don't see any missing assignments." };
  }

  const lines = assignments.map((a) => {
    const due = a.dueAt ? `(was due ${formatDate(a.dueAt)})` : "";
    return `• ${a.name} - ${a.courseName} ${due}`;
  });

  const warning = assignments.length >= 3
    ? "\n\n⚠️ That's quite a few. You might want to prioritize these."
    : "";

  return {
    message: `You have ${assignments.length} missing assignment${assignments.length === 1 ? "" : "s"}:\n\n${lines.join("\n")}${warning}`,
    data: { type: "assignments", items: assignments },
  };
}

function formatDueResponse(items: SimpleTodoItem[]): ChatResponse {
  const unsubmitted = items.filter((i) => !i.submitted);

  if (unsubmitted.length === 0) {
    return { message: "You're all caught up! Nothing due in the next week." };
  }

  const lines = unsubmitted.map((i) => {
    const due = formatDate(i.dueAt);
    const points = i.pointsPossible ? ` (${i.pointsPossible} pts)` : "";
    return `• ${i.title} - ${i.courseName}${points}\n  Due: ${due}`;
  });

  return {
    message: `Here's what's coming up:\n\n${lines.join("\n\n")}`,
    data: { type: "todo", items: unsubmitted },
  };
}

const HELP_MESSAGE = `I can help you track your assignments. Try asking:

• "What's due this week?"
• "Do I have any missing assignments?"
• "What are my grades?"
• "What's due tomorrow?"

I cannot help with actual homework. That's not my function.`;

const GREETING_RESPONSES = [
  "Hello. I am C.A.R.L., your Canvas Assignment Reminder Liaison. How can I help you track your assignments?",
  "Greetings. I'm here to help you stay on top of your schoolwork. What would you like to know?",
  "Hello. I'm ready to assist with assignment tracking. What do you need?",
];

const UNKNOWN_RESPONSES = [
  "I'm not sure I understand. I can help you check grades, find missing assignments, or see what's due soon.",
  "My capabilities are limited to assignment tracking. Try asking about what's due or your grades.",
  "I don't follow. Would you like to know about upcoming assignments or your current grades?",
];

async function handleChat(req: ChatRequest): Promise<ChatResponse> {
  const { userId, message } = req;

  // Check if locked out first
  if (isLockedOut(userId)) {
    const { response, lockedOut } = handleHomeworkRequest(userId);
    return { message: response, lockedOut };
  }

  // Check guardrails
  if (isHomeworkRequest(message)) {
    const { response, lockedOut } = handleHomeworkRequest(userId);
    return { message: response, lockedOut };
  }

  // Detect intent and respond
  const intent = detectIntent(message);

  try {
    switch (intent) {
      case "grades": {
        const courses = await getCoursesWithGrades();
        return formatGradesResponse(courses);
      }

      case "missing": {
        // Get both Canvas-flagged missing AND unsubmitted past-due
        const [missing, unsubmitted] = await Promise.all([
          getMissingAssignments(),
          getUnsubmittedPastDue(),
        ]);

        // Dedupe by assignment ID
        const seen = new Set(missing.map((m) => m.id));
        const combined = [
          ...missing,
          ...unsubmitted.filter((u) => !seen.has(u.id)),
        ];

        return formatMissingResponse(combined);
      }

      case "due_soon": {
        const items = await getDueThisWeek(7);
        return formatDueResponse(items);
      }

      case "help": {
        return { message: HELP_MESSAGE };
      }

      case "greeting": {
        const response = GREETING_RESPONSES[Math.floor(Math.random() * GREETING_RESPONSES.length)];
        return { message: response };
      }

      default: {
        const response = UNKNOWN_RESPONSES[Math.floor(Math.random() * UNKNOWN_RESPONSES.length)];
        return { message: response };
      }
    }
  } catch (error) {
    console.error("Canvas API error:", error);
    return {
      message: "I'm having trouble connecting to Canvas right now. Please try again later.",
      error: true,
    };
  }
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // CORS headers
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
  if (url.pathname === "/api/chat" && req.method === "POST") {
    try {
      const body: ChatRequest = await req.json();
      if (!body.message || typeof body.message !== "string") {
        return new Response(JSON.stringify({ error: "Message is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Default userId if not provided
      body.userId = body.userId || "default-user";
      const response = await handleChat(body);
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Serve static UI
  if (url.pathname === "/" || url.pathname === "/index.html") {
    return new Response(CHAT_HTML, {
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  }

  return new Response("Not found", { status: 404, headers: corsHeaders });
}

// HAL 9000-themed chat interface
const CHAT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>C.A.R.L.</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Courier New', Courier, monospace;
      background: #0a0a0a;
      color: #e0e0e0;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* Header */
    .header {
      background: linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%);
      border-bottom: 1px solid #333;
      padding: 1rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .hal-eye {
      width: 48px;
      height: 48px;
      background: radial-gradient(circle at 30% 30%, #ff6b6b 0%, #cc0000 50%, #660000 100%);
      border-radius: 50%;
      box-shadow: 0 0 20px rgba(255, 0, 0, 0.5), inset 0 0 10px rgba(0, 0, 0, 0.5);
      animation: pulse 4s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 20px rgba(255, 0, 0, 0.5), inset 0 0 10px rgba(0, 0, 0, 0.5); }
      50% { box-shadow: 0 0 30px rgba(255, 0, 0, 0.7), inset 0 0 10px rgba(0, 0, 0, 0.5); }
    }

    .header-text h1 {
      font-size: 1.5rem;
      color: #fff;
      letter-spacing: 0.2em;
    }

    .header-text p {
      font-size: 0.75rem;
      color: #888;
      letter-spacing: 0.1em;
    }

    /* Chat container */
    .chat-container {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .message {
      max-width: 80%;
      padding: 0.75rem 1rem;
      border-radius: 4px;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    .message.carl {
      align-self: flex-start;
      background: #1a1a1a;
      border-left: 3px solid #cc0000;
      color: #e0e0e0;
    }

    .message.carl.error {
      border-left-color: #ff6600;
    }

    .message.carl.lockout {
      border-left-color: #ff0000;
      background: #2a1a1a;
    }

    .message.user {
      align-self: flex-end;
      background: #1a2a1a;
      border-right: 3px solid #00cc00;
      color: #a0e0a0;
    }

    .message .timestamp {
      font-size: 0.65rem;
      color: #666;
      margin-top: 0.5rem;
    }

    /* Input area */
    .input-area {
      background: #1a1a1a;
      border-top: 1px solid #333;
      padding: 1rem;
      display: flex;
      gap: 0.75rem;
    }

    .input-area input {
      flex: 1;
      background: #0d0d0d;
      border: 1px solid #333;
      color: #00ff00;
      padding: 0.75rem 1rem;
      font-family: inherit;
      font-size: 1rem;
      border-radius: 4px;
      outline: none;
    }

    .input-area input:focus {
      border-color: #00ff00;
      box-shadow: 0 0 5px rgba(0, 255, 0, 0.3);
    }

    .input-area input::placeholder {
      color: #444;
    }

    .input-area input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .input-area button {
      background: linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%);
      border: 1px solid #444;
      color: #00ff00;
      padding: 0.75rem 1.5rem;
      font-family: inherit;
      font-size: 1rem;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .input-area button:hover:not(:disabled) {
      background: linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 100%);
      border-color: #00ff00;
    }

    .input-area button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Loading indicator */
    .loading {
      display: none;
      align-self: flex-start;
      padding: 0.75rem 1rem;
    }

    .loading.active {
      display: block;
    }

    .loading-dots {
      display: inline-flex;
      gap: 4px;
    }

    .loading-dots span {
      width: 8px;
      height: 8px;
      background: #cc0000;
      border-radius: 50%;
      animation: loadingDot 1.4s ease-in-out infinite;
    }

    .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
    .loading-dots span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes loadingDot {
      0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
      40% { opacity: 1; transform: scale(1); }
    }

    /* Quick actions */
    .quick-actions {
      padding: 0.5rem 1rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      background: #0d0d0d;
      border-top: 1px solid #222;
    }

    .quick-actions button {
      background: #1a1a1a;
      border: 1px solid #333;
      color: #888;
      padding: 0.4rem 0.8rem;
      font-family: inherit;
      font-size: 0.8rem;
      cursor: pointer;
      border-radius: 3px;
      transition: all 0.2s;
    }

    .quick-actions button:hover {
      color: #00ff00;
      border-color: #00ff00;
    }

    /* Mobile adjustments */
    @media (max-width: 600px) {
      .message {
        max-width: 90%;
      }

      .header-text h1 {
        font-size: 1.2rem;
      }

      .hal-eye {
        width: 40px;
        height: 40px;
      }
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="hal-eye"></div>
    <div class="header-text">
      <h1>C.A.R.L.</h1>
      <p>Canvas Assignment Reminder Liaison</p>
    </div>
  </header>

  <div class="chat-container" id="chat">
    <div class="message carl">Hello. I am C.A.R.L., your Canvas Assignment Reminder Liaison.

I can help you track assignments, check grades, and find what's due.

I cannot help with homework. That's not my function.
      <div class="timestamp">${new Date().toLocaleTimeString()}</div>
    </div>
  </div>

  <div class="loading" id="loading">
    <div class="loading-dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
  </div>

  <div class="quick-actions">
    <button onclick="sendQuick('What\\'s due this week?')">What's due?</button>
    <button onclick="sendQuick('Do I have any missing assignments?')">Missing work?</button>
    <button onclick="sendQuick('What are my grades?')">My grades</button>
    <button onclick="sendQuick('Help')">Help</button>
  </div>

  <div class="input-area">
    <input
      type="text"
      id="input"
      placeholder="Ask about your assignments..."
      autocomplete="off"
    />
    <button onclick="sendMessage()" id="sendBtn">SEND</button>
  </div>

  <script>
    const chat = document.getElementById('chat');
    const input = document.getElementById('input');
    const loading = document.getElementById('loading');
    const sendBtn = document.getElementById('sendBtn');

    // Generate a simple user ID for this session
    const userId = 'user-' + Math.random().toString(36).substr(2, 9);

    function addMessage(text, isUser = false, isError = false, isLockout = false) {
      const div = document.createElement('div');
      div.className = 'message ' + (isUser ? 'user' : 'carl');
      if (isError) div.classList.add('error');
      if (isLockout) div.classList.add('lockout');

      const time = new Date().toLocaleTimeString();
      div.innerHTML = text + '<div class="timestamp">' + time + '</div>';

      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
    }

    async function sendMessage() {
      const text = input.value.trim();
      if (!text) return;

      // Add user message
      addMessage(text, true);
      input.value = '';

      // Show loading
      loading.classList.add('active');
      input.disabled = true;
      sendBtn.disabled = true;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, message: text }),
        });

        const data = await res.json();

        // Hide loading
        loading.classList.remove('active');
        input.disabled = false;
        sendBtn.disabled = false;

        // Add CARL's response
        addMessage(data.message, false, data.error, data.lockedOut);

        // Focus input
        input.focus();
      } catch (err) {
        loading.classList.remove('active');
        input.disabled = false;
        sendBtn.disabled = false;
        addMessage('Connection error. Please try again.', false, true);
        input.focus();
      }
    }

    function sendQuick(text) {
      input.value = text;
      sendMessage();
    }

    // Enter key sends message
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    // Focus input on load
    input.focus();
  </script>
</body>
</html>`;

if (import.meta.main) {
  console.log("C.A.R.L. Web Interface");
  console.log("=".repeat(40));

  // Initialize Canvas API
  try {
    await initCanvasApi();
    console.log("Canvas API initialized");
  } catch (error) {
    console.warn("Warning: Canvas API not configured -", (error as Error).message);
    console.warn("Chat will work but Canvas queries will fail.");
  }

  console.log(`Starting server on http://localhost:${PORT}`);
  Deno.serve({ port: PORT }, handler);
}
