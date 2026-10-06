import { generateToken } from "../lib/utils.js"
import User from "../models/users.model.js"
import bcrypt from "bcryptjs"
import validator from "validator"
import cloudinary from "../lib/cloudinary.js"

export const signup = async (req, res) => {
    const { fullName, email, password } = req.body
    try {

        if (!fullName || !email || !password) {
            return res.status(400).json({ message: "All Fields are Required" })
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password Length is too short" })
        }
        //by me
        if (!validator.isEmail(email)) {
            return res.status(400).json({ message: "Invalid email expression" })
        }

        const user = await User.findOne({ email })

        if (user) {
            return res.status(400).json({ message: "User already registered " })
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            fullName,
            email,
            password: hashedPassword
        })


        if (newUser) {
            await newUser.save();
            generateToken(newUser._id, res)

            return res.status(201).json({
                _id: newUser._id,
                fullName: newUser.fullName,
                email: newUser.email,
                profilePic: newUser.profilePic
            })

        } else {
            return res.status(400).json({ message: "Invalid User Data" })
        }

    } catch (error) {
        console.log("Error in Signup controller", error.message)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

export const login = async (req, res) => {
    const { email, password } = req.body
    try {
        if (!email || !password) {
            return res.status(400).json({ message: "All Fields are Required" })
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password Length is too short" })
        }
        //by me
        if (!validator.isEmail(email)) {
            return res.status(400).json({ message: "Invalid email expression" })
        }

        const user = await User.findOne({ email })

        if (!user) {
            return res.status(400).json({ message: "Invalid Credentials" })
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password)

        if (!isPasswordCorrect) {
            return res.status(400).json({ message: "Invalid Credentials" })
        }

        generateToken(user._id, res)

        return res.status(200).json({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            profilePic: user.profilePic
        })


    } catch (error) {
        console.log("Error in Login controller", error.message)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

export const logout = (req, res) => {
    try {
        res.cookie('jwt', "", { maxAge: 0 })
        res.status(200).json({ message: "Logged Out Successfully" })
    } catch (error) {
        console.log("Error in Logout controller", error.message)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

export const updateProfile = async (req, res) => {
    try {
        const { profilePic } = req.body
        const userId = req.user._id

        if (!profilePic) {
            return res.status(401).json({ message: "No Profile Pic Provided" })
        }

        const uploadResponse = await cloudinary.uploader.upload(profilePic)
        const updatedUser = await User.findByIdAndUpdate(userId , {profilePic:uploadResponse.secure_url} , {new:true})

        res.status(200).json(updatedUser)
    } catch (error) {
        console.log("Error in uploadProfile controller", error.message)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

export const checkAuth = (req,res)=>{
    try {
        res.status(200).json(req.user)
    } catch (error) {
        console.log("Error in checkAuth controller", error.message)
        res.status(500).json({ message: "Internal Server Error" })
    }
}