import React, { useState } from "react";
import { MdEmail, MdLock } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "../../Redux/Slice/authSlice";
import { useNavigate } from "react-router-dom";

const travelStack =
  "https://plus.unsplash.com/premium_photo-1661962174396-e6d539b5c0d8?fm=jpg&q=60&w=2400";
const travelBg =
  "https://images.unsplash.com/photo-1496588152823-86ff7695e68f?fm=jpg&q=60&w=2400";

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error } = useSelector((state) => state.auth);

  const handleLogin = (e) => {
    e.preventDefault(); // prevent page reload

    dispatch(
      loginUser({
        email: form.email,
        password: form.password,
      })
    )
      .unwrap()
      .then(() => {
        navigate("/total-bookings");
      })
      .catch((err) => {
        console.log("Login error:", err);
      });
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300 relative overflow-hidden p-4">
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

          <div className="absolute left-35 top-10 flex flex-col justify-center items-center text-white z-10 px-10">
            <h1 className="text-5xl font-bold mb-4  drop-shadow-xl text-blue-600">
              WELCOME!
            </h1>
            <p className="text-gray-200 mb-6 text-lg">
              Your corporate travel journey starts here
            </p>
            <button className="bg-white text-blue-700 font-semibold py-2 px-8 rounded-2xl shadow-lg hover:bg-gray-200 transition">
              SIGN UP
            </button>
          </div>
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
              <label className="absolute left-12 top-3 text-gray-500 pointer-events-none transition-all group-focus-within:-top-3 group-focus-within:text-sm group-focus-within:text-blue-600 bg-white px-1">
                Email Address
              </label>
            </div>

            {/* Password */}
            <div className="relative group">
              <MdLock className="absolute left-4 top-3.5 text-blue-600 text-xl" />
              <input
                type="password"
                name="password"
                placeholder=" "
                value={form.password}
                onChange={handleChange}
                required
                className="w-full py-3 pl-12 pr-4 border rounded-xl bg-white/70 backdrop-blur-sm focus:bg-white transition outline-none focus:ring-2 focus:ring-blue-500"
              />
              <label className="absolute left-12 top-3 text-gray-500 pointer-events-none transition-all group-focus-within:-top-3 group-focus-within:text-sm group-focus-within:text-blue-600 bg-white px-1">
                Password
              </label>
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
