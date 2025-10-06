import React, { useState } from "react";
import Title from "../../../components/Title";
import Modal from "../../../components/Modal";
import Backdrop from "../../../components/Backdrop";
import { useSelector, useDispatch } from "react-redux";
import { openModal, closeModal } from "../../../features/ui/uiSlice";

const fakeClaims = [
  {
    id: "claim001",
    vin: "5YJ3E1EA4KF123456",
    vehicle: {
      model: "VinFast VF8",
      year: 2023,
      color: "Pearl White",
      kilometers: 15200,
    },
    customer: {
      name: "Nguyễn Văn An",
      phone: "0987654321",
      email: "nguyenvanan@email.com",
    },
    issues: [
      {
        description:
          "Battery charging issue - vehicle not charging to full capacity",
        evmNote:
          "Approved for warranty claim. Battery module will be replaced under policy.",
      },
      {
        description: "Cooling fan making abnormal noise during charging",
        evmNote: "Fan replacement required under standard warranty.",
      },
    ],
    parts: [
      { name: "Battery Pack Module", code: "BT-VF8-001", cost: 32500000 },
      { name: "Cooling Fan Unit", code: "CF-VF8-002", cost: 2800000 },
    ],
    technician: "Vũ Thành Nam",
    status: "Chờ duyệt",
    createdAt: "2024-01-15",
    updatedAt: "2024-01-15",
  },
  {
    id: "claim002",
    vin: "5YJ3E1EA4KF654321",
    vehicle: {
      model: "VinFast VF9",
      year: 2023,
      color: "Metallic Blue",
      kilometers: 8500,
    },
    customer: {
      name: "Trần Thị Bình",
      phone: "0912345678",
      email: "tranthibinh@email.com",
    },
    issues: [
      {
        description: "Front brake noise and vibration during braking",
        evmNote:
          "Approved for warranty claim. Part covered under standard warranty.",
      },
      {
        description: "Brake fluid leakage detected from front left caliper",
        evmNote: "Caliper replacement authorized by EVM.",
      },
    ],
    parts: [
      { name: "Brake Disc Front", code: "BD-VF8-004", cost: 1200000 },
      { name: "Brake Caliper Left", code: "BC-VF9-006", cost: 1800000 },
    ],
    technician: "Vũ Thành Nam",
    status: "Được duyệt",
    createdAt: "2024-01-10",
    updatedAt: "2024-01-12",
  },
  {
    id: "claim003",
    vin: "5YJ3E1EA4KF777777",
    vehicle: {
      model: "VinFast VF6",
      year: 2022,
      color: "Jet Black",
      kilometers: 23100,
    },
    customer: {
      name: "Phạm Quốc Tính",
      phone: "0977888999",
      email: "quoctinh@email.com",
    },
    issues: [
      {
        description: "Touch screen not responding intermittently",
        evmNote: "Pending approval from manufacturer.",
      },
    ],
    parts: [
      { name: "Display Unit", code: "DS-VF6-002", cost: 8200000 },
      { name: "Touch Sensor Module", code: "TS-VF6-003", cost: 3100000 },
    ],
    technician: "Nguyễn Mạnh Dũng",
    status: "Đang sửa",
    createdAt: "2024-01-08",
    updatedAt: "2024-01-14",
  },
];

