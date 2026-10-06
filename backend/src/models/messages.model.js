import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema({
    senderId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
        required:true
    },
    receiverId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
        required:true
    },
    text:{
        type:String
    },
    image:{
        type:String
    }
},{timestamps:true})


const Message = mongoose.model('message',messageSchema)

export default Message