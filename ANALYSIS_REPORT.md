# 📊 BÁO CÁO PHÂN TÍCH DỰ ÁN - OEM EV WARRANTY SYSTEM

**Ngày phân tích**: 2025-11-14  
**Phiên bản**: 1.0  
**Trạng thái**: Đang phân tích (Phase 1-5 hoàn thành)

---

## 🎯 TỔNG QUAN DỰ ÁN

### Kiến trúc hiện tại
- **Pattern**: Microservices với API Gateway
- **Backend**: 6 services (user, vehicle, warranty, part, campaign, analytics*)
- **Frontend**: React + Vite + Redux Toolkit
- **Database**: MongoDB (mỗi service 1 DB riêng)
- **Deployment**: Docker Compose + Railway

### Công nghệ stack
- **Backend**: Node.js + Express 5.x + Mongoose
- **Frontend**: React 19 + Vite 7 + TailwindCSS 4
- **Auth**: JWT (jsonwebtoken)
- **API Gateway**: http-proxy-middleware

---

## 🔴 VẤN ĐỀ NGHIÊM TRỌNG (CRITICAL)

### 1. Analytics Service - Service "ma" không tồn tại ⚠️
**Mô tả**: Docker compose định nghĩa analytics-service nhưng folder không tồn tại

**Bằng chứng**:
- `docker-compose.yml` lines 36-50: Định nghĩa analytics-service + mongo-analytics
- `Backend/api-gateway/index.js` line 16: Proxy route `/api/analytics`
- **KHÔNG TỒN TẠI**: Folder `Backend/analytics-service/`

**Thực tế**: Analytics routes nằm trong `warranty-service/routes/analyticsRoutes.js`

**Ảnh hưởng**:
- Docker compose sẽ fail khi build
- Tốn resources: 1 MongoDB instance + 1 container
- API Gateway proxy đến service không tồn tại
- Confusion trong team

**Giải pháp đề xuất**:
- [ ] Option 1: Xóa analytics-service khỏi docker-compose.yml
- [ ] Option 2: Tạo analytics-service thực sự và migrate logic từ warranty-service
- [ ] Cập nhật API Gateway routing

---

### 2. Frontend bypass API Gateway ⚠️
**Mô tả**: Frontend gọi trực tiếp đến từng service, không qua API Gateway

**Bằng chứng**:
```javascript
// Frontend/.env
VITE_USER_API=http://localhost:3001/api      // Direct to user-service
VITE_VEHICLE_API=http://localhost:3002/api   // Direct to vehicle-service
VITE_PART_API=http://localhost:3004/api      // Direct to part-service
VITE_WARRANTY_API=http://localhost:3003/api  // Direct to warranty-service
```

**API Gateway (port 3000) KHÔNG ĐƯỢC SỬ DỤNG**

**Ảnh hưởng**:
- Mất centralized logging, monitoring
- Mất rate limiting, request validation
- CORS phải config ở MỌI service
- Khó implement authentication middleware tập trung
- Không thể cache, load balance
- Vi phạm microservices best practices

**Giải pháp đề xuất**:
- [ ] Đổi Frontend .env thành: `VITE_API_URL=http://localhost:3000/api`
- [ ] Tất cả requests đi qua API Gateway
- [ ] Remove CORS config khỏi individual services
- [ ] Implement centralized auth middleware tại Gateway

---

### 3. Campaign Service - Service rỗng ⚠️
**Mô tả**: Campaign service chỉ có skeleton, không có logic thực tế

**Bằng chứng**:
- `Backend/campaign-service/index.js`: Chỉ có route test "/"
- `Backend/campaign-service/config/`: Rỗng
- `Backend/campaign-service/controllers/`: Rỗng
- `Backend/campaign-service/routes/`: Rỗng
- `Backend/campaign-service/models/`: Chỉ có folder dto/ rỗng

**Frontend sử dụng fake data**:
- `Frontend/src/page/Home/SC/ManageCampaign.jsx`: 150+ dòng fake data hardcode
- Không có API call thực tế

**Ảnh hưởng**:
- Tốn resources: MongoDB instance + Docker container
- Gây nhầm lẫn về tính năng có sẵn
- Technical debt

**Giải pháp đề xuất**:
- [ ] Option 1: Remove campaign-service hoàn toàn (nếu không cần)
- [ ] Option 2: Implement campaign-service đầy đủ
- [ ] Xóa fake data trong frontend

---

