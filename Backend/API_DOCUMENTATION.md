# OEM EV Warranty Management System - API Documentation

## Base URL

```
http://localhost:3000
```

## Authentication

Most endpoints require JWT authentication. Include the access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Response Format

All responses follow this format:

```json
{
  "success": true/false,
  "message": "Description",
  "data": {}, // Response data
  "error": "Error message" // Only on errors
}
```

---

## 🔐 Authentication APIs

### 1. Register New Account

**POST** `/api/auth/register`

**Body:**

For **admin, service_staff, technician, manufacturer_staff**:

```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "Test123!",
  "role": "admin" // admin, service_staff, technician, manufacturer_staff
}
```

For **customer** (requires additional fields):

```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "Test123!",
  "role": "customer",
  "phone": "0123456789", // Required for customer
  "fullAddress": "123 Main St, City, Country" // Required for customer
}
```

**Response:**

```json
{
  "success": true,
  "message": "Đăng ký thành công",
  "data": {
    "user": {
      "id": "user_id",
      "username": "testuser",
      "email": "test@example.com",
      "role": "customer"
    }
  }
}
```

### 2. Login

**POST** `/api/auth/login`

**Body:**

```json
{
  "email": "test@example.com",
  "password": "Test123!"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 1800,
  "tokenType": "Bearer",
  "user": {
    "id": "user_id",
    "username": "testuser",
    "email": "test@example.com",
    "role": "customer"
  }
}
```

### 3. Refresh Token

**POST** `/api/auth/refresh`

**Note:** Requires refresh token in httpOnly cookie

**Response:**

```json
{
  "success": true,
  "message": "Token làm mới thành công",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 1800,
  "tokenType": "Bearer"
}
```

### 4. Logout

**POST** `/api/auth/logout`

**Note:** Uses refresh token from httpOnly cookie

**Response:**

```json
{
  "success": true,
  "message": "Đăng xuất thành",
  "data": {
    "id": "user_id",
    "username": "testuser",
    "email": "test@example.com",
    "role": "customer",
    "status": "active"
  }
}
```

### 6. Force Logout User (Admin Only)

**POST** `/api/auth/force-logout/:userId`

**Headers:** `Authorization: Bearer <admin_token>`

**Response:**

```json
{
  "success": true,
  "message": "User đã được đăng xuất khỏi tất cả thiết bị công"
}
```

### 5. Get Current User Info

**GET** `/api/auth/me`

**Headers:** `Authorization: Bearer <token>`

**Response:**

```json
{
  "success": true,
  "message": "Lấy thông tin user thành công",
  "data": {
    "id": "user_id",
    "username": "testuser",
    "email": "test@example.com",
    "role": "customer",
    "status": "active"
  }
}
```

### 6. Force Logout User (Admin Only)

**POST** `/api/auth/force-logout/:userId`

**Headers:** `Authorization: Bearer <admin_token>`

**Response:**

```json
{
  "success": true,
  "message": "User đã được đăng xuất khỏi tất cả thiết bị"
}
```

---

## 👥 User Management APIs

### 1. Get All Users

**GET** `/api/users`

**Auth:** Admin only

**Response:**

```json
{
  "success": true,
  "message": "Lấy danh sách users thành công",
  "data": [
    {
      "id": "user_id",
      "username": "testuser",
      "email": "test@example.com",
      "role": "customer",
      "status": "active"
    }
  ],
  "count": 1
}
```

### 2. Get User by ID

**GET** `/api/users/:id`

**Auth:** Admin or self

**Response:**

```json
{
  "success": true,
  "message": "Lấy thông tin user thành công",
  "data": {
    "id": "user_id",
    "username": "testuser",
    "email": "test@example.com",
    "role": "customer",
    "status": "active"
  }
}
```

### 3. Update User

**PUT** `/api/users/:id`

**Auth:** Admin or self

**Body:**

```json
{
  "username": "newusername",
  "email": "newemail@example.com",
  "phone": "0123456789",
  "address": "New Address"
}
```

### 4. Get Available Technicians

**GET** `/api/users/technicians/available`

**Auth:** Admin, Service Staff

**Query Parameters:**

- `specialization` (optional): Filter by specialization
- `serviceCenter` (optional): Filter by service center

### 5. Delete User

**DELETE** `/api/users/:id`

**Auth:** Admin only

---

## 🚗 Vehicle Management APIs

