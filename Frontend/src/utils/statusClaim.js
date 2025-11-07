const STATUS_INFO = {
  submitted: {
    label: "Đã gửi yêu cầu",
    color: "bg-blue-200 text-blue-700",
  },
  confirmed: {
    label: "Đã xác nhận",
    color: "bg-yellow-200 text-yellow-700",
  },
  pending: {
    label: "Đang chờ xác nhận",
    color: "bg-gray-200 text-black-700",
  },
  rejected: {
    label: "Từ chối bảo hành",
    color: "bg-red-200 text-red-700",
  },
  in_progress: {
    label: "Đang sửa chữa",
    color: "bg-orange-200 text-orange-700",
  },
  completed: {
    label: "Hoàn thành",
    color: "bg-gray-200 text-black-700",
  },
};
export default STATUS_INFO;
