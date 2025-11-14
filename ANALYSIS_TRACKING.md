# 📋 TRACKING - FILES ĐÃ PHÂN TÍCH

**Cập nhật**: 2025-11-14

---

## ✅ ĐÃ ĐỌC VÀ PHÂN TÍCH

### Root Level
- [x] `package.json` - Root package config
- [x] `docker-compose.yml` - Docker orchestration
- [x] `.env` - Root environment variables
- [x] `RAILWAY_SETUP.md` - Deployment notes

### Backend - API Gateway
- [x] `Backend/api-gateway/index.js` - Main gateway file
- [x] `Backend/api-gateway/package.json` - Dependencies
- [x] `Backend/api-gateway/routes/analytics.js` - Empty file
- [x] `Backend/api-gateway/routes/campaign.js` - Empty file
- [x] `Backend/api-gateway/routes/part.js` - Empty file
- [x] `Backend/api-gateway/routes/user.js` - Empty file
- [x] `Backend/api-gateway/routes/vehicle.js` - Empty file
- [x] `Backend/api-gateway/routes/warranty.js` - Empty file

### Backend - User Service
- [x] `Backend/user-service/index.js` - Main entry
- [x] `Backend/user-service/package.json` - Dependencies
- [x] `Backend/user-service/.env` - Environment config
- [x] `Backend/user-service/routes/authRoute.js` - Scanned for imports
- [x] `Backend/user-service/routes/userRoute.js` - Scanned for imports
- [x] `Backend/user-service/routes/centerRoute.js` - Scanned for imports
- [x] `Backend/user-service/routes/technicianRoute.js` - Scanned for imports

### Backend - Vehicle Service
- [x] `Backend/vehicle-service/index.js` - Main entry
- [x] `Backend/vehicle-service/package.json` - Dependencies
- [x] `Backend/vehicle-service/.env` - Environment config
- [x] `Backend/vehicle-service/routes/vehicleRoutes.js` - Scanned for imports

### Backend - Warranty Service
- [x] `Backend/warranty-service/index.js` - Main entry
- [x] `Backend/warranty-service/package.json` - Dependencies
- [x] `Backend/warranty-service/.env` - Environment config
- [x] `Backend/warranty-service/routes/analyticsRoutes.js` - Analytics logic
- [x] `Backend/warranty-service/routes/warrantyClaimRoutes.js` - Scanned for imports

### Backend - Part Service
- [x] `Backend/part-service/index.js` - Main entry
- [x] `Backend/part-service/package.json` - Dependencies
- [x] `Backend/part-service/.env` - Environment config

### Backend - Campaign Service
- [x] `Backend/campaign-service/index.js` - Skeleton only
- [x] `Backend/campaign-service/package.json` - Dependencies
- [x] `Backend/campaign-service/Readme.md` - Empty

### Backend - Shared
- [x] `Backend/shared/middlewares/auth.js` - JWT authentication
- [x] `Backend/shared/middlewares/authorize.js` - Role-based authorization

### Frontend
- [x] `Frontend/package.json` - Dependencies
- [x] `Frontend/.env` - API endpoints config
- [x] `Frontend/README.md` - Vite template readme
- [x] `Frontend/src/routes/index.jsx` - Routing config
- [x] `Frontend/src/service/userApi.js` - RTK Query setup
- [x] `Frontend/src/service/vehicleApi.js` - RTK Query setup
- [x] `Frontend/src/service/warrantyApi.js` - RTK Query setup
- [x] `Frontend/src/service/partApi.js` - RTK Query setup
- [x] `Frontend/src/page/Home/SC/ManageCampaign.jsx` - Campaign page with fake data

---

## ⏳ ĐANG CHỜ PHÂN TÍCH CHI TIẾT

