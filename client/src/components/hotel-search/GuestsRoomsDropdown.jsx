import React, { useState, useRef, useEffect } from "react";
import {
  LuUsers,
  LuUser,
  LuBaby,
  LuBedDouble,
  LuChevronDown,
  LuCheck,
} from "react-icons/lu";

export default function GuestsRoomsDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [rooms, setRooms] = useState(
    value || [
      {
        adults: 2,
        children: 0,
        childAges: [],
      },
    ]
  );

  /* ---------------- outside click ---------------- */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ---------------- helpers ---------------- */
  const updateRoom = (i, key, val) => {
    const copy = [...rooms];
    copy[i][key] = val;

    if (key === "children") {
      copy[i].childAges = Array(val).fill(5);
    }

    setRooms(copy);
  };

  const addRoom = () => {
    if (rooms.length < 5) {
      setRooms([
        ...rooms,
        { adults: 2, children: 0, childAges: [] },
      ]);
    }
  };

  const removeRoom = (i) => {
    if (rooms.length > 1) {
      setRooms(rooms.filter((_, idx) => idx !== i));
    }
  };

  const totalGuests = rooms.reduce(
    (sum, r) => sum + r.adults + r.children,
    0
  );

  const summary = `${totalGuests} Guest${
    totalGuests > 1 ? "s" : ""
  } • ${rooms.length} Room${rooms.length > 1 ? "s" : ""}`;

  const apply = () => {
    onChange(rooms);
    setOpen(false);
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full px-4 py-3 border rounded-xl flex justify-between items-center hover:border-blue-800"
      >
        <div className="flex items-center gap-2">
          <LuUsers className="text-gray-500" />
          <span className="text-gray-700">{summary}</span>
        </div>
        <LuChevronDown
          className={`transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-2xl border max-h-[70vh] overflow-y-auto">
          <div className="p-4 space-y-4">
            {rooms.map((room, i) => (
              <div key={i} className="border-b pb-4 last:border-0">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <LuBedDouble className="text-blue-600" />
                    <span className="font-semibold">
                      Room {i + 1}
                    </span>
                  </div>
                  {rooms.length > 1 && (
                    <button
                      onClick={() => removeRoom(i)}
                      className="text-red-500 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Adults */}
                <Counter
                  icon={<LuUser />}
                  label="Adults"
                  value={room.adults}
                  min={1}
                  onChange={(v) => updateRoom(i, "adults", v)}
                />

                {/* Children */}
                <Counter
                  icon={<LuBaby />}
                  label="Children"
                  value={room.children}
                  min={0}
                  onChange={(v) => updateRoom(i, "children", v)}
                />
              </div>
            ))}

            {rooms.length < 5 && (
              <button
                onClick={addRoom}
                className="w-full border border-dashed rounded-lg py-2 text-blue-700 font-medium"
              >
                + Add another room
              </button>
            )}

            <button
              onClick={apply}
              className="w-full bg-blue-800 text-white py-3 rounded-lg font-semibold flex justify-center gap-2"
            >
              <LuCheck /> Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Counter sub-component ---------------- */
function Counter({ icon, label, value, min, onChange }) {
  return (
    <div className="flex justify-between items-center py-2">
      <div className="flex items-center gap-2 text-gray-700">
        {icon}
        {label}
      </div>
      <div className="flex items-center gap-3">
        <button
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="w-8 h-8 rounded-full bg-gray-100"
        >
          −
        </button>
        <span>{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          className="w-8 h-8 rounded-full bg-gray-100"
        >
          +
        </button>
      </div>
    </div>
  );
}
