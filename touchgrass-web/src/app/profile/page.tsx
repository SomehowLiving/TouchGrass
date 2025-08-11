"use client";

import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { Pencil, Plus, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

const ProfilePage = () => {
  const { walletAddress, email, isAuthenticated } = useAuth();
  const router = useRouter();

  const cliques = [
    "/avatar1.png",
    "/avatar2.png",
    "/avatar1.png",
    "/avatar2.png",
    "/avatar1.png",
    "/avatar2.png",
    "/avatar1.png",
    "/avatar2.png",
  ];

  const vibeQuests = [
    { title: "Strolling", status: "Completed" },
    { title: "Games & Chill", status: "Completed" },
  ];

  const memories = [
    {
      title: "Strolling",
      image: "/stroll1.png",
      minters: "10 others",
    },
    { title: "Strolling", image: "/gaming.png", minters: "40 others" },
    {
      title: "Strolling",
      image: "/stroll2.png",
      minters: "10 others",
    },
    {
      title: "Strolling",
      image: "/stroll1.png",
      minters: "10 others",
    },
  ];

  return (
    <div className="min-h-screen text-white w-full">
      <header className="flex items-center bg-green-900 text-white px-4 py-3 opacity-95 w-full space-x-6">
        <ArrowLeft onClick={() => router.back()} />
        <h3 className="text-white font-bold">Profile</h3>
      </header>
      <div className="p-4">
        {/* Profile Info */}
        <div className="bg-black/30 p-4 rounded-md mb-4">
          <div className="flex items-center space-x-4">
            <Image
              src="/avatar1.png"
              alt="user"
              width={60}
              height={60}
              className="rounded-full"
            />
            <div>
              <p className="font-semibold text-lg">@username</p>@
              {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
              <p className="text-sm text-gray-300">{email} • Etherlink</p>
            </div>
            <button className="ml-auto flex items-center text-sm border px-3 py-1 rounded hover:bg-white hover:text-black">
              Edit profile <Pencil size={14} className="ml-1" />
            </button>
          </div>
        </div>

        {/* Cliques */}
        <div className="bg-black/30 p-4 rounded-md mb-4">
          <h3 className="mb-2 font-semibold">Cliques</h3>
          <div className="flex items-center space-x-2 overflow-x-auto pb-2">
            {cliques.map((img, idx) => (
              <Image
                key={idx}
                src={img}
                alt="friend"
                width={50}
                height={50}
                className="rounded-full"
              />
            ))}
            <button className="ml-2 px-3 py-1 text-sm border rounded flex items-center">
              <Plus size={16} className="mr-1" /> Invite Friends
            </button>
          </div>
        </div>

        {/* VibeQuests */}
        <div className="bg-black/30 p-4 rounded-md mb-4">
          <h3 className="mb-2 font-semibold">Your VibeQuests</h3>
          <div className="space-y-2">
            {vibeQuests.map((quest, i) => (
              <div
                key={i}
                className="flex justify-between items-center border px-4 py-2 rounded"
              >
                <span>{quest.title}</span>
                <span className="text-green-400 text-xs">{quest.status}</span>
              </div>
            ))}
            <button className="mt-2 px-3 py-1 text-sm border rounded flex items-center">
              <Plus size={16} className="mr-1" /> Start New Plan
            </button>
          </div>
        </div>

        {/* Minted Memories */}
        <div className="bg-black/30 p-4 rounded-md">
          <h3 className="mb-2 font-semibold">Minted Memories</h3>
          <p className="text-sm text-gray-400 mb-3">
            Recommended mints based on your onchain identity
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {memories.map((memory, i) => (
              <div key={i} className="bg-black rounded shadow overflow-hidden">
                <Image
                  src={memory.image}
                  alt={memory.title}
                  width={300}
                  height={200}
                  className="w-full h-40 object-cover"
                />
                <div className="p-2 text-sm">
                  <p className="text-green-400 font-semibold">{memory.title}</p>
                  <p className="text-xs text-gray-400">
                    @favyy and {memory.minters} minted
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
