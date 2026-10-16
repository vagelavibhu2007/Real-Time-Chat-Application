import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import SidebarSkeleton from "./skeletons/SidebarSkeleton.jsx";
import { Users, BellOff } from "lucide-react";
import { formatMessageTime } from "../lib/utils.js";

const Sidebar = () => {
  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser,
    isUsersLoading,
    typingUsers,
    unreadCounts,
    isConversationMuted,
    getTotalUnreadCount,
  } = useChatStore();

  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  const totalUnread = getTotalUnreadCount();

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-6 text-primary" />
            <span className="font-semibold hidden lg:block">Contacts</span>
          </div>
          {totalUnread > 0 && (
            <span
              className="badge badge-primary badge-sm font-bold shadow-xs animate-in zoom-in-75"
              title={`${totalUnread} total unread messages`}
            >
              {totalUnread > 99 ? "99+" : totalUnread} new
            </span>
          )}
        </div>

        {/* Online filter toggle */}
        <div className="mt-3 hidden lg:flex items-center justify-between">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm checkbox-primary"
            />
            <span className="text-sm">Show online only</span>
          </label>
          <span className="text-xs text-zinc-500">
            ({Math.max(0, onlineUsers.length - 1)} online)
          </span>
        </div>
      </div>

      <div className="overflow-y-auto w-full py-2">
        {filteredUsers.map((user) => {
          const userIdStr = String(user._id);
          const isSelected = selectedUser && String(selectedUser._id) === userIdStr;
          const unreadCount = unreadCounts[userIdStr] || unreadCounts[user._id] || 0;
          const isMuted = isConversationMuted(userIdStr);
          const isUserTyping = typingUsers.includes(userIdStr);
          const isOnline = onlineUsers.includes(userIdStr);

          return (
            <button
              key={user._id}
              onClick={() => setSelectedUser(user)}
              className={`
                w-full p-3 flex items-center gap-3
                hover:bg-base-200/60 transition-all text-left
                ${isSelected ? "bg-base-200 ring-1 ring-base-300" : ""}
              `}
            >
              {/* Avatar with status indicators */}
              <div className="relative mx-auto lg:mx-0 shrink-0">
                <img
                  src={user.profilePic || "/avatar.png"}
                  alt={user.fullName}
                  className="size-12 object-cover rounded-full border border-base-300"
                />
                {isOnline && (
                  <span
                    className="absolute bottom-0 right-0 size-3 bg-emerald-500 
                    rounded-full ring-2 ring-base-100"
                  />
                )}

                {/* Mobile / collapsed unread badge & mute indicator */}
                {unreadCount > 0 && (
                  <span className="lg:hidden absolute -top-1 -right-1 size-5 bg-primary text-primary-content text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-base-100 animate-in zoom-in-75">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
                {isMuted && (
                  <span
                    className="lg:hidden absolute -bottom-1 -left-1 p-0.5 bg-base-300/90 rounded-full text-zinc-400"
                    title="Muted"
                  >
                    <BellOff className="size-2.5" />
                  </span>
                )}
              </div>

              {/* User info - only visible on larger screens */}
              <div className="hidden lg:block text-left min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="font-medium truncate text-base-content">
                    {user.fullName}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {user.lastMessageAt && (
                      <span className="text-[10px] text-zinc-500 font-normal">
                        {formatMessageTime(user.lastMessageAt)}
                      </span>
                    )}
                    {isMuted && (
                      <BellOff
                        className="size-3.5 text-zinc-400"
                        title="Conversation muted"
                      />
                    )}
                    {unreadCount > 0 && (
                      <span className="badge badge-primary badge-sm font-bold min-w-5 h-5 px-1.5 rounded-full text-xs shadow-xs animate-in zoom-in-75">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs truncate">
                  {isUserTyping ? (
                    <span className="text-primary font-medium italic animate-pulse">
                      typing...
                    </span>
                  ) : user.lastMessageText ? (
                    <span className="text-zinc-400 truncate block opacity-90">
                      {user.lastMessageText}
                    </span>
                  ) : (
                    <span
                      className={isOnline ? "text-emerald-500" : "text-zinc-400"}
                    >
                      {isOnline ? "Online" : "Offline"}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="text-center text-zinc-500 py-6 text-sm">
            No contacts available
          </div>
        )}
      </div>
    </aside>
  );
};
export default Sidebar;