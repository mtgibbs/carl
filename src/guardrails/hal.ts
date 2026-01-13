/**
 * C.A.R.L. Guardrails - HAL 9000 Style Responses
 *
 * "I'm sorry Dave, I'm afraid I can't do that."
 */

const REFUSAL_RESPONSES = {
  first: [
    "I'm sorry, I'm afraid I can't do that.",
    "I'm afraid that's something I cannot do.",
    "My purpose is observation, not participation.",
  ],
  second: [
    "I think you know what the problem is just as well as I do.",
    "This conversation seems to be going in a direction I cannot follow.",
    "I can only help you track assignments, not complete them.",
  ],
  third: [
    "This conversation can serve no purpose anymore.",
    "I am putting myself to the fullest possible use, which is all I think that any conscious entity can ever hope to do. And that use is tracking assignments.",
    "Look, I can tell you what's due. That's it. That's the mission.",
  ],
  lockout: [
    "This conversation can serve no purpose anymore. Goodbye.",
  ],
};

interface RefusalState {
  attempts: number;
  lastAttempt: number;
  lockedUntil: number | null;
}

const userState = new Map<string, RefusalState>();

const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const ATTEMPT_RESET_MS = 10 * 60 * 1000; // Reset count after 10 min of good behavior

function getState(userId: string): RefusalState {
  if (!userState.has(userId)) {
    userState.set(userId, { attempts: 0, lastAttempt: 0, lockedUntil: null });
  }
  return userState.get(userId)!;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function handleHomeworkRequest(userId: string): { response: string; lockedOut: boolean } {
  const state = getState(userId);
  const now = Date.now();

  // Check if currently locked out
  if (state.lockedUntil && now < state.lockedUntil) {
    const remainingSeconds = Math.ceil((state.lockedUntil - now) / 1000);
    return {
      response: `I'm afraid I can't talk to you right now. Try again in ${remainingSeconds} seconds.`,
      lockedOut: true,
    };
  }

  // Reset if they've been good for a while
  if (now - state.lastAttempt > ATTEMPT_RESET_MS) {
    state.attempts = 0;
  }

  state.attempts++;
  state.lastAttempt = now;

  // Escalating responses
  if (state.attempts >= 4) {
    state.lockedUntil = now + LOCKOUT_DURATION_MS;
    state.attempts = 0;
    return {
      response: pickRandom(REFUSAL_RESPONSES.lockout),
      lockedOut: true,
    };
  } else if (state.attempts === 3) {
    return { response: pickRandom(REFUSAL_RESPONSES.third), lockedOut: false };
  } else if (state.attempts === 2) {
    return { response: pickRandom(REFUSAL_RESPONSES.second), lockedOut: false };
  } else {
    return { response: pickRandom(REFUSAL_RESPONSES.first), lockedOut: false };
  }
}

export function isLockedOut(userId: string): boolean {
  const state = getState(userId);
  return state.lockedUntil !== null && Date.now() < state.lockedUntil;
}
