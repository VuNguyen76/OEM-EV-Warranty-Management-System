import React, { useState } from "react";

const CreatePartCatalogModal = ({ onClose, onSubmit }) => {
  const [form, setForm] = useState({
    name: "PIN",
    category: "batteryy",
    manufacturer: "Samsung",
    model_code: "BAT60V-30A",
    cost_price: "100000",
    weight_kg: "10",
    length: "100",
    width: "50",
    height: "20",
    description: "Mô tả",
    image_url: "https://example.com/image.jpg",
    status: "active",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Build payload matching PartCatalog schema
    const payload = {
      name: form.name,
      category: form.category,
      manufacturer: form.manufacturer,
      model_code: form.model_code,
      cost_price: form.cost_price ? Number(form.cost_price) : 0,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : 0,
      dimensions: {
        length: form.length ? Number(form.length) : undefined,
        width: form.width ? Number(form.width) : undefined,
        height: form.height ? Number(form.height) : undefined,
      },
      description: form.description,
      image_url: form.image_url,
      status: form.status,
    };

    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Tạo mẫu phụ tùng thất bại: " + (err?.message || "Lỗi"));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg w-[640px] max-h-[90vh] overflow-auto">
        <h3 className="text-lg font-semibold mb-4">
          Tạo mẫu phụ tùng (Part Catalog)
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Tên phụ tùng"
            required
            className="border px-2 py-1 rounded col-span-2"
          />
          <input
            name="category"
            value={form.category}
            onChange={handleChange}
            placeholder="Loại phụ tùng"
            required
            className="border px-2 py-1 rounded"
          />

          <input
            name="manufacturer"
            value={form.manufacturer}
            onChange={handleChange}
            placeholder="Hãng sản xuất"
            required
            className="border px-2 py-1 rounded"
          />
          <input
            name="model_code"
            value={form.model_code}
            onChange={handleChange}
            placeholder="Model code (VD: BAT60V-30A)"
            required
            className="border px-2 py-1 rounded"
          />

          <input
            type="number"
            name="cost_price"
            value={form.cost_price}
            onChange={handleChange}
            placeholder="Giá vốn"
            className="border px-2 py-1 rounded"
          />
          <input
            type="number"
            name="weight_kg"
            value={form.weight_kg}
            onChange={handleChange}
            placeholder="Cân nặng (kg)"
            className="border px-2 py-1 rounded"
          />

          <input
            type="number"
            name="length"
            value={form.length}
            onChange={handleChange}
            placeholder="Dài (mm)"
            className="border px-2 py-1 rounded"
          />
          <input
            type="number"
            name="width"
            value={form.width}
            onChange={handleChange}
            placeholder="Rộng (mm)"
            className="border px-2 py-1 rounded"
          />
          <input
            type="number"
            name="height"
            value={form.height}
            onChange={handleChange}
            placeholder="Cao (mm)"
            className="border px-2 py-1 rounded"
          />
          <input
            name="image_url"
            value={form.image_url}
            onChange={handleChange}
            placeholder="Image URL"
            className="border px-2 py-1 rounded col-span-2"
          />
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Mô tả"
            className="border px-2 py-1 rounded col-span-2"
          />
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="border px-2 py-1 rounded"
          >
            <option value="active">Hoạt động</option>
            <option value="inactive">Không hoạt động</option>
          </select>

          <div className="flex justify-end col-span-2 space-x-2 mt-3">
            <button
              type="button"
              onClick={onClose}
              className="border px-3 py-1 rounded"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="bg-green-600 text-white px-3 py-1 rounded"
            >
              Tạo mẫu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePartCatalogModal;
