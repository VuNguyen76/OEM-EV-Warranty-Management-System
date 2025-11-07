import React from "react";
import Report from "./Report";
import Title from "../../../components/Title";
import { useGetAllClaimsQuery } from "../../../features/warranty/warranty.api";
import STATUS_INFO from "../../../utils/statusClaim";
const Dashboard = () => {
  const { data: claims = [], isLoading } = useGetAllClaimsQuery();
 

  return (
    <div className="h-full w-full space-y-3 p-4">
      <Title
        title="Dashboard - Trung tâm dịch vụ"
        subTitle="Chào mừng, quản lý hệ thống trung tâm bảo hành"
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white shadow rounded-lg p-4 border border-gray-300">
          <div className="flex justify-between items-center ">
            <h3 className="text-lg font-semibold mb-2">Tổng số Claim</h3>
            <i class="text-blue-500 fa-solid fa-file-lines"></i>
          </div>
          <p className="text-xl font-bold">{claims.length}</p>
          <p className="text-gray-500 text-sm">Tất cả claim được tạo</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border border-gray-300">
          <div className="flex justify-between items-center ">
            <h3 className="text-lg font-semibold mb-2">Chờ duyệt</h3>
            <i class="text-blue-500 fa-solid fa-clock-rotate-left"></i>
          </div>
          <p className="text-xl font-bold">
            {" "}
            {claims.filter((claim) => claim.status === "submitted").length}
          </p>{" "}
          <p className="text-gray-500 text-sm">Đang chờ EVM duyệt</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border border-gray-300">
          <div className="flex justify-between items-center ">
            <h3 className="text-lg font-semibold mb-2">Được duyệt</h3>
            <i class="text-blue-500 fa-regular fa-circle-check"></i>
          </div>
          <p className="text-xl font-bold">
            {claims.filter((claim) => claim.status === "approved").length}
          </p>{" "}
          <p className="text-gray-500 text-sm">Sẵn sàng phân công</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border border-gray-300">
          <div className="flex justify-between items-center ">
            <h3 className="text-lg font-semibold mb-2">Đang bảo hành</h3>
            <i class="text-blue-500 fa-regular fa-circle-check"></i>
          </div>
          <p className="text-xl font-bold">
            {claims.filter((claim) => claim.status === "in_progress").length}
          </p>{" "}
          <p className="text-gray-500 text-sm">Đang trong quá trình sửa chữa</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border border-gray-300">
          <div className="flex justify-between items-center ">
            <h3 className="text-lg font-semibold mb-2">Hoàn thành</h3>
            <i class="text-blue-500 fa-solid fa-check"></i>
          </div>
          <p className="text-xl font-bold">
            {claims.filter((claim) => claim.status === "completed").length}
          </p>{" "}
          <p className="text-gray-500 text-sm">Đã sửa xong</p>
        </div>
      </div>
      <div className="space-y-2 p-4 border border-gray-300 rounded-lg">
        <h3 className="text-xl font-semibold mb-2">Claim gần đây</h3>
        {claims.slice(0, 5).map((claim) => (
          <div className="flex justify-between items-center p-4 border border-gray-300 rounded-lg">
            <div className="space-y-1">
              <h4 className="font-semibold">{claim.vehicle?.customer_name}</h4>
              <p className="text-gray-500 text-sm">
                Mã claim:{" "}
                <span className="text-black font-semibold">
                  {claim.claim_code}
                </span>
              </p>
              <p className="text-gray-500 text-sm">VIN: {claim.vin}</p>
              <p className="text-gray-500 text-sm">
                Ngày tạo: {new Date(claim.updatedAt).toLocaleString()}
              </p>
              <p className="text-gray-500 text-sm"></p>
            </div>
            <div className=" flex flex-col items-center gap-2">
              <p
                className={`text-sm ${
                  STATUS_INFO[claim.status]?.color
                } px-4 rounded-full py-1`}
              >
                {STATUS_INFO[claim.status]?.label || claim.status}
              </p>
              <p className="text-blue-500 text-sm cursor-pointer">
                Xem chi tiết
              </p>
            </div>
          </div>
        ))}
      </div>
      <Report />
    </div>
  );
};

export default Dashboard;
