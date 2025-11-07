import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Title from "../../../components/Title";
import Backdrop from "../../../components/Backdrop";
import Modal from "../../../components/Modal";
import Loading from "../../../components/Loading";
import { closeModal, openModal } from "../../../features/ui/uiSlice";
import {
  useGetAllCustomersQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
} from "../../../features/vehicle/vehicle.api";
import { toast } from "react-toastify";

const ManageCustomer = () => {
  const dispatch = useDispatch();
  const { isOpen, modalType, modalData } = useSelector(
    (state) => state.ui.modal
  );

  const { data: customers = [], isLoading } = useGetAllCustomersQuery();
  const [createCustomer] = useCreateCustomerMutation();
  const [updateCustomer] = useUpdateCustomerMutation();
  const [deleteCustomer] = useDeleteCustomerMutation();


 

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    address: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm({ full_name: "", phone: "", email: "", address: "" });
  };

  // ------------------ ADD CUSTOMER ------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.full_name || !form.phone || !form.email) {
      toast.error("Vui lòng nhập đầy đủ thông tin bắt buộc!");
      return;
    }

    try {
      await createCustomer(form).unwrap();
      toast.success("Thêm khách hàng thành công!");
      resetForm();
      dispatch(closeModal());
    } catch (error) {
      toast.error(error?.data?.message || "Lỗi khi thêm khách hàng");
    }
  };

  // ------------------ UPDATE CUSTOMER ------------------
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    try {
      await updateCustomer({
        id: modalData._id,
        data: form,
      }).unwrap();

      toast.success("Cập nhật khách hàng thành công!");
      resetForm();
      dispatch(closeModal());
    } catch (error) {
      toast.error(error?.data?.message || "Lỗi khi cập nhật khách hàng");
    }
  };

  // ------------------ DELETE CUSTOMER ------------------
  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc muốn xóa khách hàng này?")) {
      try {
        await deleteCustomer(id).unwrap();
        toast.success("Xóa khách hàng thành công!");
      } catch (error) {
        toast.error(error?.data?.message || "Lỗi khi xóa khách hàng");
      }
    }
  };

  // ------------------ JSX RETURN ------------------
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
          onClick={() => {
            resetForm();
            dispatch(openModal({ modalType: "addCustomer" }));
          }}
        >
          <i className="fa-solid fa-plus"></i>
          <span>Thêm khách hàng</span>
        </button>
      </div>

      {/* Customer List */}
      {isLoading ? (
        <Loading />
      ) : (
        <div className="border border-gray-300 p-4 rounded-lg space-y-3 bg-white">
          <h3 className="font-semibold text-lg text-gray-800">
            Danh sách khách hàng ({customers.length})
          </h3>

          <table className="w-full mt-3">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-left text-sm">
                <th className="py-2 px-3 rounded-tl-lg">Họ tên</th>
                <th className="py-2 px-3">Liên hệ</th>
                <th className="py-2 px-3">Địa chỉ</th>
                <th className="py-2 px-3 text-center">Số xe</th>
                <th className="py-2 px-3 rounded-tr-lg text-center">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody>
              {customers.map((cust, index) => (
                <tr
                  key={cust._id}
                  className={`${
                    index !== customers.length - 1 && "border-b"
                  } border-gray-300 hover:bg-gray-50 transition text-sm`}
                >
                  <td className="py-3 px-3 font-semibold text-gray-900">
                    {cust.full_name}
                  </td>
                  <td className="py-3 px-3">
                    <p className="text-black font-semibold">{cust.phone}</p>
                    <p className="text-gray-600">{cust.email}</p>
                  </td>
                  <td className="py-3 px-3 text-gray-700">{cust.address}</td>
                  <td className="py-3 px-3 text-center">
                    {cust.registered_vehicles?.length || 0}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => {
                        setForm({
                          full_name: cust.full_name,
                          phone: cust.phone,
                          email: cust.email,
                          address: cust.address,
                        });
                        dispatch(
                          openModal({
                            modalType: "editCustomer",
                            modalData: cust,
                          })
                        );
                      }}
                      className="text-xl hover:text-blue-600 cursor-pointer mx-2"
                    >
                      <i className="text-gray-400 fa-solid fa-pen-to-square"></i>
                    </button>
                    <button
                      onClick={() => handleDelete(cust._id)}
                      className="text-xl hover:text-red-600 cursor-pointer mx-2"
                    >
                      <i className="text-gray-400 fa-solid fa-trash"></i>
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
      )}

      {/* Backdrop */}
      <Backdrop
        isOpen={modalType === "addCustomer" || modalType === "editCustomer"}
        onClose={() => dispatch(closeModal())}
      />

      {/* ------------------ ADD CUSTOMER MODAL ------------------ */}
      {isOpen && modalType === "addCustomer" && (
        <Modal isOpen={true}>
          <div className="w-[500px] bg-white rounded-lg p-5 shadow-md space-y-4">
            <Title
              title="Thêm khách hàng"
              subTitle="Nhập thông tin khách hàng"
            />
            <form onSubmit={handleSubmit} className="space-y-3">
              <InputField
                label="Họ tên"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                required
              />
              <InputField
                label="Số điện thoại"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
              />
              <InputField
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
              />
              <InputField
                label="Địa chỉ"
                name="address"
                value={form.address}
                onChange={handleChange}
              />

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

      {/* ------------------ EDIT CUSTOMER MODAL ------------------ */}
      {isOpen && modalType === "editCustomer" && (
        <Modal isOpen={true}>
          <div className="w-[500px] bg-white rounded-lg p-5 shadow-md space-y-4">
            <Title
              title={`Chỉnh sửa: ${modalData?.full_name}`}
              subTitle="Cập nhật thông tin khách hàng"
            />
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <InputField
                label="Họ tên"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
              />
              <InputField
                label="Số điện thoại"
                name="phone"
                value={form.phone}
                onChange={handleChange}
              />
              <InputField
                label="Email"
                name="email"
                value={form.email}
                onChange={handleChange}
              />
              <InputField
                label="Địa chỉ"
                name="address"
                value={form.address}
                onChange={handleChange}
              />

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

/* ------------------ COMPONENT PHỤ NHỎ ------------------ */
const InputField = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  required,
}) => (
  <div>
    <label className="block text-gray-700 text-sm font-medium mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none"
    />
  </div>
);
