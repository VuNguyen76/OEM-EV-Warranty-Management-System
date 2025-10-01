const mongoose = require("mongoose");
const BaseEntity = require("../Base/BaseEntity");
const Enum = require("../Enum/Enum");
const validator = require("validator");
const UserSchema = new mongoose.Schema({
    // Base fields
    ...BaseEntity,

    // Basic info
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
        // No length validation here since password will be hashed
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        validate: {
            validator: validator.isEmail,
            message: "Please provide a valid email",
        },
    },

    // Contact info
    phone: {
        type: String,
        trim: true,
    },
    address: {
        street: String,
        city: String,
        province: String,
        country: String,
        zipCode: String,
    },

    // Role & Organization
    role: {
        type: String,
        enum: Enum.getValues(),
        default: "customer",
    },
    serviceCenter: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ServiceCenter'
        },
        name: String,
        location: String,
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
    },
    availability: {
        type: Boolean,
        default: true,
    },

    // Performance metrics (for technicians)
    performanceMetrics: {
        averageCompletionTime: {
            type: Number,
            default: 0,
        },
        qualityScore: {
            type: Number,
            default: 5.0,
            min: 0,
            max: 10,
        },
        completedTasks: {
            type: Number,
            default: 0,
        },
        customerRating: {
            type: Number,
            default: 5.0,
            min: 0,
            max: 5,
        },
    },

    // Security fields
    lastLoginAt: Date,
    loginAttempts: {
        type: Number,
        default: 0,
    },
    lockedUntil: Date,
    refreshToken: String,
});

const User = mongoose.model("User", UserSchema);

module.exports = User;
