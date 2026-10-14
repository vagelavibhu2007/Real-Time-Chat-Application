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

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ message: "Invalid email expression" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "No account found with this email address" });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        user.resetPasswordOtp = otp;
        user.resetPasswordOtpExpires = otpExpires;
        await user.save();

        console.log("=========================================");
        console.log(`[PASSWORD RESET OTP for ${email}]: ${otp}`);
        console.log("Expires in 10 minutes");
        console.log("=========================================");

        res.status(200).json({
            message: "Verification code sent to your email",
            email,
            devOtp: otp // Included for local dev simulation
        });
    } catch (error) {
        console.log("Error in forgotPassword controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp.toString().trim()) {
            return res.status(400).json({ message: "Invalid verification code" });
        }

        if (!user.resetPasswordOtpExpires || new Date() > new Date(user.resetPasswordOtpExpires)) {
            return res.status(400).json({ message: "Verification code has expired. Please request a new one." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        user.resetPasswordOtp = null;
        user.resetPasswordOtpExpires = null;
        await user.save();

        res.status(200).json({ message: "Password updated successfully. You can now login." });
    } catch (error) {
        console.log("Error in resetPassword controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};