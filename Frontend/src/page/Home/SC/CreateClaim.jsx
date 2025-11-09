import React, { useState, useEffect } from "react";
import Title from "../../../components/Title";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import warrantyStatus from "../../../utils/warrantyStatus";
import Loading from "../../../components/Loading";
import { useCreateClaimMutation } from "../../../features/warranty/warranty.api";
import { toast } from "react-toastify";

const CreateClaim = () => {
  const [description, setDescription] = useState("");
  const [selectedParts, setSelectedParts] = useState([]); // Mảng các part đã chọn
  const [imageFiles, setImageFiles] = useState([]); // Lưu file objects
  const [imagePreviews, setImagePreviews] = useState([]); // Lưu URL preview
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const { searchResult: result } = useSelector((state) => state.warranty);

  const { user } = useSelector((state) => state.user);
  const [createClaim, { isLoading: isCreatingClaim }] =
    useCreateClaimMutation();

  // Cleanup preview URLs khi component unmount
  useEffect(() => {
    return () => {
      imagePreviews.forEach((item) => {
        URL.revokeObjectURL(item.preview);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Xử lý chọn/bỏ chọn part
  const handlePartToggle = (part) => {
    
    setSelectedParts((prev) => {
      const partSerial = part.serial_number;
      const exists = prev.find((p) => p.part_serial === partSerial);

      if (exists) {
        // Bỏ chọn
        return prev.filter((p) => p.part_serial !== partSerial);
      } else {
        // Chọn - map từ result.parts sang format API cần
        return [
          ...prev,
          {
            part_id: part._id,
            part_serial: partSerial,
            part_category: part.part_category,
            part_name: part.part_name,
            cost: part.part_cost_price,
            quantity: 1,
          },
        ];
      }
    });
  };

  // Xử lý upload hình ảnh
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);

    // Validate file size (5MB max)
    const validFiles = files.filter((file) => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} vượt quá 5MB. Vui lòng chọn file khác.`);
        return false;
      }
      return true;
    });

    // Validate số lượng (tối đa 10 file)
    const totalFiles = imageFiles.length + validFiles.length;
    if (totalFiles > 10) {
      alert("Tối đa 10 hình ảnh. Vui lòng chọn lại.");
      return;
    }

    // Lưu file objects
    setImageFiles((prev) => [...prev, ...validFiles]);

    // Tạo preview URLs
    const newPreviews = validFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  // Xóa hình ảnh
  const handleRemoveImage = (index) => {
    // Revoke URL để tránh memory leak
    URL.revokeObjectURL(imagePreviews[index].preview);

    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Gửi request tạo claim
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!description.trim()) {
      setError("Vui lòng nhập mô tả vấn đề");
      return;
    }

    if (selectedParts.length === 0) {
      setError("Vui lòng chọn ít nhất một phụ tùng cần thay thế");
      return;
    }

    if (!user || !user.id) {
      setError("Không tìm thấy thông tin người dùng");
      return;
    }

    setIsSubmitting(true);

    try {
      // Tạo FormData
      const formData = new FormData();

      // Thông tin bắt buộc
      formData.append("vin", result.vin);
      formData.append("issue_description", description);
      formData.append("submitted_by", user.id || user._id);

      // Parts - gửi dạng JSON string
      formData.append("parts", JSON.stringify(selectedParts));

      //Part cost
      formData.append(
        "part_cost",
        selectedParts.reduce((acc, part) => acc + part.cost, 0)
      );

      // Thông tin tùy chọn
      if (user.technician_id) {
        formData.append("technician_id", user.technician_id);
      }

      // Upload hình ảnh
      imageFiles.forEach((file) => {
        formData.append("images", file);
      });

      // Gửi request bằng RTK Query mutation
      const data = await createClaim(formData).unwrap();
      if (data.success) {
        toast.success(`Tạo claim thành công! Mã claim: ${data.claim_code}`);
        // Reset form hoặc navigate
        navigate("/sc_staff/search-vin");
      } else {
        throw new Error(data.message || "Có lỗi xảy ra");
      }
    } catch (err) {
      // RTK Query sẽ throw error với cấu trúc {data, status, ...}
      const errorMessage =
        err.data?.message ||
        err.data?.errors ||
        err.message ||
        "Có lỗi xảy ra khi tạo claim";
      setError(errorMessage);
      console.error("Error creating claim:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Nếu không có result, redirect về search
  if (!result) {
    navigate("/sc_staff/search-vin");
    return null;
  }

  return (
    <div className="h-full w-full space-y-6 p-4">
      <Title
        title="Tạo Claim Bảo Hành"
        subTitle="Tạo yêu cầu bảo hành cho khách hàng"
      />

      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg">
        {/* --- Thông tin xe --- */}
        <div className="border border-gray-300 rounded-lg p-5 space-y-3">
          <div className="flex gap-4">
            <div className="w-1/2 space-y-3 border border-gray-300 p-4 rounded-lg">
              <Title title="Thông tin xe" />
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="text-gray-500">VIN</p>
                  <p className="font-semibold">{result.vin}</p>
                </div>
                <div>
                  <p className="text-gray-500">Biển số xe</p>
                  <p className="font-semibold">{result.registration_number}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="text-gray-500">Hãng xe</p>
                  <p className="font-semibold">{result.manufacturer}</p>
                </div>
                <div>
                  <p className="text-gray-500">Mẫu xe</p>
                  <p className="font-semibold">{result.model}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="text-gray-500">Năm sản xuất</p>
                  <p className="font-semibold">{result.modelYear}</p>
                </div>
                <div>
                  <p className="text-gray-500">Màu sắc</p>
                  <p className="font-semibold">{result.color}</p>
                </div>
              </div>
              <p className="text-gray-500">
                <i className="fa-regular fa-clock"></i>
                <span> Số km đã đi: </span>
                <span className="text-xl text-black font-semibold">
                  {result.kilometer.toLocaleString()} km
                </span>
              </p>
              <p className="text-gray-500">
                <i className="fa-solid fa-shield-halved"></i>
                <span> Trạng thái bảo hành: </span>
                <span className="px-2 py-1 bg-green-600 text-white rounded-full text-sm font-semibold">
                  {warrantyStatus(result.warranty_end)}
                </span>
              </p>
              <p className="text-gray-500">
                <i className="fa-solid fa-table"></i>
                <span> Hết hạn bảo hành: </span>
                <span className="text-black font-semibold">
                  {new Date(result.warranty_end).toLocaleDateString("vi-VN")}
                </span>
              </p>
            </div>

            {/* Khối thông tin khách hàng */}
            <div className="w-1/2 space-y-3 border border-gray-300 p-4 rounded-lg">
              <Title title="Thông tin khách hàng" />
              <div>
                <p className="text-gray-500">Họ tên</p>
                <p className="text-xl font-semibold">{result.customer_name}</p>
              </div>
              <p className="text-gray-500">
                <i className="fa-solid fa-phone"></i>
                <span> Số điện thoại: </span>
                <span className=" text-black font-semibold">
                  {result.customer_phone}
                </span>
              </p>
              <p className="text-gray-500">
                <i className="fa-solid fa-location-dot"></i>
                <span> Địa chỉ: </span>
                <span className=" text-black font-semibold">
                  {result.customer_address}
                </span>
              </p>
              <p className="text-gray-500">
                <i className="fa-solid fa-envelope"></i>
                <span> Email: </span>
                <span className="text-black font-semibold">
                  {result.customer_email}
                </span>
              </p>
            </div>
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
            <label className="block text-gray-700 font-medium mb-2">
              Phụ tùng cần thay <span className="text-red-500">*</span>
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Chọn một hoặc nhiều phụ tùng cần thay thế (đã chọn:{" "}
              {selectedParts.length})
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {result.parts && result.parts.length > 0 ? (
                result.parts.map((p, index) => {
                  const isSelected = selectedParts.some(
                    (sp) => sp.part_serial === (p.serial_number || p.serial)
                  );
                  return (
                    <label
                      key={index}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-green-50 border-green-500"
                          : "bg-white border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handlePartToggle(p)}
                        className="w-5 h-5 text-green-600 focus:ring-green-500 border-gray-300 rounded cursor-pointer"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">
                          {p.part_name || p.name || "Phụ tùng"}
                        </p>
                        <p className="text-sm text-gray-500">
                          Serial: {p.serial_number || p.serial || "N/A"}
                        </p>
                      </div>
                      {isSelected && (
                        <i className="fa-solid fa-check-circle text-green-600"></i>
                      )}
                    </label>
                  );
                })
              ) : (
                <p className="text-gray-500 text-center py-4">
                  Không có phụ tùng nào trong danh sách
                </p>
              )}
            </div>
          </div>
        </div>

        {/* --- Hình ảnh minh chứng --- */}
        <div className="border border-gray-300 rounded-lg p-5 space-y-3">
          <h3 className="text-xl font-semibold text-gray-800">
            Hình ảnh minh chứng
          </h3>
          <p className="text-gray-500">
            Tải lên ảnh chụp lỗi hoặc hư hỏng (Tối đa 10 ảnh, mỗi ảnh &lt; 5MB)
          </p>

          <label
            className={`flex items-center gap-2 cursor-pointer w-fit bg-gray-100 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 ${
              imageFiles.length >= 10 ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <i className="fa-solid fa-camera text-gray-600"></i>
            <span className="font-medium text-gray-700">Chọn ảnh</span>
            <input
              type="file"
              multiple
              className="hidden"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleImageChange}
              disabled={imageFiles.length >= 10}
            />
          </label>

          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {imagePreviews.map((item, index) => (
                <div
                  key={index}
                  className="relative group border border-gray-300 rounded-lg overflow-hidden"
                >
                  <img
                    src={item.preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-40 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    title="Xóa ảnh"
                  >
                    <i className="fa-solid fa-times text-xs"></i>
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1">
                    {item.file.name.length > 20
                      ? item.file.name.substring(0, 20) + "..."
                      : item.file.name}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-gray-500">
            {imagePreviews.length > 0
              ? `${imagePreviews.length}/10 ảnh đã chọn`
              : "0/10 ảnh đã chọn"}
          </p>
        </div>

        {/* --- Error Message --- */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* --- Nút hành động --- */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/sc_staff/search-vin")}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100"
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isCreatingClaim}
            className={`bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700  ${
              isSubmitting || isCreatingClaim
                ? "opacity-50 cursor-not-allowed bg-green-200"
                : "cursor-pointer"
            } flex items-center gap-2`}
          >
            {" "}
            <i className="fa-solid fa-check"></i>
            {isSubmitting || isCreatingClaim ? (
              <>
               <span >Đang xử lý...</span>
              </>
            ) : (
              <>
                <span>Tạo Claim</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateClaim;
