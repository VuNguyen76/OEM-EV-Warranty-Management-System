import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  useCreateCenterMutation,
  useCreateTechnicianMutation,
} from "../../features/user/user.api";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import navigateByRole from "../../utils/navigateByRole";
import { setCredentials } from "../../features/user/user.slice";

const AuthActive = () => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const { user, token } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [createTechnician, { isLoading }] = useCreateTechnicianMutation();
  const [createCenter, { isLoading: isCreating }] = useCreateCenterMutation();

  const handleActive = async (e) => {
    e.preventDefault();
    
    try {
      if (user?.role === "sc_staff") {
        const res = await createCenter({ name, phone, address }).unwrap();
        if (res.success) {
          // Update user status trong Redux store
          const updatedUser = { 
            ...user, 
            status: "active",
            name,
            phone,
            address 
          };
          dispatch(setCredentials({ user: updatedUser, token }));
          
          toast.success("Kích hoạt tài khoản thành công");
          navigate(navigateByRole(user.role));
          return;
        }
      } else if (user?.role === "sc_technician") {
        const res = await createTechnician({ name, phone }).unwrap();
        if (res.success) {
          // Update user status trong Redux store
          const updatedUser = { 
            ...user, 
            status: "active",
            name,
            phone 
          };
          dispatch(setCredentials({ user: updatedUser, token }));
          
          toast.success("Kích hoạt tài khoản thành công");
          navigate(navigateByRole(user.role));
          return;
        }
      }
    } catch (error) {
      toast.error(error?.data?.message || "Lỗi hệ thống khi kích hoạt");
    }
  };

  return (
    <div className="h-screen flex justify-center items-center gap-10">
      <div className="w-1/2">
        <div className="flex flex-col gap-5 justify-center items-center">
          <form
            onSubmit={handleActive}
            className="w-[400px] p-8 space-y-5 border border-gray-300 rounded-xl shadow-md"
          >
            <div className=" space-y-2">
              <h3 className="text-xl font-bold">Kích hoạt tài khoản</h3>
              <p className="text-gray-500">
                Vui lòng nhập thông tin để kích hoạt tài khoản
              </p>
            </div>

            <div>
              <label htmlFor="name" className="text-lg font-semibold">
                Tên người dùng
              </label>
              <input
                type="text"
                id="name"
                className="w-full p-2 border border-gray-300 rounded-md mt-2"
                placeholder="Nhập tên người dùng"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="phone" className="text-lg font-semibold">
                Số điện thoại
              </label>
              <input
                type="text"
                id="phone"
                className="w-full p-2 border border-gray-300 rounded-md mt-2"
                placeholder="Nhập số điện thoại người dùng"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            {user?.role === "sc_staff" && (
              <div>
                <label htmlFor="address" className="text-lg font-semibold">
                  Địa chỉ
                </label>
                <input
                  type="text"
                  id="address"
                  className="w-full p-2 border border-gray-300 rounded-md mt-2"
                  placeholder="Nhập địa chỉ người dùng"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isCreating || isLoading}
              className={`w-full bg-primary text-white p-2 rounded-md hover:bg-primary/80  transition flex items-center justify-center gap-3 ${
                (isCreating || isLoading) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              {(isCreating || isLoading) ? (
                <>
                  <p className="w-8 h-8 border-t border-l border-white rounded-full animate-spin"></p>
                  <span className="font-semibold">Đang kích hoạt</span>
                </>
              ) : (
                <span>Kích hoạt</span>
              )}
            </button>
          </form>
          <p className="text-xs text-gray-500 text-center">
            © 2024 AutoCare Pro. Hệ thống quản lý bảo hành xe hơi
          </p>
        </div>
      </div>
      <div className="w-1/2 h-full relative ">
        <img src="/gara.jpg" alt="" className="w-full h-full object-cover " />
        <div className="h-full w-full absolute top-0 left-0 bg-gradient-to-r from-[hsl(215,80%,25%)] to-[sl(215,75%,35%)] "></div>
        <div className="absolute bottom-10 left-10 space-y-5">
          <div className="flex  items-center gap-3">
            <div className="p-3 bg-amber-600 rounded-2xl">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="size-15 text-white"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                />
              </svg>
            </div>
            <div className="space-y-1">
              <h4 className="text-4xl text-white font-bold">AutoCare Pro</h4>
              <p className="text-sm text-white">Hệ thống quản lý bảo hành</p>
            </div>
          </div>
          <p className="text-lg text-white max-w-[500px]">
            Cổng quản lý dành cho trung tâm bảo hành - Theo dõi và xử lý các yêu
            cầu bảo hành từ khách hàng
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthActive;
