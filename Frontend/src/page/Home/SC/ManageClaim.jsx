import React, { useState } from "react";
import Title from "../../../components/Title";
import Modal from "../../../components/Modal";
import Backdrop from "../../../components/Backdrop";
import { useSelector, useDispatch } from "react-redux";
import { openModal, closeModal } from "../../../features/ui/uiSlice";
import { useGetAllClaimsQuery } from "../../../features/warranty/warranty.api";
import Loading from "../../../components/Loading";
import {
  useGetAllTechniciansQuery,
  useAssignTechnicianMutation,
} from "../../../features/user/user.api";
import { toast } from "react-toastify";

const ManageClaim = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả trạng thái");
  const [assignedTech, setAssignedTech] = useState("");

  const { data: apiClaims = [], isLoading } = useGetAllClaimsQuery();
  const claims = apiClaims?.data || apiClaims; // tùy response structure

  const dispatch = useDispatch();
  const { isOpen, modalType, modalData } = useSelector(
    (state) => state.ui.modal
  );
  const [assignTechnician, { isLoading: isAssigning }] =
    useAssignTechnicianMutation();

  const STATUS_INFO = {
    submitted: {
      label: "Đã gửi yêu cầu",
      color: "bg-blue-100 text-blue-700",
    },
    under_review: {
      label: "Đang xem xét",
      color: "bg-yellow-100 text-yellow-700",
    },
    approved: {
      label: "Đã duyệt",
      color: "bg-green-100 text-green-700",
    },
    in_progress: {
      label: "Đang sửa chữa",
      color: "bg-orange-100 text-orange-700",
    },
    rejected: {
      label: "Bị từ chối",
      color: "bg-red-100 text-red-700",
    },
    completed: {
      label: "Hoàn thành",
      color: "bg-gray-200 text-gray-700",
    },
  };

  const { data: technicians, isLoading: isTechnicianLoading } =
    useGetAllTechniciansQuery();

  const handleAssign = async () => {
    if (!assignedTech) {
      toast.error("Vui lòng chọn kỹ thuật viên");
      return;
    }
    const res = await assignTechnician({
      claim_id: modalData._id,
      technician_id: assignedTech,
    }).unwrap();
    if (res.success) {
      toast.success("Phân công thành công");
      dispatch(closeModal());
    }
  };

  const handleViewClaim = (claim) => {
    dispatch(openModal({ modalType: "viewClaim", modalData: claim }));
  };

  // Bộ lọc tìm kiếm
  const filteredClaims = (claims || []).filter((claim) => {
    const vehicle = claim.vehicle || {};
    const matchSearch =
      vehicle.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.vin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.issue_description
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      claim.claim_code?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus =
      statusFilter === "Tất cả trạng thái" ||
      claim.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchSearch && matchStatus;
  });
  console.log(technicians);

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
            <option value="Tất cả trạng thái">Tất cả trạng thái</option>
            <option value="submitted">Đã gửi yêu cầu</option>
            <option value="under_review">Đang xem xét</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Bị từ chối</option>
            <option value="completed">Hoàn thành</option>
          </select>
        </div>
      </div>

      {/* --- Danh sách Claim --- */}
      {isLoading ? (
        <Loading />
      ) : (
        <div className="border border-gray-300 p-4 rounded-lg space-y-3">
          <h3 className="font-semibold text-lg text-gray-800">
            Danh sách Claim ({filteredClaims.length})
          </h3>
          <p className="text-gray-500">Tất cả claim được tạo</p>

          <div className="space-y-3">
            {filteredClaims.map((claim) => {
              const v = claim.vehicle || {};
              return (
                <div
                  key={claim._id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition bg-white"
                >
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {v.customer_name || "Chưa rõ"}{" "}
                        <span className="text-gray-400 text-sm">
                          #{claim.claim_code}
                        </span>
                      </p>
                      <p className="text-gray-600 text-sm">
                        VIN: {claim.vin || "Không có"} • {v.model || "Không rõ"}
                      </p>
                      <p className="text-gray-700 mt-1">
                        {claim.issue_description || "Không có mô tả"}
                      </p>
                      <p className="text-gray-500 text-sm">
                        Phụ tùng:{" "}
                        {claim.parts?.map((p) => p.part_name).join(", ") ||
                          "Không có"}{" "}
                        • Tổng chi phí:{" "}
                        {(claim.part_cost || 0).toLocaleString("vi-VN")} VND
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          STATUS_INFO[claim.status]?.color ||
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {STATUS_INFO[claim.status]?.label || claim.status}
                      </span>
                      <p className="text-xs text-gray-500">
                        Tạo: {new Date(claim.createdAt).toLocaleString("vi-VN")}
                      </p>
                      <p className="text-xs text-gray-500">
                        Cập nhật:{" "}
                        {new Date(claim.updatedAt).toLocaleString("vi-VN")}
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
              );
            })}

            {filteredClaims.length === 0 && (
              <p className="text-center text-gray-500 italic">
                Không tìm thấy claim nào phù hợp.
              </p>
            )}
          </div>
        </div>
      )}

      {/* --- Modal chi tiết --- */}
      {isOpen && modalType === "viewClaim" && (
        <>
          <Backdrop isOpen={isOpen} onClose={() => dispatch(closeModal())} />
          <Modal isOpen={isOpen}>
            <div className="w-[850px] max-h-[90vh] overflow-y-auto shadow-lg p-3 space-y-5">
              <div className="flex justify-between items-center pb-2">
                <Title
                  title={`Chi tiết Claim #${modalData.claim_code}`}
                  subTitle={`${modalData.vehicle?.model || ""}`}
                />
                <button
                  className="w-8 h-8 flex justify-center items-center text-xl border text-green-500 hover:text-red-500 border-green-500 hover:border-red-500 p-2 rounded-full bg-green-100 hover:bg-red-100 cursor-pointer"
                  onClick={() => dispatch(closeModal())}
                >
                  ✕
                </button>
              </div>

              {/* Vehicle + Customer */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-gray-300 rounded-lg p-3">
                  <h3 className="font-semibold text-gray-800 mb-2">
                    Thông tin xe
                  </h3>
                  <p>
                    <b>VIN:</b> {modalData.vin || "Không có"}
                  </p>
                  <p>
                    <b>Xe:</b> {modalData.vehicle?.model}{" "}
                    {modalData.vehicle?.modelYear || ""}
                  </p>
                  <p>
                    <b>Màu:</b> {modalData.vehicle?.color}
                  </p>
                  <p>
                    <b>Biển số:</b> {modalData.vehicle?.registration_number}
                  </p>
                  <p>
                    <b>Số km:</b>{" "}
                    {modalData.vehicle?.kilometer?.toLocaleString()} km
                  </p>
                </div>

                <div className="border border-gray-300 rounded-lg p-3">
                  <h3 className="font-semibold text-gray-800 mb-2">
                    Khách hàng
                  </h3>
                  <p>
                    <b>Tên:</b> {modalData.vehicle?.customer_name}
                  </p>
                  <p>
                    <b>SĐT:</b> {modalData.vehicle?.customer_phone}
                  </p>
                  <p>
                    <b>Email:</b> {modalData.vehicle?.customer_email}
                  </p>
                  <p>
                    <b>Địa chỉ:</b> {modalData.vehicle?.customer_address}
                  </p>
                </div>
              </div>

              {/* Issue */}
              <div className="border border-gray-300 rounded-lg p-3 space-y-3">
                <h3 className="font-semibold text-gray-800 mb-1">
                  Mô tả vấn đề
                </h3>
                <p className="text-gray-700">
                  {modalData.issue_description || "Không có mô tả chi tiết"}
                </p>
              </div>

              {/* Parts */}
              <div className="border border-gray-300 rounded-lg p-3 space-y-2">
                <h3 className="font-semibold text-gray-800 mb-1">
                  Phụ tùng liên quan
                </h3>
                {modalData.parts?.map((part, idx) => (
                  <div
                    key={part._id || idx}
                    className="flex justify-between items-center border border-gray-200 rounded-lg p-2"
                  >
                    <div>
                      <p>
                        {idx + 1}. {part.part_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        Mã serial: {part.part_serial}
                      </p>
                    </div>
                    <p className="font-semibold">
                      {modalData.part_cost?.toLocaleString("vi-VN")} VND
                    </p>
                  </div>
                ))}
              </div>

              {/* Technician assign */}
              {modalData.status === "approved" && (
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
                        <option key={tech.name} value={tech._id}>
                          {`${tech.name} - ${tech.email} (Workload: ${tech.totalClaims})`}
                        </option>
                      ))}
                    </select>
                    <button
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-1"
                      onClick={handleAssign}
                      disabled={isAssigning}
                    >
                      <i className="fa-solid fa-user-gear"></i> Phân công
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Modal>
        </>
      )}
    </div>
  );
};

export default ManageClaim;