### Backend - User Service (Controllers & Models)
- [x] `Backend/user-service/controllers/authController.js` - Login/Register logic
- [x] `Backend/user-service/controllers/userController.js` - CRUD users
- [ ] `Backend/user-service/controllers/serviceCenterController.js`
- [ ] `Backend/user-service/controllers/technicianController.js`
- [x] `Backend/user-service/models/UserModel.js` - User schema
- [x] `Backend/user-service/models/ServiceCenterModel.js` - ServiceCenter schema
- [x] `Backend/user-service/models/TechnicianModel.js` - Technician schema
- [ ] `Backend/user-service/configs/database.js`

### Backend - Vehicle Service (Controllers & Models)
- [ ] `Backend/vehicle-service/controllers/VehicleController.js`
- [x] `Backend/vehicle-service/models/Vehicle.js` - Vehicle schema (has cross-service imports!)
- [x] `Backend/vehicle-service/models/Customer.js` - Customer schema
- [ ] `Backend/vehicle-service/models/PartsAttached.js`
- [x] `Backend/vehicle-service/models/ServiceRecord.js` - Service record schema
- [ ] `Backend/vehicle-service/models/Vin.js`
- [ ] `Backend/vehicle-service/routes/customerRoutes.js`
- [ ] `Backend/vehicle-service/routes/partsAttachedRoutes.js`
- [ ] `Backend/vehicle-service/routes/serviceRecordRoutes.js`
- [ ] `Backend/vehicle-service/routes/vinRoutes.js`
- [ ] `Backend/vehicle-service/config/database.js`

### Backend - Warranty Service (Controllers & Models)
- [x] `Backend/warranty-service/controllers/WarrantyClaimController.js` - Core business logic
- [ ] `Backend/warranty-service/controllers/WarrantyCostsController.js`
- [x] `Backend/warranty-service/models/WarrantyClaim.js` - Claim schema (embeds vehicle data)
- [x] `Backend/warranty-service/models/WarrantyPolicy.js` - Policy schema
- [x] `Backend/warranty-service/models/WarrantyCosts.js` - Costs schema
- [ ] `Backend/warranty-service/routes/warrantyPolicyRoutes.js`
- [ ] `Backend/warranty-service/routes/warrantyCostsRoutes.js`
- [ ] `Backend/warranty-service/middlewares/upload.js`
- [ ] `Backend/warranty-service/config/database.js`

### Backend - Part Service (Controllers & Models)
- [ ] `Backend/part-service/controllers/partController.js`
- [ ] `Backend/part-service/controllers/inventoryController.js`
- [ ] `Backend/part-service/controllers/shipmentController.js`
- [ ] `Backend/part-service/controllers/partCatalogController.js`
- [x] `Backend/part-service/models/PartInstance.js` - Part instance schema (race condition!)
- [x] `Backend/part-service/models/PartCatalog.js` - Part catalog schema
- [x] `Backend/part-service/models/Inventory.js` - Inventory schema
- [ ] `Backend/part-service/models/Shipment.js`
- [ ] `Backend/part-service/routes/partRoutes.js`
- [ ] `Backend/part-service/routes/inventoryRoutes.js`
- [ ] `Backend/part-service/routes/shipmentRoutes.js`
- [ ] `Backend/part-service/routes/partCatalogRoute.js`
- [ ] `Backend/part-service/validates/` (all files)
- [ ] `Backend/part-service/services/` (all files)
- [ ] `Backend/part-service/config/database.js`

### Frontend - Components
- [ ] `Frontend/src/components/Navbar.jsx`
- [ ] `Frontend/src/components/SideBar.jsx`
- [ ] `Frontend/src/components/Modal.jsx`
- [ ] `Frontend/src/components/Loading.jsx`
- [ ] `Frontend/src/components/ProtectRoute.jsx`
- [ ] `Frontend/src/components/UpdateClaimStatus.jsx`
- [ ] `Frontend/src/components/BarChartRevenue.jsx`

