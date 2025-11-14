import React, { useState } from "react";

const CreateInventoryModal = ({ onClose, onSubmit, partCatalogs, refetch }) => {
  const [form, setForm] = useState({
    part_catalog_id: "",
    quantity: "",
    threshold: "",
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit(form).unwrap();
    refetch();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg w-[600px]">
        <h3 className="text-lg font-semibold mb-4">Tạo tồn kho</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label>Loại phụ tùng</label>
            <select
              name="part_catalog_id"
              value={form.part_catalog_id}
              onChange={handleChange}
              className="border border-gray-300 w-full px-2 py-1 rounded"
              required
            >
              <option value="">-- Chọn loại phụ tùng --</option>
              {partCatalogs?.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.model_code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Số lượng</label>
            <input
              type="number"
              name="quantity"
              value={form.quantity}
              onChange={handleChange}
              className="border border-gray-300 w-full px-2 py-1 rounded"
              required
            />
          </div>

          <div>
            <label>Ngưỡng cảnh báo (threshold)</label>
            <input
              type="number"
              name="threshold"
              value={form.threshold}
              onChange={handleChange}
              className="border border-gray-300 w-full px-2 py-1 rounded"
              required
            />
          </div>

          <div className="flex justify-end space-x-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 border border-gray-300 rounded"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-green-600 text-white rounded"
            >
              Tạo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateInventoryModal;
