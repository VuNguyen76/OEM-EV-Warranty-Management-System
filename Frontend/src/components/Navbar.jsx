import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLogoutMutation } from "../features/auth/auth.api";
import { toast } from "react-toastify";
import { persistor } from "../app/store";

const Navbar = () => {
  const [logout, { isLoading }] = useLogoutMutation();
  const navigate = useNavigate();
  const handleLogout = async () => {
    try {
      await logout().unwrap();
      toast.success("Đăng xuat thanh cong");
      navigate("/");
    } catch (err) {
      console.log(err);
    }
  };
  return (
    <div className="w-full bg-white border-b border-gray-300 px-4 py-2">
      <div className="flex justify-between items-center">
        <Link to={"/"} className="flex gap-2 items-center ">
          <img src="/car-icon.png" alt="" className="w-15" />
          <p className="text-xl font-bold text-green-500">Auto Care</p>
        </Link>
        <div className="flex gap-4 items-center">
          <p className="text-gray-500">
            Xin chào{" "}
            <span className="font-bold text-black">Nguyễn Quốc Tính</span>
          </p>
          <button
            onClick={handleLogout}
            className={`px-4 py-1 border border-gray-300 rounded-xl space-x-2 hover:bg-gray-500/50 hover:text-white flex items-center justify-center gap-2 ${
              isLoading ? "opacity-50 cursor-not-allowed" : " cursor-pointer"
            }`}
          >
            {isLoading ? (
              <>
                {" "}
                <p className="w-5 h-5 border-t border-l border-blue-500 rounded-full animate-spin"></p>
                <span className="font-semibold">Đang đăng xuất</span>
              </>
            ) : (
              <>
                <i class="fa-solid fa-right-from-bracket"></i>
                <span>Đăng xuất</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
