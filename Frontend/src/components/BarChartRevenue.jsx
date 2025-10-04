import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  groupByMonth,
  groupByQuarter,
  groupByYear,
} from "../utils/groupByTime";

const allData = [
  { date: "2025-01-01", revenue: 1200 },
  { date: "2025-02-15", revenue: 3200 },
  { date: "2025-03-10", revenue: 4200 },
  { date: "2025-04-22", revenue: 3900 },
  { date: "2025-05-05", revenue: 5300 },
  { date: "2025-06-22", revenue: 3900 },
  { date: "2025-07-09", revenue: 7100 },
  { date: "2025-08-22", revenue: 3900 },
  { date: "2025-09-22", revenue: 5900 },
  { date: "2025-10-09", revenue: 2100 },
  { date: "2025-10-01", revenue: 3500 },
  { date: "2025-11-01", revenue: 4500 },
  { date: "2025-12-01", revenue: 5500 },
];

const BarChartRevenue = ({ filterMode = "month" }) => {
  const filteredData = useMemo(() => {
    switch (filterMode) {
      case "month":
        return groupByMonth(allData, "revenue");
      case "quarter":
        return groupByQuarter(allData, "revenue");
      case "year":
        return groupByYear(allData, "revenue");
      default:
        return groupByMonth(allData, "revenue");
    }
  }, [filterMode]);

  return (
    <div className="w-full h-96 p-4 bg-white rounded-xl shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          Doanh thu theo{" "}
          {filterMode === "month"
            ? "tháng (12 tháng)"
            : filterMode === "quarter"
            ? "quý"
            : "năm"}
        </h2>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filteredData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="revenue" fill="#16a34a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChartRevenue;
