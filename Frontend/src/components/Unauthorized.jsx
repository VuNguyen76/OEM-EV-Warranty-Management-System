import React from "react";
import { Link } from "react-router-dom";

const Unauthorized = () => (
  <div className="flex flex-col items-center justify-center min-h-screen text-center">
    <h1 className="text-4xl font-bold text-red-600 mb-4">
      403 - Không có quyền truy cập
    </h1>
    <p className="text-gray-700 mb-6">
      Bạn không có quyền truy cập trang này. Vui lòng quay lại hoặc đăng nhập
      bằng tài khoản phù hợp.
    </p>
    <Link
      to="/"
      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
    >
      Quay lại trang chủ
    </Link>
  </div>
);

export default Unauthorized;
