import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Title from "../../../components/Title";
import { closeModal, openModal } from "../../../features/ui/uiSlice";
import Backdrop from "../../../components/Backdrop";
import Modal from "../../../components/Modal";

const fakeCustomers = [
  {
    id: "cust001",
    name: "Nguyễn Văn An",
    phone: "0987654321",
    email: "nguyenvanan@email.com",
    address: "123 Lê Lợi, Quận 1, TP.HCM",
    registerDate: "01/03/2023",
    vehicles: [{ model: "VinFast VF8", vin: "5YJ3E1EA4KF123456" }],
  },
  {
    id: "cust002",
    name: "Trần Thị Bình",
    phone: "0976543210",
    email: "tranthibinh@email.com",
    address: "456 Nguyễn Huệ, Quận 1, TP.HCM",
    registerDate: "15/05/2023",
    vehicles: [{ model: "VinFast VF9", vin: "5YJ3E1EA4KF654321" }],
  },
  {
    id: "cust003",
    name: "Lê Minh Cường",
    phone: "0965432109",
    email: "leminhcuong@email.com",
    address: "789 Trần Hưng Đạo, Quận 5, TP.HCM",
    registerDate: "01/12/2022",
    vehicles: [{ model: "BYD Atto 3", vin: "5YJ3E1EA4KF998877" }],
  },
];

