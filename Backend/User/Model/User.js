const mongoose = require("mongoose");
const validator = require("validator");
const BaseEntity = require("../../shared/Base/BaseEntity");
const Enum = require("../../shared/Enum/Enum");

const UserSchema = new mongoose.Schema({
    // Base fields
    ...BaseEntity.BaseEntity,

    // Basic info
    username: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        validate: [validator.isEmail, "Email không hợp lệ"]
    },

    // Contact info
    phone: {
        type: String,
        trim: true,
        validate: {
            validator: function (v) {
                return !v || /^[0-9+\-\s()]+$/.test(v);
            },
            message: "Số điện thoại không hợp lệ"
        }
    },
    address: {
        street: String,
        city: String,
        province: String,
        country: String,
        zipCode: String
    },

    // Role & Organization
    role: {
        type: String,
        enum: Enum.getValues(),
        default: "customer"
    },
    serviceCenter: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ServiceCenter'
        },
        name: String,
        location: String
    },

    // Technician specific fields
    specialization: [{
        type: String,
        enum: ["battery", "motor", "bms", "inverter", "charger", "general"]
    }],
    skills: [String],
    workload: {
        type: Number,
        default: 0,
        min: 0
    },
    availability: {
        type: Boolean,
        default: true
    },

    // Performance metrics (for technicians)
    performanceMetrics: {
        averageCompletionTime: { type: Number, default: 0 },
        qualityScore: { type: Number, default: 5.0, min: 0, max: 10 },
        completedTasks: { type: Number, default: 0 },
        customerRating: { type: Number, default: 5.0, min: 0, max: 5 }
    },

    // Security fields
    lastLoginAt: Date,
    loginAttempts: { type: Number, default: 0 },
    lockedUntil: Date,
    refreshToken: String
});

// Indexes for performance (non-unique)
UserSchema.index({ "serviceCenter.id": 1 });
UserSchema.index({ specialization: 1 });
UserSchema.index({ availability: 1 });

// Virtual for full name
UserSchema.virtual('fullAddress').get(function () {
    if (!this.address) return '';
    const { street, city, province, country } = this.address;
    return [street, city, province, country].filter(Boolean).join(', ');
});

// Methods
UserSchema.methods.isLocked = function () {
    return !!(this.lockedUntil && this.lockedUntil > Date.now());
};

UserSchema.methods.incrementLoginAttempts = function () {
    if (this.lockedUntil && this.lockedUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockedUntil: 1, loginAttempts: 1 }
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };
    if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
        updates.$set = { lockedUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
    }
    return this.updateOne(updates);
};

// Ensure virtual fields are serialized
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

// Create indexes for performance
UserSchema.index({ email: 1 }, { unique: true }); // Index for email lookups
UserSchema.index({ username: 1 }, { unique: true }); // Index for username lookups
UserSchema.index({ role: 1 }); // Index for role-based queries
UserSchema.index({ status: 1 }); // Index for status queries

const User = mongoose.model("User", UserSchema);

module.exports = User;