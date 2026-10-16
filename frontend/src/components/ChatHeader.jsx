import { useState, useSyncExternalStore } from "react";
import { X, Bell, BellOff, Volume2 } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore.js";
import { useChatStore } from "../store/useChatStore.js";

let currentTimeSnapshot = Date.now();
const subscribeTime = (callback) => {
  const interval = setInterval(() => {
    currentTimeSnapshot = Date.now();
    callback();
  }, 30000);
  return () => clearInterval(interval);
};
const getTimeSnapshot = () => currentTimeSnapshot;

const ChatHeader = () => {
  const {
    selectedUser,
    setSelectedUser,
    typingUsers,
    isConversationMuted,
    mutedConversations,
    muteConversation,
  } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const currentTime = useSyncExternalStore(subscribeTime, getTimeSnapshot, getTimeSnapshot);

  const isTyping = typingUsers.includes(selectedUser?._id);
  const isMuted = isConversationMuted(selectedUser?._id);
  const muteData = mutedConversations[selectedUser?._id];

  const getMuteRemainingText = (mutedUntil, now) => {
    if (!mutedUntil) return "Indefinitely";
    if (!now) return "Muted";
    const diffMs = new Date(mutedUntil).getTime() - now;
    if (diffMs <= 0) return null;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const handleMute = async (duration) => {
    setIsMenuOpen(false);
    await muteConversation(selectedUser._id, duration);
  };

  return (
    <div className="p-3 border-b border-base-300 bg-base-100/50 backdrop-blur-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar */}
          <div className="avatar shrink-0">
            <div className="size-10 rounded-full relative border border-base-300">
              <img
                src={selectedUser.profilePic || "/avatar.png"}
                alt={selectedUser.fullName}
              />
            </div>
          </div>

          {/* User info */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate text-base-content">
                {selectedUser.fullName}
              </h3>
              {isMuted && (
                <span
                  className="badge badge-sm badge-ghost gap-1 text-[11px] font-normal text-zinc-400"
                  title={`Muted ${getMuteRemainingText(muteData?.mutedUntil, currentTime) || ""}`}
                >
                  <BellOff className="size-3" />
                  <span className="hidden sm:inline">
                    {getMuteRemainingText(muteData?.mutedUntil, currentTime) || "Muted"}
                  </span>
                </span>
              )}
            </div>

            <p className="text-xs">
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

        {/* Controls: Mute dropdown & Close */}
        <div className="flex items-center gap-1">
          {/* Mute Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`btn btn-ghost btn-circle btn-sm ${
                isMuted
                  ? "text-warning hover:bg-warning/10"
                  : "text-base-content/60 hover:text-base-content"
              }`}
              title={isMuted ? "Manage mute settings" : "Mute notifications"}
            >
              {isMuted ? <BellOff className="size-4" /> : <Bell className="size-4" />}
            </button>

            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-base-100 rounded-xl shadow-xl border border-base-300 py-1.5 z-40 text-sm animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 border-b border-base-300 text-xs font-semibold text-base-content/60">
                    {isMuted ? "Conversation Muted" : "Mute Notifications"}
                  </div>

                  {isMuted ? (
                    <>
                      <div className="px-3 py-2 text-xs text-base-content/70">
                        Status:{" "}
                        <span className="font-semibold text-warning">
                          {getMuteRemainingText(muteData?.mutedUntil, currentTime) || "Muted"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleMute("unmute")}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-emerald-500 hover:bg-base-200 flex items-center gap-2 transition-colors"
                      >
                        <Volume2 className="size-3.5" />
                        Unmute conversation
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleMute("1h")}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-base-200 flex items-center justify-between transition-colors"
                      >
                        <span>For 1 hour</span>
                        <span className="text-[10px] text-base-content/50">1h</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMute("8h")}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-base-200 flex items-center justify-between transition-colors"
                      >
                        <span>For 8 hours</span>
                        <span className="text-[10px] text-base-content/50">8h</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMute("24h")}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-base-200 flex items-center justify-between transition-colors"
                      >
                        <span>For 24 hours</span>
                        <span className="text-[10px] text-base-content/50">24h</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMute("indefinite")}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-base-200 flex items-center justify-between text-warning font-medium transition-colors"
                      >
                        <span>Until manually unmuted</span>
                        <span className="text-[10px] text-base-content/50">∞</span>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={() => setSelectedUser(null)}
            className="btn btn-ghost btn-circle btn-sm text-base-content/60 hover:text-base-content"
            title="Close conversation"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
export default ChatHeader;