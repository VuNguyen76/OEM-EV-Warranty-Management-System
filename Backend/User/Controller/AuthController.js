const express = require("express");
const User = require("../Model/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { authenticateToken } = require("../Middleware/AuthMiddleware");
const redisService = require("../../shared/services/RedisService");

const router = express.Router();

// Đăng ký tài khoản mới
router.post("/register", async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Username, email và password là bắt buộc"
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Email không hợp lệ"
            });
        }

        // Validate password strength
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: "Password phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt"
            });
        }

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
        });

        await newUser.save();

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: newUser._id,
                email: newUser.email,
                role: newUser.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

        // Return success response (don't send password)
        const userResponse = {
            id: newUser._id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
            status: newUser.status,
            createdAt: newUser.createdAt
        };

        res.status(201).json({
            success: true,
            message: "Đăng ký thành công",
            token,
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
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email và password là bắt buộc"
            });
        }

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

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

        // Return success response
        const userResponse = {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            status: user.status
        };

        res.json({
            success: true,
            message: "Đăng nhập thành công",
            token,
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

// Đăng xuất - Thực sự blacklist token
router.post("/logout", async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            // Blacklist token với TTL = thời gian còn lại của token
            const decoded = jwt.decode(token);
            const currentTime = Math.floor(Date.now() / 1000);
            const remainingTime = decoded.exp - currentTime;

            if (remainingTime > 0) {
                await redisService.blacklistToken(token, remainingTime);
                console.log(`🚫 User ${decoded.email} logged out, token blacklisted`);
            }
        }

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
router.post("/force-logout/:userId", authenticateToken, async (req, res) => {
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