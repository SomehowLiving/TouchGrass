"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Share, UserPlus } from "lucide-react";
import { useParams } from "next/navigation";
import HeaderActions from "@/components/HeaderActions";

interface Clique {
  id: string;
  name: string;
  memberCount: number;
  isActive?: boolean;
  members: string[];
}

const CliqueDetailPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const [clique, setClique] = useState<Clique | null>(null);

  useEffect(() => {
    const fetchClique = async () => {
      if (!id) return;

      try {
        const res = await fetch(`/api/clique/${id}`);
        const data = await res.json();

        if (res.ok) {
          setClique({
            id: data.clique._id,
            name: data.clique.name,
            memberCount: data.clique.members.length,
            isActive: data.clique.isActive,
            members: data.clique.members,
          });
        } else {
          console.error("Error fetching clique:", data.error);
        }
      } catch (err) {
        console.error("Failed to fetch clique", err);
      }
    };

    fetchClique();
  }, [id]);

  const handleShare = () => {
    // Generate referral link logic
    const referralLink = `${window.location.origin}/invite?ref=${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    navigator.clipboard.writeText(referralLink);
    alert("Referral link copied to clipboard!");
  };

  const handleInviteUsers = () => {
    // Logic to invite existing app users to clique
    alert("Invite users feature - this would open a user selection modal");
  };

  if (!clique) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <HeaderActions
        title="Clique"
        showAddMembers={true}
        cliqueId={clique?.id}
        currentMembers={clique?.members || []}
      />

      {/* Content */}
      <div className="p-6">
        {clique?.isActive && (
          <button
            onClick={() => router.push(`/plan/seal-vibe?cliqueId=${clique.id}`)}
            className="bg-green-600 rounded-full px-4 py-2 inline-block text-white font-medium hover:bg-green-700 transition"
          >
            I'm game!
          </button>
        )}

        {/* Additional clique detail content */}
        <div className="mt-8">
          <h2 className="text-white text-xl font-semibold mb-4">
            {clique.name}
          </h2>
          <p className="text-gray-400">Members: {clique.memberCount}</p>

          {/* Add more clique details here */}
          <div className="mt-8 text-gray-400">
            <p>Clique activities and interactions will be displayed here</p>
          </div>
        </div>
        {clique?.isActive === false && clique && (
          <button
            onClick={() => router.push(`/plan?cliqueId=${clique.id}`)}
            className="mt-6 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
          >
            Create Plan
          </button>
        )}
      </div>
    </div>
  );
};

export default CliqueDetailPage;
