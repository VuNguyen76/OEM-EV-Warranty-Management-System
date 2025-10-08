import React from 'react';
import Title from '../../../components/Title';

const ProductionPage = () => {
  return (
    <div className="h-full w-full space-y-6 p-4">
      <Title 
        title="Sản xuất xe" 
        subTitle="Quản lý quy trình sản xuất xe điện" 
      />
      
      <div className="bg-white shadow rounded-lg p-6 border border-gray-300">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Lô sản xuất mới</h2>
          <button className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition">
            Bắt đầu sản xuất
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mã mẫu xe</label>
            <select className="w-full p-2 border border-gray-300 rounded-md">
              <option>Chọn mẫu xe</option>
              <option>EV-S001 - Sedan Elegance</option>
              <option>EV-SUV002 - SUV Adventure</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng</label>
            <input 
              type="number" 
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Nhập số lượng"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dây chuyền sản xuất</label>
            <input 
              type="text" 
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Nhập mã dây chuyền"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vị trí nhà máy</label>
            <input 
              type="text" 
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Nhập vị trí"
            />
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6 border border-gray-300">
        <h2 className="text-xl font-bold mb-4">Lịch sử sản xuất</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã VIN</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mẫu xe</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày sản xuất</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dây chuyền</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">5YJ3E1EA4KF123456</td>
                <td className="px-6 py-4 whitespace-nowrap">EV-S001</td>
                <td className="px-6 py-4 whitespace-nowrap">2024-10-01</td>
                <td className="px-6 py-4 whitespace-nowrap">LINE-A01</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Đã hoàn thành
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">5YJ3E1EA4KF123457</td>
                <td className="px-6 py-4 whitespace-nowrap">EV-S001</td>
                <td className="px-6 py-4 whitespace-nowrap">2024-10-01</td>
                <td className="px-6 py-4 whitespace-nowrap">LINE-A01</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    Kiểm tra chất lượng
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductionPage;