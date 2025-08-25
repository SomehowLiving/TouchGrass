"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

interface UseProtectedRouteOptions {
  redirectTo?: string;
  showToast?: boolean;
  toastMessage?: string;
}

export const useProtectedRoute = (options: UseProtectedRouteOptions = {}) => {
  const {
    redirectTo = "/",
    showToast = true,
    toastMessage = "Please sign in to proceed",
  } = options;

  const { isAuthenticated, hydrated, isAuthLoading } = useAuth(); // ✅ include loading state
  const router = useRouter();
  const authCheckHandled = useRef(false);

  useEffect(() => {
    // Wait until hydration + loading are both finished
    if (!hydrated || isAuthLoading) return;

    // Prevent multiple redirects
    if (authCheckHandled.current) return;

    if (!isAuthenticated) {
      authCheckHandled.current = true;

      if (showToast) {
        toast.error(toastMessage);
      }

      router.replace(redirectTo);
    }
  }, [
    hydrated,
    isAuthLoading,
    isAuthenticated,
    router,
    redirectTo,
    showToast,
    toastMessage,
  ]);

  return {
    isLoading: !hydrated || isAuthLoading, // ✅ cleaner loading condition
    isAuthenticated,
    hydrated,
  };
};
