import React, { useState } from "react";

const EditInventoryModal = ({ onClose, onSubmit, inventory, refetch }) => {
  const [form, setForm] = useState({
    quantity: inventory.quantity,
    threshold: inventory.threshold,
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit({
      part_catalog_id: inventory.part_catalog_id._id,
      data: form,
    }).unwrap();
    refetch();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg w-[400px]">
        <h3 className="text-lg font-semibold mb-4">Chỉnh sửa tồn kho</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
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
            <label>Ngưỡng cảnh báo</label>
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
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditInventoryModal;
