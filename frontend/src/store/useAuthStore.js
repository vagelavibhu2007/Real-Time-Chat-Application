import {io} from 'socket.io-client'
import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";

const BASE_URL =  import.meta.env.MODE === "development" ?'http://localhost:5000' : "/"

export const useAuthStore = create((set,get) => ({
    authUser: null,
    isSigningUp: false,
    isLoggingIn: false,
    isUpdatingProfile: false,

    isCheckingAuth: true,
    isSendingOtp: false,
    isResettingPassword: false,
    onlineUsers:[],
    socket:null,


    checkAuth: async () => {
        try {
            const res = await axiosInstance.get("/auth/check");
            set({ authUser: res.data })
            get().connectSocket()
        } catch (error) {
            console.log('Error in checkAuth : ', error)
            set({ authUser: null })
        } finally {
            set({ isCheckingAuth: false })
        }
    },

    signup: async (data) => {
        set({ isSigningUp: true });
        try {
            const res = await axiosInstance.post("/auth/signup", data);
            set({ authUser: res.data });
            toast.success("Account created successfully");
            get().connectSocket();
        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({ isSigningUp: false });
        }
    },

    logout: async () => {
        try {
            await axiosInstance.post("/auth/logout");
            set({ authUser: null });
            toast.success("Logged out successfully");
            get().disconnectSocket();
        } catch (error) {
            toast.error(error.response.data.message);
        }
    },

    login: async (data) => {
        set({ isLoggingIn: true });
        try {
            const res = await axiosInstance.post("/auth/login", data);
            set({ authUser: res.data });
            toast.success("Logged in successfully");

            get().connectSocket();
        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({ isLoggingIn: false });
        }
    },

    updateProfile: async (data) => {
        set({ isUpdatingProfile: true });
        try {
            const res = await axiosInstance.put("/auth/update-profile", data);
            set({ authUser: res.data });
            toast.success("Profile updated successfully");
        } catch (error) {
            console.log("error in update profile:", error);
            toast.error(error.response?.data?.message || "Failed to update profile");
        } finally {
            set({ isUpdatingProfile: false });
        }
    },

    forgotPassword: async (email) => {
        set({ isSendingOtp: true });
        try {
            const res = await axiosInstance.post("/auth/forgot-password", { email });
            toast.success(res.data.message || "Verification code sent to your email");
            return { success: true, devOtp: res.data.devOtp, email: res.data.email };
        } catch (error) {
            const message = error.response?.data?.message || "Failed to send verification code";
            toast.error(message);
            return { success: false, message };
        } finally {
            set({ isSendingOtp: false });
        }
    },

    resetPassword: async ({ email, otp, newPassword }) => {
        set({ isResettingPassword: true });
        try {
            const res = await axiosInstance.post("/auth/reset-password", { email, otp, newPassword });
            toast.success(res.data.message || "Password updated successfully!");
            return { success: true };
        } catch (error) {
            const message = error.response?.data?.message || "Failed to reset password";
            toast.error(message);
            return { success: false, message };
        } finally {
            set({ isResettingPassword: false });
        }
    },

    connectSocket : ()=>{
        const {authUser} = get()
        if(!authUser || get().socket?.connected) return

        const socket = io(BASE_URL,{
            query:{
                userId:authUser._id
            }
        })
        socket.connect()
        set({socket:socket})

        socket.on("getOnlineUsers",(userIds)=>{
            set({onlineUsers:userIds})
        })
    },
    disconnectSocket : ()=>{
        if(get.socket?.connected)
            get.socket?.disconnect()
    },

}))