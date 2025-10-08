import React from 'react';
import Title from '../../../components/Title';

const QualityPage = () => {
  return (
    <div className="h-full w-full space-y-6 p-4">
      <Title 
        title="Kiểm tra chất lượng" 
        subTitle="Quản lý quy trình kiểm tra chất lượng xe điện" 
      />
      
      <div className="bg-white shadow rounded-lg p-6 border border-gray-300">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Kiểm tra chất lượng lô hàng</h2>
          <button className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition">
            Bắt đầu kiểm tra
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mã VIN</label>
            <input 
              type="text" 
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Nhập mã VIN"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại kiểm tra</label>
            <select className="w-full p-2 border border-gray-300 rounded-md">
              <option>Chọn loại kiểm tra</option>
              <option>Kiểm tra an toàn</option>
              <option>Kiểm tra hiệu suất</option>
              <option>Kiểm tra điện</option>
              <option>Kiểm tra tổng thể</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Người kiểm tra</label>
            <input 
              type="text" 
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Nhập tên người kiểm tra"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
            <textarea 
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Nhập ghi chú"
              rows="2"
            ></textarea>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6 border border-gray-300">
        <h2 className="text-xl font-bold mb-4">Kết quả kiểm tra gần đây</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã VIN</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại kiểm tra</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người kiểm tra</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày kiểm tra</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kết quả</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">5YJ3E1EA4KF123456</td>
                <td className="px-6 py-4 whitespace-nowrap">Kiểm tra tổng thể</td>
                <td className="px-6 py-4 whitespace-nowrap">Nguyễn Văn A</td>
                <td className="px-6 py-4 whitespace-nowrap">2024-10-01</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Đạt
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">5YJ3E1EA4KF123457</td>
                <td className="px-6 py-4 whitespace-nowrap">Kiểm tra điện</td>
                <td className="px-6 py-4 whitespace-nowrap">Trần Thị B</td>
                <td className="px-6 py-4 whitespace-nowrap">2024-10-01</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                    Không đạt
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

export default QualityPage;