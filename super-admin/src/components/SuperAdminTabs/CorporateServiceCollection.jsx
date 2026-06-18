import React, { useEffect, useState, useRef, useMemo } from "react";
import { FiActivity, FiUser, FiCalendar, FiFileText, FiArrowLeft, FiRefreshCw, FiSearch, FiX, FiChevronDown, FiCheck, FiLayers, FiSettings, FiDownload } from "react-icons/fi";
import { FaPlane, FaHotel, FaRupeeSign, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { fetchServiceFeeCollections } from "../../Redux/Slice/serviceFeeLedgerSlice";
import { useSearchParams, useNavigate } from "react-router-dom";
import Pagination from "../Shared/Pagination";
import useExcelExporter from "../../services/export/useExcelExporter";
import { serviceChargeCollectionsExportTemplate } from "../../templates/exportTemplates/superAdminExportTemplates";

const CustomDropdown = ({ value, options, onChange, icon: Icon, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className="flex flex-col gap-1.5 w-full relative" ref={dropdownRef}>
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
        {Icon && <Icon size={12} />} {label}
      </label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-slate-50 border ${isOpen ? "border-[#003399] ring-2 ring-[#003399]/10" : "border-slate-200 hover:bg-white"} rounded-xl px-4 py-2.5 text-[13px] font-medium text-slate-700 cursor-pointer flex items-center justify-between transition-all`}
      >
        <span className="truncate">{selectedOption?.label}</span>
        <FiChevronDown className={`transition-transform duration-200 text-slate-400 shrink-0 ml-2 ${isOpen ? "rotate-180" : ""}`} />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-16 bg-white border border-slate-100 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden py-1 max-h-60 overflow-y-auto">
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`px-4 py-2.5 text-sm font-bold cursor-pointer flex items-center justify-between transition-colors ${value === opt.value ? "bg-indigo-50/50 text-[#003399]" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <span className="truncate">{opt.label}</span>
              {value === opt.value && <FiCheck size={14} className="text-[#003399] shrink-0 ml-2" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, Icon, borderCls, iconBgCls, iconColorCls }) => (
  <div className={`bg-white rounded-2xl p-6 border-l-4 ${borderCls} shadow-sm border-y border-r border-slate-100 flex items-center justify-between`}>
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-2xl font-black text-slate-700">{value}</h3>
    </div>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBgCls} ${iconColorCls}`}>
      <Icon size={20} />
    </div>
  </div>
);

export default function CorporateServiceCollection() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const corporateId = searchParams.get("corporateId");
  const corporateName = searchParams.get("corporateName");
  const initialDateRange = searchParams.get("dateRange");
  const initialBookingType = searchParams.get("bookingType");
  const initialCustomFromDate = searchParams.get("customFromDate");
  const initialCustomToDate = searchParams.get("customToDate");

  const { collections, loadingCollections } = useSelector((state) => state.serviceFeeLedger);
  const { exportExcel, exportingKey } = useExcelExporter();

  // Helper to normalize category
  const getInitialCategory = () => {
    if (initialBookingType === "Flight") return "Flight";
    if (initialBookingType === "Hotel") return "Hotel";
    return "All";
  };

  // Local Filter States
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(getInitialCategory());
  const [operation, setOperation] = useState("All");
  const [startDate, setStartDate] = useState(initialCustomFromDate || "");
  const [endDate, setEndDate] = useState(initialCustomToDate || "");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const tableScrollRef = useRef(null);

  const handleScrollTable = (direction) => {
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollBy({
        left: direction === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  const handleRefresh = () => {
    if (corporateId) {
      dispatch(fetchServiceFeeCollections({
        corporateId,
        // When refreshing, we just grab everything and do local filtering.
        // We'll pass "Custom" with very wide dates or simply don't pass date limits if backend allows.
        // For now, we will pass the exact params we had initially so we at least get that scope.
        ...(initialDateRange && { dateRange: initialDateRange }),
        ...(initialBookingType && { bookingType: initialBookingType }),
        ...(initialDateRange === "Custom" && initialCustomFromDate && initialCustomToDate && { 
          customFromDate: initialCustomFromDate, customToDate: initialCustomToDate 
        })
      }));
    }
  };

  useEffect(() => {
    handleRefresh();
  }, [corporateId, dispatch]); // only re-fetch if corporate ID changes

  const filteredCollections = useMemo(() => {
    return (collections || []).filter(c => {
      const q = search.trim().toLowerCase();
      const matchSearch = !q || (
        c.reference?.toLowerCase().includes(q) ||
        c.bookingId?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.operationType?.toLowerCase().includes(q)
      );

      const matchCategory = category === "All" || category === "Both (F+H)" || 
        (category === "Flight" && c.bookingModel === "BookingRequest") ||
        (category === "Hotel" && c.bookingModel === "HotelBookingRequest");

      const op = (c.operationType || "Book").toLowerCase();
      const matchOperation = operation === "All" || op.includes(operation.toLowerCase());

      const itemDate = new Date(c.createdAt);
      const matchStartDate = !startDate || itemDate >= new Date(startDate);
      const matchEndDate = !endDate || itemDate <= new Date(endDate + 'T23:59:59');

      return matchSearch && matchCategory && matchOperation && matchStartDate && matchEndDate;
    });
  }, [collections, search, category, operation, startDate, endDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, category, operation, startDate, endDate]);

  const totalPages = Math.ceil(filteredCollections.length / itemsPerPage);
  const currentData = filteredCollections.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const displayCorporateName = collections[0]?.corporateId?.corporateName || corporateName || "Corporate";

  // Stat Calculations
  const totalRevenue = filteredCollections.reduce((sum, item) => sum + (item.amount || 0), 0);
  const flightRevenue = filteredCollections.filter(c => c.bookingModel === "BookingRequest").reduce((sum, item) => sum + (item.amount || 0), 0);
  const hotelRevenue = filteredCollections.filter(c => c.bookingModel === "HotelBookingRequest").reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalCount = filteredCollections.length;

  const exportKey = "service_charge_collections";
  const isExporting = exportingKey === exportKey;

  const handleExport = () => {
    if (loadingCollections || isExporting) return;

    const statCards = [
      { label: "Total Collected", value: `₹${totalRevenue.toLocaleString()}` },
      { label: "Flight Collections", value: `₹${flightRevenue.toLocaleString()}` },
      { label: "Hotel Collections", value: `₹${hotelRevenue.toLocaleString()}` },
      { label: "Total Transactions", value: totalCount },
    ];

    const appliedFilters = [
      { label: "Company", value: displayCorporateName },
      { label: "Search", value: search || "None" },
      { label: "Category", value: category },
      { label: "Operation", value: operation },
      { label: "From Date", value: startDate || "Any" },
      { label: "To Date", value: endDate || "Any" },
    ];

    exportExcel({
      key: exportKey,
      pageHeader: `Service Charge Collections Report - ${displayCorporateName}`,
      statCards,
      appliedFilters,
      data: filteredCollections,
      columns: serviceChargeCollectionsExportTemplate,
      filenamePrefix: `service_collections_${displayCorporateName.replace(/\\s+/g, "_")}`,
      emptyMessage: "No service charge collections to export",
      successMessage: "Collections exported successfully",
    });
  };

  const resetFilters = () => {
    setSearch("");
    setCategory("All");
    setOperation("All");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6 bg-[#f8fafc]">
      {/* Header */}
      <div className="w-full bg-[#001f5c] text-white pt-6 pb-28 px-6 md:px-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate(-1)} 
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white shadow-sm"
            >
              <FiArrowLeft size={18} />
            </button>
            <button 
              onClick={handleRefresh}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white shadow-sm"
            >
              <FiRefreshCw size={18} className={loadingCollections ? "animate-spin" : ""} />
            </button>
          </div>
          
          <div className="flex items-center gap-4 ml-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl text-white bg-white/10">
              <FiActivity size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight leading-none mb-1">
                Service Charge Collections: <span className="font-bold">{displayCorporateName}</span>
              </h1>
              <p className="text-[9px] font-bold uppercase tracking-[2px] text-slate-300">
                Detailed view of all service fee deductions
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-20 relative z-10 space-y-6">
        
        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Total Collected"
            value={`₹${totalRevenue.toLocaleString()}`}
            Icon={FaRupeeSign}
            borderCls="border-emerald-500"
            iconBgCls="bg-emerald-50"
            iconColorCls="text-emerald-600"
          />
          <StatCard
            label="Flight Collections"
            value={`₹${flightRevenue.toLocaleString()}`}
            Icon={FaPlane}
            borderCls="border-[#003399]"
            iconBgCls="bg-[#003399]/10"
            iconColorCls="text-[#003399]"
          />
          <StatCard
            label="Hotel Collections"
            value={`₹${hotelRevenue.toLocaleString()}`}
            Icon={FaHotel}
            borderCls="border-amber-500"
            iconBgCls="bg-amber-50"
            iconColorCls="text-amber-500"
          />
          <StatCard
            label="Total Transactions"
            value={totalCount}
            Icon={FiActivity}
            borderCls="border-violet-500"
            iconBgCls="bg-violet-50"
            iconColorCls="text-violet-600"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 border shadow-sm border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-5">
            {/* Search */}
            <div className="flex flex-col gap-1.5 lg:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <FiSearch size={12} /> Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Order ID, PNR, or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white"
                />
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              </div>
            </div>

            {/* Category */}
            <CustomDropdown 
              label="Category"
              icon={FiLayers}
              value={category}
              onChange={setCategory}
              options={[
                { value: "All", label: "All Categories" },
                { value: "Flight", label: "Flight" },
                { value: "Hotel", label: "Hotel" },
              ]}
            />

            {/* Operation */}
            <CustomDropdown 
              label="Operation"
              icon={FiSettings}
              value={operation}
              onChange={setOperation}
              options={[
                { value: "All", label: "All Operations" },
                { value: "Book", label: "Book" },
                { value: "Cancel", label: "Cancel" },
                { value: "Re-Issue", label: "Re-Issue" },
              ]}
            />

            {/* Date Filters */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={resetFilters}
              className="px-6 py-2.5 rounded-xl font-black text-[13px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-100 hover:text-slate-700 bg-white text-slate-500 border-slate-200"
            >
              <FiX size={14} /> Reset Filters
            </button>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
          {/* Table Titlebar */}
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap gap-3 justify-between items-center bg-slate-50/50">
            {/* Left: title + count */}
            <div>
              <h2 className="font-black text-slate-700 uppercase tracking-tighter text-lg">
                Collections Report
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                {filteredCollections.length} records found
              </p>
            </div>

            {/* Right: Export + Scroll controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                disabled={loadingCollections || isExporting}
                className="flex items-center justify-center space-x-2 px-5 py-1.5 bg-[#000d26] text-white hover:text-white hover:border-[#C9A84C] transition-all shadow-sm rounded-2xl"
              >
                <FiDownload className="w-4 h-4" />
                <span>{isExporting ? "Exporting..." : "Export Excel"}</span>
              </button>

              <div className="w-px h-7 bg-slate-200 mx-1" />

              <button
                onClick={() => handleScrollTable("left")}
                title="Scroll table left"
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-[#003399] hover:border-[#003399] transition-all shadow-sm"
              >
                <FaChevronLeft size={15} />
              </button>

              <button
                onClick={() => handleScrollTable("right")}
                title="Scroll table right"
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-[#003399] hover:border-[#003399] transition-all shadow-sm"
              >
                <FaChevronRight size={15} />
              </button>
            </div>
          </div>

          <div ref={tableScrollRef} className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-gradient-to-r from-[#003399] to-[#000d26] text-white">
                <tr>
                  <th className="px-8 py-5 text-[11px] uppercase font-black tracking-widest  whitespace-nowrap">Date</th>
                  <th className="px-8 py-5 text-[11px] uppercase font-black tracking-widest  whitespace-nowrap">Booking Info</th>
                  <th className="px-8 py-5 text-[11px] uppercase font-black tracking-widest  whitespace-nowrap">Action</th>
                  <th className="px-8 py-5 text-[11px] uppercase font-black tracking-widest  whitespace-nowrap">Amount</th>
                  <th className="px-8 py-5 text-[11px] uppercase font-black tracking-widest  whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {loadingCollections ? (
                  <tr>
                    <td colSpan={5} className="p-16 text-center bg-white">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#003399] rounded-full animate-spin"></div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Fetching Collections...</p>
                      </div>
                    </td>
                  </tr>
                ) : currentData.length > 0 ? (
                  currentData.map((record) => (
                    <tr key={record._id} className="border-b border-slate-100 bg-white hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                          <FiCalendar className="text-slate-400" />
                          {new Date(record.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                          })}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-1 max-w-[300px]">
                          <p className="text-sm font-black text-slate-800 flex items-center gap-2">
                            <FiFileText className="text-slate-400" />
                            {record.reference || record.bookingId || "N/A"}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500 leading-snug line-clamp-2" title={record.description}>
                            {record.description}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const op = (record.operationType || "Book").toLowerCase();
                            let Icon = FiCheck;
                            let iconBg = "bg-emerald-50 text-emerald-600";
                            
                            if (op.includes("cancel")) {
                              Icon = FiX;
                              iconBg = "bg-rose-50 text-rose-600";
                            } else if (op.includes("re-issue") || op.includes("reissue")) {
                              Icon = FiRefreshCw;
                              iconBg = "bg-indigo-50 text-indigo-600";
                            }

                            const textColor = record.bookingModel === "BookingRequest" ? "text-blue-600" : "text-amber-600";

                            return (
                              <>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
                                  <Icon size={14} strokeWidth={3} />
                                </div>
                                <span className={`text-xs font-black uppercase tracking-wider ${textColor}`}>
                                  {record.operationType || "Book"}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm font-black text-emerald-600 flex items-center gap-1">
                        <FaRupeeSign size={12} />
                        {record.amount?.toLocaleString()}
                      </td>
                      <td className="px-8 py-5">
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-md text-[10px] font-black tracking-widest uppercase bg-[#E6F8F0] text-[#009951]">
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-16 text-center bg-white">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                          <FiActivity size={28} />
                        </div>
                        <p className="text-sm font-bold text-slate-500">No service fee collections match your filters.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          <div className="flex flex-wrap gap-3 items-center justify-between px-6 py-3 border-t border-slate-100 bg-white">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Page {currentPage} of {Math.max(1, totalPages)}
            </span>
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                showFirstLast={true}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
