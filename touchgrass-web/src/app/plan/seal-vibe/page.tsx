"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Share, UserPlus, Upload } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import MemoryMintedModal from "@/components/MemoryMintedModal";
import { Suspense } from "react";

interface PlanData {
  planTitle: string;
  location: string;
  time: string;
  vibeCheck: string;
  isClique: boolean;
}

function SealVibePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cliqueId = searchParams.get("cliqueId");
  const { walletAddress } = useAuth();
  console.log("clique Id ", cliqueId);

  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadUrl, setUploadUrl] = useState<string>("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!cliqueId || !walletAddress) return;

    const fetchData = async () => {
      try {
        const [cliqueRes, planRes] = await Promise.all([
          fetch(`/api/clique/${cliqueId}`),
          fetch(`/api/plan/clique/${cliqueId}`),
        ]);

        const cliqueData = await cliqueRes.json();
        const planResult = await planRes.json();

        setPlanData(planResult.plan || null);
        setIsCreator(cliqueData?.clique?.creator === walletAddress);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [cliqueId, walletAddress]);

  const handleShare = () => {
    const shareLink = `${window.location.origin}/plan/share?id=${cliqueId}`;
    navigator.clipboard.writeText(shareLink);
    alert("Plan link copied to clipboard!");
  };

  const handleInviteUsers = () => {
    alert("Invite users feature - this would open a user selection modal");
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      setUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);

      const res = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setUploadUrl(data.url);
        alert("Upload successful!");
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error uploading file.");
    } finally {
      setUploading(false);
    }
  };

  const handleMintMemory = () => {
    if (!uploadUrl) {
      alert("Please upload a memory first!");
      return;
    }
    setShowModal(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  if (!planData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white p-6">
        <p>No plan data found.</p>
        <button
          onClick={() => router.push("/plan")}
          className="mt-4 bg-green-500 px-6 py-2 rounded hover:bg-green-600"
        >
          Create New Plan
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen pb-20">
        {/* Header */}
        <div className="bg-green-600 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.back()}
              className="text-white hover:bg-green-700 p-1 rounded"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-white text-lg font-medium">Plan</h1>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleShare}
              className="text-white hover:bg-green-700 p-2 rounded"
            >
              <Share className="w-5 h-5" />
            </button>
            <button
              onClick={handleInviteUsers}
              className="text-white hover:bg-green-700 p-2 rounded"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <h2 className="text-center text-white text-2xl font-bold mb-6">
            Seal the Vibe
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Input label="Plan Title" value={planData.planTitle} />
            <Input label="Location" value={planData.location} />
            <Input label="Time" value={planData.time} />
            <Input label="Vibe Check" value={planData.vibeCheck} />
          </div>

          {/* Creator Only Upload Section */}
          {isCreator && (
            <div className="mb-6">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? "border-green-500 bg-green-500/10"
                    : "border-gray-600 hover:border-gray-500"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  id="file-upload"
                  type="file"
                  hidden
                  accept="image/*,video/*"
                  onChange={handleFileInput}
                />
                {uploadedFile ? (
                  <div className="text-green-400">
                    <p className="mb-2">✓ {uploadedFile.name}</p>
                    <button
                      onClick={() => setUploadedFile(null)}
                      className="text-sm text-gray-400 hover:text-white"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="text-gray-400">
                    <Upload className="w-8 h-8 mx-auto mb-2" />
                    <p className="mb-2">Drag or upload memory</p>
                    <label
                      htmlFor="file-upload"
                      className="text-green-400 hover:text-green-300 cursor-pointer"
                    >
                      Choose file
                    </label>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-4">
                <button
                  disabled={!uploadedFile || uploading}
                  onClick={handleUpload}
                  className="bg-blue-500 text-white px-6 py-2 rounded disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload to IPFS"}
                </button>
              </div>
            </div>
          )}

          {/* Mint Button */}
          <div className="flex justify-center mt-4">
            <button
              disabled={!uploadUrl}
              onClick={handleMintMemory}
              className="bg-green-500 text-white px-8 py-3 rounded-lg disabled:opacity-50"
            >
              Mint Memory
            </button>
          </div>
        </div>
      </div>

      <MemoryMintedModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}

const Input = ({ label, value }: { label: string; value: string }) => (
  <div>
    <label className="block text-white text-sm font-medium mb-2">{label}</label>
    <input
      type="text"
      value={value}
      readOnly
      className="w-full bg-gray-800 text-gray-200 rounded-lg px-4 py-3 border border-gray-600"
    />
  </div>
);

const SealVibePage = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <SealVibePageContent />
    </Suspense>
  );
};

export default SealVibePage;
