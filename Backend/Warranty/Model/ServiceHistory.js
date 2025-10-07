const mongoose = require('mongoose');
const { BaseEntity } = require('../../shared/Base/BaseEntity');

const serviceHistorySchema = new mongoose.Schema({
  ...BaseEntity,

  // Liên kết
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WarrantyVehicle',
    required: true
  },

  // Thông tin dịch vụ
  serviceType: {
    type: String,
    required: true,
    enum: ['maintenance', 'repair', 'warranty', 'recall', 'inspection', 'upgrade']
  },

  serviceCategory: {
    type: String,
    enum: ['scheduled', 'unscheduled', 'emergency', 'preventive', 'corrective'],
    default: 'scheduled'
  },

  title: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    required: true
  },

  // Thông tin thực hiện
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  supervisedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  serviceCenter: {
    name: String,
    code: String,
    address: String,
    contact: String
  },

  // Thời gian
  serviceDate: {
    type: Date,
    required: true
  },

  startTime: Date,
  endTime: Date,

  estimatedDuration: Number, // phút
  actualDuration: Number, // phút

  // Phụ tùng sử dụng
  partsUsed: [{
    partId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Part'
    },
    vehiclePartId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VehiclePart'
    },
    partNumber: String,
    partName: String,
    serialNumber: String,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitCost: Number,
    totalCost: Number,
    action: {
      type: String,
      enum: ['installed', 'replaced', 'removed', 'repaired', 'inspected'],
      default: 'installed'
    },
    condition: {
      type: String,
      enum: ['new', 'refurbished', 'used', 'defective'],
      default: 'new'
    }
  }],

  // Chi phí
  laborHours: {
    type: Number,
    required: true,
    min: 0
  },

  laborRate: {
    type: Number,
    required: true,
    min: 0
  },

  laborCost: {
    type: Number,
    required: true,
    min: 0
  },

  partsCost: {
    type: Number,
    required: true,
    min: 0
  },

  additionalCosts: [{
    description: String,
    amount: Number
  }],

  totalCost: {
    type: Number,
    required: true,
    min: 0
  },

  currency: {
    type: String,
    default: 'VND',
    enum: ['VND', 'USD', 'EUR']
  },

  // Trạng thái
  status: {
    type: String,
    required: true,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold'],
    default: 'scheduled'
  },

  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },

  // Kết quả và chất lượng
  workPerformed: String,

  issuesFound: [{
    description: String,
    severity: String, // low, medium, high, critical
    resolved: Boolean,
    resolution: String
  }],

  recommendations: [{
    type: String, // maintenance, repair, replacement
    description: String,
    priority: String,
    estimatedCost: Number,
    dueDate: Date
  }],

  qualityCheck: {
    performed: {
      type: Boolean,
      default: false
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    result: String, // passed, failed, conditional
    notes: String,
    checkedAt: Date
  },

  customerSatisfaction: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String,
    surveyDate: Date
  },

  // Tài liệu đính kèm
  attachments: [{
    name: String,
    type: String, // image, document, video, report
    url: String,
    description: String,
    uploadedAt: Date,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // Liên kết với yêu cầu bảo hành
  warrantyRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WarrantyRequest'
  },

  // Liên kết với chiến dịch recall
  recallCampaignId: String,

  // Thông tin bảo hành
  warrantyWork: {
    type: Boolean,
    default: false
  },

  warrantyClaimNumber: String,

  // Dịch vụ tiếp theo
  nextServiceDate: Date,
  nextServiceType: String,
  nextServiceDescription: String,

  // Odometer/Mileage
  odometerReading: {
    type: Number,
    required: true,
    min: 0
  },

  // Điều kiện môi trường
  environmentalConditions: {
    temperature: Number,
    humidity: Number,
    location: String
  },

  // Metadata
  notes: String,
  internalNotes: String, // chỉ nhân viên xem được
  tags: [String],

  // Approval workflow
  approvalRequired: {
    type: Boolean,
    default: false
  },

  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  approvedAt: Date,

  // Billing
  invoiceNumber: String,
  billingStatus: {
    type: String,
    enum: ['pending', 'billed', 'paid', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: true,
  collection: 'service_history'
});

// Indexes
serviceHistorySchema.index({ vehicleId: 1, serviceDate: -1 });
serviceHistorySchema.index({ serviceType: 1, status: 1 });
serviceHistorySchema.index({ performedBy: 1, serviceDate: -1 });
serviceHistorySchema.index({ warrantyRequestId: 1 });
serviceHistorySchema.index({ nextServiceDate: 1 });
serviceHistorySchema.index({ 'qualityCheck.result': 1 });

// Additional indexes for search performance
serviceHistorySchema.index({ 'serviceCenter.code': 1 });
serviceHistorySchema.index({ 'serviceCenter.name': 1 });
serviceHistorySchema.index({ title: 'text', description: 'text' });
serviceHistorySchema.index({ totalCost: 1 });
serviceHistorySchema.index({ serviceDate: 1, serviceType: 1 }); // For statistics
// Compound indexes for complex queries (fix N+1 problem)
serviceHistorySchema.index({ vehicleId: 1, serviceDate: -1, serviceType: 1 });
serviceHistorySchema.index({ serviceDate: -1, serviceType: 1, performedBy: 1 });

// Virtual cho duration
serviceHistorySchema.virtual('duration').get(function () {
  if (this.startTime && this.endTime) {
    return Math.round((this.endTime - this.startTime) / (1000 * 60)); // minutes
  }
  return this.actualDuration || this.estimatedDuration || 0;
});

// Virtual cho efficiency
serviceHistorySchema.virtual('efficiency').get(function () {
  if (this.estimatedDuration && this.actualDuration) {
    return Math.round((this.estimatedDuration / this.actualDuration) * 100);
  }
  return null;
});

// Methods
serviceHistorySchema.methods.calculateTotalCost = function () {
  let total = this.laborCost + this.partsCost;

  if (this.additionalCosts && this.additionalCosts.length > 0) {
    total += this.additionalCosts.reduce((sum, cost) => sum + (cost.amount || 0), 0);
  }

  this.totalCost = total;
  return total;
};

serviceHistorySchema.methods.addPart = function (partData) {
  this.partsUsed.push(partData);
  this.calculatePartsCost();
  return this.save();
};

serviceHistorySchema.methods.calculatePartsCost = function () {
  this.partsCost = this.partsUsed.reduce((total, part) => {
    return total + ((part.unitCost || 0) * (part.quantity || 0));
  }, 0);

  this.calculateTotalCost();
  return this.partsCost;
};

serviceHistorySchema.methods.calculateLaborCost = function () {
  this.laborCost = (this.laborHours || 0) * (this.laborRate || 0);
  this.calculateTotalCost();
  return this.laborCost;
};

serviceHistorySchema.methods.completeService = function (completionData = {}) {
  this.status = 'completed';
  this.endTime = new Date();

  if (completionData.workPerformed) {
    this.workPerformed = completionData.workPerformed;
  }

  if (completionData.recommendations) {
    this.recommendations = completionData.recommendations;
  }

  if (completionData.nextServiceDate) {
    this.nextServiceDate = completionData.nextServiceDate;
  }

  this.calculateTotalCost();
  return this.save();
};

serviceHistorySchema.methods.addAttachment = function (attachmentData, uploadedBy) {
  this.attachments.push({
    ...attachmentData,
    uploadedAt: new Date(),
    uploadedBy: uploadedBy
  });

  return this.save();
};

// Statics
serviceHistorySchema.statics.findByVehicle = function (vehicleId, options = {}) {
  const query = { vehicleId: vehicleId };

  if (options.serviceType) {
    query.serviceType = options.serviceType;
  }

  if (options.status) {
    query.status = options.status;
  }

  if (options.dateFrom || options.dateTo) {
    query.serviceDate = {};
    if (options.dateFrom) query.serviceDate.$gte = new Date(options.dateFrom);
    if (options.dateTo) query.serviceDate.$lte = new Date(options.dateTo);
  }

  return this.find(query)
    .populate(['performedBy', 'supervisedBy', 'partsUsed.partId'])
    .sort({ serviceDate: -1 });
};

serviceHistorySchema.statics.findByTechnician = function (technicianId, options = {}) {
  const query = { performedBy: technicianId };

  if (options.dateFrom || options.dateTo) {
    query.serviceDate = {};
    if (options.dateFrom) query.serviceDate.$gte = new Date(options.dateFrom);
    if (options.dateTo) query.serviceDate.$lte = new Date(options.dateTo);
  }

  return this.find(query)
    .populate(['vehicleId', 'partsUsed.partId'])
    .sort({ serviceDate: -1 });
};

serviceHistorySchema.statics.findUpcomingServices = function (days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return this.find({
    nextServiceDate: { $lte: futureDate },
    status: 'completed'
  }).populate('vehicleId');
};

serviceHistorySchema.statics.getServiceStats = function (filters = {}) {
  const matchStage = {};

  if (filters.dateFrom || filters.dateTo) {
    matchStage.serviceDate = {};
    if (filters.dateFrom) matchStage.serviceDate.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) matchStage.serviceDate.$lte = new Date(filters.dateTo);
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$serviceType',
        count: { $sum: 1 },
        totalCost: { $sum: '$totalCost' },
        avgCost: { $avg: '$totalCost' },
        avgDuration: { $avg: '$actualDuration' }
      }
    }
  ]);
};

// Pre-save middleware
serviceHistorySchema.pre('save', function (next) {
  // Auto-calculate costs if not set
  if (this.isModified('laborHours') || this.isModified('laborRate')) {
    this.calculateLaborCost();
  }

  if (this.isModified('partsUsed')) {
    this.calculatePartsCost();
  }

  // Set actual duration if end time is set
  if (this.startTime && this.endTime && !this.actualDuration) {
    this.actualDuration = Math.round((this.endTime - this.startTime) / (1000 * 60));
  }

  next();
});

// Export factory function
module.exports = function createServiceHistory() {
  const warrantyConnection = require('../../shared/database/warrantyConnection').getWarrantyConnection();
  return warrantyConnection.model('ServiceHistory', serviceHistorySchema);
};
