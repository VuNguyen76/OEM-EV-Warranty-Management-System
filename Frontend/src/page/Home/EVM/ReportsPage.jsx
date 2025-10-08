import React from 'react';
import Title from '../../../components/Title';

const ReportsPage = () => {
  return (
    <div className="h-full w-full space-y-6 p-4">
      <Title 
        title="Báo cáo sản xuất" 
        subTitle="Thống kê và báo cáo quy trình sản xuất xe điện" 
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-4 border border-gray-300">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold mb-2">Tổng sản xuất</h3>
            <i className="text-blue-500 fa-solid fa-car"></i>
          </div>
          <p className="text-2xl font-bold">1,250</p>
          <p className="text-gray-500 text-sm">xe trong tháng</p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-4 border border-gray-300">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold mb-2">Đạt chất lượng</h3>
            <i className="text-green-500 fa-solid fa-check-circle"></i>
          </div>
          <p className="text-2xl font-bold">1,180</p>
          <p className="text-gray-500 text-sm">xe đạt tiêu chuẩn</p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-4 border border-gray-300">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold mb-2">Tỷ lệ đạt</h3>
            <i className="text-yellow-500 fa-solid fa-percent"></i>
          </div>
          <p className="text-2xl font-bold">94.4%</p>
          <p className="text-gray-500 text-sm">tỷ lệ đạt chất lượng</p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-4 border border-gray-300">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold mb-2">Lỗi phát hiện</h3>
            <i className="text-red-500 fa-solid fa-triangle-exclamation"></i>
          </div>
          <p className="text-2xl font-bold">70</p>
          <p className="text-gray-500 text-sm">lỗi được ghi nhận</p>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6 border border-gray-300">
        <h2 className="text-xl font-bold mb-4">Biểu đồ sản xuất theo tháng</h2>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <p className="text-gray-500">Biểu đồ sản xuất sẽ hiển thị ở đây</p>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6 border border-gray-300">
        <h2 className="text-xl font-bold mb-4">Báo cáo chi tiết</h2>
        <div className="flex space-x-4 mb-4">
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg">Xuất Excel</button>
          <button className="px-4 py-2 bg-green-500 text-white rounded-lg">Xuất PDF</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tháng</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản xuất</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đạt chất lượng</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Không đạt</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tỷ lệ đạt (%)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">Tháng 9/2024</td>
                <td className="px-6 py-4 whitespace-nowrap">1,250</td>
                <td className="px-6 py-4 whitespace-nowrap">1,180</td>
                <td className="px-6 py-4 whitespace-nowrap">70</td>
                <td className="px-6 py-4 whitespace-nowrap">94.4%</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">Tháng 8/2024</td>
                <td className="px-6 py-4 whitespace-nowrap">1,120</td>
                <td className="px-6 py-4 whitespace-nowrap">1,050</td>
                <td className="px-6 py-4 whitespace-nowrap">70</td>
                <td className="px-6 py-4 whitespace-nowrap">93.8%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;