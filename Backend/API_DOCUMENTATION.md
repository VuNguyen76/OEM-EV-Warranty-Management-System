# 📚 API Documentation - OEM EV Warranty Management System

## 🏗️ Architecture Overview

Hệ thống sử dụng **Microservices Architecture** với **API Gateway** làm điểm truy cập duy nhất:

```
Client → API Gateway (Port 3000) → Services
                ├── User Service (Port 3001)
                ├── Warranty Service (Port 3002) 
                ├── Manufacturing Service (Port 3003)
                └── Vehicle Service (Port 3004)
```

## 🔐 Authentication & Authorization

### JWT Token System
- **Access Token**: 30 phút, dùng cho API calls
- **Refresh Token**: 7 ngày, lưu trong httpOnly cookie
- **Header**: `Authorization: Bearer <access_token>`

### User Roles
- `admin`: Toàn quyền
- `manufacturer_staff`: Quản lý sản xuất
- `service_staff`: Quản lý trung tâm bảo hành
- `technician`: Kỹ thuật viên
- `customer`: Khách hàng

## 🌐 API Gateway Routes

**Base URL**: `http://localhost:3000`

### Health Check
```http
GET /health
```

### Route Mapping
- `/api/auth/*` → User Service (No auth required)
- `/api/users/*` → User Service (Auth required)
- `/api/manufacturing/*` → Manufacturing Service (Auth required)
- `/api/warranty/*` → Warranty Service (Auth required)
- `/api/vehicle/*` → Vehicle Service (Auth required)

## 👤 User Service APIs

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "string",
  "email": "string",
  "password": "string",
  "role": "admin|manufacturer_staff|service_staff|technician|customer",
  "fullName": "string",
  "phone": "string (required for customer)",
  "fullAddress": "string (required for customer)"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "string",
  "password": "string"
}
```

#### Refresh Token
```http
POST /api/auth/refresh
```

#### Logout
```http
POST /api/auth/logout
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

#### Force Logout User (Admin only)
```http
POST /api/auth/force-logout/:userId
Authorization: Bearer <token>
```

### User Management Endpoints

#### Get All Users (Admin only)
```http
GET /api/users
Authorization: Bearer <token>
```

#### Get Available Technicians
```http
GET /api/users/technicians/available
Authorization: Bearer <token>
Roles: admin, service_staff
```

#### Get User by ID
```http
GET /api/users/:id
Authorization: Bearer <token>
```

#### Update User
```http
PUT /api/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "string",
  "phone": "string",
  "fullAddress": "string"
}
```

#### Delete User (Admin only)
```http
DELETE /api/users/:id
Authorization: Bearer <token>
```

## 🏭 Manufacturing Service APIs

### Vehicle Model Management

#### Create Vehicle Model
```http
POST /api/manufacturing/models
Authorization: Bearer <token>
Roles: admin, manufacturer_staff
Content-Type: application/json

{
  "modelName": "string",
  "modelCode": "string",
  "manufacturer": "string",
  "year": "number",
  "category": "sedan|suv|hatchback|truck|van",
  "batteryCapacity": "number",
  "motorPower": "number",
  "range": "number",
  "vehicleWarrantyMonths": "number",
  "batteryWarrantyMonths": "number",
  "basePrice": "number (min: 100000000 VND)",
  "description": "string"
}
```

#### Get All Vehicle Models
```http
GET /api/manufacturing/models
Authorization: Bearer <token>
```

#### Get Vehicle Model by ID
```http
GET /api/manufacturing/models/:id
Authorization: Bearer <token>
```

#### Update Vehicle Model
```http
PUT /api/manufacturing/models/:id
Authorization: Bearer <token>
Roles: admin, manufacturer_staff
```

#### Delete Vehicle Model
```http
DELETE /api/manufacturing/models/:id
Authorization: Bearer <token>
Roles: admin, manufacturer_staff
```

### Vehicle Production

#### Create Produced Vehicle
```http
POST /api/manufacturing/production
Authorization: Bearer <token>
Roles: admin, manufacturer_staff
Content-Type: application/json

{
  "vin": "string",
  "modelId": "string",
  "productionDate": "ISO date",
  "batterySerialNumber": "string",
  "motorSerialNumber": "string",
  "qualityCheckStatus": "passed|failed|pending"
}
```

#### Get All Produced Vehicles
```http
GET /api/manufacturing/production
Authorization: Bearer <token>
```

#### Get Vehicle by VIN
```http
GET /api/manufacturing/production/:vin
Authorization: Bearer <token>
```

#### Update Produced Vehicle
```http
PUT /api/manufacturing/production/:vin
Authorization: Bearer <token>
Roles: admin, manufacturer_staff
```

### Statistics

#### Get Production Statistics
```http
GET /api/manufacturing/statistics/production
Authorization: Bearer <token>
```

#### Get Model Statistics
```http
GET /api/manufacturing/statistics/models
Authorization: Bearer <token>
```

## 🔧 Warranty Service APIs

### Warranty Management

#### Register Warranty
```http
POST /api/warranty/warranty/register
Authorization: Bearer <token>
Roles: admin, service_staff
Content-Type: application/json

{
  "vin": "string",
  "warrantyStartDate": "ISO date",
  "vehicleWarrantyEndDate": "ISO date",
  "batteryWarrantyEndDate": "ISO date"
}
```

#### Get Warranty by VIN
```http
GET /api/warranty/warranty/:vin
Authorization: Bearer <token>
```

#### Get All Warranties
```http
GET /api/warranty/warranty
Authorization: Bearer <token>
```

