import React, { useState } from "react";
import Title from "../../../components/Title";
import Modal from "../../../components/Modal";
import Backdrop from "../../../components/Backdrop";
import { useSelector, useDispatch } from "react-redux";
import { openModal, closeModal } from "../../../features/ui/uiSlice";
import {
  useConfirmWarrantyCostMutation,
  useGetAllClaimsQuery,
} from "../../../features/warranty/warranty.api";
import Loading from "../../../components/Loading";
import {
  useGetAllTechniciansQuery,
  useAssignTechnicianMutation,
} from "../../../features/user/user.api";
import { toast } from "react-toastify";
// import STATUS_INFO from "../../../utils/statusClaim"; // Đã được thay thế bằng logic nội bộ
import { useGetAllCentersQuery } from "../../../features/center/center.api.js";

// Helper function để định nghĩa thông tin trạng thái và màu sắc (Tông Xanh Lá)
const getStatusInfo = (status) => {
  const map = {
    submitted: { label: "Đã gửi yêu cầu", color: "bg-blue-100 text-blue-700 border-blue-300" },
    under_review: { label: "Đang xem xét", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    approved: { label: "Đã duyệt", color: "bg-green-100 text-green-700 border-green-300" },
    rejected: { label: "Bị từ chối", color: "bg-red-100 text-red-700 border-red-300" },
    in_repair: { label: "Đang sửa chữa", color: "bg-purple-100 text-purple-700 border-purple-300" },
    completed: { label: "Hoàn thành", color: "bg-gray-100 text-gray-700 border-gray-300" },
    waiting_customer: { label: "Chờ KH xác nhận", color: "bg-orange-100 text-orange-700 border-orange-300" },
    confirmed: { label: "Đã xác nhận", color: "bg-green-100 text-green-700 border-green-300" }, // Dùng cho Modal
  };
  return map[status] || { label: status, color: "bg-gray-100 text-gray-600 border-gray-300" };
};


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
    useAssignTechnicianMutation(); // Bỏ refetch ở đây vì nó không dùng

  const [confirmWarrantyCost] = // Bỏ isLoading: isConfirming vì nó không dùng
    useConfirmWarrantyCostMutation();

  const { data: technicians, isLoading: isTechnicianLoading } =
    useGetAllTechniciansQuery();

  const handleAssign = async () => {
    if (!assignedTech || !modalData?._id) {
      toast.error("Vui lòng chọn kỹ thuật viên và đảm bảo Claim ID hợp lệ.");
      return;
    }
    try {
      await assignTechnician({
        claim_id: modalData._id,
        technician_id: assignedTech,
      }).unwrap();
      toast.success("Phân công thành công");
      dispatch(closeModal());
      // Không cần refetch vì RTK Query thường tự động cập nhật cache
      // Nhưng nếu cần cập nhật danh sách ClaimsManagement sau khi assign, cần thêm logic refetch vào component cha
    } catch (err) {
      toast.error(err.data?.message || "Lỗi khi phân công kỹ thuật viên");
    }
  };

  const handleViewClaim = (claim) => {
    dispatch(openModal({ modalType: "viewClaim", modalData: claim }));
  };

  const handleClaim = async (claimCode) => {
    try {
      await confirmWarrantyCost(claimCode).unwrap();
      toast.success("Đã gửi thông báo đến khách hàng");
      // dispatch(closeModal()); // Có thể đóng modal sau khi gửi thành công
      // refetch(); // Tương tự, dựa vào RTK Query cache
    } catch (error) {
      toast.error(error?.data?.message || "Lỗi khi xác nhận chi phí");
    }
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
      claim.status?.toLowerCase() === statusFilter.toLowerCase().replace(/\s/g, '_');

    return matchSearch && matchStatus;
  });

  if (isLoading)
    return (
      <div className="w-full h-full flex justify-center items-center">
        <Loading />
      </div>
    );

  return (
    <div className="flex-1 space-y-6 p-4 ">
      <Title
        title="Quản lý Claims & Phân công Kỹ thuật"
        subTitle="Xem, lọc và phân công các yêu cầu bảo hành cho kỹ thuật viên"
      />

      {/* --- Bộ lọc --- */}
      <div className="bg-white shadow-lg p-5 rounded-xl border border-green-200">
        <h3 className="font-bold text-xl text-green-700 mb-4">Bộ lọc & Tìm kiếm</h3>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <input
            type="text"
            placeholder="Tìm theo tên khách hàng, VIN, hoặc mô tả..."
            className="flex-grow border-2 border-green-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-150"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="border-2 border-green-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-green-500 w-full md:w-[250px] bg-white text-gray-700 transition duration-150"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="Tất cả trạng thái">Tất cả trạng thái</option>
            <option value="submitted">Đã gửi yêu cầu</option>
            <option value="under_review">Đang xem xét</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Bị từ chối</option>
            <option value="completed">Hoàn thành</option>
            <option value="waiting_customer">Chờ KH xác nhận</option>
            <option value="confirmed">Đã xác nhận</option>
          </select>
        </div>
      </div>

      {/* --- Danh sách Claim --- */}
      <div className="bg-white shadow-xl p-5 rounded-xl border border-green-200">
        <h3 className="font-bold text-xl text-gray-800 mb-2">
          Danh sách Claim ({filteredClaims.length})
        </h3>
        <p className="text-gray-500 text-sm mb-4">Danh sách các yêu cầu bảo hành cần được xử lý.</p>

        <div className="space-y-4">
          {filteredClaims.map((claim) => {
            const v = claim.vehicle || {};
            // Sử dụng logic getStatusInfo mới
            const statusInfo = getStatusInfo(claim.status);
            
            return (
              <div
                key={claim._id}
                className={`border-l-4 border-green-500 rounded-lg p-4 shadow-sm hover:shadow-md transition bg-white ${
                  statusInfo.color.includes('bg-gray') ? 'bg-gray-50' : 'bg-white'
                }`}
              >
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  
                  {/* Claim Details */}
                  <div>
                    <p className="font-bold text-lg text-gray-900 flex items-center gap-2">
                      {v.customer_name || "Khách hàng không rõ"}{" "}
                      <span className="text-sm text-green-600 font-semibold">
                        #{claim.claim_code}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-mono">VIN: {claim.vin || "Không có"}</span> • Model: {v.model || "Không rõ"}
                    </p>
                    <p className="text-gray-700 mt-2 text-sm max-w-prose">
                      <span className="font-semibold text-red-600">Sự cố:</span> {claim.issue_description || "Không có mô tả chi tiết"}
                    </p>
                  </div>

                  {/* Actions & Status */}
                  <div className="flex flex-col items-start md:items-end gap-2 text-sm">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border ${statusInfo.color}`}
                    >
                      {statusInfo.label}
                    </span>
                    <p className="text-xs text-gray-500">
                      Tạo lúc: {new Date(claim.createdAt).toLocaleString("vi-VN")}
                    </p>
                    <button
                      onClick={() => handleViewClaim(claim)}
                      className="mt-1 flex items-center gap-1 text-sm bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition duration-150"
                    >
                      <i className="fa-solid fa-eye"></i>
                      <span>Xem chi tiết</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredClaims.length === 0 && (
            <p className="text-center py-6 text-gray-500 italic text-lg">
              Không tìm thấy yêu cầu bảo hành nào phù hợp.
            </p>
          )}
        </div>
      </div>

      {/* --- Modal chi tiết --- */}
      {isOpen && modalType === "viewClaim" && (
        <>
          {/* Backdrop (đã có trong file gốc, chỉ cần đảm bảo Modal nằm trên) */}
          <Backdrop isOpen={isOpen} onClose={() => dispatch(closeModal())} />
          <ClaimDetailsModal
            claim={modalData}
            onClose={() => dispatch(closeModal())}
            onHandleClaim={handleClaim}
            setAssignedTech={setAssignedTech}
            assignedTech={assignedTech}
            handleAssign={handleAssign}
            technicians={technicians}
            isAssigning={isAssigning}
          />
        </>
      )}
    </div>
  );
};

// Component Modal Chi tiết Claim
const ClaimDetailsModal = ({
  claim,
  onClose,
  onHandleClaim,
  assignedTech,
  setAssignedTech,
  handleAssign,
  technicians,
  isAssigning,
}) => {
  // Lấy dữ liệu trung tâm để hiển thị (giả định useGetAllCentersQuery đã được import)
  const { data: centers } = useGetAllCentersQuery();
  const center = (centers || []).find((c) => c._id === claim.center_id);

  const formatCurrency = (num) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(num || 0);

  // Status map cho Modal (Sử dụng màu sắc đậm hơn)
  const getModalStatusLabel = (status) => {
    const map = {
      submitted: { text: "Đã gửi", color: "bg-blue-600 text-white" },
      confirmed: { text: "Đã xác nhận", color: "bg-green-600 text-white" },
      waiting_customer: {
        text: "Chờ KH xác nhận",
        color: "bg-yellow-600 text-white",
      },
      in_repair: {
        text: "Đang sửa chữa",
        color: "bg-purple-600 text-white",
      },
      rejected: { text: "Đã từ chối", color: "bg-red-600 text-white" },
      completed: { text: "Hoàn thành", color: "bg-gray-600 text-white" },
      under_review: { text: "Đang xem xét", color: "bg-yellow-600 text-white" },
      approved: { text: "Đã duyệt", color: "bg-green-600 text-white" },
    };
    return map[status] || { text: status, color: "bg-gray-400 text-white" };
  };

  const statusInfo = getModalStatusLabel(claim.status);

  // Logic hiển thị nút hành động
  const getActionButtons = (status) => {
    switch (status) {
      case "submitted":
      case "under_review":
        // Giả sử có 1 action là phê duyệt/chuyển trạng thái
        return [
          {
            label: "Xác nhận Chi phí (Gửi KH)",
            action: () => onHandleClaim(claim.claim_code),
            color: "bg-green-600 hover:bg-green-700",
            icon: "fa-paper-plane",
          },
          // Thêm logic Từ chối/Chuyển trạng thái khác nếu cần
        ];
      case "waiting_customer":
        return [
          {
            label: "Đang chờ khách hàng xác nhận...",
            color: "bg-gray-500 cursor-not-allowed",
            disabled: true,
          },
        ];
      case "confirmed":
        // Phân công KTV được hiển thị trong section riêng
        return []; 
      case "in_repair":
        return [
          {
            label: "Hoàn thành Sửa chữa (DEBUG)",
            color: "bg-blue-600 hover:bg-blue-700",
            action: () => onHandleClaim(claim.claim_code), // Cần có mutation riêng để chuyển sang 'completed'
          },
        ];
      default:
        return [];
    }
  };


  return (
    <Modal isOpen={true}>
      <div className="w-[95vw] max-w-5xl bg-white rounded-2xl shadow-2xl overflow-y-auto max-h-[95vh] transform transition-all duration-300 z-50">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b-2 border-green-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-3xl font-extrabold text-green-700">
              Chi tiết yêu cầu bảo hành
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Mã:{" "}
              <span className="font-bold text-gray-700">
                {claim.claim_code}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500 text-3xl transition duration-150"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8 space-y-8 text-sm text-gray-700">
          
          {/* 1️⃣ Trạng thái & Tóm tắt Tổng quan */}
          <section className="p-5 rounded-xl shadow-lg border-2 border-green-300 bg-green-50">
            <div className="flex flex-wrap justify-between items-center mb-4 pb-3 border-b border-green-200">
              <h3 className="text-xl font-bold text-green-800">
                Thông tin Yêu cầu
              </h3>
              <span
                className={`px-4 py-2 rounded-full font-bold shadow-md ${statusInfo.color}`}
              >
                {statusInfo.text}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <p>
                    <b>Ngày gửi:</b>{" "}
                    {new Date(claim.submitted_at || claim.createdAt).toLocaleString("vi-VN")}
                </p>
                <p>
                    <b>Trung tâm:</b>{" "}
                    <span className="font-semibold text-gray-700">{center?.name || claim.center_id || "N/A"}</span>
                </p>
                <p className="col-span-full">
                    <b>Mô tả sự cố:</b>{" "}
                    <span className="text-red-600 font-bold italic">
                        {claim.issue_description || "Không có mô tả"}
                    </span>
                </p>
            </div>
          </section>

          {/* 5️⃣ Tóm tắt Chi phí */}
          {claim.status !== "submitted" && (
            <section>
              <h3 className="text-xl font-bold mb-4 text-gray-800">
                Tổng chi phí
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-100 border-2 border-green-400 rounded-xl p-5 shadow-md">
                  <h4 className="font-bold text-green-800 mb-1 uppercase text-sm">
                    Chi phí Bảo hành
                  </h4>
                  <p className="text-3xl font-extrabold text-green-700">
                    {formatCurrency(claim.summary?.total_warranty_amount || 0)}
                  </p>
                </div>

                <div className="bg-orange-100 border-2 border-orange-400 rounded-xl p-5 shadow-md">
                  <h4 className="font-bold text-orange-800 mb-1 uppercase text-sm">
                    Chi phí Khách hàng
                  </h4>
                  <p className="text-3xl font-extrabold text-orange-700">
                    {formatCurrency(claim.summary?.total_customer_amount || 0)}
                  </p>
                </div>

                <div className="bg-blue-100 border-2 border-blue-400 rounded-xl p-5 shadow-md">
                  <h4 className="font-bold text-blue-800 mb-1 uppercase text-sm">Tổng cộng</h4>
                  <p className="text-3xl font-extrabold text-blue-700">
                    {formatCurrency(
                      (claim.summary?.total_customer_amount || 0) +
                        (claim.summary?.total_warranty_amount || 0)
                    )}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Vehicle Info & Customer Info - Ghép thành 1 khối */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Vehicle Info */}
            <section className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
                <h3 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2 border-gray-100">
                    Thông tin xe
                </h3>
                <div className="space-y-2 text-sm">
                    <p><b>VIN:</b> <span className="font-mono text-green-600">{claim.vehicle?.vin}</span></p>
                    <p><b>Biển số:</b> {claim.vehicle?.registration_number}</p>
                    <p><b>Hãng/Model:</b> {claim.vehicle?.manufacturer} / {claim.vehicle?.model}</p>
                    <p><b>Số km hiện tại:</b> <span className="font-bold text-purple-600">{claim.vehicle?.kilometer} km</span></p>
                    <p>
                        <b>Thời hạn BH:</b>{" "}
                        {new Date(claim.vehicle?.warranty_start).toLocaleDateString("vi-VN")}{" "}
                        →{" "}
                        {new Date(claim.vehicle?.warranty_end).toLocaleDateString("vi-VN")}
                    </p>
                </div>
            </section>

            {/* Customer Info */}
            <section className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
                <h3 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2 border-gray-100">
                    Thông tin Khách hàng
                </h3>
                <div className="space-y-2 text-sm">
                    <p><b>Họ tên:</b> <span className="font-semibold text-gray-900">{claim.vehicle?.customer_name}</span></p>
                    <p><b>SĐT:</b> <span className="font-semibold text-blue-600">{claim.vehicle?.customer_phone}</span></p>
                    <p><b>Địa chỉ:</b> {claim.vehicle?.customer_address}</p>
                </div>
            </section>

          </div>
          

          {/* 4️⃣ Parts Info (Dạng danh sách hoặc bảng tùy trạng thái) */}
          <section className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2 border-gray-100">
              Danh sách phụ tùng yêu cầu
            </h3>
            
            {claim.parts?.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr className="text-left text-xs uppercase font-medium text-gray-600">
                            <th className="px-4 py-3">Tên phụ tùng</th>
                            <th className="px-4 py-3">Serial</th>
                            <th className="px-4 py-3 text-center">SL</th>
                            <th className="px-4 py-3 text-center">Trạng thái</th>
                            <th className="px-4 py-3">Loại xử lý</th>
                            <th className="px-4 py-3">Mô tả chi tiết</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {claim.parts.map((p, i) => (
                                <tr key={i} className={i % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"}>
                                    <td className="px-4 py-2 font-medium text-gray-900">{p.part_name}</td>
                                    <td className="px-4 py-2 font-mono text-xs text-nowrap">{p.part_serial}</td>
                                    <td className="px-4 py-2 text-center">{p.quantity}</td>
                                    <td className="px-4 py-2 text-center text-nowrap">
                                        {p.is_eligible ? (
                                            <span className="text-green-600 font-bold">Hợp lệ</span>
                                        ) : (
                                            <span className="text-red-600 font-bold">Không hợp lệ</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-nowrap">
                                        {p.warranty_type === "warranty" ? (
                                            <span className="text-blue-600 font-medium">Bảo hành</span>
                                        ) : (
                                            <span className="text-orange-600 font-medium">Khách trả phí</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-gray-600 text-xs max-w-[200px] overflow-hidden whitespace-normal">{p.reason}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="italic text-gray-500">
                    Không có phụ tùng nào trong yêu cầu này.
                </p>
            )}
          </section>

          {/* Technician assign */}
          {claim.status === "confirmed" && (
            <div className="border border-green-400 bg-green-50 rounded-xl p-5 shadow-lg">
              <h3 className="font-bold text-xl text-green-700 mb-3">
                Phân công kỹ thuật viên
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  className="flex-grow border-2 border-green-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  value={assignedTech}
                  onChange={(e) => setAssignedTech(e.target.value)}
                >
                  <option value="">-- Chọn kỹ thuật viên --</option>
                  {technicians?.map((tech) => (
                    <option key={tech._id} value={tech._id}>
                      {`${tech.name} - ${tech.email} (Claims: ${tech.totalClaims || 0})`}
                    </option>
                  ))}
                </select>
                <button
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 font-semibold transition duration-150 shadow-md disabled:opacity-50"
                  onClick={handleAssign}
                  disabled={isAssigning || !assignedTech}
                >
                  <i className="fa-solid fa-user-gear"></i> {isAssigning ? "Đang phân công..." : "Phân công"}
                </button>
              </div>
            </div>
          )}
          
          {/* Action Buttons (nếu không phải là Assign) */}
          {getActionButtons(claim.status).length > 0 && (
            <section className="text-center pt-6 border-t border-gray-300">
              <div className="flex flex-wrap justify-center gap-4">
                {getActionButtons(claim.status).map((action) => (
                  <button
                    key={action.status || action.label}
                    onClick={action.action}
                    disabled={action.disabled}
                    className={`px-8 py-3 rounded-xl font-bold text-lg text-white transition-colors shadow-lg ${action.color} disabled:opacity-70 disabled:cursor-not-allowed`}
                  >
                    {action.icon && <i className={`fa-solid ${action.icon} mr-2`}></i>}
                    {action.label}
                  </button>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
    </Modal>
  );
};

export default ManageClaim;