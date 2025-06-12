# Use Node.js base image
FROM node:18

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

COPY .env ./

# Copy the rest of the code
COPY . .

# Load environment variables if needed
ENV NODE_ENV=production

# Expose port (adjust if your app uses a different one)
EXPOSE 8002

# Start the app
CMD ["node", "index.js"]
