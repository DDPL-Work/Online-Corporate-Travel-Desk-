import React, { useEffect, useState } from "react";
import {
  FiFilter,
  FiEdit2,
  FiPlusCircle,
  FiToggleLeft,
  FiToggleRight,
  FiCheckCircle,
  FiXCircle,
  FiEye,
} from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";

import EditCorporateModal from "../../Modal/EditCorporateModal";

import {
  fetchCorporates,
  approveCorporate,
  toggleCorporateStatus,
  fetchCorporateById,
} from "../../Redux/Slice/corporateListSlice";

import ViewCorporateModal from "../../Modal/ViewCorporateModal";
import { ToastConfirm } from "../../utils/ToastConfirm";
import FinancialApprovalModal from "../../Modal/FinancialApprovalModal";

const colors = {
  primary: "#0A4D68",
  success: "#10B981",
  danger: "#EF4444",
};

export default function CorporateAccessControl() {
  const dispatch = useDispatch();

  const {
    corporates = [],
    loading,
    error,
  } = useSelector((state) => state.corporateList);

  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewCorporate, setViewCorporate] = useState(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const [corporate, setCorporate] = useState("All");
  const [role, setRole] = useState("All");
  const [status, setStatus] = useState("All");

  const [openFinancialApprove, setOpenFinancialApprove] = useState(false);

  /* ---------------- FETCH ---------------- */

  useEffect(() => {
    dispatch(fetchCorporates())
      .unwrap()
      .catch((err) => toast.error(err));
  }, [dispatch]);

  /* ---------------- FILTER ---------------- */

  const corporatesList = [
    "All",
    ...new Set(corporates.map((x) => x.corporateName)),
  ];
  const roles = ["All", "travel-admin", "employee"];
  const statuses = ["All", "active", "pending", "inactive"];

  const filtered = corporates.filter((c) => {
    const corpMatch = corporate === "All" || c.corporateName === corporate;
    const roleMatch = role === "All" || c.defaultApprover === role;
    const statusMatch = status === "All" || c.status === status;
    return corpMatch && roleMatch && statusMatch;
  });

  /* ---------------- ACTIONS ---------------- */

  const handleView = async (id) => {
    try {
      const res = await dispatch(fetchCorporateById(id)).unwrap();
      setViewCorporate(res);
      setIsViewOpen(true);
    } catch (err) {
      toast.error(err);
    }
  };

  // const handleApprove = (id) => {
  //   ToastConfirm({
  //     message: "Approve this corporate?",
  //     confirmText: "Approve",
  //     onConfirm: async () => {
  //       try {
  //         await dispatch(approveCorporate(id)).unwrap();
  //         toast.success("Corporate approved successfully");
  //       } catch (err) {
  //         toast.error(err);
  //       }
  //     },
  //   });
  // };

  const handleApprove = (corporate) => {
    setSelectedRow(corporate);
    setOpenFinancialApprove(true);
  };

  const handleToggleStatus = (id) => {
    ToastConfirm({
      message: "Change corporate status?",
      confirmText: "Change",
      onConfirm: async () => {
        try {
          await dispatch(toggleCorporateStatus(id)).unwrap();
          toast.info("Corporate status updated");
        } catch (err) {
          toast.error(err);
        }
      },
    });
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-[#1E293B]">
            Corporate Access Control
          </h1>
        </div>

        {/* TABLE */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead style={{ backgroundColor: colors.primary }}>
              <tr className="text-white">
                <th className="px-6 py-3">Corporate</th>
                <th className="px-6 py-3">Primary Contact</th>
                <th className="px-6 py-3">Classification</th>
                <th className="px-6 py-3">Wallet / Credit</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {loading && (
                <tr>
                  <td colSpan="6" className="py-6 text-center">
                    Loading...
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold">
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

                    <td className="px-6 py-4 capitalize">{c.classification}</td>

                    <td className="px-6 py-4">
                      {c.classification === "postpaid"
                        ? `₹${c.currentCredit} / ₹${c.creditLimit}`
                        : `₹${c.walletBalance}`}
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

                    {/* ACTIONS */}
                    <td className="px-6 py-4 flex gap-4">
                      <IconBtn
                        title="View"
                        color="text-green-600"
                        onClick={() => handleView(c._id)}
                      >
                        <FiEye />
                      </IconBtn>
                      <IconBtn
                        title="Edit"
                        color="text-blue-600"
                        onClick={() => {
                          setSelectedRow(c);
                          setOpenEdit(true);
                        }}
                      >
                        <FiEdit2 />
                      </IconBtn>

                      {c.status === "pending" && (
                        <IconBtn
                          title="Approve"
                          color="text-green-600"
                          onClick={() => handleApprove(c)}
                        >
                          <FiCheckCircle />
                        </IconBtn>
                      )}

                      <IconBtn
                        title="Toggle Status"
                        onClick={() => handleToggleStatus(c._id)}
                      >
                        {c.status === "active" ? (
                          <FiToggleRight size={22} className="text-green-600" />
                        ) : (
                          <FiToggleLeft size={22} className="text-red-600" />
                        )}
                      </IconBtn>
                    </td>
                  </tr>
                ))}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-500">
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {isViewOpen && viewCorporate && (
          <ViewCorporateModal
            corporate={viewCorporate}
            onClose={() => {
              setIsViewOpen(false);
              setViewCorporate(null);
            }}
          />
        )}

        {openEdit && selectedRow && (
          <EditCorporateModal
            corporate={selectedRow}
            onClose={() => setOpenEdit(false)}
          />
        )}

        {openFinancialApprove && selectedRow && (
          <FinancialApprovalModal
            corporate={selectedRow}
            onClose={() => {
              setOpenFinancialApprove(false);
              setSelectedRow(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ---------------- ICON BUTTON ---------------- */

const IconBtn = ({ title, onClick, color = "text-gray-700", children }) => (
  <button
    title={title}
    onClick={onClick}
    className={`${color} hover:scale-110 transition`}
  >
    {children}
  </button>
);
