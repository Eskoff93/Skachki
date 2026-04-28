// Shared utility helpers for the game.
// Keep this file small and framework-free.

function clampValue(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
