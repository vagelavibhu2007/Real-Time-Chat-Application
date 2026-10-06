import {v2 as cloudinary} from 'cloudinary'
import { config } from 'dotenv'

config()

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
})

const cloudinaryEnvVars = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET"
]

const missingCloudinaryEnv = cloudinaryEnvVars.filter((key) => !process.env[key])
if (missingCloudinaryEnv.length > 0) {
    console.error("Missing Cloudinary environment variables:", missingCloudinaryEnv.join(", "))
}

export default cloudinary