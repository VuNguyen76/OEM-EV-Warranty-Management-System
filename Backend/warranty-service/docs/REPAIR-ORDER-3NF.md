# 🔧 RepairOrder - 3NF Compliant Implementation

## 📊 Schema Design (3NF)

### ✅ Final Schema

```javascript
RepairOrder {
  _id: ObjectId (PK),
  order_code: String (UNIQUE),
  claim_id: ObjectId → WarrantyClaim,
  part_id: String → Parts,
  repair_description: String,
  start_date: Date,
  end_date: Date,
  status: String (enum),
  completion_report: String
}
```

### ❌ Rejected Fields (Violate 3NF)

**NOT INCLUDED:**

- ❌ `service_center_id` - Transitive dependency via claim
- ❌ `technician_id` - Transitive dependency via claim
- ❌ `cost` - Duplicate of claim.actual_cost

**Reason:**

```
RepairOrder → claim_id → WarrantyClaim → service_center_id
                                       → technician_id
                                       → actual_cost
```

This creates transitive dependencies, violating 3NF.

## 🔗 Data Relationships

```
RepairOrder
    ↓ (claim_id)
WarrantyClaim
    ├─ service_center_id (get from here)
    ├─ technician_id (get from here)
    ├─ actual_cost (get from here)
    └─ vin
```

### How to Get Related Data

```javascript
// Get repair order with all related info
const repairOrder = await RepairOrder.findById(id)
  .populate({
    path: "claim_id",
    select: "claim_code vin service_center_id technician_id actual_cost",
  })
  .populate("part_id", "part_name category");

// Access data
const serviceCenter = repairOrder.claim_id.service_center_id;
const technician = repairOrder.claim_id.technician_id;
const cost = repairOrder.claim_id.actual_cost;
```

## 📋 API Endpoints

### 1. Create Repair Order

```http
POST /api/repair-orders
Content-Type: application/json

{
  "claim_id": "507f1f77bcf86cd799439011",
  "part_id": "PART-BAT-60",
  "repair_description": "Replace battery module",
  "start_date": "2024-10-25T00:00:00Z"
}
```

**Response:**

```json
{
  "success": true,
  "order_code": "RO-MH5RUCSQ-BS01",
  "message": "Tạo repair order thành công"
}
```

**Business Rules:**

- ✅ Claim must exist
- ✅ Claim status must be 'approved'
- ✅ One repair order per claim

### 2. Get Repair Order Detail

```http
GET /api/repair-orders/:id
```

**Response:**

```json
{
  "success": true,
  "data": {
    "order_code": "RO-MH5RUCSQ-BS01",
    "claim": {
      "claim_code": "WC-...",
      "vin": "ABC12345678901234",
      "service_center_id": "...",
      "technician_id": "...",
      "actual_cost": 5000000
    },
    "part": {
      "part_id": "PART-BAT-60",
      "part_name": "Lithium Battery 60kWh",
      "category": "battery"
    },
    "status": "in_progress",
    "start_date": "2024-10-25T00:00:00Z"
  }
}
```

### 3. Update Repair Order

```http
PATCH /api/repair-orders/:id
Content-Type: application/json

{
  "status": "completed",
  "completion_report": "Battery replaced successfully"
}
```

**Auto-behaviors:**

- ✅ When status = 'completed', auto set end_date
- ✅ When repair order completed, update claim status to 'completed'

### 4. List Repair Orders

```http
GET /api/repair-orders?status=in_progress
```

## 🎯 3NF Benefits

### 1. No Data Redundancy

**Before (if we included service_center_id):**

```
RepairOrder: service_center_id = "SC001"
WarrantyClaim: service_center_id = "SC001"  ← DUPLICATE!
```

**After (3NF):**

```
RepairOrder: claim_id → WarrantyClaim
WarrantyClaim: service_center_id = "SC001"  ← SINGLE SOURCE
```

### 2. No Update Anomaly

**Scenario:** Service center changes

**Before:**

```sql
UPDATE repair_orders SET service_center_id = 'SC002' WHERE ...
UPDATE warranty_claims SET service_center_id = 'SC002' WHERE ...
-- Risk: Inconsistent if one update fails
```

**After:**

```sql
UPDATE warranty_claims SET service_center_id = 'SC002' WHERE ...
-- Done! RepairOrder automatically reflects change via reference
```

### 3. Data Integrity

- ✅ Single source of truth for service_center_id
- ✅ Single source of truth for technician_id
- ✅ Single source of truth for cost
- ✅ No transitive dependencies

## 🔄 Workflow

```
1. Claim submitted
   ↓
2. Claim reviewed & approved
   ↓
3. Create RepairOrder (this API)
   ├─ Link to claim_id
   ├─ Specify part_id
   └─ Set status = 'waiting_parts'
   ↓
4. Update status to 'in_progress'
   ↓
5. Complete repair
   ├─ Set status = 'completed'
   ├─ Add completion_report
   └─ Auto update claim.status = 'completed'
```

## 📊 Status Flow

```
waiting_parts → in_progress → completed
                           ↘ cancelled
```

## 🧪 Testing

### Test 1: Create Repair Order

```bash
curl -X POST http://localhost:3003/api/repair-orders \
  -H "Content-Type: application/json" \
  -d '{
    "claim_id": "68fc50bd534631d2c4c8dfc3",
    "part_id": "PART-BAT-60",
    "repair_description": "Replace battery"
  }'
```

### Test 2: Get Detail (Verify 3NF)

```bash
curl http://localhost:3003/api/repair-orders/[id]
```

**Check:**

- ✅ No service_center_id in RepairOrder
- ✅ service_center_id comes from populated claim
- ✅ No cost in RepairOrder
- ✅ actual_cost comes from populated claim

### Test 3: Update Status

```bash
curl -X PATCH http://localhost:3003/api/repair-orders/[id] \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "completion_report": "Repair completed successfully"
  }'
```

## ✅ 3NF Compliance Checklist

- [x] No transitive dependencies
- [x] All non-key attributes depend only on primary key
- [x] No redundant data
- [x] Single source of truth maintained
- [x] Proper foreign key relationships
- [x] Data integrity enforced

## 🎉 Summary

RepairOrder is **100% 3NF compliant** by:

1. Removing transitive dependencies (service_center_id, technician_id)
2. Avoiding data duplication (cost)
3. Using proper references (claim_id, part_id)
4. Maintaining single source of truth

**Status:** ✅ PRODUCTION READY
