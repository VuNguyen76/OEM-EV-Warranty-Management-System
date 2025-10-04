import React, { useState } from "react";
import Title from "../../../components/Title";

const CreateClaim = () => {
  const [vin, setVin] = useState("");
  const [description, setDescription] = useState("");
  const [part, setPart] = useState("");
  const [images, setImages] = useState([]);
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map((file) => URL.createObjectURL(file));
    setImages((prev) => [...prev, ...newImages]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Gửi dữ liệu tạo claim
    console.log({
      vin,
      description,
      part,
      images,
    });
  };

  return (
    <div className="h-full w-full space-y-6 p-4">
      <Title
        title="Tạo Claim Bảo Hành"
        subTitle="Tạo yêu cầu bảo hành cho khách hàng"
      />

      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg">
        {/* --- Thông tin xe --- */}
        <div className="border border-gray-300 rounded-lg p-5 space-y-3">
          <h3 className="text-xl font-semibold text-gray-800">Thông tin xe</h3>
          <p className="text-gray-500">Cung cấp VIN của xe khách hàng</p>

          <div className="flex gap-2 mt-2">
            <input
              type="text"
              placeholder="Nhập số VIN (ví dụ: 5YJ3E1EA4KF123456)"
              className="flex-grow border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              value={vin}
              onChange={(e) => setVin(e.target.value)}
            />
          </div>
        </div>

        {/* --- Chi tiết Claim --- */}
        <div className="border border-gray-300 rounded-lg p-5 space-y-3">
          <h3 className="text-xl font-semibold text-gray-800">
            Chi tiết Claim
          </h3>
          <p className="text-gray-500">Mô tả vấn đề và phụ tùng cần thay</p>

          <div className="space-y-3">
            <div>
              <label className="block text-gray-700 font-medium">
                Mô tả lỗi
              </label>
              <textarea
                rows="3"
                placeholder="Mô tả chi tiết về vấn đề của xe..."
                className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
            </div>
          </div>
        </div>
        <div className="border border-gray-300 rounded-lg p-5 space-y-3">
          <div>
            <label className="block text-gray-700 font-medium">
              Phụ tùng cần thay
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              value={part}
              onChange={(e) => setPart(e.target.value)}
            >
              <option value="">Chọn phụ tùng</option>
              <option value="battery">Pin</option>
              <option value="motor">Động cơ</option>
              <option value="sensor">Cảm biến</option>
              <option value="display">Màn hình điều khiển</option>
            </select>
          </div>
        </div>

        {/* --- Hình ảnh minh chứng --- */}
        <div className="border border-gray-300 rounded-lg p-5 space-y-3">
          <h3 className="text-xl font-semibold text-gray-800">
            Hình ảnh minh chứng
          </h3>
          <p className="text-gray-500">Tải lên ảnh chụp lỗi hoặc hư hỏng</p>

          <label className="flex items-center gap-2 cursor-pointer w-fit bg-gray-100 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200">
            <i className="fa-solid fa-camera text-gray-600"></i>
            <span className="font-medium text-gray-700">Chọn ảnh</span>
            <input
              type="file"
              multiple
              className="hidden"
              accept="image/*"
              onChange={handleImageChange}
            />
          </label>
          <div className="flex flex-wrap gap-5 ">
            {images.map((src) => (
              <div
                key={src}
                className="w-40 h-30 p-2 border border-gray-300 rounded-xl"
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>

          <p className="text-gray-500">
            {images.length > 0
              ? `${images.length} ảnh đã chọn`
              : "0 ảnh đã chọn"}
          </p>
        </div>

        {/* --- Nút hành động --- */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 cursor-pointer"
          >
            Tạo Claim
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateClaim;
