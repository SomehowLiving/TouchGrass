"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Share, UserPlus } from "lucide-react";
import Image from "next/image";
import Logo from "../../../public/logo.png";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";

const ChatPage = () => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const toastShownRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated && !toastShownRef.current) {
      toast.error("Please sign in first to view your cliques");
      toastShownRef.current = true;
      router.push("/");
    }
  }, [isAuthenticated]);

  const handleShare = () => {
    // Generate referral link logic
    const referralLink = `${window.location.origin}/invite?ref=${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    navigator.clipboard.writeText(referralLink);
    alert("Referral link copied to clipboard!");
  };

  const handleInviteUsers = () => {
    // Logic to invite existing app users
    alert("Invite users feature - this would open a user selection modal");
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-green-600 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.back()}
            className="text-white hover:bg-green-700 p-1 rounded transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-white text-lg font-medium">Chats</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleShare}
            className="text-white hover:bg-green-700 p-2 rounded transition-colors"
          >
            <Share className="w-5 h-5" />
          </button>
          <button
            onClick={handleInviteUsers}
            className="text-white hover:bg-green-700 p-2 rounded transition-colors"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
        {/* Logo/Icon */}

        <Image src={Logo} alt="TouchGrass Logo" />
        {/* Text Content */}
        <div className="text-center space-y-4">
          <h2 className="text-green-400 text-2xl font-semibold">
            Launching shortly!
          </h2>
          <p className="text-white text-xl font-medium">Stay Tuned!</p>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
