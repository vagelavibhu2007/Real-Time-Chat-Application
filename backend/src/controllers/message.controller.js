import cloudinary from "../lib/cloudinary.js"
import { getReceiverSocketId, io } from "../lib/socket.js"
import Message from "../models/messages.model.js"
import User from "../models/users.model.js"


export const getUsersForSideBar =  async(req,res)=>{
    try {
        const loggedInUserId = req.user._id

        const filteredUsers = await User.find({_id:{$ne:loggedInUserId}}).select("-password -__v")

        res.status(200).json(filteredUsers)

    } catch (error) {
        console.log("Error in message controller", error.message)
        res.status(500).json({ message: "Internal Server Error" })
    }
}


export const getMessages = async(req,res)=>{
    try {
        const myId = req.user._id;
        const userToChatId = req.params.id;

        const messages = await Message.find({
            $or:[
                {senderId:myId , receiverId:userToChatId} ,
                {senderId:userToChatId,receiverId:myId}
            ]
        })


        res.status(200).json(messages)

    } catch (error) {
        console.log("Error in getMessages controller", error.message)
        res.status(500).json({ message: "Internal Server Error" })
    }
}



export const sendMessage =  async(req,res)=>{
    try {
        const {text,image} = req.body;
        const receiverId = req.params.id
        const senderId = req.user._id

        let imageUrl
        if(image){
            const uploadResponst = await cloudinary.uploader.upload(image)
            imageUrl = uploadResponst.secure_url
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image:imageUrl
        })

        await newMessage.save()

        //todo
        const receiverSocketId = getReceiverSocketId(receiverId)
        if(receiverSocketId){
            io.to(receiverSocketId).emit('newMessage',newMessage)
        }

        res.status(201).json(newMessage)


    } catch (error) {
        console.log("Error in sendMessage controller", error.message)
        res.status(500).json({ message: "Internal Server Error" })
    }
}