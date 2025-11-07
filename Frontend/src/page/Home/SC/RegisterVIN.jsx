import React, { useState } from "react";
import Title from "../../../components/Title";
import Backdrop from "../../../components/Backdrop";
import Modal from "../../../components/Modal";
import Loading from "../../../components/Loading";
import { useDispatch, useSelector } from "react-redux";
import { closeModal, openModal } from "../../../features/ui/uiSlice";
import {
  useGetAllCustomersQuery,
  useGetAllVehiclesQuery,
  useGetAllVinsQuery,
  useUpdateVehicleMutation,
} from "../../../features/vehicle/vehicle.api";
import { useCreateVehicleMutation } from "../../../features/vehicle/vehicle.api";
import { toast } from "react-toastify";
import {
  useAddPartToVehicleMutation,
  useDeletePartMutation,
  useGetAllPartCatalogsQuery,
  useGetPartsByVehicleQuery,
} from "../../../features/part/part.api";
import { formatDate } from "date-fns";
import { formatPrice } from "../../../utils/formatPrice";

const RegisterVIN = () => {
  const dispatch = useDispatch();
  const { isOpen, modalType, modalData } = useSelector(
    (state) => state.ui.modal
  );
  const [vinInput, setVinInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [partType, setPartType] = useState("");

  const [addVehicle, setAddVehicle] = useState({
    vin_id: "",
    customer_id: "",
    registration_number: "",
    model: "",
    color: "",
    kilometer: "",
  });

  const { data: vehicles = [], isLoading, refetch } = useGetAllVehiclesQuery();
  const { data: vins = [] } = useGetAllVinsQuery();
  const { data: customers = [] } = useGetAllCustomersQuery();
  const { data: partCatalogs = [] } = useGetAllPartCatalogsQuery();
  const { data: partVehicles = [] } = useGetPartsByVehicleQuery(
    selectedVehicle?._id,
    {
      skip: !selectedVehicle?._id,
    }
  );

  const [addVehicleMutation, { isLoading: isLoadingAddVehicle }] =
    useCreateVehicleMutation();
  const [addPartMutation, { isLoading: isLoadingAddPart }] =
    useAddPartToVehicleMutation();
  const [deletePartMutation, { isLoading: isLoadingDeletePart }] =
    useDeletePartMutation();

  const handleAddVehicle = async () => {
    try {
      await addVehicleMutation(addVehicle).unwrap();
      toast.success("Đăng ký xe thành công!");
      dispatch(closeModal());
    } catch (error) {
      toast.error(
        "Lỗi đăng ký xe: " +
          (error?.data?.message || "Vui lòng kiểm tra lại thông tin.")
      );
    }
  };

  const handleAddPart = async () => {
    await addPartMutation({
      vehicle_id: selectedVehicle._id,
      part_catalog_id: partType,
    })
      .unwrap()
      .then(() => {
        toast.success("Thêm phụ tùng thành công!");
        refetch();
      })
      .catch((error) => {
        toast.error(
          "Lỗi thêm phụ tùng: " +
            (error?.data?.message || "Vui lòng kiểm tra lại thông tin.")
        );
      });
  };
  const warrantyStatus = (warranty_end) => {
    const now = new Date();
    const endDate = new Date(warranty_end);
    return endDate >= now ? "Còn hiệu lực" : "Hết hạn";
  };

  function handleClose() {
    setIsOpen({ register: false, manageParts: false });
  }

  const handleVinChange = (e) => {
    const value = e.target.value;
    setVinInput(value);

    if (value.trim() === "") {
      setSuggestions([]);
      return;
    }

    // Lọc VIN bắt đầu bằng chuỗi nhập
    const filtered = vins.filter((v) =>
      v.vin.toLowerCase().includes(value.toLowerCase())
    );

    setSuggestions(filtered.slice(0, 5)); // giới hạn 5 kết quả
  };

  const handleDeletePart = async (partId) => {
    if (window.confirm("Bạn có chắc muốn xóa phụ tùng này?")) {
      try {
        await deletePartMutation(partId).unwrap();
        toast.success("Xóa phụ tùng thành công!");
      } catch (error) {
        toast.error(
          "Lỗi xóa phụ tùng: " +
            (error?.data?.message || "Vui lòng kiểm tra lại thông tin.")
        );
      }
    }
  };

  return (
    <div className="h-full w-full space-y-3 p-4">
      {/* Tiêu đề trang */}
      <div className="flex justify-between items-center mb-3">
        <Title
          tittle="Đăng ký VIN - Trung tâm dịch vụ"
          subTittle="Quản lý đăng ký VIN cho khách hàng"
        />
        <button
          className="flex items-center gap-3 font-semibold px-4 py-2 bg-green-600 text-white cursor-pointer hover:opacity-50 rounded-lg"
          onClick={() =>
            dispatch(openModal({ modalType: "viewRegister", modalData: null }))
          }
        >
          <i class="fa-solid fa-plus"></i> <span>Đăng ký xe mới</span>
        </button>
      </div>
      {/* Danh sách xe */}
      <div className="bg-white shadow rounded-lg p-4 border border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-semibold">Danh sách xe đã đăng ký</h3>
          <p className="text-sm text-gray-500">Tổng số: {vehicles.length} xe</p>
        </div>

        {/* Header bảng */}
        <div className="grid grid-cols-7 gap-4 text-sm font-semibold text-gray-600 border-b border-gray-300 pb-2">
          <div>VIN</div>
          <div>Xe</div>
          <div>Khách hàng</div>
          <div>Số km</div>
          <div>Bảo hành</div>
          <div>Phụ tùng</div>
          <div>Thao tác</div>
        </div>

        {/* Dữ liệu bảng */}
        <div className="divide-y divide-gray-200">
          {isLoading ? (
            <Loading />
          ) : (
            vehicles.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-7 gap-4 py-3 items-center text-sm text-gray-700 hover:bg-gray-50"
              >
                {/* VIN */}
                <div className="font-mono text-xs text-gray-500 truncate">
                  {item.vin}
                </div>

                {/* Xe */}
                <div className="font-medium">{item.model}</div>

                {/* Khách hàng */}
                <div>{item.customer_name}</div>

                {/* Số km */}
                <div>{item.kilometer}</div>

                {/* Bảo hành */}
                <div>
                  <span className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded-full text-nowrap">
                    {warrantyStatus(item.warranty_end)}
                  </span>
                </div>

                {/* Phụ tùng */}
                <div>
                  <span className="px-3 py-1 text-xs font-medium bg-gray-100 rounded-full border border-gray-300">
                    {item.parts.length} phụ tùng
                  </span>
                </div>

                {/* Thao tác */}
                <div
                  className="flex items-center gap-2 text-green-700 font-medium cursor-pointer hover:text-green-600"
                  onClick={() => {
                    setSelectedVehicle(item);
                    dispatch(
                      openModal({ modalType: "manageParts", modalData: item })
                    );
                  }}
                >
                  <i className="fa-solid fa-gear"></i>
                  <span>Quản lý phụ tùng</span>
                </div>
              </div>
            ))
          )}
        </div>
        <Backdrop
          isOpen={
            isOpen ||
            modalType === "viewRegister" ||
            modalType === "manageParts"
          }
          onClose={() => dispatch(closeModal())}
        />

        {isOpen && modalType === "viewRegister" && (
          <Modal isOpen={isOpen}>
            <Title
              title={"Đăng ký xe mới"}
              subTitle={"Nhập thông tin xe để đăng ký vào hệ thống"}
            />
            <div className="w-[600px] space-y-4 ">
              <div className=" flex items-center gap-5">
                <div className="relative w-full">
                  <label htmlFor="" className="font-semibold text-gray-600">
                    Số VIN *
                  </label>
                  <input
                    type="text"
                    value={vinInput}
                    onChange={handleVinChange}
                    placeholder="VD: 1G1YZ2269G5123789"
                    className="w-full outline-none px-4 py-2 border bg-white border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                  />

                  {/* Dropdown gợi ý */}
                  {suggestions.length > 0 && (
                    <ul className="absolute z-10 bg-white border border-gray-300 rounded-xl mt-1 w-full max-h-48 overflow-y-auto shadow-md">
                      {suggestions.map((vinObj, index) => (
                        <li
                          key={index}
                          onClick={() => {
                            setVinInput(vinObj.vin);
                            setSuggestions([]);
                            setAddVehicle({
                              ...addVehicle,
                              vin_id: vinObj._id,
                            });
                          }}
                          className="px-4 py-2 text-sm cursor-pointer hover:bg-green-100"
                        >
                          <span className="font-mono">{vinObj.vin}</span>{" "}
                          <span className="text-gray-500 text-xs ml-2">
                            {vinObj.brand || ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex flex-col gap-2 w-full">
                  <label htmlFor="" className="font-semibold text-gray-600">
                    Khách hàng *
                  </label>{" "}
                  <select
                    value={addVehicle.customer_id || ""}
                    onChange={(e) =>
                      setAddVehicle({
                        ...addVehicle,
                        customer_id: e.target.value, // e.target.value = cust._id
                      })
                    }
                    className="w-full outline-none px-4 py-2 border border-gray-300 rounded-xl bg-white text-gray-700 cursor-pointer focus:ring-2 focus:ring-green-500"
                  >
                    <option value="" disabled>
                      Chọn khách hàng
                    </option>

                    {customers.map((cust) => (
                      <option key={cust._id} value={cust._id}>
                        {cust.full_name} - {cust.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className=" flex items-center gap-5">
                <div className="flex flex-col gap-2 w-full">
                  <label htmlFor="" className="font-semibold text-gray-600">
                    Mẫu xe
                  </label>
                  <input
                    value={addVehicle.model}
                    onChange={(e) =>
                      setAddVehicle({ ...addVehicle, model: e.target.value })
                    }
                    type="text"
                    placeholder="VF8, VF9, Atto 3..."
                    className="w-full outline-none px-4 py-2 border bg-white border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <label htmlFor="" className="font-semibold text-gray-600">
                    Màu sắc
                  </label>
                  <select
                    value={addVehicle.color}
                    onChange={(e) =>
                      setAddVehicle({ ...addVehicle, color: e.target.value })
                    }
                    className="w-full outline-none px-4 py-2 border border-gray-300 rounded-xl bg-white text-gray-700 cursor-pointer focus:ring-2 focus:ring-green-500"
                  >
                    <option className="text-gray-700">Trắng</option>
                    <option className="text-gray-700">Đen</option>
                    <option className="text-gray-700">Đỏ</option>
                    <option className="text-gray-700">Xanh</option>
                    <option className="text-gray-700">Vàng</option>
                  </select>
                </div>
              </div>
              <div className=" flex items-center gap-5">
                <div className="flex flex-col gap-2 w-full">
                  <label htmlFor="" className="font-semibold text-gray-600">
                    Biển số xe *
                  </label>
                  <input
                    type="text"
                    value={addVehicle.registration_number}
                    onChange={(e) =>
                      setAddVehicle({
                        ...addVehicle,
                        registration_number: e.target.value,
                      })
                    }
                    placeholder="30A-123.45..."
                    className="w-full outline-none px-4 py-2 border bg-white border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <label htmlFor="" className="font-semibold text-gray-600">
                    Số km
                  </label>
                  <input
                    value={addVehicle.kilometer}
                    onChange={(e) =>
                      setAddVehicle({
                        ...addVehicle,
                        kilometer: e.target.value,
                      })
                    }
                    type="text"
                    placeholder="0"
                    className="w-full outline-none px-4 py-2 border bg-white border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="flex justify-end items-center gap-5 mt-4">
                <button
                  className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:opacity-50 cursor-pointer"
                  onClick={() => dispatch(closeModal())}
                >
                  Hủy
                </button>
                <button
                  className="px-4 py-2 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-500 cursor-pointer"
                  onClick={handleAddVehicle}
                >
                  Đăng ký
                </button>
              </div>
            </div>
          </Modal>
        )}
        {isOpen && modalType === "manageParts" && (
          <Modal isOpen={isOpen}>
            <div className="w-[800px]">
              <Title
                title="Quản lý phụ tùng - 5YJ3E1EA4KF123456"
                subTitle="VinFast VF8 (2023)"
              />
              <div className="flex items-center gap-5">
                <div className="flex flex-col gap-2 w-full">
                  <label htmlFor="" className="font-semibold text-gray-600">
                    Loại phụ tùng
                  </label>
                  <select
                    onChange={(e) => setPartType(e.target.value)}
                    className="w-full outline-none px-4 py-2 border border-gray-300 rounded-xl bg-white text-gray-700 cursor-pointer focus:ring-2 focus:ring-green-500"
                  >
                    <option defaultValue={""} disabled selected>
                      Chọn phụ tùng
                    </option>
                    {partCatalogs.map((part) => (
                      <option key={part._id} value={part._id}>
                        {part.name} ({part.model_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={handleAddPart}
                className="w-full px-4 py-2 my-4 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-500 cursor-pointer"
              >
                Thêm phụ tùng
              </button>
              <div className="grid grid-cols-6 gap-4 border-b border-gray-300 p-2">
                <div className="font-semibold text-gray-600">Phân loại</div>
                <div className="font-semibold text-gray-600">Tên phụ tùng</div>
                <div className="font-semibold text-gray-600">Số seri</div>
                <div className="font-semibold text-gray-600 ">Ngày lắp</div>
                <div className="font-semibold text-gray-600 ">Chi phí</div>
                <div className="font-semibold text-gray-600 text-center">
                  Thao tác
                </div>
              </div>
              {partVehicles.map((part, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-6 gap-4 border-b border-gray-300 p-2 "
                >
                  <div className="text-gray-600 uppercase">
                    {part.part_category}
                  </div>
                  <div className="text-gray-600">{part.part_name}</div>
                  <div className="text-gray-600">{part.serial_number}</div>
                  <div className="text-gray-600">
                    {new Date(part.install_date).toLocaleDateString()}
                  </div>
                  <div className="text-gray-600">
                    {formatPrice(part.part_cost_price)}
                  </div>
                  <div className="text-gray-600 text-center">
                    <button
                      onClick={() => handleDeletePart(part._id)}
                      className="text-gray-400 hover:text-red-500 cursor-pointer"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex justify-end items-center gap-5 mt-4">
                <button
                  className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:opacity-50 cursor-pointer"
                  onClick={() => dispatch(closeModal())}
                >
                  Hủy
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default RegisterVIN;