const ManageClaim = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả trạng thái");
  const [assignedTech, setAssignedTech] = useState("");

  const dispatch = useDispatch();
  const { isOpen, modalType, modalData } = useSelector(
    (state) => state.ui.modal
  );

  const technicians = [
    { name: "Vũ Thành Nam", team: "General Maintenance", workload: 3 },
    { name: "Nguyễn Mạnh Dũng", team: "Electrical System", workload: 5 },
    { name: "Trần Văn Tài", team: "HVAC Specialist", workload: 2 },
    { name: "Phan Quốc Long", team: "Brake System", workload: 1 },
  ];

  const handleAssign = () => {
    alert(`Đã phân công kỹ thuật viên: ${assignedTech}`);
  };

  const handleViewClaim = (claim) => {
    dispatch(openModal({ modalType: "viewClaim", modalData: claim }));
  };

  const statusColors = {
    "Chờ duyệt": "bg-blue-100 text-blue-700",
    "Được duyệt": "bg-green-100 text-green-700",
    "Đang sửa": "bg-yellow-100 text-yellow-700",
    "Hoàn thành": "bg-gray-200 text-gray-700",
  };

  const filteredClaims = fakeClaims.filter((claim) => {
    const matchSearch =
      claim.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.vin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.issues.some((i) =>
        i.description.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchStatus =
      statusFilter === "Tất cả trạng thái" || claim.status === statusFilter;

    return matchSearch && matchStatus;
  });

  return (
    <div className="h-full w-full space-y-6 p-4">
      <Title
        title="Quản lý Claim"
        subTitle="Xem và quản lý tất cả các yêu cầu bảo hành"
      />

      {/* --- Bộ lọc --- */}
      <div className="border border-gray-300 p-4 rounded-lg space-y-3">
        <h3 className="font-semibold text-lg text-gray-800">Bộ lọc</h3>
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <input
            type="text"
            placeholder="Tìm theo tên khách hàng, VIN, hoặc mô tả..."
            className="flex-grow border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-500 w-full md:w-[220px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>Tất cả trạng thái</option>
            <option>Chờ duyệt</option>
            <option>Được duyệt</option>
            <option>Đang sửa</option>
            <option>Hoàn thành</option>
          </select>
        </div>
      </div>

      {/* --- Danh sách Claim --- */}
      <div className="border border-gray-300 p-4 rounded-lg space-y-3">
        <h3 className="font-semibold text-lg text-gray-800">
          Danh sách Claim ({filteredClaims.length})
        </h3>
        <p className="text-gray-500">Tất cả claim được tạo bởi bạn</p>

        <div className="space-y-3">
          {filteredClaims.map((claim) => (
            <div
              key={claim.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition bg-white"
            >
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                <div>
                  <p className="font-semibold text-gray-900">
                    {claim.customer.name}{" "}
                    <span className="text-gray-400 text-sm">#{claim.id}</span>
                  </p>
                  <p className="text-gray-600 text-sm">
                    VIN: {claim.vin} • {claim.vehicle.model}
                  </p>
                  <p className="text-gray-700 mt-1">
                    {claim.issues[0].description}
                    {claim.issues.length > 1 && (
                      <span className="text-gray-500 text-sm ml-1">
                        + {claim.issues.length - 1} vấn đề khác
                      </span>
                    )}
                  </p>
                  <p className="text-gray-500 text-sm">
                    Phụ tùng: {claim.parts.map((p) => p.name).join(", ")} • KTV:{" "}
                    {claim.technician}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      statusColors[claim.status]
                    }`}
                  >
                    {claim.status}
                  </span>
                  <p className="text-xs text-gray-500">
                    Tạo: {claim.createdAt}
                  </p>
                  <p className="text-xs text-gray-500">
                    Cập nhật: {claim.updatedAt}
                  </p>
                  <button
                    onClick={() => handleViewClaim(claim)}
                    className="mt-2 flex items-center gap-1 text-sm bg-gray-100 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded-md cursor-pointer"
                  >
                    <i className="fa-regular fa-eye"></i>
                    <span>Xem</span>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredClaims.length === 0 && (
            <p className="text-center text-gray-500 italic">
              Không tìm thấy claim nào phù hợp.
            </p>
          )}
        </div>
      </div>

      {/* --- Modal hiển thị chi tiết --- */}
      {isOpen && modalType === "viewClaim" && (
        <>
          <Backdrop isOpen={isOpen} onClose={() => dispatch(closeModal())} />
          <Modal isOpen={isOpen}>
            <div className="w-[850px] max-h-[90vh] overflow-y-auto shadow-lg p-3 space-y-5">
              <div className="flex justify-between items-center pb-2">
                <Title
                  title={`Chi tiết Claim #${modalData.id}`}
                  subTitle={`${modalData.vehicle.model} (${modalData.vehicle.year})`}
                />
                <button
                  className="w-8 h-8 flex justify-center items-center text-xl border text-green-500 hover:text-red-500 border-green-500 hover:border-red-500 p-2 rounded-full bg-green-100 hover:bg-red-100 cursor-pointer"
                  onClick={() => dispatch(closeModal())}
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="border border-gray-300 rounded-lg p-3">
                  <h3 className="font-semibold text-gray-800 mb-2">
                    Thông tin xe
                  </h3>
                  <p>
                    <b>VIN:</b> {modalData.vin}
                  </p>
                  <p>
                    <b>Xe:</b> {modalData.vehicle.model}{" "}
                    {modalData.vehicle.year}
                  </p>
                  <p>
                    <b>Màu:</b> {modalData.vehicle.color}
                  </p>
                  <p>
                    <b>Số km:</b>{" "}
                    {modalData.vehicle.kilometers.toLocaleString()} km
                  </p>
                </div>

                <div className="border border-gray-300 rounded-lg p-3">
                  <h3 className="font-semibold text-gray-800 mb-2">
                    Khách hàng
                  </h3>
                  <p>
                    <b>Tên:</b> {modalData.customer.name}
                  </p>
                  <p>
                    <b>SĐT:</b> {modalData.customer.phone}
                  </p>
                  <p>
                    <b>Email:</b> {modalData.customer.email}
                  </p>
                </div>
              </div>

              {/* Issues */}
              <div className="border border-gray-300 rounded-lg p-3 space-y-3">
                <h3 className="font-semibold text-gray-800 mb-1">
                  Mô tả vấn đề
                </h3>
                {modalData.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-200 rounded-lg p-2"
                  >
                    <p className="text-gray-700 mb-1">
                      {idx + 1}. {issue.description}
                    </p>
                    {issue.evmNote && (
                      <p className="bg-gray-100 text-gray-600 text-sm p-2 rounded">
                        <b>Ghi chú từ EVM:</b> {issue.evmNote}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Parts */}
              <div className="border border-gray-300 rounded-lg p-3 space-y-2">
                <h3 className="font-semibold text-gray-800 mb-1">
                  Phụ tùng yêu cầu
                </h3>
                {modalData.parts.map((part, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center border border-gray-200 rounded-lg p-2"
                  >
                    <div>
                      <p>
                        {idx + 1}. {part.name}
                      </p>
                      <p className="text-sm text-gray-500">Mã: {part.code}</p>
                    </div>
                    <p className="font-semibold">
                      {part.cost.toLocaleString("vi-VN")} VND
                    </p>
                  </div>
                ))}
              </div>

              {/* Assign technician */}
              <div className="border border-gray-300 rounded-lg p-3">
                <h3 className="font-semibold text-gray-800 mb-2">
                  Phân công kỹ thuật viên
                </h3>
                <div className="flex gap-2">
                  <select
                    className="flex-grow border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-green-500"
                    value={assignedTech}
                    onChange={(e) => setAssignedTech(e.target.value)}
                  >
                    <option value="">-- Chọn kỹ thuật viên --</option>
                    {technicians.map((tech) => (
                      <option key={tech.name} value={tech.name}>
                        {`${tech.name} - ${tech.team} (Workload: ${tech.workload})`}
                      </option>
                    ))}
                  </select>
                  <button
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-1"
                    onClick={handleAssign}
                  >
                    <i className="fa-solid fa-user-gear"></i> Phân công
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
};

export default ManageClaim;
