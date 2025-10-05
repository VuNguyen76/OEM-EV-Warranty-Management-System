FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy shared files
COPY shared/ ./shared/

# Copy warranty service files
COPY Warranty/ ./Warranty/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S warranty -u 1001

# Change ownership
RUN chown -R warranty:nodejs /app
USER warranty

EXPOSE 3002

# Force unbuffered output
ENV NODE_OPTIONS="--trace-warnings --trace-uncaught"

CMD ["sh", "-c", "node --trace-warnings --trace-uncaught Warranty/index.js 2>&1 | tee /proc/1/fd/1"]
