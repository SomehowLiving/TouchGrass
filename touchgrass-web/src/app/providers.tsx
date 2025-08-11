"use client";

import React from "react";
import { config } from "./config";
import { SequenceConnect } from "@0xsequence/connect";
import { SequenceCheckoutProvider } from "@0xsequence/checkout";
import { AuthProvider } from "@/context/AuthContext";

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <SequenceConnect config={config}>
      <SequenceCheckoutProvider>
        <AuthProvider>{children}</AuthProvider>
      </SequenceCheckoutProvider>
    </SequenceConnect>
  );
};

export default Providers;
