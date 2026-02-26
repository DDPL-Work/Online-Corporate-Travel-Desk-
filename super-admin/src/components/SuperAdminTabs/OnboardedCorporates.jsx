import React, { useState, useEffect } from "react";
import { FiPlusCircle } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import AddCorporateModal from "../../Modal/AddCorporateModal";
// NOTE: assumes you already have a list API slice
import { fetchCorporates } from "../../Redux/Slice/corporateListSlice";

export default function OnboardedCorporates() {
  const dispatch = useDispatch();

  const { corporates = [], loading } = useSelector(
    (state) => state.corporateList
  );

  const [openAddModal, setOpenAddModal] = useState(false);

  useEffect(() => {
    dispatch(fetchCorporates());
  }, [dispatch]);

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-slate-800">
            Onboarded Corporates
          </h1>

          {/* <button
            onClick={() => setOpenAddModal(true)}
            className="flex items-center gap-2 px-5 py-2 bg-[#0A4D68] text-white rounded-md shadow"
          >
            <FiPlusCircle /> Onboard Corporate

          </button> */}
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#0A4D68] text-white">
              <tr>
                <th className="px-6 py-3">Corporate</th>
                <th className="px-6 py-3">Primary Contact</th>
                <th className="px-6 py-3">Classification</th>
                <th className="px-6 py-3">Credit / Wallet</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan="5" className="py-6 text-center">
                    Loading...
                  </td>
                </tr>
              )}

              {!loading &&
                corporates.map((c) => (
                  <tr key={c._id} className="border-t hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium">
                      {c.corporateName}
                      <div className="text-xs text-gray-500">
                        {c.ssoConfig?.domain}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {c.primaryContact?.name}
                      <div className="text-xs text-gray-500">
                        {c.primaryContact?.email}
                      </div>
                    </td>

                    <td className="px-6 py-4 capitalize">
                      {c.classification}
                    </td>

                    <td className="px-6 py-4">
                      {c.classification === "postpaid"
                        ? `₹${c.currentCredit} / ₹${c.creditLimit}`
                        : `Wallet ₹${c.walletBalance}`}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          c.status === "active"
                            ? "bg-green-100 text-green-700"
                            : c.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}

              {!loading && corporates.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-gray-500">
                    No corporates found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MODAL */}
        {openAddModal && (
          <AddCorporateModal onClose={() => setOpenAddModal(false)} />
        )}
      </div>
    </div>
  );
}
