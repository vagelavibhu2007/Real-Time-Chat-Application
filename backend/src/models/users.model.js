import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
    email:{
        type:String,
        required:true,
        unique:true
    },
    fullName:{
        type:String,
        required:true
    },
    password:{
        type:String,
        require:true,
        minLength:6
    },
    profilePic:{
        type:String,
        default:""
    },
    resetPasswordOtp: {
        type: String,
        default: null
    },
    resetPasswordOtpExpires: {
        type: Date,
        default: null
    }
},{timestamps:true})


const User = mongoose.model('user',userSchema)

export default User