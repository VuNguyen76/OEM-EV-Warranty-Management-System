// api-gateway/server.js
// File khởi động API Gateway server

// Load biến môi trường từ file .env ở thư mục Backend (root) - chỉ khi không chạy trong Docker
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
}

const App = require('./app');

// Kiểm tra các biến môi trường bắt buộc
const requiredEnvVars = ['JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('❌ Thiếu các biến môi trường bắt buộc:');
    missingEnvVars.forEach(varName => {
        console.error(`   - ${varName}`);
    });
    console.error('\n💡 Vui lòng kiểm tra file .env và thêm các biến môi trường cần thiết');
    process.exit(1);
}

// Lấy port từ biến môi trường
const port = process.env.PORT || process.env.GATEWAY_PORT || 3000;

// Khởi tạo và chạy API Gateway
const app = new App();

// Async function để khởi động server
async function startServer() {
    try {
        await app.start(port);
    } catch (error) {
        console.error('❌ Failed to start API Gateway:', error);
        process.exit(1);
    }
}

startServer();
