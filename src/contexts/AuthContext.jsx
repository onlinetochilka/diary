import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import pb from "../services/pocketbase.js";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Demo accounts are managed by pocketbase.js and isDemoMode flag.
    // If authStore has a demo account but isDemoMode is false, it's stale.
    const isDemoAccount = pb.authStore.record?.email?.startsWith("demo@");
    const isDemoModeActive = typeof window !== "undefined" && localStorage.getItem("isDemoMode") === "true";
    
    if (isDemoAccount && !isDemoModeActive) {
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
    if (typeof window !== "undefined") {
      localStorage.removeItem("isDemoMode");
      localStorage.removeItem("demo_db");
    }
    pb.authStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && (window.location.search.includes("mock_user=true") || localStorage.getItem("mock_user"))) {
      setUser({ id: "mock-uid", uid: "mock-uid", email: "mock@tutor.ru" });
      setIsLoading(false);
      return;
    }

    // Subscribe to ALL auth state changes (login, logout, token refresh)
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(record ?? null);
    });

    if (!pb.authStore.isValid) {
      setUser(null);
      setIsLoading(false);
      return () => unsubscribe();
    }

    // Token is locally valid — verify with server via authRefresh.
    // This catches stale tokens (e.g. after PocketBase update changes JWT secret).
    // If server rejects the token, we log the user out to force re-login.
    const isDemoModeActive = typeof window !== "undefined" && localStorage.getItem("isDemoMode") === "true";
    if (isDemoModeActive) {
      setUser(pb.authStore.record);
      setIsLoading(false);
      return () => unsubscribe();
    }

    pb.collection("users").authRefresh()
      .then((result) => {
        // Token refreshed successfully — authStore.onChange fires automatically
        setUser(result.record);
      })
      .catch((err) => {
        console.warn("[AuthContext] authRefresh failed, logging out:", err?.status, err?.message);
        pb.authStore.clear();
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => unsubscribe();
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
