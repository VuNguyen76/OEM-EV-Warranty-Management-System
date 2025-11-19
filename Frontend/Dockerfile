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
RUN npm install

# -----------------------
# Copy source code vào container
# -----------------------
COPY . .

# -----------------------
# Expose port cho Vite dev server
# -----------------------
EXPOSE 5173

# -----------------------
# Lệnh khởi động
# -----------------------
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

