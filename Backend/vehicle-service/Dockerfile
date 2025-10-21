# -----------------------
# Base image
# -----------------------
FROM node:18-alpine

# -----------------------
# Working directory
# -----------------------
WORKDIR /app

# -----------------------
# Copy package.json và cài dependencies
# -----------------------
COPY package*.json ./
RUN npm install --production

# -----------------------
# Copy source code vào container
# -----------------------
COPY . .

# -----------------------
# Expose port (tùy service sẽ khác)
# -----------------------
EXPOSE 3002

# -----------------------
# Lệnh khởi động
# -----------------------
CMD ["npm", "start"]
