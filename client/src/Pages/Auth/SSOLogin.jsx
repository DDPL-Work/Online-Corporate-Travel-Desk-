import React from "react";
import { useNavigate } from "react-router-dom";
import { GoogleIcon, MicrosoftIcon, ZohoIcon } from "./SSOIcons";

const travelBg =
  "https://images.unsplash.com/photo-1496588152823-86ff7695e68f?fm=jpg&q=60&w=2400";

const SSOLogin = () => {
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const loginWithGoogle = () => {
    window.location.href = `${API_BASE}/auth/sso/google`;
  };

  const loginWithMicrosoft = () => {
    window.location.href = `${API_BASE}/auth/sso/microsoft`;
  };

  const loginWithZoho = () => {
    window.location.href = `${API_BASE}/auth/sso/zoho`;
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl bg-white">
        {/* IMAGE / BRAND PANEL */}
        <div className="relative hidden md:flex items-center justify-center">
          <img
            src={travelBg}
            alt="Corporate Travel"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50"></div>

          <div className="relative z-10 text-white px-12">
            <h1 className="text-4xl font-bold mb-4">Corporate SSO</h1>
            <p className="text-gray-200 text-lg leading-relaxed">
              Secure sign-in for employees using your organization’s identity
              provider.
            </p>
          </div>
        </div>

        {/* SSO CARD */}
        <div className="flex items-center justify-center p-10">
          <div className="w-full max-w-sm">
            <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-2">
              Sign in with SSO
            </h2>

            <p className="text-gray-600 text-center mb-8">
              Use your corporate Google or Microsoft account
            </p>

            <div className="space-y-4">
              {/* GOOGLE */}
              <button
                onClick={loginWithGoogle}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 py-3 rounded-xl font-semibold text-gray-800 hover:bg-gray-100 transition shadow-sm"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              {/* MICROSOFT */}
              <button
                onClick={loginWithMicrosoft}
                className="w-full flex items-center justify-center gap-3 bg-[#2F2F2F] text-white py-3 rounded-xl font-semibold hover:bg-black transition shadow-sm"
              >
                <MicrosoftIcon />
                Continue with Microsoft
              </button>

              {/* ZOHO */}
              <button
                onClick={loginWithZoho}
                className="w-full flex items-center justify-center gap-3 bg-[#E42527] text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition shadow-sm"
              >
                <ZohoIcon />
                Continue with Zoho
              </button>
            </div>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-300"></div>
              <span className="text-sm text-gray-500">or</span>
              <div className="flex-1 h-px bg-gray-300"></div>
            </div>
            <p className="mt-6 text-center text-xs text-gray-500 leading-relaxed">
              By continuing, you agree to your organization’s SSO policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SSOLogin;
