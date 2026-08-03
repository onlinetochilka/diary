/**
 * pocketbase.js
 * ─────────────────────────────────────────────────────────────────────────────
 * PocketBase initialization for Точилка.
 * Replaces firebase.js — single point of configuration.
 *
 * The URL is read from the VITE_POCKETBASE_URL environment variable.
 * For local development, set it in .env.local:
 *   VITE_POCKETBASE_URL=http://127.0.0.1:8090
 *
 * For production, set it in your hosting environment (Vercel, etc.):
 *   VITE_POCKETBASE_URL=https://api.tochilka.app
 */
import PocketBase from "pocketbase";

const pb = new PocketBase(
  // Single relative path that works everywhere:
  //   localhost (dev)  → Vite server.proxy forwards /api/pb → https://api.tochilka.app
  //   Vercel production → vercel.json rewrite forwards /api/pb → https://api.tochilka.app
  "/api/pb"
);

// Disable auto-cancellation so concurrent requests from different
// components don't cancel each other.
pb.autoCancellation(false);

export default pb;
