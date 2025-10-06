if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
}

const express = require("express");
const cookieParser = require("cookie-parser");
const UserService = require("./Service/UserService");
const AuthController = require("./Controller/AuthController");
const { setupCommonMiddleware } = require("../shared/middleware/common");
const connectToUserDatabase = require("../shared/database/userConnection");
const redisService = require("../shared/services/RedisService");

const app = express();
const port = process.env.PORT || process.env.USER_SERVICE_PORT || 3001;

setupCommonMiddleware(app);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/users", UserService);
app.use("/auth", AuthController);

app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'User service đang hoạt động',
        timestamp: new Date().toISOString()
    });
});

const startServer = async () => {
    try {
        await connectToUserDatabase();
        await redisService.connect();

        app.listen(port, () => {
        });
    } catch (error) {
        setImmediate(() => {
            console.error('❌ Lỗi khởi động User Service:', error.message);
        });
        process.exit(1);
    }
};

startServer();