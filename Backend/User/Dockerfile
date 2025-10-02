# User Service Dockerfile (fix)
FROM node:18-alpine

# Set working directory
WORKDIR /app

# 1) Copy package files from root and install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 2) Copy source code
COPY User/ ./User/
COPY shared/ ./shared/

# 3) Create non-root user and set permissions
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs
RUN chown -R nodejs:nodejs /app
USER nodejs

# 4) Environment variables
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# 5) Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3001)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# 6) Start the service
WORKDIR /app/User
CMD ["node", "index.js"]
