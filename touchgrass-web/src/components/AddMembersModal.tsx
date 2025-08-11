// components/AddMembersModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

interface AddMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliqueId: string;
  currentMembers: string[]; // wallet addresses
  onMembersAdded?: () => void;
}

interface User {
  _id: string;
  walletAddress: string;
  email?: string;
  username?: string;
  avatar?: string;
  isSelected: boolean;
}

const AddMembersModal: React.FC<AddMembersModalProps> = ({
  isOpen,
  onClose,
  cliqueId,
  currentMembers,
  onMembersAdded,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [addingMembers, setAddingMembers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/user");

        if (!res.ok) {
          throw new Error(`Failed to fetch users: ${res.status}`);
        }

        const data = await res.json();

        if (!data.users) {
          throw new Error("No users data received");
        }

        // Filter out current members and map with selection state
        const availableUsers = data.users
          .filter((user: any) => !currentMembers.includes(user.walletAddress))
          .map((user: any) => ({
            ...user,
            isSelected: false,
          }));

        setUsers(availableUsers);
      } catch (err) {
        console.error("Failed to fetch users:", err);
        setError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, currentMembers]);

  const toggleSelect = (userId: string) => {
    setUsers((prev) =>
      prev.map((user) =>
        user._id === userId ? { ...user, isSelected: !user.isSelected } : user
      )
    );
  };

  const handleAddMembers = async () => {
    const selectedWallets = users
      .filter((user) => user.isSelected)
      .map((user) => user.walletAddress);

    if (selectedWallets.length === 0) {
      return;
    }

    setAddingMembers(true);
    setError(null);

    try {
      const res = await fetch(`/api/plan/clique/${cliqueId}/add-member`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          members: selectedWallets,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          errorData.error || `Failed to add members: ${res.status}`
        );
      }

      const result = await res.json();
      console.log("Members added successfully:", result);

      // Close modal and reset state
      setSearchQuery("");
      setUsers([]);
      onClose();

      // Call the callback if provided
      onMembersAdded?.();
    } catch (err) {
      console.error("Failed to add members:", err);
      setError(err instanceof Error ? err.message : "Failed to add members");
    } finally {
      setAddingMembers(false);
    }
  };

  // Filter users based on search query
  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.walletAddress?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.username?.toLowerCase().includes(query)
    );
  });

  const selectedCount = users.filter((user) => user.isSelected).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/70">
      <div className="bg-[#111] w-full max-w-md rounded-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Add Members</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 transition-colors"
            disabled={addingMembers}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by email, username, or wallet address..."
              className="w-full bg-gray-800 text-white rounded px-10 py-2 border border-gray-700 focus:outline-none focus:border-green-500"
              disabled={addingMembers}
            />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-6 py-2">
            <div className="bg-red-900/20 border border-red-500/20 rounded p-2">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Users List */}
        <div className="flex-1 overflow-y-auto px-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-400">Loading users...</div>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="space-y-2 py-2">
              {filteredUsers.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    {/* Display username or truncated wallet address */}
                    <p className="text-white text-sm font-medium truncate">
                      {user.username ||
                        `${user.walletAddress.slice(
                          0,
                          6
                        )}...${user.walletAddress.slice(-4)}`}
                    </p>

                    {/* Display email if available */}
                    {user.email && (
                      <p className="text-xs text-gray-400 truncate">
                        {user.email}
                      </p>
                    )}

                    {/* Always show wallet address (truncated) */}
                    <p className="text-xs text-gray-500 truncate font-mono">
                      {user.walletAddress}
                    </p>
                  </div>

                  <button
                    onClick={() => toggleSelect(user._id)}
                    disabled={addingMembers}
                    className={`px-3 py-1 rounded text-sm ml-3 flex-shrink-0 transition-colors ${
                      user.isSelected
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "border border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {user.isSelected ? "Selected" : "Add"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <p className="text-center text-gray-500">
                {searchQuery
                  ? "No users found matching your search"
                  : users.length === 0
                  ? "No users available to add"
                  : "Start typing to search users"}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <button
            disabled={selectedCount === 0 || addingMembers}
            onClick={handleAddMembers}
            className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {addingMembers
              ? "Adding Members..."
              : selectedCount > 0
              ? `Add ${selectedCount} Member${selectedCount > 1 ? "s" : ""}`
              : "Add Selected Members"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMembersModal;
