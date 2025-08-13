"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Share, UserPlus } from "lucide-react";
import AddMembersModal from "@/components/AddMembersModal";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

interface Clique {
  id: string;
  name: string;
  memberCount: number;
  members?: string[]; // Add members array for the modal
}

const CliquePage = () => {
  const { walletAddress, email, isAuthenticated } = useAuth();
  const [addMembers, setAddMembers] = useState(false);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cliques, setCliques] = useState<Clique[]>([]);
  const [selectedClique, setSelectedClique] = useState<Clique | null>(null);

  const toastShownRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated && !toastShownRef.current) {
      toast.error("Please sign in first to view your cliques");
      toastShownRef.current = true;
      router.push("/");
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const fetchCliques = async () => {
      if (!walletAddress) return;

      try {
        const res = await fetch(`/api/clique?walletAddress=${walletAddress}`);
        const data = await res.json();

        const mapped = data.cliques.map((clique: any) => ({
          id: clique._id,
          name: clique.name,
          memberCount: clique.members.length,
          members: clique.members, // Include members for the modal
        }));

        setCliques(mapped);
      } catch (err) {
        toast.error("Error occurred, please try again");
        console.error("Error fetching cliques", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCliques();
  }, [walletAddress]);

  const handleShare = () => {
    // Generate referral link logic
    const referralLink = `${window.location.origin}/invite?ref=${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    navigator.clipboard.writeText(referralLink);
    alert("Referral link copied to clipboard!");
  };

  const handleInviteUsers = (clique: Clique) => {
    // Set the selected clique and open modal
    setSelectedClique(clique);
    setAddMembers(true);
  };

  const handleCliqueClick = (clique: Clique) => {
    // Store selected clique and navigate to detail page
    localStorage.setItem("selectedClique", JSON.stringify(clique));
    router.push(`/clique/${clique.id}`);
  };

  const handleCloseModal = () => {
    setAddMembers(false);
    setSelectedClique(null);
    // Re-fetch cliques to get updated member counts
    if (walletAddress) {
      const fetchCliques = async () => {
        try {
          const res = await fetch(`/api/clique?walletAddress=${walletAddress}`);
          const data = await res.json();
          const mapped = data.cliques.map((clique: any) => ({
            id: clique._id,
            name: clique.name,
            memberCount: clique.members.length,
            members: clique.members,
          }));
          setCliques(mapped);
        } catch (err) {
          toast.error("Error occurred, please try again");
          console.error("Error fetching cliques", err);
        }
      };
      fetchCliques();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

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
          <h1 className="text-white text-lg font-medium">My Cliques</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleShare}
            className="text-white hover:bg-green-700 p-2 rounded transition-colors"
          >
            <Share className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {cliques.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <p>No cliques found. Create your first clique!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cliques.map((clique) => (
              <div
                key={clique.id}
                className="flex items-center justify-between bg-gray-800 p-4 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {clique.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <button
                      onClick={() => handleCliqueClick(clique)}
                      className="text-white text-lg hover:text-green-400 transition-colors text-left"
                    >
                      {clique.name}
                    </button>
                    <p className="text-gray-400 text-sm">
                      {clique.memberCount} members
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleInviteUsers(clique)}
                  className="text-green-400 hover:bg-green-700 hover:text-white p-2 rounded transition-colors"
                  title="Add members"
                >
                  <UserPlus className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Members Modal */}
      {selectedClique && (
        <AddMembersModal
          isOpen={addMembers}
          onClose={handleCloseModal}
          cliqueId={selectedClique.id}
          currentMembers={selectedClique.members || []}
        />
      )}
    </div>
  );
};

export default CliquePage;
