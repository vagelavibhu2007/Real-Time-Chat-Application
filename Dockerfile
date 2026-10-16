# Use Node.js 22 (Active LTS) for compatibility with Vite 8, React Router 7, and Tailwind CSS v4
FROM node:22-bookworm-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies (ensure frontend devDependencies are included for Vite build)
RUN npm install --prefix backend && npm install --prefix frontend --include=dev

# Copy source code
COPY . .

# Build frontend
RUN npm run build --prefix frontend

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]