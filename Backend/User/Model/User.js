const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const validator = require("validator");
const BaseEntity = require("../../shared/Base/BaseEntity");
const Enum = require("../../shared/Enum/Enum");

const UserSchema = new mongoose.Schema({
    ...BaseEntity.BaseEntity,

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

    // Các trường dành riêng cho technician
    specialization: [{
        type: String,
        enum: ["battery", "motor", "bms", "inverter", "charger", "general"]
    }],
    skills: [String],
    workload: {
        type: Number,
        min: 0
    },
    availability: {
        type: Boolean,
        default: true
    },

    performanceMetrics: {
        averageCompletionTime: { type: Number },
        qualityScore: { type: Number, min: 0, max: 10 },
        completedTasks: { type: Number },
        customerRating: { type: Number, min: 0, max: 5 }
    },

    lastLoginAt: Date,
    loginAttempts: { type: Number, required: true, default: 0 },
    lockedUntil: Date
});

UserSchema.index({ "serviceCenter.id": 1 });
UserSchema.index({ specialization: 1 });
UserSchema.index({ availability: 1 });

UserSchema.virtual('fullAddress').get(function () {
    if (!this.address) return '';
    const { street, city, province, country } = this.address;
    return [street, city, province, country].filter(Boolean).join(', ');
});

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
        updates.$set = { lockedUntil: Date.now() + 2 * 60 * 60 * 1000 }; // Khóa 2 giờ
    }
    return this.updateOne(updates);
};

// Hash password before saving
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });

const User = mongoose.model("User", UserSchema);

module.exports = User;