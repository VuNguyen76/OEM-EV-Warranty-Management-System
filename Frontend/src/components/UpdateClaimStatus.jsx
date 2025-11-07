import React, { useState } from "react";
import { useUpdateClaimStatusMutation } from "../../../features/warranty/warranty.api";
import { toast } from "react-toastify";

const UpdateClaimStatus = ({ claim }) => {
  const [status, setStatus] = useState(claim.status || "submitted");
  const [updateStatus, { isLoading }] = useUpdateClaimStatusMutation();

  const handleUpdate = async () => {
    try {
      const result = await updateStatus({
        claim_id: claim._id, // hoặc claim.claim_code nếu backend nhận code
        status,
      }).unwrap();

      toast.success(`Cập nhật trạng thái thành công: ${result.status}`);
    } catch (error) {
      toast.error(error?.data?.message || "Lỗi khi cập nhật trạng thái claim!");
      console.error("Update claim status error:", error);
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg p-4 space-y-3">
      <h3 className="text-lg font-semibold">Cập nhật trạng thái Claim</h3>
      <select
        className="border border-gray-300 p-2 rounded-lg w-full"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        disabled={isLoading}
      >
        <option value="submitted">Đã gửi (submitted)</option>
        <option value="under_review">Đang xem xét</option>
        <option value="approved">Đã duyệt</option>
        <option value="rejected">Từ chối</option>
        <option value="completed">Hoàn tất</option>
      </select>

      <button
        onClick={handleUpdate}
        disabled={isLoading}
        className={`bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 ${
          isLoading ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {isLoading ? "Đang cập nhật..." : "Cập nhật trạng thái"}
      </button>
    </div>
  );
};

export default UpdateClaimStatus;
