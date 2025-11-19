import React, { useState, useMemo } from 'react';
import {
  useGetAnalyticsByPeriodQuery,
  useTriggerAnalysisMutation,
} from '../../../features/analytics/analytics.api';
import { toast } from 'react-toastify';
import Loading from '../../../components/Loading';

// --- Imports cho Biểu đồ (Chart.js) ---
import { Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';

// Đăng ký các thành phần cần thiết cho Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// --- Imports cho Xuất Excel ---
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Component Biểu đồ Tỷ lệ Hỏng hóc
const PartFailureChart = ({ partsStats }) => {
  const data = useMemo(() => ({
    labels: partsStats.map(p => p.part_name),
    datasets: [
      {
        label: 'Tỷ lệ Hỏng hóc (%)',
        data: partsStats.map(p => (p.failure_rate * 100).toFixed(2)),
        backgroundColor: 'rgba(77, 182, 172, 0.8)', // Màu xanh Mint/Teal
        borderColor: 'rgba(77, 182, 172, 1)',
        borderWidth: 1,
      },
    ],
  }), [partsStats]);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Top Phụ tùng có Tỷ lệ Hỏng hóc cao nhất',
        font: {
          size: 16
        },
        color: '#166534' // dark green
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Tỷ lệ (%)'
        }
      }
    }
  };

  return (
    <div className="bg-white w-full p-6 rounded-xl shadow-lg border border-green-200">
      <Bar data={data} options={options} />
    </div>
  );
};


