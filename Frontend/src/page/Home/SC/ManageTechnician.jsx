import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Loading from "../../../components/Loading.jsx";

// TODO: import đúng hook query lấy danh sách user của bạn
// Ví dụ: useGetAllUsersQuery hoặc useGetAllTechniciansQuery
import {
  useGetAllUsersQuery,
  useRegisterUserMutation,
  useUpdateTechnicianMutation,
  useUpdateUserMutation,
  useDeleteTechnicianMutation,
  useGetAllTechniciansQuery,
} from "../../../features/user/user.api.js";

export default function TechnicianManagement() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const [addData, setAddData] = useState({
    email: "",
    password: "",
    role: "sc_technician",
  });

  const [editData, setEditData] = useState({
    technician_id: "",
    user_id: "",
    name: "",
    email: "",
    phone: "",
    status: "active",
  });

  const [filtered, setFiltered] = useState([]);

  // Map trạng thái giống ServiceCenterManagement
  const statusMap = {
    active: { color: "bg-green-500", text: "Hoạt động" },
    inactive: { color: "bg-gray-500", text: "Chưa kích hoạt" },
  };

  // Lấy danh sách user, rồi filter ra technician
  const {
    data: technicians,
    isLoading: isTechnicianLoading,
    refetch,
  } = useGetAllTechniciansQuery();

  // Các mutation
  const [registerUser, { isLoading: isRegistering }] =
    useRegisterUserMutation(); // tạo technician (email + pass + role)
  const [updateTechnician, { isLoading: isTechnicianUpdating }] =
    useUpdateTechnicianMutation(); // update name, phone, status
  const [updateUser, { isLoading: isUserUpdating }] = useUpdateUserMutation(); // update email
  const [deleteTechnician, { isLoading: isTechnicianDeleting }] =
    useDeleteTechnicianMutation(); // xóa technician

  // Thêm technician
  async function handleAddTechnician() {
    try {
      const res = await registerUser(addData).unwrap();
      if (res.success) {
        toast.success("Đăng ký kỹ thuật viên thành công");
        setAddData({ email: "", password: "", role: "sc_technician" });
        setIsAddOpen(false);
        await refetch();
      } else {
        toast.error(res.message || "Đăng ký kỹ thuật viên thất bại");
      }
    } catch (error) {
      toast.error(error?.data?.message || "Lỗi hệ thống khi đăng ký");
    }
  }

  // Change dữ liệu edit
  function handleChangeEditData(e) {
    const { name, value } = e.target;
    setEditData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  // Cập nhật technician
  async function handleEditTechnician() {
    try {
      // 1. Update email bên bảng User
      const resUser = await updateUser({
        id: editData.user_id,
        data: {
          email: editData.email,
          status: editData.status,
        },
      }).unwrap();

      // 2. Update profile technician (name, phone, status)
      
      const resTech = await updateTechnician({
        id: editData.technician_id, // ID technician profile
        data: {
          name: editData.name,
          phone: editData.phone,
          status: editData.status,
        },
      }).unwrap();

      if (resUser.success || resTech.success) {
        toast.success("Cập nhật kỹ thuật viên thành công");
        setEditData({
          technician_id: "",
          user_id: "",
          name: "",
          email: "",
          phone: "",
          status: "active",
        });
        setIsEditOpen(false);
      } else {
        toast.error(
          resUser.message ||
            resTech.message ||
            "Cập nhật kỹ thuật viên thất bại"
        );
      }
    } catch (error) {
      toast.error(error?.data?.message || "Lỗi hệ thống khi cập nhật");
    }
  }

  // Xóa technician
  async function handleDeleteTechnician(id) {
    try {
      const confirmDelete = window.confirm(
        "Bạn có chắc chắn muốn xóa kỹ thuật viên này?"
      );
      if (!confirmDelete) return;

      const res = await deleteTechnician(id).unwrap();
      if (res.success) {
        toast.success("Đã xóa kỹ thuật viên thành công!");
      } else {
        toast.error(res.message || "Xóa kỹ thuật viên thất bại!");
      }
    } catch (error) {
      console.error("Lỗi khi xóa kỹ thuật viên:", error);
      toast.error(
        error?.data?.message || "Lỗi hệ thống khi xóa kỹ thuật viên!"
      );
    }
  }

  // Filter theo searchTerm
  
  useEffect(() => {
    if (technicians) {
      const result = technicians.filter((t) => {
        return (
          (t?.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
          (t?.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
          (t?.phone?.toLowerCase() || "").includes(searchTerm.toLowerCase())
        );
      });

      setFiltered(result);
    }
  }, [technicians, searchTerm]);

  if (isTechnicianLoading) {
    return (
      <div className="p-6 mx-auto">
        <Loading />
      </div>
    );
  }  
  return (
    <div className="flex-1">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Quản lý Kỹ thuật viên
          </h1>
          <p className="text-gray-500 text-sm">
            Quản lý danh sách kỹ thuật viên tại các trung tâm dịch vụ
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className={`bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium ${
            isRegistering ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          + Thêm Kỹ thuật viên
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Tìm theo tên, email hoặc số điện thoại..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-3 pr-3 py-2 w-full border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white shadow-md rounded-md border border-gray-200">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="py-3 px-4">Tên Kỹ thuật viên</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Điện thoại</th>
              <th className="py-3 px-4 text-center">Trạng thái</th>
              <th className="py-3 px-4 text-center">Số Claim xử lý</th>
              <th className="py-3 px-4 text-center">Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((t, i) => (
              <tr key={i} className="border-t border-gray-300 hover:bg-gray-50">
                {t.name ? (
                  <td className="py-2 px-4 font-medium">{t.name}</td>
                ) : (
                  <td className="py-2 px-4 font-medium text-gray-400">
                    Chưa cập nhật
                  </td>
                )}
                <td className="py-2 px-4">{t.email}</td>
                <td className="py-2 px-4">{t.phone || "Chưa có"}</td>
                <td className="py-2 px-4">
                  <p
                    className={`min-w-[50px] text-center text-nowrap px-2 py-1 text-xs rounded-full text-white ${
                      statusMap[t.status]?.color || "bg-gray-400"
                    }`}
                  >
                    {statusMap[t.status]?.text || "Không xác định"}
                  </p>
                </td>
                <td className="py-2 px-4 text-center">{t.totalClaims || 0}</td>
                <td className="py-2 px-4 text-center">
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => {
                        // map dữ liệu technician vào editData
                        setEditData({
                          technician_id:  t.technician_id || t._id, // tuỳ backend
                          user_id: t.user_id, // id user liên kết
                          name: t.name || "",
                          email: t.email || "",
                          phone: t.phone || "",
                          status: t.status || "active",
                        });
                        setIsEditOpen(true);
                      }}
                      className="text-blue-600 hover:underline text-sm cursor-pointer"
                    >
                      <i className="fa-regular fa-pen-to-square mr-1"></i>
                    </button>
                    <button
                      onClick={() =>
                        handleDeleteTechnician(t.user_id)
                      }
                      className="text-red-600 hover:underline text-sm cursor-pointer"
                    >
                      <i className="fa-regular fa-trash-can mr-1"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="py-4 px-4 text-center text-gray-500 italic"
                >
                  Không tìm thấy kỹ thuật viên nào phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Thêm Technician */}
      {isAddOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-md shadow-lg w-96 p-6 relative">
            <button
              onClick={() => setIsAddOpen(false)}
              className="absolute top-2 right-3 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              ✕
            </button>
            <h2 className="text-lg font-semibold mb-4">
              Thêm Kỹ thuật viên mới
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1 text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={addData.email}
                  onChange={(e) =>
                    setAddData({ ...addData, email: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-gray-700">
                  Mật khẩu
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={addData.password}
                  onChange={(e) =>
                    setAddData({ ...addData, password: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>
              <button
                onClick={handleAddTechnician}
                className={`w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md text-sm mt-2 ${
                  isRegistering
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
              >
                Thêm Kỹ thuật viên
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chỉnh sửa Technician */}
      {isEditOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-md shadow-lg w-[600px] p-6 relative">
            <button
              onClick={() => setIsEditOpen(false)}
              className="absolute top-2 right-3 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              ✕
            </button>
            <h2 className="text-lg font-semibold mb-4">
              Chỉnh sửa Kỹ thuật viên
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-sm mb-1 text-gray-700">
                  Tên kỹ thuật viên
                </label>
                <input
                  type="text"
                  name="name"
                  value={editData.name}
                  onChange={handleChangeEditData}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm mb-1 text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={editData.email}
                  onChange={handleChangeEditData}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm mb-1 text-gray-700">
                  Điện thoại
                </label>
                <input
                  type="text"
                  name="phone"
                  value={editData.phone}
                  onChange={handleChangeEditData}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm mb-1 text-gray-700">
                  Trạng thái
                </label>
                <select
                  name="status"
                  value={editData.status}
                  onChange={handleChangeEditData}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                >
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Chưa kích hoạt</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleEditTechnician}
              className={`w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md text-sm ${
                isTechnicianUpdating || isUserUpdating
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
              }`}
            >
              Cập nhật
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
