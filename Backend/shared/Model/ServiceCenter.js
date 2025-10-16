const mongoose = require('mongoose');

/**
 * Service Center Model
 * Quản lý thông tin các trung tâm bảo hành/dịch vụ
 * Lưu trong Manufacturing database (do nhà máy quản lý)
 */
const serviceCenterSchema = new mongoose.Schema({
    // Thông tin cơ bản
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        validate: {
            validator: function(v) {
                return /^SC[0-9]{4,6}$/.test(v);
            },
            message: 'Mã trung tâm phải có định dạng SC + 4-6 số (VD: SC001, SC1234)'
        }
    },
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 200
    },
    
    // Thông tin liên hệ
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        validate: {
            validator: function(v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: 'Email không hợp lệ'
        }
    },
    phone: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: function(v) {
                return /^[0-9+\-\s()]+$/.test(v);
            },
            message: 'Số điện thoại không hợp lệ'
        }
    },
    hotline: {
        type: String,
        trim: true
    },
    
    // Địa chỉ
    address: {
        street: {
            type: String,
            required: true,
            trim: true
        },
        ward: {
            type: String,
            trim: true
        },
        district: {
            type: String,
            required: true,
            trim: true
        },
        city: {
            type: String,
            required: true,
            trim: true
        },
        province: {
            type: String,
            required: true,
            trim: true
        },
        country: {
            type: String,
            default: 'Vietnam',
            trim: true
        },
        zipCode: {
            type: String,
            trim: true
        }
    },
    
    // Thông tin hoạt động
    workingHours: {
        monday: { type: String, default: '08:00 - 17:00' },
        tuesday: { type: String, default: '08:00 - 17:00' },
        wednesday: { type: String, default: '08:00 - 17:00' },
        thursday: { type: String, default: '08:00 - 17:00' },
        friday: { type: String, default: '08:00 - 17:00' },
        saturday: { type: String, default: '08:00 - 12:00' },
        sunday: { type: String, default: 'Closed' }
    },
    
    // Năng lực
    capacity: {
        maxDailyAppointments: {
            type: Number,
            default: 20,
            min: 1
        },
        maxConcurrentRepairs: {
            type: Number,
            default: 10,
            min: 1
        },
        technicianCount: {
            type: Number,
            default: 5,
            min: 1
        }
    },
    
    // Chuyên môn
    specializations: [{
        type: String,
        enum: ['battery', 'motor', 'bms', 'inverter', 'charger', 'general', 'bodywork', 'electronics']
    }],
    
    // Chứng nhận
    certifications: [{
        name: String,
        issuedBy: String,
        issuedDate: Date,
        expiryDate: Date,
        certificateNumber: String
    }],
    
    // Khu vực phục vụ
    serviceArea: {
        provinces: [String],
        radius: {
            type: Number,
            default: 50, // km
            min: 0
        }
    },
    
    // Trạng thái
    status: {
        type: String,
        enum: ['active', 'inactive', 'maintenance', 'suspended'],
        default: 'active'
    },
    
    // Đánh giá
    rating: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        totalReviews: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    
    // Thống kê
    statistics: {
        totalVehiclesServiced: {
            type: Number,
            default: 0,
            min: 0
        },
        totalWarrantyClaims: {
            type: Number,
            default: 0,
            min: 0
        },
        totalRecallsCompleted: {
            type: Number,
            default: 0,
            min: 0
        },
        averageCompletionTime: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    
    // Quản lý
    manager: {
        name: String,
        email: String,
        phone: String
    },
    
    // Ghi chú
    notes: {
        type: String,
        maxlength: 1000
    },
    
    // Audit trail
    createdBy: {
        type: String,
        required: true
    },
    updatedBy: String,
    
    // Timestamps
    establishedDate: Date,
    lastInspectionDate: Date

}, {
    timestamps: true,
    collection: 'service_centers'
});

