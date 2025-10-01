// examples/test-jwt.js
// File test JWT Helper - Chạy để kiểm tra JWT hoạt động

require('dotenv').config();
const JwtHelper = require('../utils/JwtHelper');

console.log('\n' + '='.repeat(60));
console.log('🧪 TEST JWT HELPER');
console.log('='.repeat(60) + '\n');

// 1. Tạo Access Token
console.log('1️⃣  Tạo Access Token');
console.log('-'.repeat(60));

const userData = {
  userId: '123',
  email: 'test@example.com',
  role: 'user',
  username: 'test_user'
};

const accessToken = JwtHelper.generateAccessToken(userData);
console.log('✓ Access Token đã tạo:');
console.log(accessToken.substring(0, 50) + '...\n');

// 2. Tạo Refresh Token
console.log('2️⃣  Tạo Refresh Token');
console.log('-'.repeat(60));

const refreshToken = JwtHelper.generateRefreshToken({ userId: '123' });
console.log('✓ Refresh Token đã tạo:');
console.log(refreshToken.substring(0, 50) + '...\n');

// 3. Xác thực Token
console.log('3️⃣  Xác thực Token');
console.log('-'.repeat(60));

try {
  const decoded = JwtHelper.verifyToken(accessToken);
  console.log('✓ Token hợp lệ!');
  console.log('User ID:', decoded.userId);
  console.log('Email:', decoded.email);
  console.log('Role:', decoded.role);
  console.log('Username:', decoded.username);
  console.log('Issued At:', new Date(decoded.iat * 1000).toLocaleString('vi-VN'));
  console.log('Expires At:', new Date(decoded.exp * 1000).toLocaleString('vi-VN'));
} catch (error) {
  console.error('✗ Lỗi xác thực:', error.message);
}
console.log('');

// 4. Giải mã Token (không xác thực)
console.log('4️⃣  Giải mã Token (không xác thực)');
console.log('-'.repeat(60));

const decodedToken = JwtHelper.decodeToken(accessToken);
console.log('✓ Token đã giải mã:');
console.log('Header:', JSON.stringify(decodedToken.header, null, 2));
console.log('Payload:', JSON.stringify(decodedToken.payload, null, 2));
console.log('');

// 5. Kiểm tra Token hết hạn
console.log('5️⃣  Kiểm tra Token hết hạn');
console.log('-'.repeat(60));

const isExpired = JwtHelper.isTokenExpired(accessToken);
console.log('Token đã hết hạn?', isExpired ? '❌ Có' : '✓ Không');
console.log('');

// 6. Lấy thời gian còn lại
console.log('6️⃣  Thời gian còn lại của Token');
console.log('-'.repeat(60));

const remainingSeconds = JwtHelper.getTokenRemainingTime(accessToken);
const remainingMinutes = Math.floor(remainingSeconds / 60);
const remainingHours = Math.floor(remainingMinutes / 60);

console.log(`✓ Token còn ${remainingSeconds} giây`);
console.log(`✓ Token còn ${remainingMinutes} phút`);
console.log(`✓ Token còn ${remainingHours} giờ`);
console.log('');

// 7. Test Token không hợp lệ
console.log('7️⃣  Test Token không hợp lệ');
console.log('-'.repeat(60));

try {
  const invalidToken = 'invalid.token.here';
  JwtHelper.verifyToken(invalidToken);
  console.log('✗ Không nên đến đây!');
} catch (error) {
  console.log('✓ Đã bắt được lỗi:', error.message);
}
console.log('');

// 8. Test Token hết hạn
console.log('8️⃣  Test Token hết hạn');
console.log('-'.repeat(60));

// Tạo token hết hạn ngay lập tức
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt.config');

const expiredToken = jwt.sign(
  { userId: '123' },
  jwtConfig.secret,
  {
    algorithm: jwtConfig.algorithm,
    expiresIn: '1ms' // Hết hạn sau 1 millisecond
  }
);

// Đợi 1 giây để token hết hạn
setTimeout(() => {
  try {
    JwtHelper.verifyToken(expiredToken);
    console.log('✗ Không nên đến đây!');
  } catch (error) {
    console.log('✓ Đã bắt được lỗi token hết hạn:', error.message);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ TEST HOÀN TẤT!');
  console.log('='.repeat(60) + '\n');
}, 1000);

