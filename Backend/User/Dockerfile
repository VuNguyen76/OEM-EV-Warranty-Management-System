# User Service Dockerfile (fix)
FROM node:18-alpine

# Làm việc trực tiếp trong thư mục service để tránh lạc đường
WORKDIR /app/User

# 1) Cài deps đúng thư mục service
COPY User/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 2) Copy source và shared (nếu code import từ ../shared)
COPY --chown=nodejs:nodejs User/ ./
COPY --chown=nodejs:nodejs shared/ ../shared/

# 3) Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs
USER nodejs

# 4) Env & cổng
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# 5) Healthcheck (sửa --start-period và xử lý lỗi mạng)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3001)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# 6) Start
CMD ["node", "index.js"]