const ManageCustomer = () => {
  const dispatch = useDispatch();
  const [customers] = useState(fakeCustomers);

  const { isOpen, modalType, modalData } = useSelector(
    (state) => state.ui.modal
  );

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.name || !form.phone || !form.email) {
      alert("Vui lòng nhập đầy đủ thông tin bắt buộc!");
      return;
    }

    console.log("Thêm khách hàng mới:", form);
    alert("Khách hàng mới đã được thêm thành công!");
    dispatch(closeModal());
  };

  return (
    <div className="h-full w-full space-y-6 p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <Title
          title="Quản lý khách hàng"
          subTitle="Danh sách khách hàng và thông tin liên hệ"
        />
        <button
          className="flex items-center gap-2 font-semibold px-4 py-2 bg-green-600 text-white cursor-pointer hover:opacity-80 rounded-lg"
          onClick={() =>
            dispatch(openModal({ modalType: "addCustomer", modalData: null }))
          }
        >
          <i className="fa-solid fa-plus"></i>
          <span>Thêm khách hàng</span>
        </button>
      </div>

      {/* Customer List */}
      <div className="border border-gray-300 p-4 rounded-lg space-y-3 bg-white">
        <h3 className="font-semibold text-lg text-gray-800">
          Danh sách khách hàng ({customers.length})
        </h3>
        <p className="text-gray-500">Tổng số: {customers.length} khách hàng</p>

        <table className="w-full  mt-3">
          <thead>
            <tr className="bg-gray-100 text-gray-700 text-left text-sm">
              <th className="py-2 px-3 rounded-tl-lg">Khách hàng</th>
              <th className="py-2 px-3">Liên hệ</th>
              <th className="py-2 px-3">Địa chỉ</th>
              <th className="py-2 px-3">Ngày đăng ký</th>
              <th className="py-2 px-3 text-center">Số xe</th>
              <th className="py-2 px-3 rounded-tr-lg text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((cust, index) => (
              <tr
                key={cust.id}
                className={`${
                  index !== customers.length - 1 && "border-b"
                } border-gray-300 hover:bg-gray-50 transition text-sm`}
              >
                {/* Cột khách hàng */}
                <td className="py-5 px-3">
                  <div className="flex items-center gap-3">
                    <i className="fa-regular fa-user text-gray-500"></i>
                    <div>
                      <p className=" font-semibold text-gray-900 flex items-center gap-2">
                        {cust.name}
                      </p>
                      <p className="text-gray-500 text-sm">ID: {cust.id}</p>
                    </div>
                  </div>
                </td>

                {/* Cột liên hệ */}
                <td className="py-3 px-3">
                  <div className="text-gray-700">
                    <p className="font-semibold text-black">{cust.phone}</p>
                    <p>{cust.email}</p>
                  </div>
                </td>

                {/* Cột địa chỉ */}
                <td className="py-3 px-3 text-gray-700 text-sm">
                  <i className="fa-solid fa-location-dot text-green-500 mr-1"></i>
                  {cust.address}
                </td>

                {/* Cột ngày đăng ký */}
                <td className="py-3 px-3 text-gray-700 text-sm">
                  <i className="fa-regular fa-calendar text-green-500 mr-1"></i>
                  {cust.registerDate}
                </td>

                {/* Cột số xe */}
                <td className=" py-3 px-5 space-y-2 text-center">
                  <p className="inline-block px-4 py-1 border border-gray-300 rounded-full text-xs font-semibold">
                    {cust.vehicles.length} xe
                  </p>
                  <p className="text-gray-600 text-sm">
                    {cust.vehicles[0].model}
                  </p>
                </td>

                <td className="py-3 px-3 text-gray-700 text-center">
                  <button
                    onClick={() =>
                      dispatch(
                        openModal({
                          modalType: "editCustomer",
                          modalData: cust,
                        })
                      )
                    }
                    className="text-xl hover:text-blue-600 font-semibold cursor-pointer"
                  >
                    <i class="fa-solid fa-pen-to-square"></i>
                  </button>{" "}
                  <button className="text-xl hover:text-red-600 font-semibold cursor-pointer">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {customers.length === 0 && (
          <p className="text-center text-gray-500 italic py-3">
            Chưa có khách hàng nào.
          </p>
        )}
      </div>

      <Backdrop
        isOpen={
          (isOpen && modalType === "addCustomer") ||
          (isOpen && modalType === "editCustomer")
        }
        onClose={() => dispatch(closeModal())}
      />

      {/* Modal Thêm khách hàng */}
      {isOpen && modalType === "addCustomer" && (
        <Modal isOpen={true}>
          <div className="w-[500px] bg-white rounded-lg p-3 shadow-md space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center  ">
              <Title
                title="Thêm khách hàng mới"
                subTitle="Nhập thông tin khách hàng"
              />
              <button
                className="w-8 h-8 flex justify-center items-center text-xl border text-green-500 hover:text-red-500 border-green-500 hover:border-red-500 p-2 rounded-full bg-green-100 hover:bg-red-100 cursor-pointer"
                onClick={() => dispatch(closeModal())}
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Họ tên */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Họ tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Nguyễn Văn A"
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              {/* Số điện thoại */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="0987654321"
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="email@example.com"
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              {/* Địa chỉ */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Địa chỉ
                </label>
                <input
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="123 Đường ABC, Quận 1, TP.HCM"
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-3 mt-4">
                <button
                  type="button"
                  onClick={() => dispatch(closeModal())}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-200 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer"
                >
                  Thêm
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {isOpen && modalType === "editCustomer" && (
        <Modal isOpen={true}>
          <div className="w-[500px] bg-white rounded-lg p-3 shadow-md space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
              <Title
                title={`Khách hàng #${modalData?.id}`}
                subTitle="Cập nhật thông tin khách hàng"
              />
              <button
                className="w-8 h-8 flex justify-center items-center text-xl border text-green-500 hover:text-red-500 border-green-500 hover:border-red-500 p-2 rounded-full bg-green-100 hover:bg-red-100 cursor-pointer"
                onClick={() => dispatch(closeModal())}
              >
                ✕
              </button>
            </div>

            {/* Form chỉnh sửa */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                console.log("Cập nhật khách hàng:", modalData);
                alert("Cập nhật thông tin khách hàng thành công!");
                dispatch(closeModal());
              }}
              className="space-y-3"
            >
              {/* Họ tên */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Họ tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  defaultValue={modalData?.name}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              {/* Số điện thoại */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  defaultValue={modalData?.phone}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  defaultValue={modalData?.email}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              {/* Địa chỉ */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Địa chỉ
                </label>
                <input
                  type="text"
                  defaultValue={modalData?.address}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              {/* Xe đăng ký */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Xe đăng ký
                </label>
                {modalData?.vehicles?.map((v, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center border border-gray-200 rounded-lg p-2 mb-2"
                  >
                    <div>
                      <p className="font-semibold text-gray-800">{v.model}</p>
                      <p className="text-sm text-gray-500">VIN: {v.vin}</p>
                    </div>
                    <button
                      type="button"
                      className="text-gray-500 hover:text-red-700 text-sm cursor-pointer"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                ))}
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-3 mt-4">
                <button
                  type="button"
                  onClick={() => dispatch(closeModal())}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-200 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ManageCustomer;