### 4. Part Service thiếu Authentication ⚠️
**Mô tả**: Part service không sử dụng shared auth middleware

**Bằng chứng**:
- `Backend/part-service/routes/`: Không import auth middleware
- User, Vehicle, Warranty services đều dùng `../../shared/middlewares/auth.js`
- Part service routes không có authentication

**Ảnh hưởng**:
- Security vulnerability: API endpoints không được bảo vệ
- Inconsistent authentication across services

**Giải pháp đề xuất**:
- [ ] Import và apply auth middleware cho part-service routes
- [ ] Test authentication flow

---

## 🟠 VẤN ĐỀ QUAN TRỌNG (HIGH)

### 5. Cấu hình .env phân tán và không nhất quán
**Mô tả**: Mỗi service có .env riêng với tên biến khác nhau

**Bằng chứng**:
| Service | MongoDB Variable | Port Variable |
|---------|-----------------|---------------|
| Root | USER_DB, VEHICLE_DB, etc. | PORT_USER, PORT_VEHICLE |
| user-service | MONGO_URL | Không có |
| vehicle-service | MONGO_URI | PORT |
| warranty-service | MONGO_URI | WARRANTY_PORT |
| part-service | MONGO_URL | PORT |

**Vấn đề**:
- Không có single source of truth
- Khó maintain và sync
- Dễ sai khi deploy

**Giải pháp đề xuất**:
- [ ] Standardize tên biến: `MONGO_URI`, `PORT`
- [ ] Sử dụng root .env làm source of truth
- [ ] Services đọc từ environment variables

---

### 6. API Gateway routes files thừa
**Mô tả**: 6 route files trong `Backend/api-gateway/routes/` đều RỖNG

**Files thừa**:
- `analytics.js` - Empty
- `campaign.js` - Empty
- `part.js` - Empty
- `user.js` - Empty
- `vehicle.js` - Empty
- `warranty.js` - Empty

**Thực tế**: API Gateway dùng `createProxyMiddleware` trực tiếp trong index.js

**Giải pháp đề xuất**:
- [ ] Xóa toàn bộ folder `Backend/api-gateway/routes/`

---

### 7. JWT_SECRET yếu và duplicate
**Mô tả**: JWT_SECRET="admin" (quá yếu) được duplicate ở nhiều nơi

**Locations**:
- `.env` (root)
- `Backend/user-service/.env`
- `Backend/vehicle-service/.env`
- `Backend/warranty-service/.env`

**Ảnh hưởng**:
- Security risk: Secret quá đơn giản
- Maintenance: Phải update nhiều nơi

**Giải pháp đề xuất**:
- [ ] Generate strong JWT secret (32+ characters)
- [ ] Chỉ lưu ở root .env
- [ ] Services đọc từ process.env.JWT_SECRET

---

### 8. Shared configs không được sử dụng
**Mô tả**: `Backend/shared/configs/DBConfig/` tồn tại nhưng rỗng

**Thực tế**: Mỗi service tự implement database connection
- `user-service/configs/database.js`
- `vehicle-service/config/database.js`
- `warranty-service/config/database.js`
- `part-service/config/database.js`

**Giải pháp đề xuất**:
- [ ] Tạo shared database connection utility
- [ ] Hoặc xóa folder shared/configs nếu không dùng

---

## 🟡 VẤN ĐỀ NÊN FIX (MEDIUM)

### 9. Duplicate node_modules
**Mô tả**: 9 thư mục node_modules trong dự án

**Locations**:
- Root `/node_modules/`
- `Backend/node_modules/`
- `Backend/api-gateway/node_modules/`
- `Backend/user-service/node_modules/`
- `Backend/vehicle-service/node_modules/`
- `Backend/warranty-service/node_modules/`
- `Backend/part-service/node_modules/`
- `Backend/campaign-service/node_modules/`
- `Frontend/node_modules/`

**Ảnh hưởng**: Tốn hàng GB disk space

**Giải pháp**: Chấp nhận được cho microservices, nhưng nên dùng Docker multi-stage builds

---

### 10. Root package.json scripts sai path
**Mô tả**: Scripts dùng lowercase `backend/` nhưng folder là `Backend/`

```json
"start-user": "cd backend/user-service && npm start",  // ❌ Sai
```

**Giải pháp đề xuất**:
- [ ] Sửa thành `Backend/` (uppercase)
- [ ] Thêm script start api-gateway

---

