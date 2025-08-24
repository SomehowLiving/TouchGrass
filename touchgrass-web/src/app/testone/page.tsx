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
import CliqueNFT from "../../../../backend/src/abis/CliqueNFT.json";

interface PlanData {
  planTitle: string;
  location: string;
  time: string;
  vibeCheck: string;
  isClique: boolean;
}

function TestOneContent() {
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
  const [address, setAddress] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);

  const toastShownRef = useRef(false);

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

    try {
      console.log("=== MINT DEBUG INFO ===");
      console.log("Metadata URL:", metadataUrl);
      console.log("Wallet address from context:", walletAddress);
      console.log("Is authenticated:", isAuthenticated);
      console.log("Wallet isConnected:", sequence.getWallet().isConnected());
      console.log("Wallet provider:", await sequence.getWallet().getProvider());
      console.log("Contract address:", process.env.NEXT_PUBLIC_CLIQUE_CONTRACT);
      console.log("Sequence wallet initialized:", !!sequence.getWallet());
      console.log("=======================");

      const wallet = await sequence.getWallet();

      if (!walletAddress) {
        throw new Error("No wallet address available in AuthContext");
      }

      let currentAddress: string;

      if (!wallet.isConnected()) {
        setStateMessage("Connecting wallet...");
        console.log("Attempting wallet connection...");
        const connectDetails = await wallet.connect({
          app: "TouchGrass",
          authorize: true,
          settings: { theme: "light" },
        });

        if (!connectDetails.connected) {
          console.error("Wallet connection failed:", connectDetails.error);
          throw new Error(connectDetails.error || "Failed to connect wallet");
        }

        const sessionAddress = connectDetails.session?.accountAddress;
        if (!sessionAddress) {
          throw new Error("No account address returned from wallet connection");
        }

        currentAddress = sessionAddress;
        setAddress(currentAddress);
        console.log("Wallet connected, address:", currentAddress);
        toast.success(
          `Wallet connected: ${currentAddress.slice(
            0,
            6
          )}...${currentAddress.slice(-4)}`
        );
      } else {
        console.log("Wallet already connected");
        currentAddress = await wallet.getAddress();
        setAddress(currentAddress);
      }

      setStateMessage("Minting your memory NFT...");
      console.log("Calling mintClique with URI:", metadataUrl);

      const contractAddress = process.env.NEXT_PUBLIC_CLIQUE_CONTRACT;
      if (!contractAddress) {
        throw new Error("Contract address not configured");
      }

      const signer = wallet.getSigner(84532); // Base Sepolia
      const contract = new ethers.Contract(contractAddress, CliqueNFT, signer);

      console.log("Sending mintClique transaction...");
      const tx = await contract.mintClique(metadataUrl);
      console.log("Transaction sent, hash:", tx.hash);
      const receipt = await tx.wait();
      console.log("Transaction receipt:", receipt);
      const cliqueMintedEvent = receipt.events?.find(
        (e: any) => e.event === "CliqueMinted"
      );
      const tokenId =
        cliqueMintedEvent?.args?.tokenId ||
        receipt.events?.find((e: any) => e.event === "Transfer")?.args?.tokenId;

      if (!tokenId) {
        throw new Error("Failed to retrieve token ID from transaction");
      }

      console.log("Mint successful:", { tokenId });
      setStateMessage("");
      toast.success(`🎉 NFT Minted Successfully! Token ID: ${tokenId}`);
      setShowModal(true);
    } catch (err: any) {
      console.error("=== MINT ERROR ===");
      console.error("Error object:", JSON.stringify(err, null, 2));
      console.error("Error message:", err.message || "No message provided");
      console.error("Error code:", err.code || "No code provided");
      console.error("==================");

      let errorMessage = "Minting failed";
      if (err.code === 4001 || err.message?.includes("user rejected")) {
        errorMessage = "Transaction rejected by user";
      } else if (err.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for transaction";
      } else if (err.message?.includes("execution reverted")) {
        errorMessage = "Contract execution failed - please try again";
      } else if (err.message?.includes("network")) {
        errorMessage = "Network error - please check your connection";
      } else if (err.message?.includes("Contract address not configured")) {
        errorMessage = "Configuration error - please contact support";
      } else if (err.message?.includes("No wallet address")) {
        errorMessage = "Please connect your wallet first";
      } else if (err.message) {
        errorMessage = err.message;
      }

      toast.error(errorMessage);
      setStateMessage("");
    } finally {
      setIsMinting(false);
      setIsLoading(false);
    }
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
            <button
              disabled={!metadataUrl}
              onClick={() => handleMintMemory(metadataUrl)}
              className="bg-green-500 text-white px-8 py-3 rounded-lg disabled:opacity-50"
            >
              Mint Memory
            </button>
            <button
              onClick={async () => {
                try {
                  const wallet = sequence.getWallet();
                  console.log(
                    "Test: Wallet isConnected:",
                    wallet.isConnected()
                  );
                  console.log(
                    "Test: Sequence wallet initialized:",
                    !!sequence.getWallet()
                  );
                  const connectDetails = await wallet.connect({
                    app: "TouchGrass",
                    authorize: true,
                  });
                  if (connectDetails.connected) {
                    const address = await wallet.getAddress();
                    console.log("Test: Wallet address:", address);
                    toast.success(
                      `Connected: ${address.slice(0, 6)}...${address.slice(-4)}`
                    );
                  } else {
                    throw new Error(
                      connectDetails.error || "Connection failed"
                    );
                  }
                } catch (err) {
                  console.error(
                    "Test connect error:",
                    JSON.stringify(err, null, 2)
                  );
                  toast.error("Failed to connect wallet");
                }
              }}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Test Wallet Connection
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

const TestOnePage = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <TestOneContent />
    </Suspense>
  );
};

export default TestOnePage;
