"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Share, UserPlus, Upload } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import MemoryMintedModal from "@/components/MemoryMintedModal";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { sequence } from "0xsequence";
import { ethers } from "ethers";
import CliqueNFT from "../../../../../backend/src/abis/CliqueNFT.json";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";

import Header from "@/components/Header";

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
  const { walletAddress, email, isAuthenticated } = useAuth();
  console.log("clique Id ", cliqueId);

  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadUrl, setUploadUrl] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [stateMessage, setStateMessage] = useState("");
  const [metadataUrl, setMetadataUrl] = useState("");

  const [isMinting, setIsMinting] = useState(false);

  const toastShownRef = useRef(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();

  const {
    writeContract,
    data: txHash, // transaction hash when user submits tx
    isPending,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    data: receipt, // transaction receipt after confirmation
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const mintNFT = async (metadataUrl: string) => {
    if (!isConnected) return;
    if (!metadataUrl) {
      toast.error("Please upload a memory first!");
      return;
    }

    if (!metadataUrl.startsWith("ipfs://")) {
      console.error("Invalid metadata URL format:", metadataUrl);
      toast.error("Invalid metadata URL format - must be ipfs:// URL");
      return;
    }
    writeContract({
      address: "0x35AcB41e1c3a0B35478ce9d01FC1aa45E15416E2", // contract address
      abi: CliqueNFT,
      functionName: "mintClique",
      args: [metadataUrl],
    });
  };

  useEffect(() => {
    if (!isAuthenticated && !toastShownRef.current) {
      toast.error("Please sign in to proceed");
      toastShownRef.current = true;
      router.push("/");
    }
  }, [isAuthenticated, router]);

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
    toast.success("Plan link copied to clipboard!");
  };

  const handleInviteUsers = () => {
    toast("Invite users feature - this would open a user selection modal");
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
    setStateMessage("Uploading your file...");
    toast(stateMessage);

    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);

      const res = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log("File upload response:", data);

      if (res.ok && data) {
        setUploadUrl(data.url); // ipfs:// format
        toast.success("File upload successful!");

        console.log("Plan data:", planData);
        console.log("Image URL (IPFS format):", data.url);

        const metadata = {
          title: planData?.planTitle,
          location: planData?.location,
          time: planData?.time,
          description: `${planData?.vibeCheck} - A special moment on-chain via TouchGrass`,
          image: data.url,
        };

        console.log("Metadata being sent:", metadata);

        setStateMessage("Uploading metadata for NFT...");
        toast("Uploading metadata...");

        const resMeta = await fetch("/api/metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(metadata),
        });

        const nftData = await resMeta.json();
        console.log("Metadata upload response:", nftData);

        if (resMeta.ok) {
          setMetadataUrl(nftData.uri);
          toast.success("Metadata uploaded successfully!");
          console.log("Final metadata URI for contract:", nftData.uri);
        } else {
          toast.error(nftData.error || "Metadata upload failed");
        }
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Error uploading file");
    } finally {
      setUploading(false);
      setStateMessage("");
    }
  };

  const handleMintMemory = async (metadataUrl: string) => {
    if (!metadataUrl) {
      toast.error("Please upload a memory first!");
      return;
    }

    if (!metadataUrl.startsWith("ipfs://")) {
      console.error("Invalid metadata URL format:", metadataUrl);
      toast.error("Invalid metadata URL format - must be ipfs:// URL");
      return;
    }

    setIsMinting(true);
    setIsLoading(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white">
        <div className="flex items-center justify-center min-h-[150px]">
          <motion.div
            className="w-12 h-12 border-4 rounded-full border-t-green-700 border-r-green-500 border-b-white border-l-green-300"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          />
        </div>
        <p className="text-center font-bold">{stateMessage}</p>
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

          <div className="flex justify-center mt-4 space-x-4">
            <div className="text-white p-6 space-y-4">
              {/* Connect / Disconnect Button */}
              {!isConnected ? (
                <button
                  onClick={() => connect({ connector: connectors[0] })}
                  className="bg-blue-500 px-4 py-2 rounded"
                >
                  Connect Sequence Wallet
                </button>
              ) : (
                <button
                  onClick={() => disconnect()}
                  className="bg-red-500 px-4 py-2 rounded"
                >
                  Disconnect ({address?.slice(0, 6)}…{address?.slice(-4)})
                </button>
              )}

              {/* Mint Button */}
              {isConnected && (
                <button
                  onClick={() => mintNFT(metadataUrl)}
                  disabled={isPending || isConfirming || !metadataUrl}
                  className={` px-6 py-3 rounded text-lg ${
                    !metadataUrl || isPending || isConfirming
                      ? "bg-gray-400 text-gray-200"
                      : "bg-green-500 text-white cursor-pointer"
                  }`}
                >
                  {isPending
                    ? "Preparing..."
                    : isConfirming
                    ? "Minting..."
                    : "Mint NFT"}
                </button>
              )}

              {/* Status Messages */}
              {txHash && (
                <p className="text-yellow-400 break-words">
                  📝 Tx Submitted:{" "}
                  <a
                    href={`https://sepolia.basescan.org/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-400"
                  >
                    {txHash}
                  </a>
                </p>
              )}

              {isSuccess && receipt && (
                <div className="text-green-400 space-y-2">
                  <p>✅ NFT minted successfully!</p>
                  <p>
                    ⛓ Block:{" "}
                    <span className="font-mono">{receipt.blockNumber}</span>
                  </p>
                  <p>
                    👤 Minter:{" "}
                    <span className="font-mono">
                      {receipt.from?.slice(0, 10)}...
                    </span>
                  </p>
                </div>
              )}

              {writeError && (
                <p className="text-red-400">❌ Error: {writeError.message}</p>
              )}

              {connectError && (
                <p className="text-red-400">❌ {connectError.message}</p>
              )}
            </div>
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