### 11. CORS config duplicate
**Mô tả**: Mỗi service config CORS riêng cho `http://localhost:5173`

**Services có CORS**:
- user-service
- vehicle-service
- warranty-service
- part-service

**Giải pháp đề xuất**:
- [ ] Chỉ config CORS tại API Gateway
- [ ] Remove CORS khỏi individual services

---

## 📊 THỐNG KÊ

### Services Status
| Service | Status | Models | Routes | Controllers | Auth |
|---------|--------|--------|--------|-------------|------|
| user-service | ✅ Active | 3 | 4 | 4 | ✅ |
| vehicle-service | ✅ Active | 5 | 5 | ? | ✅ |
| warranty-service | ✅ Active | 3 | 4 | ? | ✅ |
| part-service | ✅ Active | ? | 4 | ? | ❌ |
| campaign-service | ⚠️ Empty | 0 | 0 | 0 | ❌ |
| analytics-service | ❌ Not Exist | - | - | - | - |
| api-gateway | ✅ Active | - | 0 | - | - |

### Frontend Pages
- **Auth**: 3 pages (Auth, AuthActive, ForgotPassword)
- **SC Staff**: 8 pages (Dashboard, RegisterVIN, SearchVIN, CreateClaim, ManageClaim, ManageCustomer, ManageCampaign, ManageTechnician)
- **EVM Staff**: 3 pages (Dashboard, CenterManagement, ClaimsManagement, RepairOrderManagement)
- **Technician**: 1 page (Technician)

---

## 📝 CHECKLIST CLEANUP

### Phase 1: Critical Fixes
- [ ] Quyết định analytics-service: Remove hoặc Implement
- [ ] Cấu hình Frontend qua API Gateway
- [ ] Quyết định campaign-service: Remove hoặc Implement
- [ ] Thêm auth middleware cho part-service

### Phase 2: Configuration Cleanup
- [ ] Standardize .env variables
- [ ] Generate strong JWT_SECRET
- [ ] Centralize configuration
- [ ] Xóa API Gateway routes files

### Phase 3: Architecture Improvements
- [ ] Implement shared database config (optional)
- [ ] Centralize CORS config
- [ ] Fix root package.json scripts
- [ ] Document architecture decisions

---

## 🔍 CẦN PHÂN TÍCH THÊM

**Chưa đọc chi tiết**:
- [ ] Controllers logic trong từng service
- [ ] Models schema và relationships
- [ ] Validation logic
- [ ] Error handling patterns
- [ ] Business logic trong warranty claims
- [ ] Part inventory management logic
- [ ] Vehicle service records logic

**Sẽ phân tích trong Phase tiếp theo**

---

**Cập nhật lần cuối**: 2025-11-14  
**Người phân tích**: Kiro AI Assistant


---

## 🔍 PHÂN TÍCH CHI TIẾT - PHASE 6: BUSINESS LOGIC & DATA MODELS

### User Service - Authentication & Authorization ✅

**Models**:
- `UserModel`: email, password, center_id, role, status
- `ServiceCenterModel`: user_id, center_code (auto-gen SC0, SC1...), name, phone, address, claims, staffs
- `TechnicianModel`: user_id, center_id, status, workload, skills, name, phone

**Roles hỗ trợ**:
- `admin` - Quản trị hệ thống
- `evm_staff` - Nhân viên EVM (Electric Vehicle Manufacturer)
- `sc_staff` - Nhân viên Service Center
- `sc_technician` - Kỹ thuật viên

**Vấn đề phát hiện**:
1. ❌ **Password không có validation**: Không check độ dài, độ phức tạp
2. ❌ **Email không unique trong schema**: Chỉ check trong code
3. ⚠️ **Status "inactive" mặc định**: User mới tạo phải activate thủ công
4. ⚠️ **ServiceCenter auto-gen code có race condition**: `countDocuments()` không atomic

---

### Vehicle Service - Vehicle & Customer Management ✅

**Models**:
- `Vehicle`: vin_id (ref Vin), customer_id, center_id, registration_number, model, color, warranty_start/end, current_mileage, kilometer, service_history, parts[], status
- `Customer`: full_name, phone, email, address, person_id (CCCD), gender, vehicles[]
- `ServiceRecord`: vin, service_center_id, technician_id, service_type, description, date_in/out, duration_days, cost, status, attachments
- `Vin`: (chưa đọc chi tiết)
- `PartsAttached`: (chưa đọc chi tiết)

