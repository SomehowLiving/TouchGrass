"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { LiaTimesCircleSolid } from "react-icons/lia";
import { FaTimesCircle } from "react-icons/fa";
import { useAuth } from "@/context/AuthContext";

interface CreateCliqueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateCliqueModal: React.FC<CreateCliqueModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { walletAddress } = useAuth();
  const [cliqueName, setCliqueName] = useState("");
  const router = useRouter();

  const handleCreateClique = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliqueName.trim()) return;

    try {
      const res = await fetch("/api/clique", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cliqueName.trim(), walletAddress }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      console.log("✅ Clique created:", data.clique);

      onClose();
      setCliqueName("");
      router.push("/clique");
    } catch (err) {
      console.error("❌ Failed to create clique", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0   flex items-center justify-center p-4 z-50">
      <div className="rounded-2xl p-8 w-full max-w-md border ">
        <div onClick={onClose} className="w-full flex justify-end">
          <FaTimesCircle className="font-bold  w-8 h-8 text-white" />
        </div>

        <form onSubmit={handleCreateClique} className="space-y-6">
          <div className="mt-6">
            <input
              type="text"
              value={cliqueName}
              onChange={(e) => setCliqueName(e.target.value)}
              placeholder="Clique Name"
              className="w-full  text-gray-200 placeholder-gray-400 rounded-lg px-4 py-3 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full cursor-pointer text-gray-200 rounded-lg px-6 py-3 border border-gray-600 hover:bg-gray-600 transition-colors font-medium"
          >
            Create
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateCliqueModal;
