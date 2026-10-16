import dotenv from "dotenv"
dotenv.config()

import express from "express"
import authRoutes from "./routes/auth.routes.js";
import messageRoutes from "./routes/message.routes.js";
import { connectDB, isDbConnected, getDbState, getMongoEnvKey, getLastDbError, sanitizeError } from "./lib/db.js";
import cookieParser from "cookie-parser"
import cors from "cors"
import helmet from "helmet"
import { app,server } from "./lib/socket.js";
import fs from "fs"
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const backendDir = path.resolve(__dirname, "..")
const clientBuildPath = path.resolve(backendDir, "../frontend/dist")

app.set('trust proxy', 1);

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https:"],
            fontSrc: ["'self'", "https:"]
        }
    }
}))
app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true, limit: '20mb' }))
app.use(cookieParser())
app.use(cors({
    origin:"http://localhost:5173",
    credentials:true
}))

// Health and diagnostics endpoint (safe for production - exposes no credentials)
app.get('/api/health', (req, res) => {
    const isConnected = isDbConnected();
    const envKey = getMongoEnvKey();
    const lastErr = getLastDbError();

    const healthData = {
        status: isConnected ? "ok" : "degraded",
        timestamp: new Date().toISOString(),
        database: {
            state: getDbState(),
            connected: isConnected,
            envConfigured: !!envKey,
            envKeyUsed: envKey,
            host: isConnected ? (mongoose.connection?.host || null) : null,
            error: lastErr ? sanitizeError(lastErr) : null
        },
        auth: {
            jwtConfigured: !!process.env.JWT_SECRET
        },
        environment: process.env.NODE_ENV || "development"
    };

    res.status(isConnected ? 200 : 503).json(healthData);
});

app.use('/api/auth', authRoutes)
app.use('/api/messages', messageRoutes)

if (fs.existsSync(clientBuildPath)) {
    app.use(express.static(clientBuildPath))

    app.use('*', (req, res) => {
        res.sendFile(path.join(clientBuildPath, 'index.html'))
    })
}

const main = async () => {
    await connectDB()  //connect mongo first
    server.listen(PORT, async () => {           //connect server next
        console.log("Listening at Port : ", PORT)
    })
}

main()
