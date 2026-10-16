import mongoose, { Schema } from "mongoose";

const reactionSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    emoji: {
        type: String,
        required: true,
        enum: ['👍', '❤️', '😂', '😮', '😢', '🔥']
    }
}, { _id: false });

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
    },
    replyTo:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'message',
        default:null
    },
    reactions:{
        type:[reactionSchema],
        default:[]
    },
    isRead:{
        type:Boolean,
        default:false
    },
    readAt:{
        type:Date,
        default:null
    }
},{timestamps:true})

messageSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 });
messageSchema.index({ receiverId: 1, senderId: 1, isRead: 1 });
messageSchema.index({ replyTo: 1 });

const Message = mongoose.model('message',messageSchema)

export default Message