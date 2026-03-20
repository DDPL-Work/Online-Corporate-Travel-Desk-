import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectFareFamily } from "../../../Redux/Slice/flightSearchSlice";

export default function FareUpsellModal({ isOpen, onClose, fareUpsellData }) {
  const dispatch = useDispatch();
  const { selectedFareFamily } = useSelector((state) => state.flights);

  if (!isOpen) return null;

  const fares = fareUpsellData?.data?.FareFamilies || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-2xl w-full max-w-4xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-slate-900">Choose Your Fare</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        {!fares.length ? (
          <div className="p-10 text-center text-gray-600">
            <p className="font-medium">
              Fare upgrade options are not available for this flight.
            </p>
            <p className="text-sm mt-1">
              You can continue with the selected fare.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {fares.map((fare) => {
              const isSelected = selectedFareFamily?.code === fare.code;

              return (
                <div
                  key={fare.code}
                  className={`border rounded-xl p-5 transition ${
                    isSelected
                      ? "border-blue-600 ring-2 ring-blue-200"
                      : "border-slate-200"
                  }`}
                >
                  <h3 className="font-bold text-lg mb-2">{fare.name}</h3>

                  <p className="text-xl font-bold mb-3">
                    {fare.price > 0 ? `₹${fare.price}` : "Included"}
                  </p>

                  <ul className="space-y-2 text-sm mb-4">
                    {fare.services?.map((s, idx) => (
                      <li key={idx}>✔ {s.description}</li>
                    ))}
                  </ul>

                  <button
                    onClick={() => {
                      dispatch(selectFareFamily(fare));
                      onClose();
                    }}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg"
                  >
                    Select Fare
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
