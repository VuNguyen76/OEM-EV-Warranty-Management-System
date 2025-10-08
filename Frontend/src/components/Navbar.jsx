import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useLogoutMutation } from "../features/auth/auth.api";

const Navbar = () => {
  const [logout] = useLogoutMutation();
  const location = useLocation();
  
  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch (err) {
      console.log(err);
    }
  };
  
  // Determine if we're in SC or EVM section based on the current path
  const isEVMSection = location.pathname.startsWith('/evm');
  
  return (
    <div className="w-full bg-white border-b border-gray-300 px-4 py-2">
      <div className="flex justify-between items-center">
        <Link to={isEVMSection ? "/evm" : "/sc"} className="flex gap-2 items-center">
          <img src="/car-icon.png" alt="" className="w-15" />
          <p className="text-xl font-bold text-green-500">
            {isEVMSection ? "EVM - Nhà sản xuất" : "SC - Trung tâm bảo hành"}
          </p>
        </Link>
        <div className="flex gap-4 items-center">
          <p className="text-gray-500">
            Xin chào{" "}
            <span className="font-bold text-black">Nguyễn Quốc Tính</span>
          </p>
          <button className="px-4 py-1 border border-gray-300 rounded-xl space-x-2 hover:bg-gray-500/50 hover:text-white cursor-pointer">
            <i className="fa-solid fa-right-from-bracket"></i>
            <span onClick={handleLogout}>Đăng xuất</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;