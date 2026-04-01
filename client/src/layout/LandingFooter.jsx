import logo from "../../public/logo-traveamer.svg";

export default function LandingFooter() {
  return (
    <footer className="w-full border-t border-[#000D26] py-8 px-6">
      <div className="max-w-[1340px] border-t pt-5 mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        {/* Logo */}
        <div>
          <img src={logo} alt="" />
        </div>

        {/* Copyright */}
        <p className="text-[#04112F] text-xs font-['Inter']">
          © 2026 Traveamer. All rights reserved.
        </p>

        {/* Links */}
        <div className="flex items-center gap-6">
          <a
            href="#"
            className="text-[#04112F] text-xs font-['Inter'] font-[400px] hover:text-[#C9A84C] transition-colors"
          >
            Privacy
          </a>
          <a
            href="#"
            className="text-[#04112F] text-xs font-['Inter'] font-[400px] hover:text-[#C9A84C] transition-colors"
          >
            Terms
          </a>
          <a
            href="#"
            className="text-[#04112F] text-xs font-['Inter'] font-[400px] hover:text-[#C9A84C] transition-colors"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
