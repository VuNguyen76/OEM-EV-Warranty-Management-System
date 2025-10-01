import React from 'react';
import { Link } from 'react-router-dom';

const ManufacturerDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                <i className="fa-solid fa-industry text-white text-sm"></i>
              </div>
              <h1 className="text-xl font-bold text-gray-800">Hãng sản xuất xe</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">Xin chào, Admin</span>
              <button className="text-gray-500 hover:text-gray-700">
                <i className="fa-solid fa-bell text-lg"></i>
              </button>
              <Link 
                to="/" 
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded-lg text-sm"
              >
                Đăng xuất
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Stats Cards */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-building text-orange-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Trung tâm bảo hành</p>
                <p className="text-2xl font-bold text-gray-900">12</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-car text-blue-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Xe được bảo hành</p>
                <p className="text-2xl font-bold text-gray-900">2,456</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-dollar-sign text-green-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Chi phí bảo hành</p>
                <p className="text-2xl font-bold text-gray-900">$1.2M</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-chart-line text-purple-600 text-xl"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tỷ lệ hài lòng</p>
                <p className="text-2xl font-bold text-gray-900">94%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Thao tác nhanh</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              <i className="fa-solid fa-cog text-orange-600 text-lg mr-3"></i>
              <span className="text-gray-700">Quản lý chính sách</span>
            </button>
            <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              <i className="fa-solid fa-chart-bar text-blue-600 text-lg mr-3"></i>
              <span className="text-gray-700">Báo cáo tổng hợp</span>
            </button>
            <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              <i className="fa-solid fa-users text-green-600 text-lg mr-3"></i>
              <span className="text-gray-700">Quản lý trung tâm</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManufacturerDashboard;
