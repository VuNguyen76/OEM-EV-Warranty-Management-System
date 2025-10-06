FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy shared files
COPY shared/ ./shared/

# Copy manufacturing service files
COPY Manufacturing/ ./Manufacturing/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S manufacturing -u 1001

# Change ownership
RUN chown -R manufacturing:nodejs /app
USER manufacturing

EXPOSE 3003

CMD ["node", "Manufacturing/index.js"]
