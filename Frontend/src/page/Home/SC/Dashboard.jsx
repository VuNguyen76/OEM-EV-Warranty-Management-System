import React from "react";
import Report from "./Report";
import Title from "../../../components/Title";

const Dashboard = () => {
  return (
    <div className="h-full w-full space-y-3 p-4">
      <Title title="Dashboard - Trung tâm dịch vụ" subTitle="Chào mừng, quản lý hệ thống trung tâm bảo hành" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white shadow rounded-lg p-4 border border-gray-300">
          <div className="flex justify-between items-center ">
            <h3 className="text-lg font-semibold mb-2">Tổng số Claim</h3>
            <i class="text-blue-500 fa-solid fa-file-lines"></i>
          </div>
          <p className="text-xl font-bold">100</p>
          <p className="text-gray-500 text-sm">Tất cả claim được tạo</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border border-gray-300">
          <div className="flex justify-between items-center ">
            <h3 className="text-lg font-semibold mb-2">Chờ duyệt</h3>
            <i class="text-blue-500 fa-solid fa-clock-rotate-left"></i>
          </div>
          <p className="text-xl font-bold">100</p>{" "}
          <p className="text-gray-500 text-sm">Đang chờ EVM duyệt</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border border-gray-300">
          <div className="flex justify-between items-center ">
            <h3 className="text-lg font-semibold mb-2">Được duyệt</h3>
            <i class="text-blue-500 fa-regular fa-circle-check"></i>
          </div>
          <p className="text-xl font-bold">100</p>{" "}
          <p className="text-gray-500 text-sm">Sẵn sàng phân công</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border border-gray-300">
          <div className="flex justify-between items-center ">
            <h3 className="text-lg font-semibold mb-2">Hoàn thành</h3>
            <i class="text-blue-500 fa-solid fa-check"></i>
          </div>
          <p className="text-xl font-bold">100</p>{" "}
          <p className="text-gray-500 text-sm">Đã sửa xong</p>
        </div>
      </div>
      <div className="space-y-2 p-4 border border-gray-300 rounded-lg">
        <h3 className="text-xl font-semibold mb-2">Claim gần đây</h3>
        <div className="flex justify-between items-center p-4 border border-gray-300 rounded-lg">
          <div className="space-y-1">
            <h4 className="font-semibold">Nguyễn Văn An</h4>
            <p className="text-gray-500 text-sm">VIN: 5YJ3E1EA4KF123456</p>
            <p className="text-gray-500 text-sm">Ngày tạo: 2024-10-01</p>
            <p className="text-gray-500 text-sm"></p>
          </div>
          <div className=" flex flex-col items-center gap-2">
            <p className="text-sm text-white bg-blue-700 px-4 rounded-full py-1">
              Chờ duyệt
            </p>
            <p className="text-blue-500 text-sm cursor-pointer">Xem chi tiết</p>
          </div>
        </div>
      </div>
      <Report />
    </div>
  );
};

export default Dashboard;
