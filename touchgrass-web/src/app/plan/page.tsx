// app/plan/page.tsx
"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { ArrowLeft, Share, UserPlus, MessageCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

// Component that uses useSearchParams - needs to be wrapped in Suspense
function PlanContent() {
  const { walletAddress, email, isAuthenticated } = useAuth();
  const searchParams = useSearchParams();
  const cliqueIdFromUrl = searchParams.get("cliqueId");

  const [existingCliques, setExistingCliques] = useState<any[]>([]);
  const [selectedCliqueId, setSelectedCliqueId] = useState<string | null>(
    cliqueIdFromUrl
  );
  const [newCliqueName, setNewCliqueName] = useState("");

  const router = useRouter();
  const [formData, setFormData] = useState({
    planTitle: "",
    location: "",
    time: "",
    vibeCheck: "",
    isPublic: true,
    isClique: false,
  });
  const toastShownRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated && !toastShownRef.current) {
      toast.error("Sign in first to create a plan");
      toastShownRef.current = true;
      router.push("/");
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const fetchCliques = async () => {
      if (!walletAddress) return;

      try {
        const res = await fetch(`/api/clique/user/${walletAddress}`);
        const data = await res.json();
        setExistingCliques(data.cliques || []);
      } catch (error) {
        console.error("Error fetching cliques:", error);
      }
    };

    if (!cliqueIdFromUrl && walletAddress) {
      fetchCliques();
    }
  }, [walletAddress, cliqueIdFromUrl]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleShare = () => {
    const shareLink = `${window.location.origin}/plan/share?id=${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    navigator.clipboard.writeText(shareLink);
    alert("Plan link copied to clipboard!");
  };

  const handleInviteUsers = () => {
    alert("Invite users feature - this would open a user selection modal");
  };

  const handleJoinChat = () => {
    alert("Join chat feature - this would open the chat for this plan");
  };

  const handlePostPlan = async () => {
    let cliqueId = cliqueIdFromUrl;

    // If no cliqueId in URL, handle selection or creation
    if (!cliqueId) {
      if (newCliqueName.trim()) {
        console.log("🟡 Sending to /api/clique:", {
          name: newCliqueName.trim(),
          creator: walletAddress,
        });

        try {
          const res = await fetch("/api/clique", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: newCliqueName.trim(),
              walletAddress,
            }),
          });

          const data = await res.json();
          cliqueId = data?.clique?._id;
        } catch (error) {
          console.error("Error creating clique:", error);
          alert("Failed to create clique");
          return;
        }
      } else if (selectedCliqueId) {
        cliqueId = selectedCliqueId;
      } else {
        alert("Please select or create a clique");
        return;
      }
    }

    if (!walletAddress || !formData.planTitle || !cliqueId) {
      alert("Missing required data.");
      return;
    }

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          cliqueId,
          creator: walletAddress,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push(`/clique/${cliqueId}`);
      } else {
        console.error("Failed to post plan", data.error);
        alert("Error: " + data.error);
      }
    } catch (error) {
      console.error("Error posting plan:", error);
      alert("Failed to post plan");
    }
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
          <h1 className="text-white text-lg font-medium">Plan</h1>
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
      <div className="p-6">
        {/* Header Text */}
        <div className="text-center mb-8">
          <h2 className="text-white text-2xl font-bold mb-2">
            Touch grass today!
          </h2>
          <p className="text-gray-400">
            Create an NFT, share the moment, let friends mint.
          </p>
        </div>

        {/* Form Container */}
        <div className="border border-gray-600 rounded-2xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Plan Title */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Plan Title
              </label>
              <input
                type="text"
                value={formData.planTitle}
                onChange={(e) => handleInputChange("planTitle", e.target.value)}
                placeholder="Gamings"
                className="w-full bg-gray-800 text-gray-200 placeholder-gray-500 rounded-lg px-4 py-3 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                placeholder="Georgia"
                className="w-full bg-gray-800 text-gray-200 placeholder-gray-500 rounded-lg px-4 py-3 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Time
              </label>
              <input
                type="text"
                value={formData.time}
                onChange={(e) => handleInputChange("time", e.target.value)}
                placeholder="3:00pm"
                className="w-full bg-gray-800 text-gray-200 placeholder-gray-500 rounded-lg px-4 py-3 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Vibe Check */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Vibe check
              </label>
              <input
                type="text"
                value={formData.vibeCheck}
                onChange={(e) => handleInputChange("vibeCheck", e.target.value)}
                placeholder="How you feeling?"
                className="w-full bg-gray-800 text-gray-200 placeholder-gray-500 rounded-lg px-4 py-3 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Toggle Switches */}
          <div className="flex justify-between items-center mt-6">
            <div className="flex items-center space-x-3">
              <span className="text-white font-medium">Public</span>
              <button
                onClick={() =>
                  handleInputChange("isPublic", !formData.isPublic)
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.isPublic ? "bg-green-500" : "bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.isPublic ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-white font-medium">Clique</span>
              <button
                onClick={() =>
                  handleInputChange("isClique", !formData.isClique)
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.isClique ? "bg-green-500" : "bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.isClique ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* If no cliqueId in URL, show picker */}
          {!cliqueIdFromUrl && (
            <div className="mt-6 space-y-4">
              <div>
                <label className="text-white text-sm font-medium block mb-1">
                  Choose Existing Clique
                </label>
                <select
                  value={selectedCliqueId || ""}
                  onChange={(e) => setSelectedCliqueId(e.target.value)}
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600"
                >
                  <option value="">-- Select Clique --</option>
                  {existingCliques.map((clique) => (
                    <option key={clique._id} value={clique._id}>
                      {clique.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-white text-sm font-medium block mb-1">
                  Or Create New Clique
                </label>
                <input
                  type="text"
                  value={newCliqueName}
                  onChange={(e) => setNewCliqueName(e.target.value)}
                  placeholder="New Clique Name"
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4 mt-8">
            <button
              onClick={handleJoinChat}
              className="flex items-center space-x-2 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Join chat</span>
            </button>
            <button
              onClick={handlePostPlan}
              className="bg-green-500 text-white px-8 py-3 rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              Post Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense wrapper
const PlanPage = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <PlanContent />
    </Suspense>
  );
};

export default PlanPage;
