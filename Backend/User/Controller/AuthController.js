const express = require("express");
const User = require("../Model/User");
const RefreshToken = require("../Model/RefreshToken");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { authenticateToken } = require("../../shared/middleware/AuthMiddleware");
const { loginRateLimit, registerRateLimit, strictRateLimit } = require("../../shared/middleware/RateLimitMiddleware");
const { validate, validationRules } = require("../../shared/middleware/ValidationMiddleware");

const router = express.Router();

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = '30m'; // 30 minutes

// Helper functions
const generateAccessToken = (user) => {
    return jwt.sign(
        {
            sub: user._id || user.id,
            email: user.email,
            role: user.role,
            username: user.username
        },
        JWT_SECRET,
        {
            expiresIn: ACCESS_TOKEN_EXPIRY,
            issuer: 'warranty-system',
            audience: 'warranty-users'
        }
    );
};

const generateTokenPair = async (user) => {
    const accessToken = generateAccessToken(user);
    const refreshTokenDoc = await RefreshToken.createRefreshToken(user._id || user.id);

    return {
        accessToken,
        refreshToken: refreshTokenDoc.token,
        expiresIn: 30 * 60, // 30 minutes in seconds
        tokenType: 'Bearer'
    };
};

// Đăng ký tài khoản mới
router.post("/register", registerRateLimit, validate(validationRules.register), async (req, res) => {
    try {
        const { username, email, password, role, phone, fullAddress } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: existingUser.email === email ? "Email đã được sử dụng" : "Username đã được sử dụng"
            });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create new user
        const newUser = new User({
            username,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: role || "customer",
            status: "active",
            loginAttempts: 0,
            availability: role === "technician" ? true : undefined,
            workload: role === "technician" ? 0 : undefined,
            // Add phone and fullAddress for customer role
            ...(role === "customer" && { phone, fullAddress }),
        });

        await newUser.save();

        // Generate token pair (access + refresh)
        const tokens = await generateTokenPair(newUser);

        // Return success response (don't send password)
        const userResponse = {
            id: newUser._id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
            status: newUser.status,
            createdAt: newUser.createdAt
        };

        // Set refresh token as httpOnly cookie
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(201).json({
            success: true,
            message: "Đăng ký thành công",
            accessToken: tokens.accessToken,
            expiresIn: tokens.expiresIn,
            tokenType: tokens.tokenType,
            user: userResponse
        });

    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi đăng ký",
            error: err.message
        });
    }
});

// Đăng nhập
router.post("/login", loginRateLimit, validate(validationRules.login), async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Email hoặc password không đúng"
            });
        }

        // Check if account is locked
        if (user.lockedUntil && user.lockedUntil > Date.now()) {
            return res.status(401).json({
                success: false,
                message: "Tài khoản đã bị khóa tạm thời. Vui lòng thử lại sau."
            });
        }

        // Check if user is active
        if (user.status !== "active") {
            return res.status(401).json({
                success: false,
                message: "Tài khoản đã bị vô hiệu hóa"
            });
        }

        // Compare password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            // Increment login attempts
            user.loginAttempts = (user.loginAttempts || 0) + 1;

            // Lock account after 5 failed attempts for 15 minutes
            if (user.loginAttempts >= 5) {
                user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
            }

            await user.save();

            return res.status(401).json({
                success: false,
                message: "Email hoặc password không đúng"
            });
        }

        // Reset login attempts and update last login
        user.loginAttempts = 0;
        user.lockedUntil = undefined;
        user.lastLoginAt = new Date();
        user.updatedAt = new Date();
        await user.save();

        // Generate token pair (access + refresh)
        const tokens = await generateTokenPair(user);

        // Return success response
        const userResponse = {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            status: user.status
        };

        // Set refresh token as httpOnly cookie
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            success: true,
            message: "Đăng nhập thành công",
            accessToken: tokens.accessToken,
            expiresIn: tokens.expiresIn,
            tokenType: tokens.tokenType,
            user: userResponse
        });

    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi đăng nhập",
            error: err.message
        });
    }
});

// Refresh access token
router.post("/refresh", async (req, res) => {
    try {
        const refreshTokenString = req.cookies.refreshToken;

        if (!refreshTokenString) {
            return res.status(401).json({
                success: false,
                message: "Refresh token không tồn tại"
            });
        }

        // Find and validate refresh token with populated user
        const refreshTokenDoc = await RefreshToken.findValidToken(refreshTokenString);

        if (!refreshTokenDoc || !refreshTokenDoc.userId) {
            res.clearCookie('refreshToken');
            return res.status(401).json({
                success: false,
                message: "Refresh token không hợp lệ hoặc đã hết hạn"
            });
        }

        // Get current user data (refreshTokenDoc.userId is populated by findValidToken)
        const user = refreshTokenDoc.userId;

        // Security checks: Verify user is still active and not locked
        if (user.status !== "active") {
            // Revoke all tokens for inactive user
            await RefreshToken.revokeAllUserTokens(user._id);
            res.clearCookie('refreshToken');
            return res.status(403).json({
                success: false,
                message: "Tài khoản đã bị vô hiệu hóa"
            });
        }

        if (user.isLocked && user.isLocked()) {
            res.clearCookie('refreshToken');
            return res.status(423).json({
                success: false,
                message: "Tài khoản đang bị khóa"
            });
        }

        // Generate new access token with current user data
        const accessToken = generateAccessToken(user);

        // Update last login time
        user.lastLoginAt = new Date();
        await user.save();

        res.json({
            success: true,
            message: "Token đã được gia hạn",
            accessToken,
            expiresIn: 30 * 60, // 30 minutes
            tokenType: 'Bearer'
        });

    } catch (err) {
        console.error("Refresh token error:", err);

        // Clear invalid refresh token cookie
        res.clearCookie('refreshToken');

        res.status(401).json({
            success: false,
            message: "Refresh token không hợp lệ hoặc đã hết hạn",
            error: err.message
        });
    }
});

// Đăng xuất - Chỉ revoke refresh token
router.post("/logout", async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (refreshToken) {
            try {
                // Revoke refresh token
                await RefreshToken.revokeToken(refreshToken);
                console.log(`🚫 Refresh token revoked during logout`);
            } catch (err) {
                console.log(`⚠️ Failed to revoke refresh token: ${err.message}`);
            }
        }

        // Clear refresh token cookie
        res.clearCookie('refreshToken');

        res.json({
            success: true,
            message: "Đăng xuất thành công"
        });
    } catch (err) {
        console.error("Logout error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi đăng xuất",
            error: err.message
        });
    }
});

// Lấy thông tin user hiện tại (cần authentication)
router.get("/me", authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select("-password");
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy user"
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                status: user.status,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }
        });
    } catch (err) {
        console.error("Get user info error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy thông tin user",
            error: err.message
        });
    }
});

// Force logout user (Admin only)
router.post("/force-logout/:userId", strictRateLimit, authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Chỉ admin mới có quyền force logout user"
            });
        }

        const { userId } = req.params;

        // Check if target user exists
        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy user"
            });
        }

        // Blacklist all tokens for this user
        const blacklistedCount = await redisService.blacklistUserTokens(userId);

        console.log(`👮 Admin ${req.user.email} force logged out user ${targetUser.email}`);

        res.json({
            success: true,
            message: `Force logout thành công cho user ${targetUser.username}`,
            data: {
                userId: targetUser._id,
                username: targetUser.username,
                email: targetUser.email,
                blacklistedTokens: blacklistedCount
            }
        });
    } catch (err) {
        console.error("Force logout error:", err);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi force logout",
            error: err.message
        });
    }
});

// Export router
module.exports = router;