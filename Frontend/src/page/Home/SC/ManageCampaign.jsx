import React, { useState } from "react";
import Title from "../../../components/Title";
import { useDispatch, useSelector } from "react-redux";
import { closeModal, openModal } from "../../../features/ui/uiSlice";
import Backdrop from "../../../components/Backdrop";
import Modal from "../../../components/Modal";
import { set } from "date-fns";

const fakeCampaigns = [
  {
    id: "RC-VF9-2024-001",
    title: "VF 9 - Cập nhật phần mềm hệ thống phanh",
    level: "Cao",
    status: "Đang hoạt động",
    description:
      "Cập nhật phần mềm ECU phanh để khắc phục vấn đề cảnh báo sai.",
    affectedCars: 3,
    duration: "1.5h",
    completionRate: 33,
    type: "Triệu hồi",
    model: "VF9",
    affectedVehicles: [
      {
        vin: "5YJ3E1EA4KF654321",
        customerName: "Trần Thị Bình",
        phone: "0912345678",
        status: "Chờ xử lý",
        appointmentDate: "2024-02-10",
        technician: null,
      },
      {
        vin: "5YJ3E1EA4KF988888",
        customerName: "Nguyễn Văn An",
        phone: "0987654321",
        status: "Đang thực hiện",
        appointmentDate: "2024-02-12",
        technician: "Vũ Thành Nam",
      },
      {
        vin: "5YJ3E1EA4KF123456",
        customerName: "Phạm Quốc Tính",
        phone: "0977888999",
        status: "Hoàn thành",
        appointmentDate: "2024-02-05",
        technician: "Nguyễn Mạnh Dũng",
      },
    ],
  },
  {
    id: "SV-VF8-2024-002",
    title: "VF 8 - Bảo dưỡng định kỳ 10.000km",
    level: "Trung bình",
    status: "Đang hoạt động",
    description:
      "Thực hiện kiểm tra hệ thống điều hòa và thay dầu phanh định kỳ.",
    affectedCars: 2,
    duration: "2h",
    completionRate: 50,
    type: "Bảo dưỡng",
    model: "VF8",
    affectedVehicles: [
      {
        vin: "5YJ3E1EA4KF777777",
        customerName: "Phạm Quốc Tính",
        phone: "0977888999",
        status: "Hoàn thành",
        appointmentDate: "2024-03-02",
        technician: "Trần Văn Tài",
      },
      {
        vin: "5YJ3E1EA4KF111111",
        customerName: "Lê Minh Cường",
        phone: "0965432109",
        status: "Chờ lịch hẹn",
        appointmentDate: null,
        technician: null,
      },
    ],
  },
  {
    id: "RC-VF7-2024-003",
    title: "VF 7 - Thay thế bộ dây cảm biến túi khí",
    level: "Cao",
    status: "Hoàn thành",
    description: "Thay mới dây cảm biến túi khí để đảm bảo an toàn vận hành.",
    affectedCars: 2,
    duration: "1h",
    completionRate: 100,
    type: "Triệu hồi",
    model: "VF7",
    affectedVehicles: [
      {
        vin: "5YJ3E1EA4KF222222",
        customerName: "Nguyễn Văn Bình",
        phone: "0909999999",
        status: "Hoàn thành",
        appointmentDate: "2024-01-15",
        technician: "Phan Quốc Long",
      },
      {
        vin: "5YJ3E1EA4KF333333",
        customerName: "Đỗ Thị Hạnh",
        phone: "0933333333",
        status: "Hoàn thành",
        appointmentDate: "2024-01-16",
        technician: "Vũ Thành Nam",
      },
    ],
  },
];
const fakeAppointments = [
  {
    campaignId: "RC-VF9-2024-001",
    vin: "5YJ3E1EA4KF654321",
    customer: "Trần Thị Bình",
    date: "20/02/2024 10:00",
    status: "Đã lên lịch",
    technician: "",
  },
  {
    campaignId: "SC-VF8-2024-002",
    vin: "5YJ3E1EA4KF123456",
    customer: "Nguyễn Văn An",
    date: "21/02/2024 14:00",
    status: "Đã xác nhận",
    technician: "Vũ Thành Nam",
  },
  {
    campaignId: "RC-BYD-2024-001",
    vin: "1GYY22G9651138789",
    customer: "Lê Minh Cường",
    date: "19/02/2024 09:00",
    status: "Hoàn thành",
    technician: "Vũ Thành Nam",
  },
];

const technicians = [
  "Phạm Văn Đức",
  "Hoàng Minh Tùng",
  "Vũ Thành Nam",
  "Nguyễn Mạnh Dũng",
];

