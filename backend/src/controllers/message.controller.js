import mongoose from "mongoose"
import cloudinary from "../lib/cloudinary.js"
import { getReceiverSocketId, io } from "../lib/socket.js"
import Message from "../models/messages.model.js"
import User from "../models/users.model.js"

const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

export const getUsersForSideBar = async (req, res) => {
    try {
        const loggedInUserId = req.user._id

        const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password -__v")

        const unreadAgg = await Message.aggregate([
            { $match: { receiverId: loggedInUserId, isRead: false } },
            { $group: { _id: "$senderId", count: { $sum: 1 } } }
        ])
        const unreadMap = {}
        unreadAgg.forEach(item => {
            unreadMap[item._id.toString()] = item.count
        })

        // Aggregate latest message activity for each conversation with loggedInUserId
        const lastMessageAgg = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { senderId: loggedInUserId },
                        { receiverId: loggedInUserId }
                    ]
                }
            },
            {
                $project: {
                    createdAt: 1,
                    text: 1,
                    image: 1,
                    otherUserId: {
                        $cond: [
                            { $eq: ["$senderId", loggedInUserId] },
                            "$receiverId",
                            "$senderId"
                        ]
                    }
                }
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $group: {
                    _id: "$otherUserId",
                    lastMessageAt: { $first: "$createdAt" },
                    lastMessageText: { $first: "$text" },
                    lastMessageImage: { $first: "$image" }
                }
            }
        ])

        const lastActivityMap = {}
        lastMessageAgg.forEach(item => {
            lastActivityMap[item._id.toString()] = {
                lastMessageAt: item.lastMessageAt,
                lastMessageText: item.lastMessageText || (item.lastMessageImage ? "📷 Photo" : "")
            }
        })

        const now = new Date()
        const muteMap = {}
        const userDoc = await User.findById(loggedInUserId).select("mutedConversations")
        const activeMutes = []
        let hasExpiredMutes = false

        for (const m of (userDoc?.mutedConversations || [])) {
            const isStillMuted = !m.mutedUntil || new Date(m.mutedUntil) > now
            if (isStillMuted) {
                activeMutes.push(m)
                muteMap[m.userId.toString()] = {
                    isMuted: true,
                    mutedUntil: m.mutedUntil
                }
            } else {
                hasExpiredMutes = true
            }
        }

        // Clean up expired mutes from user document if any expired
        if (hasExpiredMutes && userDoc) {
            userDoc.mutedConversations = activeMutes
            await userDoc.save()
        }

        const usersWithMetadata = filteredUsers.map(user => {
            const uObj = user.toObject()
            const strId = uObj._id.toString()
            const muteInfo = muteMap[strId]
            const activity = lastActivityMap[strId]
            return {
                ...uObj,
                unreadCount: unreadMap[strId] || 0,
                isMuted: !!muteInfo,
                mutedUntil: muteInfo?.mutedUntil || null,
                lastMessageAt: activity?.lastMessageAt || null,
                lastMessageText: activity?.lastMessageText || null
            }
        })

        // Sort descending: newest conversation activity first; contacts without messages below
        usersWithMetadata.sort((a, b) => {
            const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
            const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0

            if (timeA && timeB) {
                if (timeB !== timeA) return timeB - timeA
            }
            if (timeA && !timeB) return -1
            if (!timeA && timeB) return 1
            return (a.fullName || "").localeCompare(b.fullName || "")
        })

        res.status(200).json(usersWithMetadata)

    } catch (error) {
        console.log("Error in getUsersForSideBar controller", error.message)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

export const getMessages = async (req, res) => {
    try {
        const myId = req.user._id
        const userToChatId = req.params.id

        if (!mongoose.Types.ObjectId.isValid(userToChatId)) {
            return res.status(400).json({ message: "Invalid user ID format" })
        }

        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: userToChatId },
                { senderId: userToChatId, receiverId: myId }
            ]
        })
        .populate({
            path: 'replyTo',
            select: 'text image senderId createdAt',
            populate: {
                path: 'senderId',
                select: 'fullName profilePic'
            }
        })
        .populate({
            path: 'reactions.userId',
            select: 'fullName profilePic'
        })
        .sort({ createdAt: 1 })

        // Gracefully format cases where replyTo points to an original message that was deleted
        const formattedMessages = messages.map(msg => {
            const msgObj = msg.toObject()
            const rawReplyToId = msg.populated('replyTo')
            if (!msgObj.replyTo && rawReplyToId) {
                msgObj.replyTo = {
                    _id: rawReplyToId,
                    isDeleted: true,
                    text: "Original message unavailable"
                }
            }
            return msgObj
        })

        res.status(200).json(formattedMessages)

    } catch (error) {
        console.log("Error in getMessages controller", error.message)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

export const sendMessage = async (req, res) => {
    try {
        const { text, image, replyTo } = req.body
        const receiverId = req.params.id
        const senderId = req.user._id

        if (!text && !image) {
            return res.status(400).json({ message: "Message text or image is required" })
        }

        if (!mongoose.Types.ObjectId.isValid(receiverId)) {
            return res.status(400).json({ message: "Invalid receiver ID format" })
        }

        let validReplyTo = null
        if (replyTo) {
            if (!mongoose.Types.ObjectId.isValid(replyTo)) {
                return res.status(400).json({ message: "Invalid replyTo message ID format" })
            }
            const originalMsg = await Message.findById(replyTo)
            if (!originalMsg) {
                return res.status(404).json({ message: "Original message for reply not found" })
            }

            // Verify permission: original message must belong to the conversation between these two users
            const isParticipant =
                [originalMsg.senderId.toString(), originalMsg.receiverId.toString()].includes(senderId.toString()) &&
                [originalMsg.senderId.toString(), originalMsg.receiverId.toString()].includes(receiverId.toString())

            if (!isParticipant) {
                return res.status(403).json({ message: "Cannot reply to a message outside this conversation" })
            }
            validReplyTo = originalMsg._id
        }

        let imageUrl
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image)
            imageUrl = uploadResponse.secure_url
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
            replyTo: validReplyTo,
            reactions: []
        })

        await newMessage.save()

        await newMessage.populate([
            {
                path: 'replyTo',
                select: 'text image senderId createdAt',
                populate: {
                    path: 'senderId',
                    select: 'fullName profilePic'
                }
            },
            {
                path: 'reactions.userId',
                select: 'fullName profilePic'
            }
        ])

        const strReceiverId = receiverId.toString()
        io.to(strReceiverId).emit('newMessage', newMessage)

        res.status(201).json(newMessage)

    } catch (error) {
        console.log("Error in sendMessage controller", error.message)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

export const toggleReaction = async (req, res) => {
    try {
        const { id: messageId } = req.params
        const { emoji } = req.body
        const userId = req.user._id

        if (!emoji || !ALLOWED_EMOJIS.includes(emoji)) {
            return res.status(400).json({
                message: `Invalid emoji. Allowed emojis are: ${ALLOWED_EMOJIS.join(' ')}`
            })
        }

        if (!mongoose.Types.ObjectId.isValid(messageId)) {
            return res.status(400).json({ message: "Invalid message ID format" })
        }

        const message = await Message.findById(messageId)
        if (!message) {
            return res.status(404).json({ message: "Message not found" })
        }

        // User must be sender or receiver of the message to react
        const isParticipant =
            message.senderId.toString() === userId.toString() ||
            message.receiverId.toString() === userId.toString()

        if (!isParticipant) {
            return res.status(403).json({ message: "You are not authorized to react to this message" })
        }

        const existingReactionIndex = message.reactions.findIndex(
            (r) => r.userId.toString() === userId.toString()
        )

        if (existingReactionIndex > -1) {
            const currentEmoji = message.reactions[existingReactionIndex].emoji
            if (currentEmoji === emoji) {
                // Same emoji clicked -> Remove reaction
                message.reactions.splice(existingReactionIndex, 1)
            } else {
                // Different emoji clicked -> Change reaction
                message.reactions[existingReactionIndex].emoji = emoji
            }
        } else {
            // New reaction -> Add reaction
            message.reactions.push({ userId, emoji })
        }

        await message.save()

        await message.populate({
            path: 'reactions.userId',
            select: 'fullName profilePic'
        })

        // Notify the other conversation participant via Socket.IO
        const otherUserId = message.senderId.toString() === userId.toString()
            ? message.receiverId.toString()
            : message.senderId.toString()

        io.to(otherUserId.toString()).emit('messageReaction', {
            messageId: message._id,
            reactions: message.reactions
        })

        res.status(200).json({
            messageId: message._id,
            reactions: message.reactions
        })

    } catch (error) {
        console.log("Error in toggleReaction controller", error.message)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

export const deleteMessage = async (req, res) => {
    try {
        const { id: messageId } = req.params
        const userId = req.user._id

        if (!mongoose.Types.ObjectId.isValid(messageId)) {
            return res.status(400).json({ message: "Invalid message ID format" })
        }

        const message = await Message.findById(messageId)
        if (!message) {
            return res.status(404).json({ message: "Message not found" })
        }

        // Only sender can delete their message
        if (message.senderId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "You can only delete your own messages" })
        }

        await Message.findByIdAndDelete(messageId)

        // Notify receiver via Socket.IO
        io.to(message.receiverId.toString()).emit('messageDeleted', messageId)

        res.status(200).json({ message: "Message deleted successfully", messageId })

    } catch (error) {
        console.log("Error in deleteMessage controller", error.message)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

export const getUnreadCounts = async (req, res) => {
    try {
        const loggedInUserId = req.user._id

        const unreadAgg = await Message.aggregate([
            { $match: { receiverId: loggedInUserId, isRead: false } },
            { $group: { _id: "$senderId", count: { $sum: 1 } } }
        ])

        const unreadCounts = {}
        let totalUnread = 0
        unreadAgg.forEach(item => {
            unreadCounts[item._id.toString()] = item.count
            totalUnread += item.count
        })

        res.status(200).json({ unreadCounts, totalUnread })

    } catch (error) {
        console.log("Error in getUnreadCounts controller", error.message)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

export const markMessagesAsRead = async (req, res) => {
    try {
        const myId = req.user._id
        const userToChatId = req.params.id

        if (!mongoose.Types.ObjectId.isValid(userToChatId)) {
            return res.status(400).json({ message: "Invalid user ID format" })
        }

        const result = await Message.updateMany(
            { senderId: userToChatId, receiverId: myId, isRead: false },
            { $set: { isRead: true, readAt: new Date() } }
        )

        io.to(userToChatId.toString()).emit("messagesRead", { readerId: myId })

        res.status(200).json({
            success: true,
            userToChatId,
            modifiedCount: result.modifiedCount
        })

    } catch (error) {
        console.log("Error in markMessagesAsRead controller", error.message)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

export const muteConversation = async (req, res) => {
    try {
        const myId = req.user._id
        const targetUserId = req.params.id
        const { duration } = req.body

        const VALID_DURATIONS = ['1h', '8h', '24h', 'indefinite', 'unmute']
        if (!duration || !VALID_DURATIONS.includes(duration)) {
            return res.status(400).json({
                message: `Invalid duration. Allowed values are: ${VALID_DURATIONS.join(', ')}`
            })
        }

        if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
            return res.status(400).json({ message: "Invalid user ID format" })
        }

        const targetUser = await User.findById(targetUserId)
        if (!targetUser) {
            return res.status(404).json({ message: "User not found" })
        }

        const user = await User.findById(myId)
        if (!user.mutedConversations) {
            user.mutedConversations = []
        }

        // Remove existing mute for this user
        user.mutedConversations = user.mutedConversations.filter(
            m => m.userId.toString() !== targetUserId.toString()
        )

        let mutedUntil = null
        let isMuted = false

        if (duration !== 'unmute') {
            const now = Date.now()
            if (duration === '1h') {
                mutedUntil = new Date(now + 60 * 60 * 1000)
            } else if (duration === '8h') {
                mutedUntil = new Date(now + 8 * 60 * 60 * 1000)
            } else if (duration === '24h') {
                mutedUntil = new Date(now + 24 * 60 * 60 * 1000)
            } else if (duration === 'indefinite') {
                mutedUntil = null
            }

            user.mutedConversations.push({
                userId: targetUserId,
                mutedUntil
            })
            isMuted = true
        }

        await user.save()

        res.status(200).json({
            success: true,
            targetUserId,
            isMuted,
            mutedUntil
        })

    } catch (error) {
        console.log("Error in muteConversation controller", error.message)
        res.status(500).json({ message: "Internal Server Error" })
    }
}