**Business Logic**:
- Warranty mặc định 1 năm từ warranty_start
- Tracking mileage: `current_mileage` vs `kilometer` (duplicate?)
- Service types: warranty, maintenance, recall, repair

**Vấn đề phát hiện**:
1. ⚠️ **Import models từ user-service**: `import "../../user-service/models/UserModel.js"` - Vi phạm microservices independence
2. ❌ **Duplicate mileage fields**: `current_mileage` và `kilometer` không rõ khác biệt
3. ⚠️ **Service history embedded**: Nên dùng ServiceRecord collection thay vì embedded array
4. ⚠️ **Parts array chỉ lưu String**: Nên reference đến PartInstance

---

### Warranty Service - Core Business Logic ✅

**Models**:
- `WarrantyClaim`: claim_code (auto-gen), vehicle (embedded object), vin, parts[], policy_id, issue_description, images[], center_id, technician_id, status, customer_confirmation, summary (total_warranty_amount, total_customer_amount), repair_order_id
- `WarrantyPolicy`: name, description, model_applicable[], part_category, duration_months, max_mileage, conditions[], status
- `WarrantyCosts`: claim_id, part_cost, labor_cost, transport_cost, other_costs, notes (có virtual field total_cost)

**Claim Status Flow**:
```
submitted → waiting_customer → confirmed → in_repair → completed
         ↘ rejected
```

**Business Logic Highlights**:
1. ✅ **Auto-generate claim_code**: `WC-{timestamp}-{count}`
2. ✅ **Warranty evaluation**: Check policy cho từng part
3. ✅ **Customer confirmation flow**: Email với link confirm/reject
4. ✅ **Cost calculation**: Tách warranty vs customer pay
5. ✅ **Image upload**: Multer middleware

**Vấn đề phát hiện**:
1. ⚠️ **Vehicle data embedded**: Duplicate data từ vehicle-service, không sync
2. ⚠️ **VIN validation call**: Gọi HTTP đến vehicle-service (tight coupling)
3. ❌ **Email service không có retry**: `sendEmail()` fail sẽ mất email
4. ⚠️ **Customer confirmation timeout**: Không có auto-expire mechanism
5. ❌ **Images không có cleanup**: Upload fail không xóa files

---

### Part Service - Inventory Management ✅

**Models**:
- `PartCatalog`: name, category (battery/motor/bms/charger/inverter/sensor), manufacturer, model_code, cost_price, weight_kg, dimensions, description, image_url, status
- `PartInstance`: serial_number (auto-gen BAT-00001), part_catalog_id, vehicle_id, install_date, warranty_end (1 year default), status (active/replaced/defective)
- `Inventory`: part_id, quantity, threshold (default 3), last_restocked_at
- `Shipment`: (chưa đọc chi tiết)

**Business Logic**:
- Auto-generate serial numbers: `{PREFIX}-{COUNT:5}`
- Prefixes: BAT (battery), MOT (motor), BMS, CHR (charger), INV (inverter), SNS (sensor)
- Warranty 1 năm từ install_date

**Vấn đề phát hiện**:
1. ⚠️ **PartInstance không có auth**: Routes không dùng auth middleware
2. ❌ **Serial number race condition**: `countDocuments()` không atomic
3. ⚠️ **Inventory threshold**: Có threshold nhưng không có alert mechanism
4. ❌ **Part catalog vs instance confusion**: Inventory dùng `part_id` (String) nhưng không rõ ref đến catalog hay instance

---

### Frontend - API Integration ✅

**Service APIs**:
- `userApi`: Base RTK Query setup với auth token
- `vehicleApi`: CRUD vehicles, customers, VINs
- `warrantyApi`: Claims, repair orders, technician assignments, approve/confirm flow
- `partApi`: Part catalogs, part instances, vehicle parts

**Vấn đề phát hiện**:
1. ❌ **Direct service calls**: Frontend gọi thẳng đến services (đã nêu ở Phase 3)
2. ⚠️ **Custom FormData handling**: `warrantyApi` có custom baseQuery cho multipart/form-data
3. ⚠️ **No error handling**: Không có global error interceptor
4. ⚠️ **No retry logic**: API fail không retry
5. ❌ **Token refresh missing**: Không có refresh token mechanism

---

## 🔴 VẤN ĐỀ MỚI PHÁT HIỆN (CRITICAL)

### 12. Cross-Service Model Imports ⚠️
**Mô tả**: Vehicle service import models từ user-service

