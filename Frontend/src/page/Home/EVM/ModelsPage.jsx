import React from 'react';
import Title from '../../../components/Title';

const ModelsPage = () => {
  return (
    <div className="h-full w-full space-y-6 p-4">
      <Title 
        title="Quản lý mẫu xe" 
        subTitle="Quản lý các mẫu xe điện đang được sản xuất" 
      />
      
      <div className="bg-white shadow rounded-lg p-6 border border-gray-300">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Danh sách mẫu xe</h2>
          <button className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition">
            Thêm mẫu xe mới
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã mẫu xe</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên mẫu xe</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhà sản xuất</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tầm hoạt động</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">EV-S001</td>
                <td className="px-6 py-4 whitespace-nowrap">Sedan Elegance</td>
                <td className="px-6 py-4 whitespace-nowrap">EVMotors</td>
                <td className="px-6 py-4 whitespace-nowrap">450 km</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Đang sản xuất
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button className="text-blue-600 hover:text-blue-900 mr-2">Sửa</button>
                  <button className="text-red-600 hover:text-red-900">Xóa</button>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">EV-SUV002</td>
                <td className="px-6 py-4 whitespace-nowrap">SUV Adventure</td>
                <td className="px-6 py-4 whitespace-nowrap">EVMotors</td>
                <td className="px-6 py-4 whitespace-nowrap">400 km</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Đang sản xuất
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button className="text-blue-600 hover:text-blue-900 mr-2">Sửa</button>
                  <button className="text-red-600 hover:text-red-900">Xóa</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ModelsPage;