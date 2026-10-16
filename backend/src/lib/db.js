import mongoose from "mongoose"

let lastDbError = null;

export const getLastDbError = () => lastDbError;

export const getMongoEnvKey = () => {
    if (process.env.MONGO_URL) return "MONGO_URL";
    if (process.env.MONGO_URI) return "MONGO_URI";
    if (process.env.MONGODB_URI) return "MONGODB_URI";
    return null;
};

export const getDbState = () => {
    const states = ["disconnected", "connected", "connecting", "disconnecting"];
    return states[mongoose.connection.readyState] || "unknown";
};

export const isDbConnected = () => {
    return mongoose.connection.readyState === 1;
};

// Mask credentials in Mongo connection string for safe logging
export const sanitizeError = (err) => {
    if (!err) return null;
    const msg = typeof err === "string" ? err : err.message || String(err);
    return msg.replace(/:\/\/([^:]+):([^@]+)@/g, "://$1:****@");
};

export const connectDB = async () => {
    const rawUrl = process.env.MONGO_URL || process.env.MONGO_URI || process.env.MONGODB_URI;
    const mongoUrl = rawUrl ? rawUrl.trim() : "";

    if (!mongoUrl) {
        const errorMsg = "MongoDB connection failed: No connection string found. Please set MONGO_URL in your environment variables.";
        console.error(`[Database Error] ${errorMsg}`);
        lastDbError = new Error(errorMsg);
        return false;
    }

    if (mongoose.connection.readyState === 1) {
        return true;
    }

    try {
        const conn = await mongoose.connect(mongoUrl, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging 30s
        });
        lastDbError = null;
        console.log(`[Database] MongoDB connected successfully to host: ${conn.connection.host}`);
        return true;
    } catch (e) {
        lastDbError = e;
        console.error(`[Database Connection Error]: ${sanitizeError(e)}`);
        return false;
    }
};

// Monitor ongoing connection events
mongoose.connection.on("disconnected", () => {
    console.warn("[Database Warning] MongoDB disconnected. Will attempt reconnect on next query.");
});

mongoose.connection.on("error", (err) => {
    lastDbError = err;
    console.error(`[Database Event Error]: ${sanitizeError(err)}`);
});