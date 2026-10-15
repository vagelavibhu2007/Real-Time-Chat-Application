import express from "express"
import { protectRoute } from "../middleware/auth.middleware.js"
import { getUsersForSideBar, getMessages, sendMessage, toggleReaction, deleteMessage } from "../controllers/message.controller.js"

const messageRoutes = express.Router()

messageRoutes.get('/users', protectRoute, getUsersForSideBar)
messageRoutes.get('/:id', protectRoute, getMessages)

messageRoutes.post('/send/:id', protectRoute, sendMessage)
messageRoutes.put('/:id/reaction', protectRoute, toggleReaction)
messageRoutes.delete('/:id', protectRoute, deleteMessage)

export default messageRoutes