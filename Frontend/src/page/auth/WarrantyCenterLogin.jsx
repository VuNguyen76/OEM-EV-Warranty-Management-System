import React from 'react';
import { Link } from 'react-router-dom';

const WarrantyCenterLogin = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <i className="fa-solid fa-shield text-white text-xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">AutoCare Pro</h1>
        </div>
        <p className="text-gray-500">Đăng nhập - Trung tâm bảo hành</p>
      </div>

      {/* Login Form */}
      <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-md">
        <form className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Tên đăng nhập
            </label>
            <input
              type="text"
              id="username"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập tên đăng nhập"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Mật khẩu
            </label>
            <input
              type="password"
              id="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập mật khẩu"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-700 hover:bg-blue-800 text-white py-2 rounded-lg font-medium shadow transition"
          >
            Đăng nhập
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link 
            to="/" 
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← Quay lại chọn vai trò
          </Link>
        </div>
      </div>
    </div>
  );
};

export default WarrantyCenterLogin;