#### Update Warranty
```http
PUT /api/warranty/warranty/:vin
Authorization: Bearer <token>
Roles: admin, service_staff
```

#### Activate Warranty
```http
POST /api/warranty/warranty/:vin/activate
Authorization: Bearer <token>
Roles: admin, service_staff
```

#### Void Warranty
```http
POST /api/warranty/warranty/:vin/void
Authorization: Bearer <token>
Roles: admin, service_staff
```

### Parts Management

#### Create Part
```http
POST /api/warranty/parts
Authorization: Bearer <token>
Roles: admin, service_staff
Content-Type: application/json

{
  "partName": "string",
  "partCode": "string",
  "partNumber": "string",
  "category": "battery|motor|bms|inverter|charger|brake|suspension|body|electronics|other",
  "cost": "number",
  "description": "string",
  "supplier": "string",
  "warrantyPeriod": "number"
}
```

#### Get All Parts
```http
GET /api/warranty/parts
Authorization: Bearer <token>
```

#### Get Part by ID
```http
GET /api/warranty/parts/:id
Authorization: Bearer <token>
```

#### Update Part
```http
PUT /api/warranty/parts/:id
Authorization: Bearer <token>
Roles: admin, service_staff
```

#### Delete Part
```http
DELETE /api/warranty/parts/:id
Authorization: Bearer <token>
Roles: admin, service_staff
```

#### Get Low Stock Parts
```http
GET /api/warranty/parts/low-stock
Authorization: Bearer <token>
```

### Vehicle Parts Management

#### Add Part to Vehicle
```http
POST /api/warranty/vehicle-parts
Authorization: Bearer <token>
Roles: admin, service_staff, technician
Content-Type: application/json

{
  "vin": "string",
  "partId": "string",
  "serialNumber": "string",
  "installationDate": "ISO date",
  "installedBy": "string",
  "position": "string",
  "notes": "string"
}
```

#### Get Vehicle Parts
```http
GET /api/warranty/vehicle-parts/:vin
Authorization: Bearer <token>
```

### Service History

#### Add Service History
```http
POST /api/warranty/service-history
Authorization: Bearer <token>
Roles: admin, service_staff, technician
Content-Type: application/json

{
  "vin": "string",
  "serviceType": "maintenance|repair|inspection|recall",
  "description": "string",
  "serviceDate": "ISO date",
  "technicianId": "string",
  "partsUsed": ["partId1", "partId2"],
  "laborHours": "number",
  "cost": "number",
  "notes": "string"
}
```

#### Get Service History by VIN
```http
GET /api/warranty/service-history/:vin
Authorization: Bearer <token>
```

#### Get All Service Histories
```http
GET /api/warranty/service-history
Authorization: Bearer <token>
```

#### Update Service History
```http
PUT /api/warranty/service-history/:id
Authorization: Bearer <token>
Roles: admin, service_staff, technician
```

#### Get Service Statistics
```http
GET /api/warranty/service-history/statistics
Authorization: Bearer <token>
```

## 🚗 Vehicle Service APIs

### Vehicle Management

#### Register Vehicle
```http
POST /api/vehicle/vehicles/register
Authorization: Bearer <token>
Roles: service_staff, admin
Content-Type: application/json

{
  "vin": "string",
  "modelName": "string",
  "modelCode": "string",
  "manufacturer": "string",
  "year": "number",
  "color": "string",
  "ownerName": "string",
  "ownerPhone": "string",
  "ownerAddress": "string",
  "serviceCenterName": "string",
  "productionDate": "ISO date (optional)",
  "notes": "string (optional)"
}
```

#### Get Vehicle by VIN
```http
GET /api/vehicle/vehicles/vin/:vin
Authorization: Bearer <token>
Roles: service_staff, admin, technician
```

#### Get All Vehicles
```http
GET /api/vehicle/vehicles
Authorization: Bearer <token>
Roles: service_staff, admin
```

#### Update Vehicle
```http
PUT /api/vehicle/vehicles/:id
Authorization: Bearer <token>
Roles: service_staff, admin
```

#### Search Vehicles
```http
GET /api/vehicle/vehicles/search?q=<query>
Authorization: Bearer <token>
Roles: service_staff, admin, technician
```

#### Get Vehicle Statistics
```http
GET /api/vehicle/statistics/vehicles
Authorization: Bearer <token>
Roles: service_staff, admin
```

## 🔒 Security Features

### Rate Limiting
- **General API**: 1000 requests/hour per IP
- **Login**: 10 attempts/15 minutes per IP
- **Register**: 5 attempts/hour per IP
- **Sensitive operations**: 20 requests/hour per IP

### Input Validation
- XSS protection middleware
- SQL injection prevention
- Input sanitization
- Schema validation

### CORS Configuration
- Configurable allowed origins
- Credentials support
- Preflight handling

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "cached": false
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error info"
}
```

## 🚀 Getting Started

1. **Start Services**:
   ```bash
   docker-compose up -d
   ```

2. **Health Check**:
   ```bash
   curl http://localhost:3000/health
   ```

3. **Register User**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","email":"admin@test.com","password":"Admin123!","role":"admin","fullName":"Admin User"}'
   ```

4. **Login**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@test.com","password":"Admin123!"}'
   ```

## 📝 Notes

- All timestamps are in ISO 8601 format
- All monetary values are in VND
- VIN must be unique across the system
- Passwords must meet complexity requirements
- Redis caching is enabled for performance
- MongoDB TTL indexes handle token cleanup
- Docker networking enables service communication
