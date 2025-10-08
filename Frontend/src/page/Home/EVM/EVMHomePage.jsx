import React, { useState, useEffect } from 'react';
import Title from '../../../components/Title';

const EVMHomePage = () => {
  const [productionStats, setProductionStats] = useState({
    totalVehicles: 0,
    byStatus: {},
    byQualityStatus: {}
  });
  
  const [modelStats, setModelStats] = useState({
    totalModels: 0,
    byStatus: {},
    byCategory: {}
  });

  // In a real implementation, these would be fetched from the backend API
  useEffect(() => {
    // Mock data for demonstration
    setProductionStats({
      totalVehicles: 1250,
      byStatus: {
        manufactured: 800,
        quality_check: 300,
        completed: 150
      },
      byQualityStatus: {
        pending: 200,
        passed: 900,
        failed: 150
      }
    });
    
    setModelStats({
      totalModels: 12,
      byStatus: {
        development: 2,
        production: 8,
        discontinued: 2
      },
      byCategory: {
        sedan: 5,
        suv: 4,
        hatchback: 3
      }
    });
  }, []);

  return (
    <div className="h-full w-full space-y-6 p-4">
      <Title 
        title="Manufacturing Control Panel" 
        subTitle="Quản lý sản xuất và kiểm soát chất lượng xe điện" 
      />
      
      {/* Production Statistics */}
      <div className="bg-white shadow rounded-lg p-6 border border-gray-300">
        <h2 className="text-xl font-bold mb-4">Thống kê sản xuất</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold">Tổng số xe sản xuất</h3>
            <p className="text-3xl font-bold text-blue-600">{productionStats.totalVehicles}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold">Đạt kiểm tra chất lượng</h3>
            <p className="text-3xl font-bold text-green-600">{productionStats.byQualityStatus.passed || 0}</p>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold">Chờ kiểm tra</h3>
            <p className="text-3xl font-bold text-yellow-600">{productionStats.byQualityStatus.pending || 0}</p>
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">Theo trạng thái sản xuất</h4>
            <ul className="space-y-1">
              {Object.entries(productionStats.byStatus).map(([status, count]) => (
                <li key={status} className="flex justify-between">
                  <span className="capitalize">{status}</span>
                  <span className="font-medium">{count}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Theo chất lượng</h4>
            <ul className="space-y-1">
              {Object.entries(productionStats.byQualityStatus).map(([status, count]) => (
                <li key={status} className="flex justify-between">
                  <span className="capitalize">{status}</span>
                  <span className="font-medium">{count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      
      {/* Model Statistics */}
      <div className="bg-white shadow rounded-lg p-6 border border-gray-300">
        <h2 className="text-xl font-bold mb-4">Thống kê mẫu xe</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold">Tổng số mẫu xe</h3>
            <p className="text-3xl font-bold text-purple-600">{modelStats.totalModels}</p>
          </div>
          
          <div className="bg-indigo-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold">Đang sản xuất</h3>
            <p className="text-3xl font-bold text-indigo-600">{modelStats.byStatus.production || 0}</p>
          </div>
          
          <div className="bg-pink-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold">Đang phát triển</h3>
            <p className="text-3xl font-bold text-pink-600">{modelStats.byStatus.development || 0}</p>
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg p-6 border border-gray-300">
        <h2 className="text-xl font-bold mb-4">Hành động nhanh</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg transition">
            Tạo mẫu xe mới
          </button>
          <button className="bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg transition">
            Sản xuất xe
          </button>
          <button className="bg-yellow-500 hover:bg-yellow-600 text-white py-3 px-4 rounded-lg transition">
            Kiểm tra chất lượng
          </button>
          <button className="bg-purple-500 hover:bg-purple-600 text-white py-3 px-4 rounded-lg transition">
            Báo cáo sản xuất
          </button>
        </div>
      </div>
    </div>
  );
};

export default EVMHomePage;