import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { persistor } from "../app/store";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../features/user/user.slice";
import { useGetCenterByIdQuery } from "../features/center/center.api";

const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.user);
  const handleLogout = async () => {
    try {
      dispatch(logout());
      await persistor.purge();
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
            Xin chào, <span className="font-bold text-black">{user.email}</span>
          </p>
          <button
            onClick={handleLogout}
            className={`px-4 py-1 border border-gray-300 rounded-xl space-x-2 hover:bg-gray-500/50 hover:text-white flex items-center justify-center gap-2 cursor-pointer`}
          >
            <i class="fa-solid fa-right-from-bracket"></i>
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
