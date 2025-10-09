const mongoose = require('mongoose');
const { BaseEntity } = require('../../shared/Base/BaseEntity');
const { VINMixin } = require('../../shared/Base/VINMixin');

const vehiclePartSchema = new mongoose.Schema({
  ...BaseEntity,
  ...VINMixin,

  // Các trường cốt lõi cho phụ tùng xe
  partId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Part',
    required: true
  },

  // Thông tin lắp đặt
  serialNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  installationDate: {
    type: Date,
    required: true,
    default: Date.now
  },

  installedBy: {
    type: String, // ✅ Email nhân viên lắp đặt phụ tùng
    required: true,
    trim: true
  },

  // Vị trí lắp đặt
  position: {
    type: String,
    required: true,
    trim: true
  },

  location: {
    zone: String, // trước, sau, trái, phải, giữa
    section: String, // động cơ, pin, nội thất, ngoại thất
    specificLocation: String // mô tả vị trí chi tiết
  },

  // Trạng thái
  status: {
    type: String,
    required: true,
    enum: ['installed', 'replaced', 'defective', 'recalled', 'maintenance'],
    default: 'installed'
  },

  // Thông tin bảo hành
  warrantyStartDate: {
    type: Date,
    required: true,
    default: Date.now
  },

  warrantyEndDate: {
    type: Date,
    required: true
  },

  warrantyStatus: {
    type: String,
    enum: ['active', 'expired', 'voided'],
    default: 'active'
  },

  // Lịch sử thay thế
  replacementHistory: [{
    replacedDate: Date,
    replacedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    oldSerialNumber: String,
    newSerialNumber: String,
    warrantyRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WarrantyRequest'
    }
  }],

  // Lịch sử bảo trì
  maintenanceHistory: [{
    date: Date,
    type: String, // kiểm tra, làm sạch, hiệu chuẩn, sửa chữa
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    description: String,
    result: String, // tốt, cần chú ý, đã thay thế
    nextMaintenanceDate: Date
  }],

  // Thông tin kỹ thuật
  specifications: {
    voltage: Number,
    capacity: Number,
    power: Number,
    firmware: String,
    calibrationData: mongoose.Schema.Types.Mixed
  },

  // Điều kiện hoạt động
  operatingConditions: {
    temperature: {
      min: Number,
      max: Number,
      current: Number
    },
    humidity: Number,
    vibration: Number,
    cycles: Number // số chu kỳ hoạt động
  },

  // Hiệu suất
  performance: {
    efficiency: Number,
    degradation: Number, // % suy giảm
    lastTestDate: Date,
    testResults: mongoose.Schema.Types.Mixed
  },

  // Cảnh báo và vấn đề
  alerts: [{
    type: String, // cảnh báo, lỗi, đến hạn bảo dưỡng
    message: String,
    severity: String, // thấp, trung bình, cao, tới hạn
    createdAt: Date,
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // Tài liệu
  documents: [{
    name: String,
    type: String, // báo cáo lắp đặt, chứng chỉ kiểm tra, thẻ bảo hành
    url: String,
    uploadedAt: Date,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // Metadata
  notes: String,
  tags: [String],

  // Ngày quan trọng
  nextMaintenanceDate: Date,
  lastInspectionDate: Date,

  // Trạng thái recall
  recallStatus: {
    isRecalled: {
      type: Boolean,
      default: false
    },
    recallCampaignId: String,
    recallDate: Date,
    recallReason: String,
    recallCompleted: Boolean
  }
}, {
  timestamps: true,
  collection: 'vehicle_parts'
});

// Indexes
vehiclePartSchema.index({ vehicleId: 1, partId: 1 });
vehiclePartSchema.index({ serialNumber: 1 });
vehiclePartSchema.index({ status: 1, warrantyStatus: 1 });
vehiclePartSchema.index({ warrantyEndDate: 1 });
vehiclePartSchema.index({ nextMaintenanceDate: 1 });
vehiclePartSchema.index({ 'recallStatus.isRecalled': 1 });

// Virtual cho số ngày bảo hành còn lại
vehiclePartSchema.virtual('warrantyRemainingDays').get(function () {
  if (this.warrantyStatus !== 'active') return 0;
  const now = new Date();
  const diffTime = this.warrantyEndDate - now;
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
});

// Virtual cho hạn bảo dưỡng
vehiclePartSchema.virtual('isMaintenanceDue').get(function () {
  if (!this.nextMaintenanceDate) return false;
  return new Date() >= this.nextMaintenanceDate;
});

// Methods
vehiclePartSchema.methods.replacePart = function (newSerialNumber, replacedBy, reason, warrantyRequestId = null) {
  // Thêm vào lịch sử thay thế
  this.replacementHistory.push({
    replacedDate: new Date(),
    replacedBy: replacedBy,
    reason: reason,
    oldSerialNumber: this.serialNumber,
    newSerialNumber: newSerialNumber,
    warrantyRequestId: warrantyRequestId
  });

  // Cập nhật thông tin hiện tại
  this.serialNumber = newSerialNumber;
  this.status = 'installed';
  this.warrantyStartDate = new Date();

  // Calculate new warranty end date (get from part info)
  return this.populate('partId').then(() => {
    this.warrantyEndDate = new Date(Date.now() + (this.partId.warrantyPeriod * 30 * 24 * 60 * 60 * 1000));
    this.warrantyStatus = 'active';
    return this.save();
  });
};

vehiclePartSchema.methods.addMaintenanceRecord = function (maintenanceData) {
  this.maintenanceHistory.push({
    date: new Date(),
    ...maintenanceData
  });

  this.lastInspectionDate = new Date();

  if (maintenanceData.nextMaintenanceDate) {
    this.nextMaintenanceDate = maintenanceData.nextMaintenanceDate;
  }

  return this.save();
};

vehiclePartSchema.methods.addAlert = function (type, message, severity = 'medium') {
  this.alerts.push({
    type: type,
    message: message,
    severity: severity,
    createdAt: new Date()
  });

  return this.save();
};

vehiclePartSchema.methods.resolveAlert = function (alertId, resolvedBy) {
  const alert = this.alerts.id(alertId);
  if (alert) {
    alert.resolvedAt = new Date();
    alert.resolvedBy = resolvedBy;
  }

  return this.save();
};

vehiclePartSchema.methods.setRecallStatus = function (campaignId, reason) {
  this.recallStatus = {
    isRecalled: true,
    recallCampaignId: campaignId,
    recallDate: new Date(),
    recallReason: reason,
    recallCompleted: false
  };

  this.status = 'recalled';

  return this.save();
};

// Statics
vehiclePartSchema.statics.findByVehicle = function (vehicleId, status = null) {
  const query = { vehicleId: vehicleId };
  if (status) {
    query.status = status;
  }
  return this.find(query).populate('partId');
};

vehiclePartSchema.statics.findBySerialNumber = function (serialNumber) {
  return this.findOne({ serialNumber: serialNumber }).populate(['vehicleId', 'partId', 'installedBy']);
};

vehiclePartSchema.statics.findWarrantyExpiring = function (days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return this.find({
    warrantyStatus: 'active',
    warrantyEndDate: { $lte: futureDate }
  }).populate(['vehicleId', 'partId']);
};

vehiclePartSchema.statics.findMaintenanceDue = function () {
  return this.find({
    nextMaintenanceDate: { $lte: new Date() },
    status: 'installed'
  }).populate(['vehicleId', 'partId']);
};

vehiclePartSchema.statics.findRecalledParts = function (campaignId = null) {
  const query = { 'recallStatus.isRecalled': true };
  if (campaignId) {
    query['recallStatus.recallCampaignId'] = campaignId;
  }
  return this.find(query).populate(['vehicleId', 'partId']);
};

// Middleware trước khi lưu
vehiclePartSchema.pre('save', function (next) {
  // Tự động cập nhật warranty status based on end date
  if (this.warrantyEndDate && this.warrantyEndDate < new Date()) {
    this.warrantyStatus = 'expired';
  }

  next();
});

// Middleware trước khi xóa
vehiclePartSchema.pre('remove', function (next) {
  // Ghi log xóa cho audit trail
  console.log(`VehiclePart removed: ${this.serialNumber} from vehicle ${this.vehicleId}`);
  next();
});

// Export factory function
module.exports = function createVehiclePart() {
  const warrantyConnection = require('../../shared/database/warrantyConnection').getWarrantyConnection();
  return warrantyConnection.model('VehiclePart', vehiclePartSchema);
};
