import React from "react";
import { Link } from "react-router-dom";

const SelectRole = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
            <i className="fa-solid fa-shield-halved text-white text-xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">AutoCare Pro</h1>
        </div>
        <p className="text-gray-500">Hệ thống quản lý bảo hành xe hơi</p>
        <p className="mt-2 text-lg text-gray-700 font-medium">
          Chọn vai trò để đăng nhập vào hệ thống
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full px-6">
        {/* Card 1 */}
        <div className="bg-white rounded-xl shadow-md p-8 flex flex-col items-center text-center hover:shadow-lg transition">
          <div className="w-16 h-16 rounded-xl bg-blue-600 flex items-center justify-center mb-4">
            <i className="fa-solid fa-shield text-white text-2xl"></i>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Trung tâm bảo hành
          </h2>
          <p className="text-gray-500 mb-6">
            Quản lý và xử lý các yêu cầu bảo hành, theo dõi lịch sử dịch vụ
            khách hàng
          </p>
          <Link 
            to="/auth/warranty-center"
            className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2 rounded-lg font-medium shadow inline-block"
          >
            Đăng nhập
          </Link>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-xl shadow-md p-8 flex flex-col items-center text-center hover:shadow-lg transition">
          <div className="w-16 h-16 rounded-xl bg-orange-500 flex items-center justify-center mb-4">
            <i className="fa-solid fa-industry text-white text-2xl"></i>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Hãng sản xuất xe
          </h2>
          <p className="text-gray-500 mb-6">
            Giám sát toàn bộ hệ thống, quản lý chính sách bảo hành và báo cáo
            tổng hợp
          </p>
          <Link 
            to="/auth/manufacturer"
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium shadow inline-block"
          >
            Đăng nhập
          </Link>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-10 text-gray-400 text-sm">
        © 2024 AutoCare Pro. Hệ thống quản lý bảo hành xe hơi
      </p>
    </div>
  );
};

export default SelectRole;
