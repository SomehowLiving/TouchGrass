"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Share,
  UserPlus,
  Home,
  Users,
  Plus,
  MessageCircle,
  Settings,
} from "lucide-react";

type Screen = "create" | "clique-list" | "clique-detail";

interface Clique {
  id: string;
  name: string;
  memberCount: number;
}

const CliqueFlow: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>("create");
  const [cliqueName, setCliqueName] = useState("");
  const [cliques, setCliques] = useState<Clique[]>([
    { id: "1", name: "Jubi", memberCount: 5 },
  ]);

  const handleCreateClique = (e: React.FormEvent) => {
    e.preventDefault();
    if (cliqueName.trim()) {
      const newClique: Clique = {
        id: Date.now().toString(),
        name: cliqueName.trim(),
        memberCount: 1,
      };
      setCliques([...cliques, newClique]);
      setCliqueName("");
      setCurrentScreen("clique-list");
    }
  };

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

  const BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-green-600 p-4">
      <div className="flex justify-center space-x-8">
        <button className="bg-green-700 p-3 rounded-full hover:bg-green-800 transition-colors">
          <Home className="w-6 h-6 text-white" />
        </button>
        <button className="bg-green-700 p-3 rounded-full hover:bg-green-800 transition-colors">
          <Users className="w-6 h-6 text-white" />
        </button>
        <button className="bg-green-700 p-3 rounded-full hover:bg-green-800 transition-colors">
          <Plus className="w-6 h-6 text-white" />
        </button>
        <button className="bg-green-700 p-3 rounded-full hover:bg-green-800 transition-colors">
          <MessageCircle className="w-6 h-6 text-white" />
        </button>
        <button className="bg-green-700 p-3 rounded-full hover:bg-green-800 transition-colors">
          <Settings className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );

  if (currentScreen === "create") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md border border-gray-700">
          <button
            onClick={() => setCurrentScreen("clique-list")}
            className="absolute top-6 right-6 bg-gray-300 rounded-full p-2 hover:bg-gray-400 transition-colors"
          >
            <svg
              className="w-6 h-6 text-gray-800"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <form onSubmit={handleCreateClique} className="space-y-6">
            <div>
              <input
                type="text"
                value={cliqueName}
                onChange={(e) => setCliqueName(e.target.value)}
                placeholder="Clique Name"
                className="w-full bg-gray-700 text-gray-200 placeholder-gray-400 rounded-lg px-4 py-3 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gray-700 text-gray-200 rounded-lg px-6 py-3 border border-gray-600 hover:bg-gray-600 transition-colors font-medium"
            >
              Create
            </button>
          </form>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (currentScreen === "clique-list") {
    return (
      <div className="min-h-screen bg-gray-900">
        {/* Header */}
        <div className="bg-green-600 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setCurrentScreen("create")}
              className="text-white hover:bg-green-700 p-1 rounded transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-white text-lg font-medium">Clique Name</h1>
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
        <div className="p-6 pb-20">
          <div className="space-y-4">
            {cliques.map((clique) => (
              <div key={clique.id} className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {clique.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={() => setCurrentScreen("clique-detail")}
                  className="text-white text-lg hover:text-green-400 transition-colors"
                >
                  {clique.name}
                </button>
              </div>
            ))}
          </div>
        </div>

        <BottomNav />
      </div>
    );
  }

  if (currentScreen === "clique-detail") {
    return (
      <div className="min-h-screen bg-gray-900">
        {/* Header */}
        <div className="bg-green-600 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setCurrentScreen("clique-list")}
              className="text-white hover:bg-green-700 p-1 rounded transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-white text-lg font-medium">Clique Name</h1>
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
        <div className="p-6 pb-20">
          <div className="bg-green-600 rounded-full px-4 py-2 inline-block">
            <span className="text-white font-medium">I'm game!</span>
          </div>

          {/* Additional clique detail content can be added here */}
          <div className="mt-8 text-gray-400 text-center">
            <p>Clique details and interactions will be displayed here</p>
          </div>
        </div>

        <BottomNav />
      </div>
    );
  }

  return null;
};

export default CliqueFlow;
