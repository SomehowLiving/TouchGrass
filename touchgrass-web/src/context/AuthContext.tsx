"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from "react";
import { useAccount } from "wagmi";
import { useListAccounts } from "@0xsequence/connect";

interface AuthContextType {
  walletAddress: string | null;
  email: string | null;
  accountId: string | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  hydrated: boolean;
  refetchAccounts: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { address } = useAccount();
  const {
    data: accountData,
    isLoading: isAuthLoading,
    refetch: refetchAccounts,
  } = useListAccounts();

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Track processed combinations to prevent duplicates
  const processedCombinations = useRef(new Set<string>());

  /** Hydrate from localStorage on first mount */
  useEffect(() => {
    try {
      const storedWallet = localStorage.getItem("walletAddress");
      const storedEmail = localStorage.getItem("email");
      const storedAccountId = localStorage.getItem("accountId");

      if (storedWallet) setWalletAddress(storedWallet);
      if (storedEmail) setEmail(storedEmail);
      if (storedAccountId) setAccountId(storedAccountId);
    } catch {
      // no-op (private browsing / disabled storage)
    } finally {
      setHydrated(true); // ✅ mark hydration complete
    }
  }, []);

  /** Sync state when Sequence accountData changes (safe narrowing) */
  useEffect(() => {
    // Only process account data changes after initial hydration
    if (!hydrated) return;

    const primary = accountData?.accounts?.[0];
    const currentId = accountData?.currentAccountId;

    if (primary?.email) {
      setEmail(primary.email);
      try {
        localStorage.setItem("email", primary.email);
      } catch {}
    }

    if (currentId) {
      setAccountId(currentId);
      try {
        localStorage.setItem("accountId", currentId);
      } catch {}
    }

    // If accounts list becomes empty (logout), clear persisted email/accountId
    const hasAccounts = (accountData?.accounts?.length ?? 0) > 0;
    if (!isAuthLoading && !hasAccounts) {
      setEmail(null);
      setAccountId(null);
      try {
        localStorage.removeItem("email");
        localStorage.removeItem("accountId");
      } catch {}
    }
  }, [accountData, isAuthLoading, hydrated]);

  /** Sync walletAddress when wagmi changes */
  useEffect(() => {
    // Only process wallet changes after initial hydration
    if (!hydrated) return;

    if (address) {
      setWalletAddress(address);
      try {
        localStorage.setItem("walletAddress", address);
      } catch {}
    } else {
      setWalletAddress(null);
      try {
        localStorage.removeItem("walletAddress");
      } catch {}
      processedCombinations.current.clear();
    }
  }, [address, hydrated]);

  /** Send profile creation request (only once per wallet+email combo) */
  useEffect(() => {
    if (!hydrated || !walletAddress || !email) return;

    const combinationKey = `${walletAddress}-${email}`;
    if (processedCombinations.current.has(combinationKey)) return;

    processedCombinations.current.add(combinationKey);

    fetch("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress, email }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("User profile:", data.user);
      })
      .catch((err) => {
        console.error("User profile creation failed", err);
        processedCombinations.current.delete(combinationKey);
      });
  }, [walletAddress, email, hydrated]);

  /** Logout helper */
  const logout = () => {
    setWalletAddress(null);
    setEmail(null);
    setAccountId(null);
    try {
      localStorage.removeItem("walletAddress");
      localStorage.removeItem("email");
      localStorage.removeItem("accountId");
    } catch {}
    processedCombinations.current.clear();
  };

  // Calculate authentication status
  // Only consider user authenticated if hydrated AND has both wallet and email
  const isAuthenticated = hydrated && !!(walletAddress && email);

  const value: AuthContextType = {
    walletAddress,
    email,
    accountId,
    isAuthenticated,
    isAuthLoading,
    hydrated,
    refetchAccounts,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
