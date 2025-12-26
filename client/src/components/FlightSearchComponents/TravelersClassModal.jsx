import React, { useEffect, useRef, useState } from "react";

const TRAVEL_CLASSES = ["Economy", "Premium Economy", "Business", "First"];

export default function TravelersClassModal({
  onClose,
  onApply,
  modalPosition,
  initialData = {
    adults: 1,
    children: 0,
    childAges: [],
    travelClass: "Economy",
    directOnly: false,
  },
}) {
  const modalRef = useRef(null);

  const [adults, setAdults] = useState(initialData.adults || 1);
  const [children, setChildren] = useState(initialData.children || 0);
  const [childAges, setChildAges] = useState(initialData.childAges || []);
  const [travelClass, setTravelClass] = useState(
    initialData.travelClass || "Economy"
  );
  const [directOnly, setDirectOnly] = useState(initialData.directOnly || false);

  /* ---------------- CLOSE ON OUTSIDE CLICK ---------------- */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  /* ---------------- CHILD HANDLERS ---------------- */
  const addChild = () => {
    if (children < 6 && adults + children < 9) {
      setChildren(children + 1);
      setChildAges([...childAges, ""]);
    }
  };

  const removeChild = () => {
    if (children > 0) {
      setChildren(children - 1);
      setChildAges(childAges.slice(0, -1));
    }
  };

  const updateChildAges = (index, value) => {
    const updated = [...childAges];
    updated[index] = value;
    setChildAges(updated);
  };

  const handleApply = () => {
    onApply({
      adults,
      children,
      childAges,
      travelClass,
      directOnly,
    });
    onClose();
  };

  return (
    <div
      className="absolute z-50"
      style={{
        top: modalPosition?.top ?? 0,
        right: modalPosition?.right ?? 360,
        width: modalPosition?.width ?? 660,
      }}
    >
      <div
        ref={modalRef}
        className="bg-white w-100 rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              Travelers & Cabin Class
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Travelers */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-700 mb-3">Travelers</h3>

            {/* Adults */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-sm font-medium">Adults</p>
                <p className="text-xs text-gray-500">Aged 18+</p>
              </div>
              <div className="flex items-center">
                <button
                  className="w-8 h-8 rounded-full border"
                  disabled={adults <= 1}
                  onClick={() => setAdults(adults - 1)}
                >
                  -
                </button>
                <span className="mx-3">{adults}</span>
                <button
                  className="w-8 h-8 rounded-full border"
                  disabled={adults >= 9}
                  onClick={() => setAdults(adults + 1)}
                >
                  +
                </button>
              </div>
            </div>

            {/* Children */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-sm font-medium">Children</p>
                <p className="text-xs text-gray-500">Aged 0–17</p>
              </div>
              <div className="flex items-center">
                <button
                  className="w-8 h-8 rounded-full border"
                  onClick={removeChild}
                  disabled={children <= 0}
                >
                  -
                </button>
                <span className="mx-3">{children}</span>
                <button
                  className="w-8 h-8 rounded-full border"
                  onClick={addChild}
                >
                  +
                </button>
              </div>
            </div>

            {/* Child Ages */}
            {childAges.map((age, index) => (
              <div key={index} className="mb-3">
                <label className="text-sm block mb-1">
                  Age of child {index + 1}
                </label>
                <select
                  value={age}
                  onChange={(e) => updateChildAges(index, e.target.value)}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="">Select age</option>
                  {Array.from({ length: 18 }, (_, i) => (
                    <option key={i} value={i}>
                      {i} years
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Cabin Class */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-700 mb-3">Cabin Class</h3>
            {TRAVEL_CLASSES.map((cls) => (
              <label
                key={cls}
                className="flex items-center mb-2 cursor-pointer"
              >
                <input
                  type="radio"
                  checked={travelClass === cls}
                  onChange={() => setTravelClass(cls)}
                  className="mr-2"
                />
                {cls}
              </label>
            ))}
          </div>

          {/* Direct */}
          <label className="flex items-center mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={directOnly}
              onChange={() => setDirectOnly(!directOnly)}
              className="mr-2"
            />
            Direct flights only
          </label>

          <button
            onClick={handleApply}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