const ManageCampaign = () => {
  const affectedVehicles = fakeCampaigns.affectedVehicles || [];

  const [form, setForm] = useState({
    vins: [],
    date: "",
    note: "",
  });
  const [isCampaign, setIsCampaign] = useState(true);

  const dispatch = useDispatch();
  const { isOpen, modalType, modalData } = useSelector(
    (state) => state.ui.modal
  );

  const totalCampaigns = fakeCampaigns.length;
  const totalCars = fakeCampaigns.reduce((sum, c) => sum + c.affectedCars, 0);
  const totalAppointments = 3;
  const totalCompletion = Math.round(
    fakeCampaigns.reduce((s, c) => s + c.completionRate, 0) / totalCampaigns
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.vins.length === 0 || !form.date) {
      alert("Vui lòng chọn ít nhất 1 xe và ngày hẹn!");
      return;
    }

    console.log("📅 Lịch hẹn mới:", form);
    alert(`Đã tạo lịch hẹn cho ${form.vins.length} xe.`);
    dispatch(closeModal());
    setForm({ vins: [], date: "", note: "" });
  };

  const statusColors = {
    "Đang hoạt động": "bg-green-100 text-green-700",
    "Hoàn thành": "bg-gray-100 text-gray-700",
  };

  const levelColors = {
    Cao: "bg-red-100 text-red-700",
    "Trung bình": "bg-yellow-100 text-yellow-700",
    Thấp: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="h-full w-full space-y-6 p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <Title
          title="Chiến dịch Recall & Service"
          subTitle="Quản lý chiến dịch triệu hồi và bảo dưỡng từ hãng"
        />
      </div>

      {/* --- Thống kê --- */}
      <div className="grid grid-cols-4 gap-4">
        <div className="border border-gray-300 rounded-lg p-4 text-center bg-white">
          <p className="text-gray-500 text-sm">Tổng chiến dịch</p>
          <h2 className="text-2xl font-bold">{totalCampaigns}</h2>
          <p className="text-gray-400 text-xs mt-1">{`${totalCampaigns} đang hoạt động`}</p>
        </div>

        <div className="border border-gray-300 rounded-lg p-4 text-center bg-white">
          <p className="text-gray-500 text-sm">Xe cần xử lý</p>
          <h2 className="text-2xl font-bold">{totalCars}</h2>
          <p className="text-gray-400 text-xs mt-1">Trên tất cả chiến dịch</p>
        </div>

        <div className="border border-gray-300 rounded-lg p-4 text-center bg-white">
          <p className="text-gray-500 text-sm">Lịch hẹn</p>
          <h2 className="text-2xl font-bold">{totalAppointments}</h2>
          <p className="text-gray-400 text-xs mt-1">{`${1} đã hoàn thành`}</p>
        </div>

        <div className="border border-gray-300 rounded-lg p-4 text-center bg-white">
          <p className="text-gray-500 text-sm">Tỷ lệ hoàn thành</p>
          <h2 className="text-2xl font-bold">{totalCompletion}%</h2>
          <p className="text-gray-400 text-xs mt-1">Tổng thể</p>
        </div>
      </div>

      {/* --- Tabs --- */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => setIsCampaign(true)}
          className={`px-4 py-2 rounded-lg text-gray-500 font-semibold cursor-pointer ${
            isCampaign
              ? "bg-green-500 hover:bg-green-600 text-white"
              : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          Chiến dịch
        </button>
        <button
          onClick={() => setIsCampaign(false)}
          className={`px-4 py-2 rounded-lg text-gray-500 font-semibold cursor-pointer ${
            isCampaign
              ? "bg-gray-200 hover:bg-gray-300"
              : "bg-green-500 hover:bg-green-600 text-white"
          }`}
        >
          Lịch hẹn
        </button>
      </div>

      {isCampaign ? (
        // ======= Danh sách chiến dịch =======
        <div className="space-y-4">
          {fakeCampaigns.map((c) => (
            <div
              key={c.id}
              className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm"
            >
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">
                    {c.title}
                  </h3>
                  <p className="text-gray-500 text-sm">{c.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      levelColors[c.level]
                    }`}
                  >
                    {c.level}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      statusColors[c.status]
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
              </div>

              <p className="mt-2 text-gray-700">{c.description}</p>

              <div className="grid grid-cols-4 gap-4 text-sm mt-3 text-gray-700">
                <p>
                  <b>Loại chiến dịch:</b> {c.type}
                </p>
                <p>
                  <b>Xe ảnh hưởng:</b> {c.affectedCars} xe
                </p>
                <p>
                  <b>Thời gian dự kiến:</b> {c.duration}
                </p>
                <p>
                  <b>Tỷ lệ hoàn thành:</b> {c.completionRate}%
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">
                    Mẫu xe ảnh hưởng:
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                    {c.model}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      dispatch(
                        openModal({
                          modalType: "createAppointment",
                          modalData: c,
                        })
                      )
                    }
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center gap-2 cursor-pointer"
                  >
                    Tạo lịch hẹn
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // ======= Danh sách lịch hẹn =======
        <div className="border border-gray-300 p-4 rounded-lg bg-white">
          <h3 className="font-semibold text-lg text-gray-800 mb-3">
            Danh sách lịch hẹn
          </h3>
          <p className="text-gray-500 text-sm mb-3">
            Quản lý và theo dõi lịch hẹn của khách hàng
          </p>

          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left text-gray-700">
                <th className="py-2 px-3">Chiến dịch</th>
                <th className="py-2 px-3">VIN</th>
                <th className="py-2 px-3">Khách hàng</th>
                <th className="py-2 px-3">Ngày hẹn</th>
                <th className="py-2 px-3">Trạng thái</th>
                <th className="py-2 px-3">Kỹ thuật viên</th>
                <th className="py-2 px-3 text-center">Hành động</th>
              </tr>
            </thead>

            <tbody>
              {fakeAppointments.map((a, i) => (
                <tr
                  key={i}
                  className="border-t border-gray-200 hover:bg-gray-50 transition"
                >
                  <td className="py-3 px-3">{a.campaignId}</td>
                  <td className="py-3 px-3">{a.vin}</td>
                  <td className="py-3 px-3">{a.customer}</td>
                  <td className="py-3 px-3">{a.date}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        a.status === "Đã xác nhận"
                          ? "bg-green-100 text-green-700"
                          : a.status === "Đã báo cáo"
                          ? "bg-blue-100 text-blue-700"
                          : a.status === "Chờ xử lý"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <select
                      value={a.technician || ""}
                      onChange={(e) =>
                        alert(
                          `Đã phân công ${e.target.value} cho xe ${a.vin} (${a.campaignId})`
                        )
                      }
                      className="border border-gray-300 rounded-md p-1 outline-none focus:ring-1 focus:ring-green-500"
                    >
                      <option value="">Phân công</option>
                      {technicians.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="py-3 px-3 text-center">
                    {a.status === "Hoàn thành" ? (
                      <span className="text-gray-500 text-sm italic">
                        Đã báo cáo
                      </span>
                    ) : (
                      <button className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg">
                        Hoàn thành
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Backdrop
        isOpen={isOpen && modalType === "createAppointment"}
        onClose={() => dispatch(closeModal())}
      />
      {isOpen && modalType === "createAppointment" && (
        <Modal isOpen={true}>
          <div className="w-[500px] bg-white rounded-lg p-3 shadow-md space-y-5">
            {/* Header */}
            <div className="flex justify-between items-center">
              <Title
                title="Tạo lịch hẹn"
                subTitle={`Chiến dịch: ${modalData.title || "Không xác định"}`}
              />
              <button
                className="w-8 h-8 flex justify-center items-center text-xl border text-green-500 hover:text-red-500 border-green-500 hover:border-red-500 p-2 rounded-full bg-green-100 hover:bg-red-100 cursor-pointer"
                onClick={() => dispatch(closeModal())}
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Chọn xe */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-gray-700 text-sm font-medium">
                    Chọn xe
                  </label>
                </div>

                <select
                  name="vins"
                  multiple
                  value={form.vins}
                  onChange={(e) => {
                    const selected = Array.from(
                      e.target.selectedOptions,
                      (o) => o.value
                    );
                    setForm((prev) => ({ ...prev, vins: selected }));
                  }}
                  className="w-full border border-gray-300 rounded-lg p-2 h-32 focus:ring-2 focus:ring-green-500 outline-none"
                >
                  {modalData.affectedVehicles.map((v) => (
                    <option key={v.vin} value={v.vin}>
                      {v.vin} - {modalData.model}
                    </option>
                  ))}
                </select>

                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500 mt-1">
                    {form.vins?.length || 0} xe được chọn
                  </p>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          vins: modalData.affectedVehicles.map((v) => v.vin),
                        }))
                      }
                      className="text-green-600  font-medium cursor-pointer"
                    >
                      Chọn tất cả
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, vins: [] }))}
                      className="text-red-500  font-medium cursor-pointer"
                    >
                      Bỏ chọn tất cả
                    </button>
                  </div>
                </div>
              </div>

              {/* Chọn ngày & giờ */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Ngày và giờ hẹn
                </label>
                <input
                  type="datetime-local"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Ghi chú
                </label>
                <textarea
                  name="note"
                  value={form.note}
                  onChange={handleChange}
                  placeholder="Ghi chú đặc biệt..."
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none"
                  rows="3"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-2">
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
                  Tạo lịch hẹn
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ManageCampaign;