const Analytics = () => {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [triggerAnalysis, { isLoading: isTriggering }] = useTriggerAnalysisMutation();

  const { data, isLoading, error, refetch } = useGetAnalyticsByPeriodQuery(period, {
    skip: !period,
  });
  
  // Màu xanh chủ đạo và các biến CSS classes
  const primaryColor = 'bg-green-600 hover:bg-green-700';
  const tableHeaderBg = 'bg-green-500 text-white';

  const handleRunAnalysis = async () => {
    if (!period) {
      toast.success('Vui lòng chọn kỳ phân tích!');
      return;
    }
    try {
      await triggerAnalysis(period).unwrap();
      toast.success('Đã chạy phân tích thành công!');
      refetch();
    } catch (err) {
      console.error(err);
      toast.error(err.data?.message || 'Có lỗi xảy ra khi chạy phân tích.');
    }
  };

  // --- LOGIC XUẤT EXCEL ---
  const handleExport = () => {
    if (!data) {
      toast.error('Không có dữ liệu để xuất Excel!');
      return;
    }

    const fileName = `Analytics_${period}.xlsx`;
    const workbook = XLSX.utils.book_new();

    // 1. Dữ liệu Hỏng hóc theo phụ tùng
    const partData = data.parts_failure_stats.map(p => ({
      'Tên Phụ tùng': p.part_name,
      'Số lượng hỏng': p.failure_count,
      'Tỷ lệ Hỏng hóc (%)': (p.failure_rate * 100).toFixed(2),
      'Chi phí trung bình (VND)': p.average_cost,
    }));
    const partSheet = XLSX.utils.json_to_sheet(partData);
    XLSX.utils.book_append_sheet(workbook, partSheet, 'Hỏng hóc Phụ tùng');

    // 2. Dữ liệu Thống kê theo Model
    const modelData = data.vehicle_model_stats.map(m => ({
      'Model Xe': m.model,
      'Số lượng Claims': m.claims_count,
      'Tổng Bảo hành (VND)': m.total_warranty,
      'Tổng Khách hàng (VND)': m.total_customer,
    }));
    const modelSheet = XLSX.utils.json_to_sheet(modelData);
    XLSX.utils.book_append_sheet(workbook, modelSheet, 'Thống kê theo Model');

    // 3. Dữ liệu Thống kê theo Trung tâm
    const centerData = data.center_stats.map(c => ({
      'Center ID': c.center_id,
      'Số lượng Claims': c.claims_count,
      'Tổng Chi phí Bảo hành (VND)': c.total_warranty,
    }));
    const centerSheet = XLSX.utils.json_to_sheet(centerData);
    XLSX.utils.book_append_sheet(workbook, centerSheet, 'Thống kê theo Trung tâm');
    
    // Xuất file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(dataBlob, fileName);
    toast.success('Xuất file Excel thành công!');
  };

  return (
    <div className="p-3 flex-1 mx-auto">
      {/* Tiêu đề chính */}
      <h1 className={`text-3xl font-extrabold mb-8  border-b-2 border-white pb-2`}>
        Analytics Dashboard
      </h1>

      {/* Form chọn kỳ và nút chạy/xuất */}
      <div className={`mb-8 p-5 border border-green-200 rounded-lg shadow-md flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between`}>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <label htmlFor="period" className="font-semibold text-lg text-gray-700 whitespace-nowrap">
              Chọn kỳ phân tích:
            </label>
            <input
              id="period"
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className={`border-2 border-white px-3 py-2 rounded-lg focus:ring-green-500 focus:border-green-500 transition duration-150 ease-in-out w-full sm:w-auto`}
            />
            <button
              onClick={handleRunAnalysis}
              disabled={isLoading || isTriggering}
              className={`${primaryColor} text-white px-6 py-2 rounded-lg font-medium transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed shadow-md`}
            >
              {isTriggering ? 'Đang chạy phân tích...' : 'Chạy phân tích'}
            </button>
        </div>
        
        {/* Nút Xuất Excel */}
        {data && (
            <button
                onClick={handleExport}
                className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-lg font-medium transition duration-300 ease-in-out shadow-md disabled:opacity-50"
                disabled={isLoading}
            >
                Xuất Excel
            </button>
        )}
      </div>

      {/* Hiển thị trạng thái */}
      {isLoading && <Loading />}
      
      {error && (
        <div className="text-red-600 p-4 border border-red-300 bg-red-50 rounded-lg text-center font-medium">
          ⚠️ Lỗi: {error.data?.message || 'Không thể tải dữ liệu.'}
        </div>
      )}

      {!isLoading && !error && !data && (
        <div className="text-gray-500 p-4 border border-gray-300 bg-gray-50 rounded-lg text-center font-medium">
          Chưa có dữ liệu phân tích cho kỳ này. Vui lòng **Chạy phân tích**.
        </div>
      )}

      {/* Dashboard Data */}
      {data && (
        <>
          {/* Tổng quan (KPI Cards) - Giữ nguyên */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-5 text-gray-800">Thông tin Tổng quan</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1: Tổng claims */}
              <div className="p-6 bg-white border border-green-200 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                <h3 className="text-sm font-medium uppercase text-gray-500 tracking-wider mb-2">Tổng Claims</h3>
                <p className="text-3xl font-bold text-green-700">{data.total_claims.toLocaleString()}</p>
              </div>

              {/* Card 2: Tổng chi phí bảo hành */}
              <div className="p-6 bg-white border border-green-200 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                <h3 className="text-sm font-medium uppercase text-gray-500 tracking-wider mb-2">Tổng Chi phí Bảo hành</h3>
                <p className="text-3xl font-bold text-green-700">{data.total_warranty_amount.toLocaleString()} ₫</p>
              </div>
              
              {/* Card 3: Tổng chi phí khách hàng */}
              <div className="p-6 bg-white border border-green-200 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                <h3 className="text-sm font-medium uppercase text-gray-500 tracking-wider mb-2">Tổng Chi phí Khách hàng</h3>
                <p className="text-3xl font-bold text-green-700">{data.total_customer_amount.toLocaleString()} ₫</p>
              </div>

              {/* Card 4: Chi phí dự báo */}
              <div className="p-6  border border-green-200 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 ">
                <h3 className="text-sm font-bold uppercase text-green-700 tracking-wider mb-2">Chi phí Dự báo</h3>
                <p className="text-3xl font-bold text-green-800">{data.predicted_future_cost.toLocaleString()} ₫</p>
              </div>
            </div>
          </section>

          {/* Biểu đồ Hỏng hóc theo phụ tùng */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-5 text-gray-800">Phân tích chuyên sâu</h2>
            <PartFailureChart partsStats={data.parts_failure_stats} />
          </section>

          {/* Bảng: Hỏng hóc theo phụ tùng */}
          <section className="mb-10 bg-white rounded-xl shadow-lg overflow-hidden border border-white">
            <h2 className={`text-2xl font-bold p-5`}>Hỏng hóc theo Phụ tùng</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-green-200">
                <thead>
                  <tr className={tableHeaderBg}>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider rounded-tl-xl">Tên phụ tùng</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider">Số lượng hỏng</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider">Tỷ lệ (%)</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider rounded-tr-xl">Chi phí trung bình</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-green-100">
                  {data.parts_failure_stats.map((part, index) => (
                    <tr key={part._id} className={index % 2 === 0 ? 'bg-green-50 hover:bg-green-100 transition duration-150' : 'bg-white hover:bg-green-100 transition duration-150'}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{part.part_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-gray-700">{part.failure_count}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center font-bold text-green-600">{(part.failure_rate * 100).toFixed(2)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-gray-700">{part.average_cost.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Bảng: Thống kê theo model xe - Giữ nguyên */}
          <section className="mb-10 bg-white rounded-xl shadow-lg overflow-hidden border border-white">
            <h2 className={`text-2xl font-bold p-5`}>Thống kê theo Model Xe</h2>
            {/* ... (Nội dung bảng) ... */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-green-200">
                <thead>
                  <tr className={tableHeaderBg}>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider rounded-tl-xl">Model</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider">Số lượng Claims</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider">Tổng Bảo hành</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider rounded-tr-xl">Tổng Khách hàng</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-green-100">
                  {data.vehicle_model_stats.map((model, index) => (
                    <tr key={model._id} className={index % 2 === 0 ? 'bg-green-50 hover:bg-green-100 transition duration-150' : 'bg-white hover:bg-green-100 transition duration-150'}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{model.model}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-gray-700">{model.claims_count}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-green-600 font-medium">{model.total_warranty.toLocaleString()} ₫</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-gray-700">{model.total_customer.toLocaleString()} ₫</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Bảng: Thống kê theo trung tâm - Giữ nguyên */}
          <section className="mb-10 bg-white rounded-xl shadow-lg overflow-hidden border border-white">
            <h2 className={`text-2xl font-bold p-5`}>Thống kê theo Trung tâm Dịch vụ</h2>
            {/* ... (Nội dung bảng) ... */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-green-200">
                <thead>
                  <tr className={tableHeaderBg}>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider rounded-tl-xl">Center ID</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider">Số lượng Claims</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider rounded-tr-xl">Tổng Chi phí Bảo hành</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-green-100">
                  {data.center_stats.map((center, index) => (
                    <tr key={center._id} className={index % 2 === 0 ? 'bg-green-50 hover:bg-green-100 transition duration-150' : 'bg-white hover:bg-green-100 transition duration-150'}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{center.center_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-gray-700">{center.claims_count}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-green-600">{center.total_warranty.toLocaleString()} ₫</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Analytics;