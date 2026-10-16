import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import { useAuthStore } from "./useAuthStore.js";
import { showInAppNotification } from "../components/InAppNotification.jsx";

const processedMessageIds = new Set();

export const sortUsersByActivity = (usersList) => {
  if (!Array.isArray(usersList)) return [];
  return [...usersList].sort((a, b) => {
    const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;

    if (timeA && timeB) {
      if (timeB !== timeA) return timeB - timeA;
    }
    if (timeA && !timeB) return -1;
    if (!timeA && timeB) return 1;
    return (a.fullName || "").localeCompare(b.fullName || "");
  });
};

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  replyingTo: null,
  typingUsers: [],
  isUsersLoading: false,
  isMessagesLoading: false,
  unreadCounts: {},
  mutedConversations: {},
  notificationPermission:
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "default",
  isSubscribed: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      const users = sortUsersByActivity(res.data);

      const unreadMap = {};
      const muteMap = {};
      const now = new Date();

      users.forEach((u) => {
        unreadMap[u._id] = u.unreadCount || 0;
        const isStillMuted =
          u.isMuted && (!u.mutedUntil || new Date(u.mutedUntil) > now);
        muteMap[u._id] = {
          isMuted: !!isStillMuted,
          mutedUntil: isStillMuted ? u.mutedUntil : null,
        };
      });

      set({
        users,
        unreadCounts: unreadMap,
        mutedConversations: muteMap,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  setReplyingTo: (message) => set({ replyingTo: message }),

  setSelectedUser: (selectedUser) => {
    set({ selectedUser, replyingTo: null });
    if (selectedUser) {
      const strId = String(selectedUser._id);
      // Immediately reset local unread count for this user
      set({
        unreadCounts: {
          ...get().unreadCounts,
          [strId]: 0,
        },
      });
      get().markAsRead(strId);
    }
  },

  markAsRead: async (userId) => {
    if (!userId) return;
    const strId = String(userId);
    try {
      // Optimistically clear unread count
      set({
        unreadCounts: {
          ...get().unreadCounts,
          [strId]: 0,
        },
      });
      await axiosInstance.put(`/messages/read/${strId}`);
    } catch (error) {
      console.log("Error marking messages as read:", error);
    }
  },

  muteConversation: async (userId, duration) => {
    try {
      const strId = String(userId);
      const res = await axiosInstance.put(`/messages/mute/${strId}`, { duration });
      const { isMuted, mutedUntil } = res.data;

      set({
        mutedConversations: {
          ...get().mutedConversations,
          [strId]: { isMuted, mutedUntil },
        },
        users: get().users.map((u) =>
          String(u._id) === strId ? { ...u, isMuted, mutedUntil } : u
        ),
      });

      const messages = {
        "1h": "Conversation muted for 1 hour",
        "8h": "Conversation muted for 8 hours",
        "24h": "Conversation muted for 24 hours",
        indefinite: "Conversation muted until manually unmuted",
        unmute: "Conversation unmuted",
      };

      toast.success(messages[duration] || "Mute setting updated");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update mute settings");
    }
  },

  isConversationMuted: (userId) => {
    if (!userId) return false;
    const strId = String(userId);
    const mute = get().mutedConversations[strId] || get().mutedConversations[userId];
    if (!mute || !mute.isMuted) return false;
    if (!mute.mutedUntil) return true; // indefinite mute
    return new Date(mute.mutedUntil) > new Date();
  },

  requestNotificationPermission: async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Desktop notifications are not supported by this browser");
      return "unsupported";
    }

    try {
      const permission = await Notification.requestPermission();
      set({ notificationPermission: permission });
      if (permission === "granted") {
        toast.success("Desktop notifications enabled!");
      } else if (permission === "denied") {
        toast.error("Desktop notifications denied in browser settings");
      }
      return permission;
    } catch (error) {
      console.log("Error requesting notification permission:", error);
      return "error";
    }
  },

  showInAppNotification: (sender, message) => {
    showInAppNotification(sender, message, (user) => get().setSelectedUser(user));
  },

  showBrowserNotification: (sender, message) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    try {
      const body = message.text
        ? message.text.length > 80
          ? `${message.text.slice(0, 80)}...`
          : message.text
        : message.image
        ? "📷 Sent a photo"
        : "New message";

      const notif = new Notification(sender.fullName || "Saṃlāpa", {
        body,
        icon: sender.profilePic || "/avatar.png",
        tag: `samlapa-${sender._id}`,
      });

      notif.onclick = () => {
        window.focus();
        get().setSelectedUser(sender);
        notif.close();
      };
    } catch (err) {
      console.log("Browser notification error:", err);
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages, replyingTo, users } = get();
    try {
      const payload = {
        ...messageData,
        replyTo: replyingTo ? replyingTo._id : undefined,
      };
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        payload
      );

      const targetUserIdStr = String(selectedUser._id);
      const updatedUsers = users.map((u) => {
        if (String(u._id) === targetUserIdStr) {
          return {
            ...u,
            lastMessageAt: res.data.createdAt,
            lastMessageText: res.data.text || (res.data.image ? "📷 Photo" : ""),
          };
        }
        return u;
      });

      set({
        messages: [...messages, res.data],
        replyingTo: null,
        users: sortUsersByActivity(updatedUsers),
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  toggleReaction: async (messageId, emoji) => {
    try {
      const res = await axiosInstance.put(`/messages/${messageId}/reaction`, {
        emoji,
      });
      set({
        messages: get().messages.map((m) =>
          m._id === messageId ? { ...m, reactions: res.data.reactions } : m
        ),
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update reaction");
    }
  },

  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/messages/${messageId}`);
      set({
        messages: get().messages.filter((m) => m._id !== messageId),
      });
      toast.success("Message deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // Remove any previous listeners to prevent duplicates on reconnect or re-render
    socket.off("newMessage");
    socket.off("messagesRead");
    socket.off("messageReaction");
    socket.off("messageDeleted");
    socket.off("userTyping");
    socket.off("userStoppedTyping");

    socket.on("newMessage", async (newMessage) => {
      const authUser = useAuthStore.getState().authUser;
      if (!authUser) return;

      const senderIdStr = String(newMessage.senderId?._id || newMessage.senderId);
      const authUserIdStr = String(authUser._id);

      // Do not count / notify own messages
      if (senderIdStr === authUserIdStr) return;

      // Deduplicate
      const messageIdStr = String(newMessage._id);
      if (processedMessageIds.has(messageIdStr)) return;
      processedMessageIds.add(messageIdStr);
      if (processedMessageIds.size > 200) {
        const first = processedMessageIds.values().next().value;
        processedMessageIds.delete(first);
      }

      // Update sender's latest activity timestamp and re-sort conversations immediately
      let senderFound = false;
      const currentUsers = get().users;
      const updatedUsers = currentUsers.map((u) => {
        if (String(u._id) === senderIdStr) {
          senderFound = true;
          return {
            ...u,
            lastMessageAt: newMessage.createdAt,
            lastMessageText: newMessage.text || (newMessage.image ? "📷 Photo" : ""),
          };
        }
        return u;
      });

      if (senderFound) {
        set({ users: sortUsersByActivity(updatedUsers) });
      } else {
        await get().getUsers();
      }

      const { selectedUser, messages, isConversationMuted } = get();
      const isCurrentChat = selectedUser && String(selectedUser._id) === senderIdStr;
      const isTabVisible =
        typeof document !== "undefined" &&
        document.visibilityState === "visible";

      // If actively viewing this chat in foreground
      if (isCurrentChat && isTabVisible) {
        if (!messages.some((m) => String(m._id) === messageIdStr)) {
          set({
            messages: [...messages, newMessage],
            typingUsers: get().typingUsers.filter(
              (id) => String(id) !== senderIdStr
            ),
          });
        }
        get().markAsRead(senderIdStr);
        return;
      }

      // If user is viewing this chat but tab is in background (hidden)
      if (isCurrentChat && !isTabVisible) {
        if (!messages.some((m) => String(m._id) === messageIdStr)) {
          set({
            messages: [...messages, newMessage],
            typingUsers: get().typingUsers.filter(
              (id) => String(id) !== senderIdStr
            ),
          });
        }
      }

      // Increment unread count for the sender immediately
      const currentCount = get().unreadCounts[senderIdStr] || 0;
      set({
        unreadCounts: {
          ...get().unreadCounts,
          [senderIdStr]: currentCount + 1,
        },
      });

      // Find sender info from loaded users, or refresh list if new contact
      let sender = get().users.find((u) => String(u._id) === senderIdStr);
      if (!sender) {
        await get().getUsers();
        sender = get().users.find((u) => String(u._id) === senderIdStr);
      }

      // Check if conversation is muted
      const isMuted = isConversationMuted(senderIdStr);
      if (isMuted) {
        // Muted conversations still update badges, but suppress in-app & browser notifications!
        return;
      }

      const senderInfo = sender || {
        _id: senderIdStr,
        fullName:
          newMessage.replyTo?.senderId?.fullName || "Saṃlāpa Contact",
        profilePic: "",
      };

      // In-app notification for other conversation
      if (!isCurrentChat) {
        get().showInAppNotification(senderInfo, newMessage);
      }

      // Browser notification if tab is in background or in different conversation
      if (!isTabVisible || !isCurrentChat) {
        get().showBrowserNotification(senderInfo, newMessage);
      }
    });

    socket.on("messagesRead", ({ readerId }) => {
      const { selectedUser } = get();
      const readerIdStr = String(readerId);
      if (selectedUser && String(selectedUser._id) === readerIdStr) {
        set({
          messages: get().messages.map((m) =>
            String(m.receiverId) === readerIdStr ? { ...m, isRead: true } : m
          ),
        });
      }
    });

    socket.on("messageReaction", ({ messageId, reactions }) => {
      set({
        messages: get().messages.map((m) =>
          String(m._id) === String(messageId) ? { ...m, reactions } : m
        ),
      });
    });

    socket.on("messageDeleted", (deletedMessageId) => {
      set({
        messages: get().messages.filter(
          (m) => String(m._id) !== String(deletedMessageId)
        ),
      });
    });

    socket.on("userTyping", ({ senderId }) => {
      const { typingUsers } = get();
      const strId = String(senderId);
      if (!typingUsers.includes(strId)) {
        set({ typingUsers: [...typingUsers, strId] });
      }
    });

    socket.on("userStoppedTyping", ({ senderId }) => {
      const strId = String(senderId);
      set({
        typingUsers: get().typingUsers.filter((id) => String(id) !== strId),
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("newMessage");
    socket.off("messagesRead");
    socket.off("messageReaction");
    socket.off("messageDeleted");
    socket.off("userTyping");
    socket.off("userStoppedTyping");
  },

  getTotalUnreadCount: () => {
    const counts = get().unreadCounts || {};
    return Object.values(counts).reduce((total, count) => total + (count || 0), 0);
  },
}));