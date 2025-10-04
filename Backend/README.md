# 🚀 Backend - OEM EV Warranty Management System

Backend cho hệ thống quản lý bảo hành xe điện OEM - Kiến trúc Monorepo

## 📁 Cấu trúc thư mục

```
Backend/
├── .env                        # ⭐ File cấu hình chung (1 file duy nhất)
├── .gitignore                  # ⭐ Git ignore chung (1 file duy nhất)
├── package.json                # ⭐ Dependencies chung (1 node_modules duy nhất)
├── node_modules/               # ⭐ Thư mục dependencies chung
│
├── api-gateway/                # API Gateway
│   ├── server.js               # Entry point
│   ├── app.js                  # Express app
│   ├── services/               # Services
│   │   ├── AuthService.js      # Xác thực JWT
│   │   ├── AuthorizationService.js  # Phân quyền
│   │   └── GatewayService.js   # Routing & Proxy
│   └── examples/               # Test files
│
├── User/                       # User Service
│   ├── index.js                # Entry point
│   ├── Model/                  # Models
│   ├── Service/                # Services
│   └── Routes/                 # Routes
│
└── shared/                     # ⭐ Code dùng chung
    ├── config/
    │   └── jwt.config.js       # ⭐ Cấu hình JWT (dùng chung)
    ├── utils/
    │   └── JwtHelper.js        # ⭐ JWT Helper (dùng chung)
    ├── middleware/
    │   └── common.js           # Middleware chung
    ├── database/
    │   └── connection.js       # Database connection
    └── Base/
        └── BaseEntity.js       # Base entity
```

## 🎯 Đặc điểm

### ✅ Monorepo - Dùng chung 1 node_modules

- **1 file package.json** - Tất cả dependencies ở 1 chỗ
- **1 thư mục node_modules** - Tiết kiệm dung lượng
- **1 file .env** - Cấu hình tập trung
- **1 file .gitignore** - Quản lý git đơn giản

### ✅ JWT với HS256

- Thuật toán: **HMAC SHA-256**
- Secret key: Dùng chung cho tất cả service
- File config: `shared/config/jwt.config.js`
- Helper: `shared/utils/JwtHelper.js`

### ✅ Microservices

- **API Gateway** (Port 3000) - Điểm vào duy nhất
- **User Service** (Port 3001) - Quản lý người dùng

## 🚀 Cách chạy

### Bước 1: Cài đặt dependencies

**⚠️ QUAN TRỌNG: Chỉ cần chạy `npm install` 1 LẦN duy nhất ở thư mục Backend/**

```bash
cd Backend
npm install
```

Tất cả các service (api-gateway, User, v.v.) sẽ **tự động dùng chung** thư mục `node_modules` này.

**❌ KHÔNG CẦN** chạy `npm install` trong từng thư mục service con!

### Bước 2: Cấu hình .env

Tạo file `.env` từ file mẫu:

```bash
cp .env.example .env
```

Sau đó chỉnh sửa file `.env`:

```env
# JWT Secret (PHẢI GIỐNG NHAU Ở TẤT CẢ SERVICE)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-12345678

# Database
MONGODB_URI=mongodb://localhost:27017/oem-warranty-db

# Ports
PORT=3000
GATEWAY_PORT=3000
USER_SERVICE_PORT=3001

# Service URLs
USER_SERVICE_URL=http://localhost:3001
```

**💡 Tip:** Tạo JWT Secret mạnh:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Bước 3: Chạy services

#### Chạy API Gateway

```bash
npm run dev:gateway
```

#### Chạy User Service

```bash
npm run dev:user
```

#### Chạy tất cả cùng lúc

```bash
npm run dev:all
```

## 📋 Scripts

```bash
# API Gateway
npm run start:gateway      # Chạy production mode
npm run dev:gateway        # Chạy development mode

# User Service
npm run start:user         # Chạy production mode
npm run dev:user           # Chạy development mode

# Chạy tất cả
npm run dev:all            # Chạy tất cả services cùng lúc

# Test
npm run test:jwt           # Test JWT Helper
```

## 🔐 JWT Authentication

### Cấu hình chung

File `shared/config/jwt.config.js`:

```javascript
{
  secret: process.env.JWT_SECRET,
  algorithm: 'HS256',
  expiresIn: '24h',
  issuer: 'OEM-EV-Warranty-System',
  audience: 'warranty-api'
}
```

### JWT Helper

File `shared/utils/JwtHelper.js` cung cấp:

- `generateAccessToken(payload)` - Tạo access token
- `generateRefreshToken(payload)` - Tạo refresh token
- `verifyToken(token)` - Xác thực token
- `decodeToken(token)` - Giải mã token
- `isTokenExpired(token)` - Kiểm tra hết hạn
- `getTokenRemainingTime(token)` - Thời gian còn lại

### Sử dụng trong service

```javascript
const JwtHelper = require("../shared/utils/JwtHelper");

// Tạo token
const token = JwtHelper.generateAccessToken({
  userId: "123",
  email: "user@example.com",
  role: "user",
});

// Xác thực token
const decoded = JwtHelper.verifyToken(token);
```

## ⚠️ Quan trọng

**JWT_SECRET phải giống nhau ở tất cả service!**

Tất cả service đều đọc từ file `.env` chung ở thư mục Backend.

Chúc bạn code vui vẻ! 🚀
Phần mềm quản lý bảo hành xe điện từ hãng
