/**
 * pocketbase.js
 * ─────────────────────────────────────────────────────────────────────────────
 * PocketBase initialization for Точилка.
 *
 * Используем прямой URL к PocketBase без Vercel proxy —
 * proxy добавлял лишние заголовки и ломал авторизацию.
 */
import PocketBase from "pocketbase";

const pb = new PocketBase(
  import.meta.env.VITE_POCKETBASE_URL || "https://api.tochilka.app"
);

// Disable auto-cancellation so concurrent requests from different
// components don't cancel each other.
pb.autoCancellation(false);

export default pb;
