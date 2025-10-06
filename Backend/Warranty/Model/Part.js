const mongoose = require('mongoose');
const { BaseEntity } = require('../../shared/Base/BaseEntity');

const partSchema = new mongoose.Schema({
  ...BaseEntity,

  // Thông tin cơ bản phụ tùng
  partNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  name: {
    type: String,
    required: true,
    trim: true
  },

  category: {
    type: String,
    required: true,
    enum: ['battery', 'motor', 'bms', 'inverter', 'charger', 'brake', 'suspension', 'body', 'electronics', 'other']
  },

  // Thông số kỹ thuật
  specifications: {
    voltage: Number,
    capacity: Number,
    power: Number,
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    material: String,
    color: String,
    other: mongoose.Schema.Types.Mixed
  },

  // Tương thích
  compatibleModels: [{
    type: String,
    trim: true
  }],

  compatibleYears: [{
    type: Number,
    min: 2000,
    max: new Date().getFullYear() + 5
  }],

  // Bảo hành và giá cả
  warrantyPeriod: {
    type: Number,
    required: true,
    min: 0,
    default: 12 // tháng
  },

  cost: {
    type: Number,
    required: true,
    min: 0
  },

  currency: {
    type: String,
    default: 'VND',
    enum: ['VND', 'USD', 'EUR']
  },

  // Nhà cung cấp
  supplier: {
    name: String,
    code: String,
    contact: String
  },

  // Trạng thái
  status: {
    type: String,
    required: true,
    enum: ['active', 'discontinued', 'out_of_stock'],
    default: 'active'
  },

  // Tồn kho
  stockQuantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },

  minimumStock: {
    type: Number,
    required: true,
    min: 0,
    default: 10
  },

  reservedQuantity: {
    type: Number,
    min: 0,
    default: 0
  },

  // Vị trí lưu trữ
  storageLocation: {
    warehouse: String,
    shelf: String,
    bin: String
  },

  // Thông tin bổ sung
  description: String,

  images: [{
    url: String,
    alt: String
  }],

  documents: [{
    name: String,
    url: String,
    type: String
  }],

  // Lịch sử
  lastRestocked: Date,
  lastUsed: Date,

  // Metadata
  tags: [String],
  notes: String
}, {
  timestamps: true,
  collection: 'parts'
});

// Indexes
partSchema.index({ partNumber: 1 });
partSchema.index({ name: 'text', description: 'text' });
partSchema.index({ category: 1, status: 1 });
partSchema.index({ compatibleModels: 1 });
partSchema.index({ stockQuantity: 1, minimumStock: 1 });

// Virtual cho available quantity
partSchema.virtual('availableQuantity').get(function () {
  return this.stockQuantity - this.reservedQuantity;
});

// Virtual cho low stock warning
partSchema.virtual('isLowStock').get(function () {
  return this.availableQuantity <= this.minimumStock;
});

// Methods
partSchema.methods.updateStock = function (quantity, operation = 'add') {
  // Validate input
  if (typeof quantity !== 'number' || isNaN(quantity) || !isFinite(quantity)) {
    throw new Error('Quantity phải là số hợp lệ');
  }

  if (quantity < 0) {
    throw new Error('Quantity không được âm');
  }

  if (quantity > 1000000) {
    throw new Error('Quantity quá lớn (tối đa 1,000,000)');
  }

  if (operation === 'add') {
    this.stockQuantity += quantity;
    this.lastRestocked = new Date();
  } else if (operation === 'subtract') {
    if (this.stockQuantity < quantity) {
      throw new Error('Không đủ tồn kho để trừ');
    }
    this.stockQuantity -= quantity;
    this.lastUsed = new Date();
  } else {
    throw new Error('Operation không hợp lệ (chỉ chấp nhận "add" hoặc "subtract")');
  }

  return this.save();
};

partSchema.methods.reserveStock = function (quantity, reservedBy, expirationMinutes = 30) {
  // Validate input
  if (typeof quantity !== 'number' || isNaN(quantity) || quantity <= 0) {
    throw new Error('Quantity phải là số dương hợp lệ');
  }

  if (!reservedBy) {
    throw new Error('reservedBy là bắt buộc');
  }

  if (this.availableQuantity < quantity) {
    throw new Error('Không đủ tồn kho để đặt trước');
  }

  // Create reservation record (would need separate Reservation model in production)
  this.reservedQuantity += quantity;
  this.lastReserved = new Date();

  // Note: In production, should create separate Reservation document with expiration
  // For now, just add to reserved quantity
  return this.save();
};

partSchema.methods.releaseReservedStock = function (quantity) {
  this.reservedQuantity = Math.max(0, this.reservedQuantity - quantity);
  return this.save();
};

// Statics
partSchema.statics.findLowStock = function () {
  return this.find({
    $expr: {
      $lte: [
        { $subtract: ['$stockQuantity', '$reservedQuantity'] },
        '$minimumStock'
      ]
    },
    status: 'active'
  });
};

partSchema.statics.findByModel = function (model, year = null) {
  const query = {
    compatibleModels: model,
    status: 'active'
  };

  if (year) {
    query.compatibleYears = year;
  }

  return this.find(query);
};

partSchema.statics.searchParts = function (searchTerm, filters = {}) {
  const query = {
    $and: [
      {
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { partNumber: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } }
        ]
      }
    ]
  };

  // Apply filters
  if (filters.category) {
    query.$and.push({ category: filters.category });
  }

  if (filters.status) {
    query.$and.push({ status: filters.status });
  }

  if (filters.model) {
    query.$and.push({ compatibleModels: filters.model });
  }

  if (filters.lowStock) {
    query.$and.push({
      $expr: {
        $lte: [
          { $subtract: ['$stockQuantity', '$reservedQuantity'] },
          '$minimumStock'
        ]
      }
    });
  }

  return this.find(query);
};

// Pre-save middleware
partSchema.pre('save', function (next) {
  // Ensure reserved quantity doesn't exceed stock quantity
  if (this.reservedQuantity > this.stockQuantity) {
    this.reservedQuantity = this.stockQuantity;
  }

  // Update lastUsed when stock decreases
  if (this.isModified('stockQuantity') && this.stockQuantity < this.constructor.findOne({ _id: this._id }).stockQuantity) {
    this.lastUsed = new Date();
  }

  next();
});

// Export factory function
module.exports = function createPart() {
  const warrantyConnection = require('../../shared/database/warrantyConnection').getWarrantyConnection();
  return warrantyConnection.model('Part', partSchema);
};
