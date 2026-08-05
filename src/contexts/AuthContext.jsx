import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import pb from "../services/pocketbase.js";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // NEVER auto-login demo accounts — they should not persist across page loads.
    // Users must explicitly click "Попробовать демоверсию" each time.
    if (pb.authStore.record?.email?.startsWith("demo_")) {
      pb.authStore.clear();
      return null;
    }
    // Clear invalid/corrupted tokens on init
    if (!pb.authStore.isValid && pb.authStore.token) {
      pb.authStore.clear();
    }
    return pb.authStore.isValid ? pb.authStore.record : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Force refresh — reads directly from pb.authStore and triggers re-render
  const refreshUser = useCallback(() => {
    const current = pb.authStore.isValid ? pb.authStore.record : null;
    setUser(current);
  }, []);

  const logout = useCallback(() => {
    pb.authStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && (window.location.search.includes("mock_user=true") || localStorage.getItem("mock_user"))) {
      setUser({ id: "mock-uid", uid: "mock-uid", email: "mock@tutor.ru" });
      setIsLoading(false);
      return;
    }

    // Re-check validity after hydration
    // NOTE: do NOT call pb.authStore.clear() here — in React StrictMode this runs
    // twice (mount → unmount → mount) and would wipe a freshly obtained token.
    if (pb.authStore.isValid) {
      setUser(pb.authStore.record);
    } else {
      setUser(null);
    }
    setIsLoading(false);

    // Subscribe to ALL auth state changes (login, logout, token refresh)
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(record ?? null);
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    isLoading,
    refreshUser,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
