import React, { useState } from "react";
import Title from "../../../components/Title";
import Backdrop from "../../../components/Backdrop";
import Modal from "../../../components/Modal";

const vehicles = [
  {
    vin: "5YJ3E1EA4KF123456",
    car: "VinFast VF8 2023 • Pearl White",
    customer: "Nguyễn Văn An",
    km: "15.000 km",
    warranty: "Còn hiệu lực",
    parts: 2,
  },
  {
    vin: "5YJ3E1EA4KF654321",
    car: "VinFast VF9 2023 • Metallic Blue",
    customer: "Trần Thị Bình",
    km: "8.500 km",
    warranty: "Còn hiệu lực",
    parts: 2,
  },
  {
    vin: "1G1YZ2269G5123789",
    car: "BYD Atto 3 2023 • Surf Blue",
    customer: "Lê Minh Cường",
    km: "22.000 km",
    warranty: "Còn hiệu lực",
    parts: 1,
  },
];

const RegisterVIN = () => {
  const [isOpen, setIsOpen] = useState({
    register: false,
    manageParts: false,
  });
  console.log(isOpen);

  function handleClose() {
    setIsOpen({ register: false, manageParts: false });
  }
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
          onClick={() => setIsOpen({ ...isOpen, register: true })}
        >
          <span className="text-2xl">+</span> <span>Đăng ký xe mới</span>
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
          {vehicles.map((item, idx) => (
            <div
              key={idx}
              className="grid grid-cols-7 gap-4 py-3 items-center text-sm text-gray-700 hover:bg-gray-50"
            >
              {/* VIN */}
              <div className="font-mono text-xs text-gray-500 truncate">
                {item.vin}
              </div>

              {/* Xe */}
              <div className="font-medium">{item.car}</div>

              {/* Khách hàng */}
              <div>{item.customer}</div>

              {/* Số km */}
              <div>{item.km}</div>

              {/* Bảo hành */}
              <div>
                <span className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded-full text-nowrap">
                  {item.warranty}
                </span>
              </div>

              {/* Phụ tùng */}
              <div>
                <span className="px-3 py-1 text-xs font-medium bg-gray-100 rounded-full border border-gray-300">
                  {item.parts} phụ tùng
                </span>
              </div>

              {/* Thao tác */}
              <div
                className="flex items-center gap-2 text-green-700 font-medium cursor-pointer hover:text-green-600"
                onClick={() => setIsOpen({ manageParts: true })}
              >
                <i className="fa-solid fa-gear"></i>
                <span>Quản lý phụ tùng</span>
              </div>
            </div>
          ))}
        </div>
        <Backdrop
          isOpen={isOpen.register || isOpen.manageParts}
          onClose={handleClose}
        />

        {isOpen.register && (
          <Modal isOpen={isOpen.register}>
            <Title
              title={"Đăng ký xe mới"}
              subTitle={"Nhập thông tin xe để đăng ký vào hệ thống"}
            />
            <div className="w-[600px] space-y-4 ">
              <div className=" flex items-center gap-5">
                <div className="flex flex-col gap-2 w-full">
                  <label htmlFor="" className="font-semibold text-gray-600">
                    Số VIN *
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 1G1YZ2269G5123789"
                    className="w-full outline-none px-4 py-2 border bg-white border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <label htmlFor="" className="font-semibold text-gray-600">
                    Khách hàng *
                  </label>
                  <select className="w-full outline-none px-4 py-2 border border-gray-300 rounded-xl bg-white text-gray-700 cursor-pointer focus:ring-2 focus:ring-green-500">
                    <option className="text-gray-700">Nguyễn Văn An</option>
                    <option className="text-gray-700">Trần Thị Bình</option>
                    <option className="text-gray-700">Lê Minh Cường</option>
                  </select>
                </div>
              </div>
              <div className=" flex items-center gap-5">
                <div className="flex flex-col gap-2 w-full">
                  <label htmlFor="" className="font-semibold text-gray-600">
                    Hãng xe
                  </label>
                  <input
                    type="text"
                    placeholder="VinFast, BYD, Tesla..."
                    className="w-full outline-none px-4 py-2 border bg-white border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <label htmlFor="" className="font-semibold text-gray-600">
                    Màu sắc
                  </label>
                  <select className="w-full outline-none px-4 py-2 border border-gray-300 rounded-xl bg-white text-gray-700 cursor-pointer focus:ring-2 focus:ring-green-500">
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
                    Năm sản xuất
                  </label>
                  <input
                    type="text"
                    placeholder="2025"
                    className="w-full outline-none px-4 py-2 border bg-white border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <label htmlFor="" className="font-semibold text-gray-600">
                    Mẫu xe
                  </label>
                  <input
                    type="text"
                    placeholder="VF8, VF9, Atto 3..."
                    className="w-full outline-none px-4 py-2 border bg-white border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div className=" flex items-center gap-5">
                <div className="flex flex-col gap-2 w-full">
                  <label htmlFor="" className="font-semibold text-gray-600">
                    Số km
                  </label>
                  <input
                    type="text"
                    placeholder="0"
                    className="w-full outline-none px-4 py-2 border bg-white border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <label htmlFor="" className="font-semibold text-gray-600">
                    Hết hạng bảo hành
                  </label>
                  <input
                    type="date"
                    className="w-full outline-none px-4 py-2 border bg-white border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div className="flex justify-end items-center gap-5 mt-4">
                <button
                  className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:opacity-50 cursor-pointer"
                  onClick={() => setIsOpen({ ...isOpen, register: false })}
                >
                  Hủy
                </button>
                <button
                  className="px-4 py-2 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-500 cursor-pointer"
                  onClick={() => {}}
                >
                  Đăng ký
                </button>
              </div>
            </div>
          </Modal>
        )}
        {isOpen.manageParts && (
          <Modal isOpen={isOpen.manageParts}>
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
                  <select className="w-full outline-none px-4 py-2 border border-gray-300 rounded-xl bg-white text-gray-700 cursor-pointer focus:ring-2 focus:ring-green-500">
                    <option value={""} disabled selected>
                      Chọn phụ tùng
                    </option>
                    <option value={"BP-VF8-001"}>
                      Battery Pack Module (BP-VF8-001)
                    </option>
                  </select>
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <label htmlFor="" className="font-semibold text-gray-600">
                    Số seri
                  </label>
                  <input
                    type="text"
                    placeholder="VD: BP1234567890"
                    className="w-full outline-none px-4 py-2 border bg-white border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <button className="w-full px-4 py-2 my-4 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-500 cursor-pointer">
                Thêm phụ tùng
              </button>
              <div className="grid grid-cols-4 gap-4 border-b border-gray-300 p-2 ">
                <div className="font-semibold text-gray-600">Loại phụ tùng</div>
                <div className="font-semibold text-gray-600">Số seri</div>
                <div className="font-semibold text-gray-600 ">Ngày lắp</div>
                <div className="font-semibold text-gray-600 ">Lắp bởi</div>
              </div>
              <div className="grid grid-cols-4 gap-4 border-b border-gray-300 p-2 ">
                <div className="font-semibold text-gray-600">
                  Battery Pack Module
                </div>
                <div className="font-semibold text-gray-600">BP-001-2023-001</div>
                <div className="font-semibold text-gray-600 ">15/3/2023</div>
                <div className="font-semibold text-gray-600 ">Factory</div>
              </div>
              <div className="flex justify-end items-center gap-5 mt-4">
                <button
                  className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:opacity-50 cursor-pointer"
                  onClick={() => setIsOpen({ ...isOpen, manageParts: false })}
                >
                  Hủy
                </button>
                <button
                  className="px-4 py-2 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-500 cursor-pointer"
                  onClick={() => {}}
                >
                  Lưu
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
