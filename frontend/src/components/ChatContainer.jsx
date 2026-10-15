import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore.js";
import MessageSkeleton from "./skeletons/MessageSkeleton.jsx";
import ChatHeader from "./ChatHeader.jsx";
import MessageInput from "./MessageInput.jsx";
import { useAuthStore } from "../store/useAuthStore.js";
import { formatMessageTime } from "../lib/utils.js";
import { Reply, Trash2, SmilePlus } from "lucide-react";
import toast from "react-hot-toast";

const ALLOWED_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

export const ChatContainer = () => {
  const {
    messages,
    getMessages,
    selectedUser,
    isMessagesLoading,
    subscribeToMessages,
    unsubscribeFromMessages,
    setReplyingTo,
    toggleReaction,
    deleteMessage,
  } = useChatStore();

  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [activeReactionMenuId, setActiveReactionMenuId] = useState(null);

  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const scrollToMessage = (targetId) => {
    if (!targetId) return;
    const targetElement = document.getElementById(`msg-${targetId}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(targetId);
      setTimeout(() => {
        setHighlightedMessageId((curr) => (curr === targetId ? null : curr));
      }, 2000);
    } else {
      toast("Original message is unavailable in this view", { icon: "ℹ️" });
    }
  };

  const getReactionGroups = (reactions) => {
    if (!reactions || !Array.isArray(reactions)) return [];
    const map = {};
    for (const r of reactions) {
      if (!map[r.emoji]) {
        map[r.emoji] = {
          emoji: r.emoji,
          count: 0,
          users: [],
          hasReacted: false,
        };
      }
      map[r.emoji].count += 1;
      const isMe = r.userId?._id === authUser._id || r.userId === authUser._id;
      if (isMe) {
        map[r.emoji].hasReacted = true;
      }
      const name = isMe
        ? "You"
        : r.userId?.fullName || selectedUser.fullName || "Someone";
      map[r.emoji].users.push(name);
    }
    return Object.values(map);
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto" onClick={() => setActiveReactionMenuId(null)}>
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isMyMessage = message.senderId === authUser._id;
          const reactionGroups = getReactionGroups(message.reactions);
          const isHighlighted = highlightedMessageId === message._id;
          const isMenuOpen = activeReactionMenuId === message._id;

          return (
            <div
              key={message._id}
              id={`msg-${message._id}`}
              className={`chat group relative transition-all duration-300 rounded-2xl p-1 ${
                isMyMessage ? "chat-end" : "chat-start"
              } ${
                isHighlighted
                  ? "bg-primary/15 ring-2 ring-primary ring-offset-2 ring-offset-base-100 scale-[1.01]"
                  : ""
              }`}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={
                      isMyMessage
                        ? authUser.profilePic || "/avatar.png"
                        : selectedUser.profilePic || "/avatar.png"
                    }
                    alt="profile pic"
                  />
                </div>
              </div>

              <div className="chat-header mb-1 flex items-center gap-1.5">
                <time className="text-xs opacity-50 ml-1">
                  {formatMessageTime(message.createdAt)}
                </time>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setReplyingTo(message);
                  }}
                  className="sm:hidden text-xs opacity-60 hover:opacity-100 text-primary p-0.5"
                  title="Reply"
                >
                  <Reply className="size-3 inline" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveReactionMenuId(isMenuOpen ? null : message._id);
                  }}
                  className="sm:hidden text-xs opacity-60 hover:opacity-100 p-0.5"
                  title="React"
                >
                  <SmilePlus className="size-3 inline" />
                </button>
              </div>

              {/* Message Bubble Container with Action Bar */}
              <div className="relative inline-block max-w-[85%] sm:max-w-[75%]">
                <div
                  className={`chat-bubble flex flex-col break-words ${
                    isMyMessage
                      ? "bg-primary text-primary-content"
                      : "bg-base-200 text-base-content"
                  }`}
                >
                  {/* Quoted Reply Preview */}
                  {message.replyTo && (
                    <div
                      onClick={() => scrollToMessage(message.replyTo._id)}
                      className={`mb-2 p-2 rounded-lg text-xs cursor-pointer transition-all border-l-4 select-none ${
                        isMyMessage
                          ? "bg-black/20 border-primary-content/60 text-primary-content hover:bg-black/30"
                          : "bg-base-300/80 border-primary text-base-content hover:bg-base-300"
                      }`}
                      title={
                        message.replyTo.isDeleted
                          ? "Original message unavailable"
                          : "Click to jump to original message"
                      }
                    >
                      <div className="flex items-center gap-1 font-semibold opacity-90 mb-0.5">
                        <Reply className="size-3 shrink-0" />
                        <span>
                          {message.replyTo.isDeleted
                            ? "Deleted Message"
                            : message.replyTo.senderId?._id === authUser._id ||
                              message.replyTo.senderId === authUser._id
                            ? "You"
                            : message.replyTo.senderId?.fullName || selectedUser.fullName}
                        </span>
                      </div>

                      {message.replyTo.isDeleted ? (
                        <p className="italic opacity-60">Original message unavailable</p>
                      ) : (
                        <div className="flex items-center gap-2">
                          {message.replyTo.image && (
                            <img
                              src={message.replyTo.image}
                              alt="Reply thumbnail"
                              className="size-8 object-cover rounded shrink-0 border border-black/10"
                            />
                          )}
                          <p className="line-clamp-2 opacity-80">
                            {message.replyTo.text || (message.replyTo.image ? "Photo" : "Message")}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message Attachment Image */}
                  {message.image && (
                    <img
                      src={message.image}
                      alt="Attachment"
                      className="sm:max-w-64 max-h-72 object-cover rounded-md mb-2"
                    />
                  )}

                  {/* Message Text */}
                  {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
                </div>

                {/* Floating Actions Bar (Reactions + Reply + Delete) */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute -top-3.5 ${
                    isMyMessage ? "right-2" : "left-2"
                  } ${
                    isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
                  } transition-all duration-150 z-20 flex items-center gap-0.5 bg-base-100 border border-base-300 shadow-md rounded-full px-1.5 py-0.5 text-xs`}
                >
                  {/* Emoji Picker (👍 ❤️ 😂 😮 😢 🔥) */}
                  {ALLOWED_EMOJIS.map((emoji) => {
                    const userReactedWithThis = (message.reactions || []).some(
                      (r) =>
                        (r.userId?._id === authUser._id || r.userId === authUser._id) &&
                        r.emoji === emoji
                    );
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          toggleReaction(message._id, emoji);
                          setActiveReactionMenuId(null);
                        }}
                        className={`hover:scale-130 transition-transform p-1 rounded-full ${
                          userReactedWithThis ? "bg-primary/20 scale-110 font-bold" : ""
                        }`}
                        title={`React with ${emoji}`}
                      >
                        {emoji}
                      </button>
                    );
                  })}

                  <div className="w-px h-3.5 bg-base-300 mx-0.5" />

                  {/* Reply Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(message);
                      setActiveReactionMenuId(null);
                    }}
                    className="btn btn-ghost btn-circle btn-xs text-base-content/70 hover:text-primary hover:bg-base-200"
                    title="Reply to message"
                  >
                    <Reply className="size-3.5" />
                  </button>

                  {/* Delete Button (Only for sender) */}
                  {isMyMessage && (
                    <button
                      type="button"
                      onClick={() => {
                        deleteMessage(message._id);
                        setActiveReactionMenuId(null);
                      }}
                      className="btn btn-ghost btn-circle btn-xs text-base-content/70 hover:text-error hover:bg-base-200"
                      title="Delete message"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Reaction Badges Below Message Bubble */}
                {reactionGroups.length > 0 && (
                  <div
                    className={`flex flex-wrap gap-1 mt-1.5 select-none ${
                      isMyMessage ? "justify-end" : "justify-start"
                    }`}
                  >
                    {reactionGroups.map((group) => (
                      <button
                        key={group.emoji}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleReaction(message._id, group.emoji);
                        }}
                        title={group.users.join(", ")}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all border shadow-2xs ${
                          group.hasReacted
                            ? "bg-primary/20 border-primary text-primary font-semibold ring-1 ring-primary/40"
                            : "bg-base-200/90 border-base-300 text-base-content/80 hover:bg-base-300 hover:border-base-content/20"
                        }`}
                      >
                        <span>{group.emoji}</span>
                        <span className="text-[11px] font-medium">{group.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messageEndRef} />
      </div>

      <MessageInput />
    </div>
  );
};
export default ChatContainer;