// Indexes
serviceCenterSchema.index({ code: 1 }, { unique: true });
serviceCenterSchema.index({ name: 1 });
serviceCenterSchema.index({ status: 1 });
serviceCenterSchema.index({ 'address.city': 1 });
serviceCenterSchema.index({ 'address.province': 1 });
serviceCenterSchema.index({ specializations: 1 });
serviceCenterSchema.index({ createdAt: -1 });

// Compound indexes
serviceCenterSchema.index({ status: 1, 'address.province': 1 });
serviceCenterSchema.index({ status: 1, specializations: 1 });

// Virtual fields
serviceCenterSchema.virtual('fullAddress').get(function() {
    const addr = this.address;
    const parts = [
        addr.street,
        addr.ward,
        addr.district,
        addr.city,
        addr.province,
        addr.country
    ].filter(Boolean);
    return parts.join(', ');
});

serviceCenterSchema.virtual('isOperational').get(function() {
    return this.status === 'active';
});

serviceCenterSchema.virtual('currentLoad').get(function() {
    // This would be calculated from active appointments/claims
    return 0; // Placeholder
});

// Instance methods
serviceCenterSchema.methods.activate = function() {
    this.status = 'active';
    return this.save();
};

serviceCenterSchema.methods.deactivate = function() {
    this.status = 'inactive';
    return this.save();
};

serviceCenterSchema.methods.suspend = function(reason) {
    this.status = 'suspended';
    this.notes = `Suspended: ${reason}`;
    return this.save();
};

serviceCenterSchema.methods.updateStatistics = function(stats) {
    if (stats.vehiclesServiced) {
        this.statistics.totalVehiclesServiced += stats.vehiclesServiced;
    }
    if (stats.warrantyClaims) {
        this.statistics.totalWarrantyClaims += stats.warrantyClaims;
    }
    if (stats.recallsCompleted) {
        this.statistics.totalRecallsCompleted += stats.recallsCompleted;
    }
    return this.save();
};

serviceCenterSchema.methods.updateRating = function(newRating) {
    const totalReviews = this.rating.totalReviews;
    const currentAverage = this.rating.average;
    
    this.rating.totalReviews = totalReviews + 1;
    this.rating.average = ((currentAverage * totalReviews) + newRating) / this.rating.totalReviews;
    
    return this.save();
};

// Static methods
serviceCenterSchema.statics.findByCode = function(code) {
    return this.findOne({ code: code.toUpperCase() });
};

serviceCenterSchema.statics.findByProvince = function(province) {
    return this.find({ 
        'address.province': province,
        status: 'active'
    });
};

serviceCenterSchema.statics.findBySpecialization = function(specialization) {
    return this.find({
        specializations: specialization,
        status: 'active'
    });
};

serviceCenterSchema.statics.findActive = function() {
    return this.find({ status: 'active' }).sort({ name: 1 });
};

serviceCenterSchema.statics.getStatistics = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                avgRating: { $avg: '$rating.average' },
                totalVehiclesServiced: { $sum: '$statistics.totalVehiclesServiced' },
                totalWarrantyClaims: { $sum: '$statistics.totalWarrantyClaims' }
            }
        }
    ]);
    
    return stats;
};

// Pre-save middleware
serviceCenterSchema.pre('save', function(next) {
    // Auto-generate code if not provided
    if (this.isNew && !this.code) {
        this.code = `SC${Date.now().toString().slice(-6)}`;
    }
    
    // Ensure code is uppercase
    if (this.code) {
        this.code = this.code.toUpperCase();
    }
    
    next();
});

// Set virtuals in JSON
serviceCenterSchema.set('toJSON', { virtuals: true });
serviceCenterSchema.set('toObject', { virtuals: true });

// Export model using Manufacturing database connection
const { createModelFactory } = require('../Base/ModelFactory');
const { getManufacturingConnection } = require('../database/manufacturingConnection');

module.exports = createModelFactory(
    getManufacturingConnection,
    'ServiceCenter',
    serviceCenterSchema,
    {
        addCommonIndexes: false // Already have custom indexes
    }
);
