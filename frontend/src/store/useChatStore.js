import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import { useAuthStore } from "./useAuthStore.js";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  replyingTo: null,
  typingUsers: [],
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
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

  sendMessage: async (messageData) => {
    const { selectedUser, messages, replyingTo } = get();
    try {
      const payload = {
        ...messageData,
        replyTo: replyingTo ? replyingTo._id : undefined,
      };
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, payload);
      set({
        messages: [...messages, res.data],
        replyingTo: null,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  toggleReaction: async (messageId, emoji) => {
    try {
      const res = await axiosInstance.put(`/messages/${messageId}/reaction`, { emoji });
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
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("newMessage", (newMessage) => {
      const isRelevant =
        newMessage.senderId === selectedUser._id ||
        newMessage.receiverId === selectedUser._id;
      if (!isRelevant) return;

      set({
        messages: [...get().messages, newMessage],
        typingUsers: get().typingUsers.filter((id) => id !== newMessage.senderId),
      });
    });

    socket.on("messageReaction", ({ messageId, reactions }) => {
      set({
        messages: get().messages.map((m) =>
          m._id === messageId ? { ...m, reactions } : m
        ),
      });
    });

    socket.on("messageDeleted", (deletedMessageId) => {
      set({
        messages: get().messages.filter((m) => m._id !== deletedMessageId),
      });
    });

    socket.on("userTyping", ({ senderId }) => {
      const { typingUsers } = get();
      if (!typingUsers.includes(senderId)) {
        set({ typingUsers: [...typingUsers, senderId] });
      }
    });

    socket.on("userStoppedTyping", ({ senderId }) => {
      set({
        typingUsers: get().typingUsers.filter((id) => id !== senderId),
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("newMessage");
    socket.off("messageReaction");
    socket.off("messageDeleted");
    socket.off("userTyping");
    socket.off("userStoppedTyping");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser, replyingTo: null }),
}));