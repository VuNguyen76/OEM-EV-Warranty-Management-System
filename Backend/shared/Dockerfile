# -----------------------
# Base image
# -----------------------
FROM node:18-alpine

# -----------------------
# Working directory
# -----------------------
WORKDIR /shared

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
# Lệnh để giữ container chạy (không cần expose port vì đây là shared library)
# -----------------------
CMD ["tail", "-f", "/dev/null"]

