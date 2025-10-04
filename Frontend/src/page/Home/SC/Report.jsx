import React, { useState } from "react";
import BarChartRevenue from "../../../components/BarChartRevenue";

const Report = () => {
  const [filterMode, setFilterMode] = useState("month");

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Báo cáo - Trung tâm dịch vụ</h1>
          <p className="text-gray-500">Tổng quan hiệu suất hệ thống bảo hành</p>
        </div>
        <button className="px-4 py-2 bg-green-700 text-white rounded-lg space-x-2 hover:bg-green-500/50 hover:text-white cursor-pointer ">
          <i className="fa-solid fa-arrow-down"></i>
          <span>Xuất báo cáo</span>
        </button>
      </div>

      <select
        onChange={(e) => setFilterMode(e.target.value)}
        className="border border-gray-300 outline-none cursor-pointer rounded-lg px-4 py-2"
      >
        <option value="month">Tháng</option>
        <option value="quarter">Quý</option>
        <option value="year">Năm</option>
      </select>

      <BarChartRevenue filterMode={filterMode} />
    </div>
  );
};

export default Report;
