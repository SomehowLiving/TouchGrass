"use client";

import { useState } from "react";
import { ArrowLeft, Share, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import AddMembersModal from "./AddMembersModal";

interface HeaderActionsProps {
  title: string;
  showAddMembers?: boolean;
  cliqueId?: string;
  currentMembers?: string[];
  onMembersAdded?: () => void;
}

const HeaderActions: React.FC<HeaderActionsProps> = ({
  title,
  showAddMembers = false,
  cliqueId,
  currentMembers = [],
  onMembersAdded,
}) => {
  const router = useRouter();
  const [addMembersOpen, setAddMembersOpen] = useState(false);

  const handleInviteUsers = () => {
    alert("Invite users feature – opens invite modal / link copy etc.");
  };

  return (
    <>
      <div className="bg-green-600 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.back()}
            className="text-white hover:bg-green-700 p-1 rounded transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-white text-lg font-medium">{title}</h1>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleInviteUsers}
            className="text-white hover:bg-green-700 p-2 rounded transition-colors"
          >
            <Share className="w-5 h-5" />
          </button>

          {showAddMembers && cliqueId && (
            <button
              onClick={() => setAddMembersOpen(true)}
              className="text-white hover:bg-green-700 p-2 rounded transition-colors"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {showAddMembers && cliqueId && (
        <AddMembersModal
          isOpen={addMembersOpen}
          onClose={() => setAddMembersOpen(false)}
          cliqueId={cliqueId}
          currentMembers={currentMembers}
          onMembersAdded={onMembersAdded}
        />
      )}
    </>
  );
};

export default HeaderActions;
