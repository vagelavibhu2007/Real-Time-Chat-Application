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

        res.status(200).json(filteredUsers)

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

        const receiverSocketId = getReceiverSocketId(receiverId)
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('newMessage', newMessage)
        }

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

        const receiverSocketId = getReceiverSocketId(otherUserId)
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('messageReaction', {
                messageId: message._id,
                reactions: message.reactions
            })
        }

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
        const receiverSocketId = getReceiverSocketId(message.receiverId.toString())
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('messageDeleted', messageId)
        }

        res.status(200).json({ message: "Message deleted successfully", messageId })

    } catch (error) {
        console.log("Error in deleteMessage controller", error.message)
        res.status(500).json({ message: "Internal Server Error" })
    }
}