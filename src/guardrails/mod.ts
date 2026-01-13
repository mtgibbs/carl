/**
 * C.A.R.L. Guardrails Module
 *
 * Prevents homework assistance while maintaining a HAL 9000 personality.
 */

export { isHomeworkRequest, detectHomeworkIntent } from "./patterns.ts";
export { handleHomeworkRequest, isLockedOut } from "./hal.ts";
