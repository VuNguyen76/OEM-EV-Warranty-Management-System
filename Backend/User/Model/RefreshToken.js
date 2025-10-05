const mongoose = require("mongoose");
const crypto = require("crypto");

const RefreshTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    isRevoked: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Indexes for performance
RefreshTokenSchema.index({ userId: 1, isRevoked: 1 });
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto cleanup expired tokens
RefreshTokenSchema.index({ token: 1, isRevoked: 1 });

// Static methods
RefreshTokenSchema.statics.generateToken = function () {
    return crypto.randomBytes(32).toString('hex');
};

RefreshTokenSchema.statics.createRefreshToken = async function (userId) {
    const token = this.generateToken();

    const refreshToken = new this({
        token,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    await refreshToken.save();
    return refreshToken;
};

RefreshTokenSchema.statics.findValidToken = async function (token) {
    return this.findOne({
        token,
        isRevoked: false,
        expiresAt: { $gt: new Date() }
    }).populate('userId');
};

RefreshTokenSchema.statics.revokeToken = async function (token) {
    return this.updateOne(
        { token },
        { isRevoked: true }
    );
};

RefreshTokenSchema.statics.revokeAllUserTokens = async function (userId) {
    return this.updateMany(
        { userId, isRevoked: false },
        { isRevoked: true }
    );
};

// Instance methods
RefreshTokenSchema.methods.isValid = function () {
    return !this.isRevoked && this.expiresAt > new Date();
};

RefreshTokenSchema.methods.revoke = async function () {
    this.isRevoked = true;
    return this.save();
};

module.exports = mongoose.model("RefreshToken", RefreshTokenSchema);
