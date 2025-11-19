import React, { useState } from "react";
import {
  useGetAllWarrantyPoliciesQuery,
  useCreateWarrantyPolicyMutation,
  useDeleteWarrantyPolicyMutation,
  useUpdateWarrantyPolicyMutation,
} from "../../../features/warranty/warranty.api";
import { toast } from "react-toastify";

const partCategories = ["battery", "motor", "bms", "charger", "inverter"];
const statusOptions = ["draft", "active", "expired"];

const WarrantyPolicyManagement = () => {
  const { data: policies = [], isLoading, refetch } = useGetAllWarrantyPoliciesQuery();

  const [createPolicy] = useCreateWarrantyPolicyMutation();
  const [updatePolicy] = useUpdateWarrantyPolicyMutation();
  const [deletePolicy] = useDeleteWarrantyPolicyMutation();

  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    model_applicable: "",
    part_category: "battery",
    duration_months: 12,
    max_mileage: "",
    status: "draft",
  });

  const openCreateModal = () => {
    setEditingPolicy(null);
    setFormData({
      name: "",
      description: "",
      model_applicable: "",
      part_category: "battery",
      duration_months: 12,
      max_mileage: "",
      status: "draft",
    });
    setShowModal(true);
  };

  const openEditModal = (policy) => {
    setEditingPolicy(policy);
    setFormData({
      name: policy.name,
      description: policy.description,
      model_applicable: policy.model_applicable.join(","),
      part_category: policy.part_category,
      duration_months: policy.duration_months,
      max_mileage: policy.max_mileage,
      status: policy.status,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      model_applicable: formData.model_applicable
        ? formData.model_applicable.split(",").map((m) => m.trim())
        : [],
      max_mileage: Number(formData.max_mileage),
      duration_months: Number(formData.duration_months),
    };

    try {
      if (editingPolicy) {
        await updatePolicy({ id: editingPolicy._id, data: payload }).unwrap(); // Sử dụng _id cho RTK Query mutation
        toast.success("Cập nhật thành công");
      } else {
        await createPolicy(payload).unwrap();
        toast.success("Tạo mới thành công");
      }
      setShowModal(false);
      refetch();
    } catch (err) {
      toast.error(err.data?.message || "Lỗi xử lý");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa?")) return;

    try {
      await deletePolicy(id).unwrap();
      toast.success("Xóa thành công");
      refetch();
    } catch (err) {
      toast.error("Lỗi xóa chính sách");
    }
  };

  // Helper function để định dạng trạng thái (status)
  const getStatusClasses = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-400";
      case "expired":
        return "bg-red-100 text-red-800 border-red-400";
      case "draft":
      default:
        return "bg-gray-100 text-gray-800 border-gray-400";
    }
  };

  if (isLoading) return <div className="p-6 text-center text-lg font-medium">Đang tải dữ liệu...</div>;

  return (
    <div className="p-3 flex-1 mx-auto">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 border-b pb-3 border-green-200">
        <h2 className="text-3xl font-bold ">Quản lý Chính sách Bảo hành</h2>
        <button
          onClick={openCreateModal}
          className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition duration-300"
        >
          + Thêm Chính sách Mới
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white shadow-xl rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-green-200">
            {/* THÊM TONE MÀU XANH CHO HEADER */}
            <thead className="bg-green-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider">Tên chính sách</th>
                <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider">Loại phụ tùng</th>
                <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider">Model áp dụng</th>
                <th className="px-4 py-3 text-center text-sm font-semibold uppercase tracking-wider">Thời hạn (tháng)</th>
                <th className="px-4 py-3 text-center text-sm font-semibold uppercase tracking-wider">Mileage tối đa (Km)</th>
                <th className="px-4 py-3 text-center text-sm font-semibold uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3 text-center text-sm font-semibold uppercase tracking-wider w-[180px]">Hành động</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-green-100">
              {policies.length > 0 ? (
                policies.map((p) => (
                  <tr key={p._id} className="hover:bg-green-50 transition duration-150">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{p.part_category}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{p.model_applicable.join(", ")}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-700">{p.duration_months}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-700">{p.max_mileage ? p.max_mileage.toLocaleString() : "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusClasses(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openEditModal(p)}
                          className="  text-xs rounded "
                        >
                          <i className="fa-regular fa-pen-to-square text-blue-500 cursor-pointer "></i>
                        </button>
                        <button
                          onClick={() => handleDelete(p._id)}
                          className=" text-red-600 "
                        >
                          <i className="fa-regular fa-trash-can  cursor-pointer"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-4 py-6 text-center text-gray-500">
                    Chưa có chính sách bảo hành nào được tạo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-8 rounded-xl w-full max-w-lg shadow-2xl">
            <h3 className="text-2xl font-bold mb-6 text-green-700  pb-2">
              {editingPolicy ? "Cập nhật Chính sách Bảo hành" : "Thêm Chính sách Mới"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Input: Tên chính sách */}
              <input
                className="w-full border border-green-300 p-3 rounded-lg focus:ring-green-500 focus:border-green-500 transition duration-150"
                placeholder="Tên chính sách"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              {/* Textarea: Mô tả */}
              <textarea
                className="w-full border border-green-300 p-3 rounded-lg focus:ring-green-500 focus:border-green-500 transition duration-150"
                placeholder="Mô tả chi tiết về chính sách"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="3"
              />

              {/* Input: Model áp dụng */}
              <input
                className="w-full border border-green-300 p-3 rounded-lg focus:ring-green-500 focus:border-green-500 transition duration-150"
                placeholder="Model áp dụng (VD: M1, M2, M3 - ngăn cách bằng dấu ,)"
                value={formData.model_applicable}
                onChange={(e) => setFormData({ ...formData, model_applicable: e.target.value })}
              />

              {/* Select: Loại phụ tùng */}
              <select
                className="w-full border border-green-300 p-3 rounded-lg bg-white focus:ring-green-500 focus:border-green-500 transition duration-150"
                value={formData.part_category}
                onChange={(e) => setFormData({ ...formData, part_category: e.target.value })}
              >
                {partCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.toUpperCase()}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-4">
                {/* Input: Thời hạn bảo hành (tháng) */}
                <input
                  className="w-full border border-green-300 p-3 rounded-lg focus:ring-green-500 focus:border-green-500 transition duration-150"
                  placeholder="Thời hạn (tháng)"
                  type="number"
                  min="1"
                  value={formData.duration_months}
                  onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
                  required
                />

                {/* Input: Mileage tối đa */}
                <input
                  className="w-full border border-green-300 p-3 rounded-lg focus:ring-green-500 focus:border-green-500 transition duration-150"
                  placeholder="Mileage tối đa (Km)"
                  type="number"
                  min="0"
                  value={formData.max_mileage}
                  onChange={(e) => setFormData({ ...formData, max_mileage: e.target.value })}
                />
              </div>

              {/* Select: Trạng thái */}
              <select
                className="w-full border border-green-300 p-3 rounded-lg bg-white focus:ring-green-500 focus:border-green-500 transition duration-150"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>

              {/* Footer Modal Buttons */}
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 border border-gray-400 text-gray-700 rounded-lg hover:bg-gray-100 transition duration-150"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition duration-150"
                >
                  {editingPolicy ? "Cập nhật" : "Tạo mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarrantyPolicyManagement;