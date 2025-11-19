import React, { useEffect, useState } from "react";
import {
  useDeleteCenterMutation,
  useGetAllCentersQuery,
  useUpdateCenterMutation,
} from "../../../features/center/center.api.js";
import Loading from "../../../components/Loading.jsx";
import { toast } from "react-toastify";
import {
  useRegisterUserMutation,
  useUpdateUserMutation,
} from "../../../features/user/user.api.js";
import Title from "../../../components/Title.jsx";
export default function ServiceCenterManagement() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addData, setAddData] = useState({
    email: "",
    password: "",
    role: "sc_staff",
  });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editData, setEditData] = useState({
    user_id: "",
    center_id: "",
    name: "",
    email: "",
    address: "",
    phone: "",
    status: "",
  });
  const [filtered, setFiltered] = useState([]);

  //NOTETTTTT
  const statusMap = {
    active: { color: "bg-green-500", text: "Hoạt động" },
    inactive: { color: "bg-gray-500", text: "Chưa kích hoạt" },
    pending: { color: "bg-yellow-500", text: "Chờ xác nhận" },
    deleted: { color: "bg-red-500", text: "Đã vô hiệu hóa" },
  };

  const { data: centers, isLoading, refetch } = useGetAllCentersQuery();
  const [createCenter, { isLoading: isCreating }] = useRegisterUserMutation();
  const [updateCenter, { isLoading: isUpdating }] = useUpdateCenterMutation();
  const [updateUser, { isLoading: isUserUpdating }] = useUpdateUserMutation();
  const [deleteCenter, { isLoading: isDeleting }] = useDeleteCenterMutation();

  async function handleAddCenter() {
    const res = await createCenter(addData).unwrap();
    if (res.success) {
      setAddData({ email: "", password: "" });
      toast.success("Thêm trung tâm thành công");
      setIsAddOpen(false);
      refetch();
    } else {
      toast.error("Thêm trung tâm thất bại");
    }
  }

  async function handleChangeEditData(e) {
    const { name, value } = e.target;
    setEditData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleEditCenter() {
    try {
      // Cập nhật user email
      const res1 = await updateUser({
        id: editData.user_id,
        data: {
          email: editData.email,
          status: editData.status,
        },
      }).unwrap();

      // Cập nhật thông tin trung tâm
      const res2 = await updateCenter({
        id: editData._id, // ID của trung tâm
        data: {
          name: editData.name,
          address: editData.address,
          phone: editData.phone,
          status: editData.status,
        },
      }).unwrap();

      if (res1.success || res2.success) {
        setEditData({
          user_id: "",
          center_id: "",
          name: "",
          email: "",
          address: "",
          phone: "",
          status: "",
        });
        toast.success("Cập nhật trung tâm thành công");
      } else {
        toast.error(
          res1.message || res2.message || "Cập nhật trung tâm thất bại"
        );
      }

      setIsEditOpen(false);
      refetch();
    } catch (error) {
      toast.error(error?.data?.message || "Lỗi hệ thống");
    }
  }

  async function handleDelete(centerId) {
    try {
      const confirmDelete = window.confirm(
        "Bạn có chắc chắn muốn xóa trung tâm này!"
      );
      if (!confirmDelete) return;

      const res = await deleteCenter(centerId).unwrap();

      if (res.success) {
        toast.success("Đã xóa trung tâm thành công!");
        refetch();
      } else {
        toast.error(res.message || "Xóa trung tâm thất bại!");
      }
    } catch (error) {
      console.error("Lỗi khi xóa trung tâm:", error);
      toast.error(error?.data?.message || "Lỗi hệ thống khi xóa trung tâm!");
    }
  }

  useEffect(() => {
    if (centers) {
      const result = centers.filter((c) => {
        return (
          (c?.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
          (c?.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
          (c?.address?.toLowerCase() || "").includes(searchTerm.toLowerCase())
        );
      });
      console.log(result);

      setFiltered(result);
    }
  }, [centers, searchTerm]);
  if (isLoading) {
    return (
      <div className="p-6 mx-auto">
        <Loading />
      </div>
    );
  }
  return (
    <div className="flex-1 p-3">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <Title
            title="Quản lý Trung tâm Dịch vụ"
            subTitle="Quản lý các trung tâm bảo hành xe điện"
          />
         
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className={`bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium  ${
            isCreating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          + Thêm Trung tâm
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Tìm kiếm theo tên, email hoặc địa chỉ..."
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
              <th className="py-3 px-4">Tên Trung tâm</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Địa chỉ</th>
              <th className="py-3 px-4">Điện thoại</th>
              <th className="py-3 px-4">Trạng thái</th>
              <th className="py-3 px-4 text-center">Số Claims</th>
              <th className="py-3 px-4 text-center">Số KTV</th>
              <th className="py-3 px-4 text-center">Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((c, i) => (
              <tr key={i} className="border-t border-gray-300 hover:bg-gray-50">
                <td className="py-2 px-4 font-medium">{c.name}</td>
                <td className="py-2 px-4">{c.email}</td>
                <td className="py-2 px-4">{c.address}</td>
                <td className="py-2 px-4">{c.phone}</td>
                <td className="py-2 px-4">
                  <span
                    className={`text-nowrap px-2 py-1 text-xs rounded-full text-white ${
                      statusMap[c.status]?.color || "bg-gray-400"
                    }`}
                  >
                    {statusMap[c.status]?.text || "Không xác định"}
                  </span>
                </td>
                <td className="py-2 px-4 text-center">{c.claims}</td>
                <td className="py-2 px-4 text-center">{c.staffs}</td>
                <td className="py-2 px-4 text-center">
                  <div className="flex justify-center gap-3 cursor-pointer">
                    <button
                      onClick={() => {
                        setEditData(c);
                        setIsEditOpen(true);
                      }}
                      className="text-blue-600 hover:underline text-sm cursor-pointer"
                    >
                      <i className="fa-regular fa-pen-to-square mr-1"></i>
                    </button>
                    <button
                      onClick={() => handleDelete(c._id)}
                      className="text-red-600 hover:underline text-sm cursor-pointer"
                    >
                      <i className="fa-regular fa-trash-can mr-1"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Thêm Trung tâm */}
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
              Thêm Trung tâm Dịch vụ
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
                  onChange={(e) => {
                    setAddData({ ...addData, email: e.target.value });
                  }}
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
                  onChange={(e) => {
                    setAddData({ ...addData, password: e.target.value });
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>
              <button
                onClick={handleAddCenter}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md text-sm mt-2 cursor-pointer"
              >
                Thêm Trung tâm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chỉnh sửa Trung tâm */}
      {isEditOpen && editData && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-md shadow-lg w-[600px] p-6 relative">
            <button
              onClick={() => setIsEditOpen(false)}
              className="absolute top-2 right-3 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
            <h2 className="text-lg font-semibold mb-4">
              Chỉnh sửa Trung tâm Dịch vụ
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-sm mb-1 text-gray-700">
                  Tên Trung tâm
                </label>
                <input
                  type="text"
                  name="name" // thêm dòng này
                  value={editData?.name || ""}
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
                  name="email" // thêm dòng này
                  value={editData.email}
                  onChange={handleChangeEditData}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm mb-1 text-gray-700">
                  Địa chỉ
                </label>
                <input
                  type="text"
                  name="address" // thêm dòng này
                  value={editData.address}
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
                  name="phone" // thêm dòng này
                  value={editData.phone}
                  onChange={handleChangeEditData}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleEditCenter}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md text-sm cursor-pointer"
            >
              Cập nhật
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
