# Use Node.js 20 Alpine image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install pnpm and Prisma globally
RUN npm install -g pnpm prisma

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client using global installation
RUN prisma generate

# Build the application
RUN pnpm build

# Start the application in production mode
CMD ["pnpm", "start"]