```javascript
// Backend/vehicle-service/models/Vehicle.js
import "../../user-service/models/UserModel.js";
import "../../user-service/models/ServiceCenterModel.js";
import "../../user-service/models/TechnicianModel.js";
```

**Ảnh hưởng**:
- Vi phạm microservices independence
- Không thể deploy services riêng biệt
- Tight coupling giữa services

**Giải pháp**:
- [ ] Remove cross-service imports
- [ ] Dùng API calls hoặc message queue
- [ ] Hoặc move shared models vào shared folder

---

### 13. Data Duplication & Sync Issues ⚠️
**Mô tả**: Warranty claim lưu vehicle data embedded

```javascript
// WarrantyClaim model
vehicle: {
  type: Object,
  default: null,
}
```

**Ảnh hưởng**:
- Vehicle data thay đổi không sync với claims
- Duplicate storage
- Data inconsistency

**Giải pháp**:
- [ ] Chỉ lưu vehicle_id reference
- [ ] Fetch vehicle data khi cần
- [ ] Hoặc implement event-driven sync

---

### 14. Race Conditions trong Auto-Generate IDs ❌
**Mô tả**: Multiple services dùng `countDocuments()` để gen ID

**Locations**:
- ServiceCenter: `center_code = SC${count}`
- PartInstance: `serial_number = {PREFIX}-${count}`
- WarrantyClaim: `claim_code = WC-${timestamp}-${count}`

**Ảnh hưởng**:
- Concurrent requests có thể tạo duplicate IDs
- Không atomic operation

**Giải pháp**:
- [ ] Dùng MongoDB auto-increment plugin
- [ ] Hoặc dùng UUID/ULID
- [ ] Hoặc implement distributed ID generator

---

### 15. Email Service không có Error Handling ❌
**Mô tả**: Customer confirmation email không có retry/fallback

```javascript
await sendEmail({...}); // Fail sẽ throw error
```

**Ảnh hưởng**:
- Email fail → claim stuck ở waiting_customer
- Không có notification cho admin
- Customer không biết phải làm gì

**Giải pháp**:
- [ ] Implement email queue (Bull/BullMQ)
- [ ] Retry mechanism
- [ ] Fallback notification (SMS?)
- [ ] Admin dashboard cho failed emails

---

### 16. Part Service thiếu Authentication (đã nêu nhưng critical) ❌
**Mô tả**: Part service routes không có auth middleware

**Ảnh hưởng**:
- Anyone có thể CRUD parts
- Inventory manipulation
- Security breach

**Giải pháo**:
- [ ] Apply auth middleware cho tất cả routes
- [ ] Role-based access: chỉ admin/sc_staff được modify

---

## 📊 THỐNG KÊ CẬP NHẬT

### Code Quality Metrics
| Metric | Value | Status |
|--------|-------|--------|
| Total Services | 7 (6 active + 1 ghost) | ⚠️ |
| Services with Auth | 3/6 (50%) | ❌ |
| Cross-service Imports | 1 found | ❌ |
| Race Conditions | 3 found | ❌ |
| Data Duplication | 2 cases | ⚠️ |
| Email Reliability | No retry | ❌ |

### Models Overview
| Service | Models | Relationships | Issues |
|---------|--------|---------------|--------|
| User | 3 | Clean | Password validation missing |
| Vehicle | 5 | Cross-service imports | Mileage duplication |
| Warranty | 3 | Embedded vehicle data | Sync issues |
| Part | 4 | Clean | No auth, race conditions |
| Campaign | 0 | N/A | Empty service |
| Analytics | N/A | N/A | Doesn't exist |

---

## 🎯 PRIORITY FIXES - CẬP NHẬT

### P0 - Must Fix Now
1. ❌ Remove analytics-service từ docker-compose
2. ❌ Add auth middleware cho part-service
3. ❌ Fix race conditions trong ID generation
4. ❌ Remove cross-service model imports

### P1 - Fix This Sprint
5. ⚠️ Frontend qua API Gateway
6. ⚠️ Implement email retry mechanism
7. ⚠️ Fix vehicle data duplication trong claims
8. ⚠️ Standardize .env configuration

### P2 - Technical Debt
9. 🟡 Campaign service: implement hoặc remove
10. 🟡 Password validation
11. 🟡 Token refresh mechanism
12. 🟡 Global error handling

---

**Tiếp tục phân tích**: Controllers logic, Frontend pages flow, Utils & helpers