### Frontend - Pages (SC Staff)
- [ ] `Frontend/src/page/Home/SC/Dashboard.jsx`
- [ ] `Frontend/src/page/Home/SC/RegisterVIN.jsx`
- [ ] `Frontend/src/page/Home/SC/SearchVIN.jsx`
- [ ] `Frontend/src/page/Home/SC/CreateClaim.jsx`
- [ ] `Frontend/src/page/Home/SC/ManageClaim.jsx`
- [ ] `Frontend/src/page/Home/SC/ManageCustomer.jsx`
- [ ] `Frontend/src/page/Home/SC/ManageTechnician.jsx`
- [ ] `Frontend/src/page/Home/SC/Technician.jsx`
- [ ] `Frontend/src/page/Home/SC/Report.jsx`

### Frontend - Pages (EVM Staff)
- [ ] `Frontend/src/page/Home/EVM/EvmDashboard.jsx`
- [ ] `Frontend/src/page/Home/EVM/CenterManagement.jsx`
- [ ] `Frontend/src/page/Home/EVM/ClaimsManagement.jsx`
- [ ] `Frontend/src/page/Home/EVM/RepairOrderManagement.jsx`

### Frontend - Pages (Auth)
- [ ] `Frontend/src/page/auth/Auth.jsx`
- [ ] `Frontend/src/page/auth/AuthActive.jsx`
- [ ] `Frontend/src/page/auth/ForgotPassword.jsx`
- [ ] `Frontend/src/page/CustomerConfirmPage.jsx`

### Frontend - Features (Redux Slices & APIs)
- [ ] `Frontend/src/features/auth/auth.api.js`
- [ ] `Frontend/src/features/user/user.api.js`
- [ ] `Frontend/src/features/user/user.slice.js`
- [x] `Frontend/src/features/vehicle/vehicle.api.js` - Vehicle RTK Query endpoints
- [ ] `Frontend/src/features/vehicle/vehicle.slice.js`
- [x] `Frontend/src/features/warranty/warranty.api.js` - Warranty RTK Query endpoints
- [ ] `Frontend/src/features/warranty/warranty.slice.js`
- [x] `Frontend/src/features/part/part.api.js` - Part RTK Query endpoints
- [ ] `Frontend/src/features/part/part.slice.js`
- [ ] `Frontend/src/features/center/center.api.js`
- [ ] `Frontend/src/features/center/center.slice.js`
- [ ] `Frontend/src/features/ui/uiSlice.js`

### Frontend - Utils
- [ ] `Frontend/src/utils/formatPrice.js`
- [ ] `Frontend/src/utils/groupByTime.js`
- [ ] `Frontend/src/utils/navigateByRole.js`
- [ ] `Frontend/src/utils/statusClaim.js`
- [ ] `Frontend/src/utils/warrantyStatus.js`

### Frontend - Core
- [ ] `Frontend/src/App.jsx`
- [ ] `Frontend/src/main.jsx`
- [ ] `Frontend/src/app/store.js`
- [ ] `Frontend/src/layout/DefaultLayout.jsx`

---

## 📊 THỐNG KÊ

**Tổng files đã đọc**: 57 files  
**Tổng files chờ phân tích**: ~65 files  
**Tiến độ**: ~47%

### Vấn đề phát hiện
- **Critical**: 7 issues
- **High**: 8 issues  
- **Medium**: 5 issues
- **Total**: 20 issues

---

## 🎯 ƯU TIÊN PHÂN TÍCH TIẾP THEO

### Priority 1 - Business Logic Critical
1. Warranty Claim Controllers & Models (core business)
2. Part Service Controllers & Models (inventory management)
3. Vehicle Service Controllers & Models (vehicle tracking)

### Priority 2 - Frontend Flow
4. SC Staff pages (main user flow)
5. Redux slices (state management)
6. API integration files

### Priority 3 - Supporting
7. Utils và helpers
8. Components
9. Auth pages

---

**Ghi chú**: File này sẽ được cập nhật liên tục khi phân tích thêm
