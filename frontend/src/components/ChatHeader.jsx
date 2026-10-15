
import { X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore.js";
import { useChatStore } from "../store/useChatStore.js";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, typingUsers } = useChatStore();
  const { onlineUsers } = useAuthStore();

  const isTyping = typingUsers.includes(selectedUser?._id);

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
            </div>
          </div>

          {/* User info */}
          <div>
            <h3 className="font-medium">{selectedUser.fullName}</h3>
            <p className="text-sm">
              {isTyping ? (
                <span className="text-primary font-medium italic flex items-center gap-1 animate-pulse">
                  typing...
                </span>
              ) : onlineUsers.includes(selectedUser._id) ? (
                <span className="text-emerald-500 font-medium">Online</span>
              ) : (
                <span className="text-base-content/60">Offline</span>
              )}
            </p>
          </div>
        </div>

        {/* Close button */}
        <button onClick={() => setSelectedUser(null)}>
          <X />
        </button>
      </div>
    </div>
  );
};
export default ChatHeader;