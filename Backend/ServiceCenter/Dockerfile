FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy shared modules
COPY shared/ ./shared/

# Copy service center service
COPY ServiceCenter/ ./ServiceCenter/

# Expose port
EXPOSE 3004

# Start service
CMD ["node", "ServiceCenter/index.js"]
