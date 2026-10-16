import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  },
});

// Map of userId -> Set of socketIds for multi-tab and reconnect support
const userSocketMap = {}; // { [userId: string]: Set<string> }

export function getReceiverSocketId(userId) {
  if (!userId) return null;
  const strUserId = userId.toString();
  if (userSocketMap[strUserId] && userSocketMap[strUserId].size > 0) {
    return strUserId; // Emitting to this user room reaches all active sockets for this user
  }
  return null;
}

export function isUserOnline(userId) {
  if (!userId) return false;
  const strUserId = userId.toString();
  return !!(userSocketMap[strUserId] && userSocketMap[strUserId].size > 0);
}

io.on("connection", (socket) => {
  const rawUserId = socket.handshake.query.userId;
  const userId = rawUserId ? rawUserId.toString() : null;

  if (userId) {
    // Ensure socket joins the user-specific room
    socket.join(userId);

    if (!userSocketMap[userId]) {
      userSocketMap[userId] = new Set();
    }
    userSocketMap[userId].add(socket.id);
  }

  // io.emit() sends online users list to all connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("typing", ({ receiverId }) => {
    if (!receiverId) return;
    io.to(receiverId.toString()).emit("userTyping", { senderId: userId });
  });

  socket.on("stopTyping", ({ receiverId }) => {
    if (!receiverId) return;
    io.to(receiverId.toString()).emit("userStoppedTyping", { senderId: userId });
  });

  socket.on("disconnect", () => {
    if (userId && userSocketMap[userId]) {
      userSocketMap[userId].delete(socket.id);
      if (userSocketMap[userId].size === 0) {
        delete userSocketMap[userId];
        io.emit("userStoppedTyping", { senderId: userId });
      }
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };