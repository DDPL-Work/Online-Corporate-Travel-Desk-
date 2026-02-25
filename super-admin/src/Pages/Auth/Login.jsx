import React, { useState } from "react";
import { MdEmail, MdLock, MdVisibility, MdVisibilityOff } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "../../Redux/Slice/authSlice";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const travelStack =
  "https://plus.unsplash.com/premium_photo-1661962174396-e6d539b5c0d8?fm=jpg&q=60&w=2400";
const travelBg =
  "https://images.unsplash.com/photo-1496588152823-86ff7695e68f?fm=jpg&q=60&w=2400";

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error } = useSelector((state) => state.auth);

  const handleLogin = (e) => {
    e.preventDefault(); // prevent page reload

    dispatch(
      loginUser({
        email: form.email,
        password: form.password,
      }),
    )
      .unwrap()
      .then((data) => {
        // token already saved by authSlice
        const token = sessionStorage.getItem("token");

        if (!token) {
          console.error("Token missing after login");
          return;
        }

        try {
          const decoded = jwtDecode(token);
          const role = decoded.role || decoded.userRole;

          switch (role) {
            case "super-admin":
              navigate("/onboarded-corporates");
              break;

            default:
              console.warn("Unknown role:", role);
              navigate("/login");
          }
        } catch (err) {
          console.error("Invalid token:", err);
          navigate("/login");
        }
      });
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-linear-to-br from-gray-100 to-gray-300 relative overflow-hidden p-4">
      {/* Decorative Background Blurs */}
      {/* <div className="absolute top-10 -left-16 w-72 h-72 bg-blue-600 rounded-full blur-[120px] opacity-30"></div> */}
      <div className="absolute bottom-10 -right-16 w-72 h-72 bg-purple-600 rounded-full blur-[120px] opacity-30"></div>

      {/* Right Panel (BIGGER) */}
      <div className="relative left-25 w-full max-w-6xl flex">
        {/* RIGHT IMAGE PANEL - BIGGER */}
        <div className="hidden md:block left-74 w-[60%] h-[540px] rounded-3xl overflow-hidden shadow-2xl relative">
          {/* Background Image */}
          <img
            src={travelBg}
            className="absolute inset-0 w-full h-full object-cover"
            alt="bg"
          />

          {/* Stack Images */}
          {/* <div className="absolute bottom-10 right-10 flex flex-col gap-4 z-20">
            <img
              src={travelStack}
              className="w-28 h-28 rounded-2xl shadow-2xl shadow-blue-900/50 hover:scale-105 transition"
              alt="img1"
            />
            <img
              src={travelBg}
              className="w-28 h-28 rounded-2xl shadow-2xl shadow-blue-900/50 hover:scale-105 transition"
              alt="img2"
            />
          </div> */}
        </div>

        {/* LEFT LOGIN FORM — OVERLAYED */}
        <div className="absolute md:-left-10 top-10 w-full md:w-[42%] bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white/50">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2 text-center">
            Welcome Back
          </h2>
          <p className="text-gray-600 text-center mb-8">
            Login to your Corporate Travel Desk
          </p>

          <form onSubmit={handleLogin} className="space-y-7">
            {/* Email */}
            <div className="relative group">
              <MdEmail className="absolute left-4 top-3.5 text-blue-600 text-xl" />
              <input
                type="email"
                name="email"
                placeholder=" "
                value={form.email}
                onChange={handleChange}
                required
                className="w-full py-3 pl-12 pr-4 border rounded-xl bg-white/70 backdrop-blur-sm focus:bg-white transition outline-none focus:ring-2 focus:ring-blue-500"
              />
              <label
                className={`absolute left-12 bg-white px-1 transition-all pointer-events-none
      ${form.email ? "-top-3 text-sm text-blue-600" : "top-3 text-gray-500"}
      peer-focus:-top-3 peer-focus:text-sm peer-focus:text-blue-600`}
              >
                Email Address
              </label>
            </div>

            {/* Password */}
            {/* Password */}
            <div className="relative group">
              <MdLock className="absolute left-4 top-3.5 text-blue-600 text-xl" />

              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder=" "
                value={form.password}
                onChange={handleChange}
                required
                className="w-full py-3 pl-12 pr-12 border rounded-xl bg-white/70 backdrop-blur-sm focus:bg-white transition outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Floating Label */}
              <label
                className={`absolute left-12 bg-white px-1 transition-all pointer-events-none
      ${form.password ? "-top-3 text-sm text-blue-600" : "top-3 text-gray-500"}
      peer-focus:-top-3 peer-focus:text-sm peer-focus:text-blue-600`}
              >
                Password
              </label>

              {/* Show / Hide Button */}
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-4 top-3.5 text-gray-600 hover:text-blue-600 transition"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <MdVisibilityOff size={22} />
                ) : (
                  <MdVisibility size={22} />
                )}
              </button>
            </div>

            {/* Remember + Forgot */}
            <div className="flex justify-between items-center text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" />
                Remember me
              </label>
              <button className="text-blue-700 font-semibold hover:underline">
                Forgot Password?
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg hover:shadow-xl disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Log In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