### 1. Register Vehicle

**POST** `/api/vehicles/register`

**Auth:** Admin, Service Staff

**Body:**

```json
{
  "vin": "TEST123456789ABCD",
  "model": "EV Model X",
  "year": 2024,
  "color": "White",
  "batteryCapacity": 75,
  "motorPower": 300,
  "ownerName": "John Doe",
  "ownerPhone": "0123456789",
  "ownerEmail": "john@example.com",
  "ownerAddress": "123 Main St",
  "purchaseDate": "2024-01-15",
  "warrantyStartDate": "2024-01-15",
  "warrantyEndDate": "2027-01-15",
  "assignedServiceCenter": "Service Center A"
}
```

### 2. Get Vehicle by VIN

**GET** `/api/vehicles/vin/:vin`

**Auth:** Required

### 3. Search Vehicles

**GET** `/api/vehicles/search`

**Auth:** Required

**Query Parameters:**

- `q`: Search query
- `type`: Search type (vin, owner, model)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

### 4. Update Vehicle

**PUT** `/api/vehicles/:id`

**Auth:** Admin, Service Staff

### 5. Get Vehicles by Service Center

**GET** `/api/vehicles/service-center/:centerName`

**Auth:** Admin, Service Staff

---

## 🔧 Parts Management APIs

### 1. Add Part to Vehicle

**POST** `/api/vehicles/:vehicleId/parts`

**Auth:** Admin, Service Staff, Technician

**Body:**

```json
{
  "serialNumber": "PART123456789",
  "partType": "battery",
  "partName": "Lithium Battery Pack",
  "manufacturer": "Tesla",
  "installationDate": "2024-01-15",
  "warrantyEndDate": "2026-01-15",
  "cost": 5000
}
```

### 2. Get Vehicle Parts

**GET** `/api/vehicles/:vehicleId/parts`

**Auth:** Required

### 3. Update Part Status

**PUT** `/api/vehicles/:vehicleId/parts/:partId`

**Auth:** Admin, Service Staff, Technician

**Body:**

```json
{
  "status": "replaced", // active, replaced, defective, recalled
  "notes": "Part replaced due to defect",
  "replacedDate": "2024-06-15"
}
```

### 4. Search Part by Serial Number

**GET** `/api/vehicles/parts/serial/:serialNumber`

**Auth:** Required

### 5. Get Parts Statistics

**GET** `/api/vehicles/stats/parts`

**Auth:** Admin, Service Staff

---

## 📋 Service History APIs

### 1. Add Service History

**POST** `/api/vehicles/:vehicleId/service-history`

**Auth:** Admin, Service Staff, Technician

**Body:**

```json
{
  "serviceType": "maintenance",
  "description": "Regular maintenance check",
  "serviceDate": "2024-06-15",
  "mileage": 5000,
  "serviceCenter": "Service Center A",
  "cost": 200,
  "partsReplaced": []
}
```

### 2. Get Service History

**GET** `/api/vehicles/:vehicleId/service-history`

**Auth:** Required

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

### 3. Update Service History

**PUT** `/api/vehicles/:vehicleId/service-history/:recordId`

**Auth:** Admin, Service Staff, Technician

### 4. Get Service Center History

**GET** `/api/vehicles/service-center/:centerName/history`

**Auth:** Admin, Service Staff

---

## 📊 Statistics APIs

### 1. Get Vehicle Overview Statistics

**GET** `/api/vehicles/stats/overview`

**Auth:** Admin, Service Staff

**Query Parameters:**

- `serviceCenter` (optional): Filter by service center

**Response:**

```json
{
  "success": true,
  "data": {
    "vehicles": {
      "totalVehicles": 100,
      "activeVehicles": 95,
      "avgMileage": 15000,
      "totalMileage": 1500000
    },
    "warranty": {
      "underWarranty": 80,
      "expiredWarranty": 20
    },
    "services": {
      "totalServices": 500,
      "totalServiceCost": 100000,
      "avgServiceCost": 200
    }
  }
}
```

---

## 🔒 Role-Based Access Control

### Roles:

- **admin**: Full access to all endpoints
- **service_staff**: Vehicle and service management
- **technician**: Service operations and parts management
- **manufacturer_staff**: Vehicle and parts data access
- **customer**: Limited access to own data

### Common HTTP Status Codes:

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Internal Server Error
