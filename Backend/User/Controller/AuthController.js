const express = require("express");
const User = require("../Model/User");
const RefreshToken = require("../Model/RefreshToken");
const jwt = require("jsonwebtoken");
const { authenticateToken } = require("../../shared/middleware/AuthMiddleware");
const { validate, validationRules } = require("../../shared/middleware/ValidationMiddleware");
const redisService = require("../../shared/services/RedisService");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = '30m';

const generateAccessToken = (user) => {
    return jwt.sign(
        {
            sub: user._id || user.id,
            email: user.email,
            role: user.role
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
        expiresIn: 30 * 60, // 30 phút tính bằng giây
        tokenType: 'Bearer'
    };
};

router.post("/register", validate(validationRules.register), async (req, res) => {
    try {
        const { username, email, password, role, phone, fullAddress } = req.body;

        const existingUser = await User.findOne({
            $or: [{ email: email.toLowerCase() }, { username }]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: existingUser.email === email ? "Email already used" : "Username already used"
            });
        }

        // Password will be hashed by pre-save hook in User model
        const newUser = new User({
            username,
            email: email.toLowerCase(),
            password: password, // Pass plain password, will be hashed by pre-save hook
            role: role || "customer",
            status: "active",
            loginAttempts: 0,
            availability: role === "technician" ? true : undefined,
            workload: role === "technician" ? 0 : undefined,
            ...(role === "customer" && { phone, fullAddress }),
        });

        await newUser.save();

        const tokens = await generateTokenPair(newUser);

        const userResponse = {
            id: newUser._id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
            status: newUser.status,
            createdAt: newUser.createdAt
        };

        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
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
        res.status(500).json({
            success: false,
            message: "Server error during registration",
            error: err.message
        });
    }
});

router.post("/login", validate(validationRules.login), async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Email hoặc mật khẩu không đúng"
            });
        }

        if (user.lockedUntil && user.lockedUntil > Date.now()) {
            return res.status(401).json({
                success: false,
                message: "Account temporarily locked. Please try again later."
            });
        }

        if (user.status !== "active") {
            return res.status(401).json({
                success: false,
                message: "Account has been deactivated"
            });
        }

        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            // Use the model method instead of manual implementation
            await user.incrementLoginAttempts();

            return res.status(401).json({
                success: false,
                message: "Email hoặc mật khẩu không đúng"
            });
        }

        await User.updateOne(
            { _id: user._id },
            {
                $unset: { lockedUntil: 1 },
                $set: {
                    loginAttempts: 0,
                    lastLoginAt: new Date(),
                    updatedAt: new Date()
                }
            }
        );

        const tokens = await generateTokenPair(user);

        const userResponse = {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            status: user.status
        };

        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
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
        res.status(500).json({
            success: false,
            message: "Server error during login",
            error: err.message
        });
    }
});

router.post("/refresh", async (req, res) => {
    try {
        const refreshTokenString = req.cookies.refreshToken;

        if (!refreshTokenString) {
            return res.status(401).json({
                success: false,
                message: "Refresh token không tồn tại"
            });
        }

        const refreshTokenDoc = await RefreshToken.findValidToken(refreshTokenString);

        if (!refreshTokenDoc || !refreshTokenDoc.userId) {
            res.clearCookie('refreshToken');
            return res.status(401).json({
                success: false,
                message: "Refresh token không hợp lệ hoặc đã hết hạn"
            });
        }

        const user = refreshTokenDoc.userId;

        if (user.status !== "active") {
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

        const accessToken = generateAccessToken(user);

        user.lastLoginAt = new Date();
        await user.save();

        res.json({
            success: true,
            message: "Token đã được gia hạn",
            accessToken,
            expiresIn: 30 * 60,
            tokenType: 'Bearer'
        });

    } catch (err) {
        res.clearCookie('refreshToken');

        res.status(401).json({
            success: false,
            message: "Refresh token không hợp lệ hoặc đã hết hạn",
            error: err.message
        });
    }
});

router.post("/logout", async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (refreshToken) {
            try {
                await RefreshToken.revokeToken(refreshToken);
            } catch (err) {
            }
        }

        res.clearCookie('refreshToken');

        res.json({
            success: true,
            message: "Đăng xuất thành công"
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Lỗi server khi đăng xuất",
            error: err.message
        });
    }
});

router.get("/me", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.sub || req.user.userId;
        const user = await User.findById(userId).select("-password");
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
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy thông tin user",
            error: err.message
        });
    }
});

router.post("/force-logout/:userId", authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Chỉ admin mới có quyền force logout user"
            });
        }

        const { userId } = req.params;

        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy user"
            });
        }

        const blacklistedCount = await redisService.blacklistUserTokens(userId);

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
        res.status(500).json({
            success: false,
            message: "Lỗi server khi force logout",
            error: err.message
        });
    }
});

module.exports = router;