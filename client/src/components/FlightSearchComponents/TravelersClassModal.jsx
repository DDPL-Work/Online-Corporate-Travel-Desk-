import React, { useEffect, useRef, useState } from "react";

export default function TravelersClassModal({
  onClose,
  onApply,
  modalPosition,
  initialData = {
    travelClass: "Economy",
  },
}) {
  const modalRef = useRef(null);

  // 🔒 Always fixed
  const adults = 1;
  const children = 0;
  const infants = 0;

  const [travelClass, setTravelClass] = useState(
    initialData.travelClass || "Economy",
  );

  /* Close on outside click / esc */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleEsc = (e) => e.key === "Escape" && onClose();

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  const handleApply = () => {
    onApply({
      adults,
      children,
      infants,
      travelClass,
    });
    onClose();
  };

  return (
    <div
      className="absolute z-50"
      style={{
        top: modalPosition.top,
        left: modalPosition.left,
        width: modalPosition.width,
      }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl border border-gray-200"
      >
        <div className="p-6">
          {/* FIXED TRAVELER INFO */}
          <div className="mb-3">
            <p className="font-medium text-gray-800 mb-1.5 text-sm">TRAVELERS</p>
            <p className="text-sm text-gray-600 mt-1">1 Adult</p>
          </div>

          {/* CABIN CLASS */}
          <div className="mb-4">
            <p className="font-medium text-gray-800 mb-1.5 text-sm">
              CHOOSE TRAVEL CLASS
            </p>
            <div className="flex gap-2 flex-wrap">
              {["Economy", "Premium Economy", "Business", "First Class"].map(
                (cls) => (
                  <button
                    key={cls}
                    onClick={() => setTravelClass(cls)}
                    className={`px-3 py-1 rounded-lg border text-xs
                    ${
                      travelClass === cls
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 hover:bg-blue-50"
                    }
                  `}
                  >
                    {cls}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* APPLY */}
          <div className="flex justify-end">
            <button
              onClick={handleApply}
              className="px-5 py-1 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700"
            >
              APPLY
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
