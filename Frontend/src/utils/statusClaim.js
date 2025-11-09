const STATUS_INFO = {
  submitted: {
    label: "Đã gửi yêu cầu",
    color: "bg-blue-200 text-blue-700",
  },
  confirmed: {
    label: "Đã xác nhận",
    color: "bg-green-200 text-green-700",
  },
  waiting_customer: {
    label: "Chờ xác nhận",
    color: "bg-yellow-300 text-yellow-700",
  },
  rejected: {
    label: "Từ chối bảo hành",
    color: "bg-red-200 text-red-700",
  },
  in_repair: {
    label: "Đang sửa chữa",
    color: "bg-orange-200 text-orange-700",
  },
  completed: {
    label: "Hoàn thành",
    color: "bg-gray-200 text-black-700",
  },
};
export default STATUS_INFO;
