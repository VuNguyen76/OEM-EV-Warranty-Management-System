import { useState } from "react";
import { assets } from "../../assets";
import { Link, useNavigate } from "react-router-dom";
import { useLoginMutation } from "../../features/auth/auth.api";
import { useDispatch } from "react-redux";
import { setCredentials } from "../../features/userSlice/userSlice.slice";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [login, { isLoading }] = useLoginMutation();

  const handleLogin = async () => {
    const res = await login({ email, password }).unwrap();
    if (res.success) {
      dispatch(setCredentials({ user: res.user, token: res.token }));
      localStorage.setItem("token", res.token);
      switch (res.user.role) {
        case "sc":
          navigate("/sc");
          break;
        case "admin":
          navigate("/admin");
          break;
        case "evm":
          navigate("/evm");
          break;
        default:
          break;
      }
    }
  };
  return (
    <div className="h-screen flex justify-center items-center gap-10">
      <div className="w-1/2 h-full relative ">
        <img
          src={assets.loginImage}
          alt=""
          className="w-full h-full object-cover "
        />
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
      <div className="w-1/2">
        <div className="flex flex-col gap-5 justify-center items-center">
          <div className="w-[400px] p-8 space-y-5 border border-gray-300 rounded-xl shadow-md">
            <div className=" space-y-2">
              <h3 className="text-xl font-bold">Đăng nhập</h3>
              <p className="text-gray-500">Đăng nhập tài khoản</p>
            </div>

            <div>
              <label htmlFor="email" className="text-lg font-semibold">
                Email
              </label>
              <input
                type="email"
                id="email"
                className="w-full p-2 border border-gray-300 rounded-md mt-2"
                placeholder="email@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="email" className="text-lg font-semibold">
                Mật khẩu
              </label>
              <input
                type="email"
                id="email"
                className="w-full p-2 border border-gray-300 rounded-md mt-2"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              onClick={handleLogin}
              className="w-full bg-primary text-white p-2 rounded-md hover:bg-primary/80 cursor-pointer transition"
            >
              Đăng nhập
            </button>
            <div className="text-center">
              <Link to="/forgot-password" className="text-gray-500 font-medium">
                Quên mật khẩu?
              </Link>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center">
            © 2024 AutoCare Pro. Hệ thống quản lý bảo hành xe hơi
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
