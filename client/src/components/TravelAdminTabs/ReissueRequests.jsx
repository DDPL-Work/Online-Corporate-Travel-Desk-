import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchReissueRequests, updateReissueStatus } from "../../Redux/Actions/reissueThunks";
import { FiCheckCircle, FiXCircle, FiClock, FiEye } from "react-icons/fi";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";

export default function ReissueRequests() {
  const dispatch = useDispatch();
  const { requests, loading, pagination } = useSelector((state) => state.reissue);

  const [activeTab, setActiveTab] = useState("my"); // "my" or "company"
  const [filter, setFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const token = sessionStorage.getItem("token");
  let userId = null;
  let companyId = null;
  let role = "employee";

  if (token) {
    try {
      const decoded = jwtDecode(token);
      userId = decoded.id;
      companyId = decoded.companyId;
      role = decoded.role || decoded.userRole || "employee";
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    if (!companyId) return;

    const params = {
      page: currentPage,
      limit: 10,
      status: filter !== "All" ? filter : undefined,
    };

    if (activeTab === "my") {
      params.userId = userId;
    } else {
      params.companyId = companyId;
    }

    dispatch(fetchReissueRequests(params));
  }, [dispatch, activeTab, currentPage, filter, companyId, userId]);

  const handleStatusUpdate = async (requestId, newStatus) => {
    const message = prompt(`Enter reason for marking as ${newStatus} (optional):`);
    if (message === null) return; // cancelled

    try {
      const userStr = sessionStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : {};

      await dispatch(
        updateReissueStatus({
          requestId,
          status: newStatus,
          message,
          actionBy: user._id || userId,
          actionByName: user.name || "Admin",
        })
      ).unwrap();

      toast.success(`Request ${newStatus} successfully!`);
      // refresh
      dispatch(fetchReissueRequests({
        page: currentPage,
        limit: 10,
        status: filter !== "All" ? filter : undefined,
        userId: activeTab === "my" ? userId : undefined,
        companyId: activeTab === "company" ? companyId : undefined
      }));
    } catch (err) {
      toast.error(err || "Failed to update status");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "PENDING": return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium flex items-center gap-1"><FiClock /> Pending</span>;
      case "APPROVED": return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1"><FiCheckCircle /> Approved</span>;
      case "REJECTED": return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1"><FiXCircle /> Rejected</span>;
      case "COMPLETED": return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1"><FiCheckCircle /> Completed</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-6">Reissue Requests</h1>

        {/* TABS (Hidden for employees) */}
        {role !== "employee" && (
          <div className="flex gap-4 border-b border-gray-200 mb-6">
            <button
              onClick={() => { setActiveTab("my"); setCurrentPage(1); }}
              className={`pb-2 px-1 text-sm font-medium transition-colors ${activeTab === "my" ? "text-[#0A4D68] border-b-2 border-[#0A4D68]" : "text-gray-500 hover:text-gray-700"}`}
            >
              My Reissued
            </button>
            <button
              onClick={() => { setActiveTab("company"); setCurrentPage(1); }}
              className={`pb-2 px-1 text-sm font-medium transition-colors ${activeTab === "company" ? "text-[#0A4D68] border-b-2 border-[#0A4D68]" : "text-gray-500 hover:text-gray-700"}`}
            >
              Company Reissued
            </button>
          </div>
        )}

        {/* FILTERS */}
        <div className="flex gap-2 mb-6">
          {["All", "PENDING", "APPROVED", "REJECTED", "COMPLETED"].map((s) => (
            <button
              key={s}
              onClick={() => { setFilter(s); setCurrentPage(1); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === s ? "bg-[#0A4D68] text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Request ID</th>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">PNR</th>
                <th className="px-6 py-4">Type & Reason</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-500">Loading...</td></tr>
              ) : requests?.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-500">No requests found.</td></tr>
              ) : (
                requests?.map((req) => (
                  <tr key={req._id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{req.reissueId}</div>
                      <div className="text-xs text-gray-500">
                         {new Date(req.requestedAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                         })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{req.user?.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{req.bookingSnapshot?.pnr || "N/A"}</div>
                      <div className="text-xs text-gray-500">{req.bookingReference}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 capitalize">{req.reissueType.replace("_", " ").toLowerCase()}</div>
                      <div className="text-xs text-gray-500 max-w-xs truncate" title={req.reason}>{req.reason}</div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {(activeTab === "company" || role !== "employee") && req.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(req._id, "APPROVED")}
                              className="px-3 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded-md text-xs font-medium transition-colors border border-green-200"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(req._id, "REJECTED")}
                              className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-xs font-medium transition-colors border border-red-200"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
