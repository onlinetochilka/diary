/**
 * pocketbase.js
 * ─────────────────────────────────────────────────────────────────────────────
 * PocketBase initialization for Точилка.
 *
 * Используем прямой URL к PocketBase без Vercel proxy —
 * proxy добавлял лишние заголовки и ломал авторизацию.
 */
import PocketBase from "pocketbase";
import { getMockCollection, getMockDatabase } from "./mockDatabase.js";

const pb = new PocketBase(
  import.meta.env.VITE_POCKETBASE_URL || "https://api.tochilka.app"
);

// Disable auto-cancellation so concurrent requests from different
// components don't cancel each other.
pb.autoCancellation(false);

// Функция для динамической проверки демо-режима
function getIsDemoMode() {
  return typeof window !== 'undefined' && localStorage.getItem('isDemoMode') === 'true';
}

// We need a structurally valid JWT token so PocketBase's authStore.isValid returns true
const MOCK_TOKEN = "dummy.eyJleHAiOjE5OTk5OTk5OTl9.dummy";

if (getIsDemoMode()) {
  try {
    const db = getMockDatabase();
    if (db && db.users && db.users.length > 0) {
      pb.authStore.save(MOCK_TOKEN, db.users[0]);
    }
  } catch(e) {
    console.error("Demo DB init error", e);
  }
}

const proxyPb = new Proxy(pb, {
  get(target, prop) {
    if (getIsDemoMode() && prop === 'collection') {
      return function(collectionName) {
        // Intercept collection calls
        const mockCol = getMockCollection(collectionName);
        
        // Mock auth methods on the 'users' collection so they don't crash if called
        if (collectionName === 'users') {
           mockCol.authWithPassword = async (email, pass) => {
             return { token: MOCK_TOKEN, record: getMockDatabase().users[0] };
           };
        }

        return mockCol;
      };
    }
    
    // For other properties, bind functions correctly
    const val = target[prop];
    return typeof val === 'function' ? val.bind(target) : val;
  }
});

export default proxyPb;
