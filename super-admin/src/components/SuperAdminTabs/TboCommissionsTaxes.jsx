import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchTboCommissions } from "../../Redux/Actions/corporate.related.thunks";
import { fetchCorporates } from "../../Redux/Slice/corporateListSlice";
import { FaMoneyBillWave, FaPlane, FaHotel, FaFileInvoiceDollar, FaFilter, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { FiArrowLeft, FiRefreshCw, FiSearch, FiX, FiDownload, FiEye } from "react-icons/fi";
import Pagination from "../Shared/Pagination";
import useExcelExporter from "../../services/export/useExcelExporter";
import { toast } from "sonner";



export default function TboCommissionsTaxes() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const tableScrollRef = useRef(null);

  const { tboCommissions, loadingTboCommissions } = useSelector(
    (state) => state.corporateRelated
  );
  const { corporates } = useSelector((state) => state.corporateList);

  const { exportExcel, exportingKey } = useExcelExporter();

  const [selectedBooking, setSelectedBooking] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [productFilter, setProductFilter] = useState("All");
  const [corporateFilter, setCorporateFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    dispatch(fetchTboCommissions());
    dispatch(fetchCorporates());
  }, [dispatch]);

  const formattedData = useMemo(() => {
    if (!tboCommissions) return [];
    return tboCommissions.map((item) => {
      let grossFare = 0;
      let commissionEarned = 0;
      let tdsOnCommission = 0;
      let tax = 0;
      let taxDetails = [];

      let plbEarned = 0;
      let tdsOnPlb = 0;
      let hasPlbData = false;

      let incentiveEarned = 0;
      let tdsOnIncentive = 0;
      let hasIncentiveData = false;

      if (item.bookingType === "flight" && item.fareDetails) {
        grossFare = item.fareDetails.PublishedFare || 0;
        commissionEarned = item.fareDetails.CommissionEarned || 0;
        tdsOnCommission = item.fareDetails.TdsOnCommission || 0;
        plbEarned = item.fareDetails.PLBEarned || 0;
        tdsOnPlb = item.fareDetails.TdsOnPLB || 0;
        incentiveEarned = item.fareDetails.IncentiveEarned || 0;
        tdsOnIncentive = item.fareDetails.TdsOnIncentive || 0;
        tax = item.fareDetails.Tax || 0;
        
        if (item.fareDetails.PLBEarned !== undefined || item.fareDetails.TdsOnPLB !== undefined) {
          hasPlbData = true;
        }

        if (item.fareDetails.IncentiveEarned !== undefined || item.fareDetails.TdsOnIncentive !== undefined) {
          hasIncentiveData = true;
        }
        
        if (item.fareDetails.TaxBreakup) {
          item.fareDetails.TaxBreakup.forEach(t => {
            taxDetails.push({
              type: t.key,
              amount: t.value,
              percentage: null,
              taxableAmount: null
            });
          });
        }
      } else if (item.bookingType === "hotel" && item.priceBreakdown) {
        item.priceBreakdown.forEach((pb) => {
          grossFare += (pb.RoomRate || 0) + (pb.RoomTax || 0);
          commissionEarned += pb.AgentCommission || 0;
          tax += pb.RoomTax || 0;
          const tdsTax = pb.TaxBreakup?.find(t => t.TaxType === "Tax_TDS")?.TaxAmount || 0;
          tdsOnCommission += tdsTax;

          if (pb.TaxBreakup) {
            pb.TaxBreakup.forEach(t => {
              taxDetails.push({
                type: t.TaxType,
                amount: t.TaxAmount,
                percentage: t.TaxPercentage,
                taxableAmount: t.TaxableAmount
              });
            });
          }
        });
      }

      return {
        id: item.orderId || item.bookingId,
        date: new Date(item.createdAt).toLocaleDateString(),
        rawDate: item.createdAt,
        corporate: item.corporateName,
        product: item.bookingType === "flight" ? "Flight" : "Hotel",
        pnr: item.bookingReference || "N/A",
        grossFare: parseFloat(grossFare.toFixed(2)),
        commissionEarned: parseFloat(commissionEarned.toFixed(2)),
        plbEarned: parseFloat(plbEarned.toFixed(2)),
        incentiveEarned: parseFloat(incentiveEarned.toFixed(2)),
        tdsOnCommission: parseFloat(tdsOnCommission.toFixed(2)),
        tdsOnPlb: parseFloat(tdsOnPlb.toFixed(2)),
        tdsOnIncentive: parseFloat(tdsOnIncentive.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        taxDetails,
        netPayable: parseFloat((grossFare - commissionEarned - plbEarned - incentiveEarned + tdsOnCommission + tdsOnPlb + tdsOnIncentive).toFixed(2)),
        hasPlbData,
        hasIncentiveData,
        status: item.status || "Confirmed",
        originalData: item,
      };
    });
  }, [tboCommissions]);

  const filteredData = formattedData.filter((item) => {
    const matchesSearch =
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.pnr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.corporate.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProduct = productFilter === "All" || item.product === productFilter;
    const matchesCorporate = corporateFilter === "All" || item.corporate === corporateFilter;

    let matchesDate = true;
    if (fromDate || toDate) {
      const itemDate = new Date(item.rawDate);
      itemDate.setHours(0, 0, 0, 0);

      if (fromDate) {
        const fDate = new Date(fromDate);
        fDate.setHours(0, 0, 0, 0);
        if (itemDate < fDate) matchesDate = false;
      }
      if (toDate) {
        const tDate = new Date(toDate);
        tDate.setHours(23, 59, 59, 999);
        if (itemDate > tDate) matchesDate = false;
      }
    }

    return matchesSearch && matchesProduct && matchesCorporate && matchesDate;
  });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const paginatedData = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const totalCommission = filteredData.reduce((sum, item) => sum + item.commissionEarned, 0);
  const totalPlb = filteredData.reduce((sum, item) => sum + item.plbEarned, 0);
  const totalIncentive = filteredData.reduce((sum, item) => sum + item.incentiveEarned, 0);
  const totalTds = filteredData.reduce((sum, item) => sum + item.tdsOnCommission, 0);
  const totalTdsOnPlb = filteredData.reduce((sum, item) => sum + item.tdsOnPlb, 0);
  const totalTdsOnIncentive = filteredData.reduce((sum, item) => sum + item.tdsOnIncentive, 0);

  const handleExport = () => {
    if (filteredData.length === 0) {
      toast.error("No data to export");
      return;
    }

    const totalGrossFare = filteredData.reduce((sum, item) => sum + item.grossFare, 0);
    const formattedDateRange = fromDate && toDate ? `${new Date(fromDate).toLocaleDateString("en-GB", {day:"numeric", month:"short"})} - ${new Date(toDate).toLocaleDateString("en-GB", {day:"numeric", month:"short"})}` : "All Dates";
    
    exportExcel({
      key: "tbo_commissions_taxes",
      pageHeader: "TBO Commissions & Taxes",
      statCards: [
        { label: "Total Records", value: filteredData.length },
        { label: "Total Gross Fare", value: `₹${totalGrossFare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: "Total Commission", value: `₹${totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: "Total PLB", value: `₹${totalPlb.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: "Total Incentive", value: `₹${totalIncentive.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: "TDS on Comm.", value: `₹${totalTds.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: "TDS on PLB", value: `₹${totalTdsOnPlb.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: "TDS on Incentive", value: `₹${totalTdsOnIncentive.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
      ],
      appliedFilters: [
        { label: "Search", value: searchTerm || "None" },
        { label: "Product", value: productFilter },
        { label: "Corporate", value: corporateFilter },
        { label: "Date Range", value: formattedDateRange }
      ],
      data: filteredData.map(item => ({
        "Order ID": item.id,
        "Type": item.product,
        "Booking Date": item.date,
        "Corporate": item.corporate,
        "Gross Fare (₹)": item.grossFare,
        "Commission Earned (₹)": item.commissionEarned,
        "PLB Earned (₹)": item.hasPlbData ? item.plbEarned : "N/A",
        "Incentive Earned (₹)": item.hasIncentiveData ? item.incentiveEarned : "N/A",
        "TDS on Comm. (₹)": item.tdsOnCommission,
        "TDS on PLB (₹)": item.hasPlbData ? item.tdsOnPlb : "N/A",
        "TDS on Incentive (₹)": item.hasIncentiveData ? item.tdsOnIncentive : "N/A",
        "Total Tax (₹)": item.tax
      })),
      columns: [
        { header: "Order ID", key: "Order ID" },
        { header: "Type", key: "Type" },
        { header: "Booking Date", key: "Booking Date" },
        { header: "Corporate", key: "Corporate" },
        { header: "Gross Fare (₹)", key: "Gross Fare (₹)" },
        { header: "Commission Earned (₹)", key: "Commission Earned (₹)" },
        { header: "PLB Earned (₹)", key: "PLB Earned (₹)" },
        { header: "Incentive Earned (₹)", key: "Incentive Earned (₹)" },
        { header: "TDS on Comm. (₹)", key: "TDS on Comm. (₹)" },
        { header: "TDS on PLB (₹)", key: "TDS on PLB (₹)" },
        { header: "TDS on Incentive (₹)", key: "TDS on Incentive (₹)" },
        { header: "Total Tax (₹)", key: "Total Tax (₹)" }
      ],
      filenamePrefix: "TBO_Commissions_Taxes"
    });
  };

  const resetFilters = () => {
    setSearchTerm("");
    setProductFilter("All");
    setCorporateFilter("All");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  };

  const handleScrollTable = (direction) => {
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollBy({
        left: direction === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="min-h-screen font-sans pb-20 -mt-6 -mx-4 md:-mx-6 bg-[#F5F5F5]">
      {/* Header */}
      <div className="w-full bg-linear-to-br from-[#003399] to-[#000d26] text-white pt-8 pb-20 px-6 md:px-10">
        <div className="w-full flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 text-white shadow-sm"
              >
                <FiArrowLeft size={20} />
              </button>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setProductFilter("All");
                  dispatch(fetchTboCommissions());
                }}
                className={`p-3 rounded-xl transition-all border shadow-sm ${loadingTboCommissions ? 'bg-white/20 text-white/50 cursor-not-allowed border-white/5' : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'}`}
                disabled={loadingTboCommissions}
              >
                <FiRefreshCw size={20} className={loadingTboCommissions ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="h-12 w-px bg-white/10 mx-2 hidden md:block" />

            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl text-white border border-white/10 bg-white/10">
                <FaFileInvoiceDollar size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight leading-none">TBO Commission & Taxes</h1>
                <p className="text-[10px] mt-2 font-bold uppercase tracking-[2px] opacity-60">
                  Track commissions and tax collections from TBO bookings
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-10 -mt-10 space-y-8 relative z-10">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bookings</p>
          <div className="flex items-end justify-between mt-2">
            <p className="text-xl font-black text-[#003399]">{filteredData.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Commission</p>
          <div className="flex items-end justify-between mt-2">
            <p className="text-xl font-black text-emerald-600">₹{totalCommission.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">PLB Earned</p>
          <div className="flex items-end justify-between mt-2">
            <p className="text-xl font-black text-emerald-500">₹{totalPlb.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Incentive</p>
          <div className="flex items-end justify-between mt-2">
            <p className="text-xl font-black text-emerald-400">₹{totalIncentive.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">TDS on Comm</p>
          <div className="flex items-end justify-between mt-2">
            <p className="text-xl font-black text-amber-600">₹{totalTds.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">TDS on PLB</p>
          <div className="flex items-end justify-between mt-2">
            <p className="text-xl font-black text-amber-500">₹{totalTdsOnPlb.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">TDS on Incent.</p>
          <div className="flex items-end justify-between mt-2">
            <p className="text-xl font-black text-amber-400">₹{totalTdsOnIncentive.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Net Earnings</p>
          <div className="flex items-end justify-between mt-2">
            <p className="text-xl font-black text-[#003399]">₹{(totalCommission + totalPlb + totalIncentive - totalTds - totalTdsOnPlb - totalTdsOnIncentive).toLocaleString()}</p>
          </div>
        </div>
      </div>

        {/* Toolbar / Filters */}
        <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: "#e2e8f0" }}>
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-5">
            {/* Search */}
            <div className="flex flex-col gap-1.5 xl:col-span-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <FiSearch size={12} /> Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search Order ID, PNR..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white"
                />
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              </div>
            </div>

            {/* Corporate Filter */}
            <div className="flex flex-col gap-1.5 xl:col-span-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Corporate
              </label>
              <select
                value={corporateFilter}
                onChange={(e) => setCorporateFilter(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white cursor-pointer"
              >
                <option value="All">All Corporates</option>
                {corporates?.filter(c => c.status === 'active' || c.status === 'approved').map((corp) => (
                  <option key={corp._id} value={corp.corporateName}>
                    {corp.corporateName}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Filter */}
            <div className="flex flex-col gap-1.5 xl:col-span-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Product
              </label>
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white cursor-pointer"
              >
                <option value="All">All Products</option>
                <option value="Flight">Flights</option>
                <option value="Hotel">Hotels</option>
              </select>
            </div>

            {/* From Date */}
            <div className="flex flex-col gap-1.5 xl:col-span-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Booking From
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white cursor-pointer"
              />
            </div>

            {/* To Date */}
            <div className="flex flex-col gap-1.5 xl:col-span-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Booking To
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                min={fromDate}
                className="w-full px-4 py-2.5 border rounded-xl text-[13px] font-medium outline-none transition-all focus:border-[#003399] focus:ring-2 focus:ring-[#003399]/10 bg-slate-50 hover:bg-white cursor-pointer"
              />
            </div>

            {/* Reset Button */}
            <div className="flex items-end xl:col-span-1">
              <button
                onClick={resetFilters}
                className="w-full py-2.5 rounded-xl font-black text-[13px] flex items-center justify-center gap-2 border shadow-sm transition-all hover:bg-slate-100 hover:text-slate-700 bg-white text-slate-500 border-slate-200"
              >
                <FiX size={14} /> Reset
              </button>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
          {/* Table Titlebar */}
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap gap-3 justify-between items-center bg-slate-50/50">
            <div>
              <h2 className="font-black text-slate-700 uppercase tracking-tighter text-lg">
                Commission Report
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                {filteredData.length} records found
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={handleExport}
                disabled={exportingKey === "tbo_commissions_taxes"}
                className={`flex items-center justify-center space-x-2 px-5 py-1.5 transition-all shadow-sm rounded-2xl ${
                  exportingKey === "tbo_commissions_taxes"
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                    : "bg-[#000d26] text-white hover:border-[#C9A84C]"
                }`}
              >
                <FiDownload className={`w-4 h-4 ${exportingKey === "tbo_commissions_taxes" ? "animate-pulse" : ""}`} />
                <span>{exportingKey === "tbo_commissions_taxes" ? "Exporting..." : "Export"}</span>
              </button>
              <div className="w-px h-7 bg-slate-200 mx-1" />
              <button
                onClick={() => handleScrollTable("left")}
                title="Scroll table left"
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-[#C9A84C] hover:border-[#C9A84C] transition-all shadow-sm"
              >
                <FaChevronLeft size={15} />
              </button>
              <button
                onClick={() => handleScrollTable("right")}
                title="Scroll table right"
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-[#C9A84C] hover:border-[#C9A84C] transition-all shadow-sm"
              >
                <FaChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Table Body */}
          <div ref={tableScrollRef} className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
              <tr className="bg-linear-to-r from-[#003399] to-[#000d26] text-white border-b border-[#000d26]">
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-white/90 whitespace-nowrap text-left">Order ID</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-white/90 whitespace-nowrap text-left">Type</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-white/90 whitespace-nowrap text-left">Booking Date</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-white/90 whitespace-nowrap text-left">Corporate</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-white/90 whitespace-nowrap text-left">Gross Fare</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-white/90 whitespace-nowrap text-left">Commission Earned</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-white/90 whitespace-nowrap text-left">PLB Earned</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-white/90 whitespace-nowrap text-left">Incentive Earned</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-white/90 whitespace-nowrap text-left">TDS on Comm.</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-white/90 whitespace-nowrap text-left">TDS on PLB</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-white/90 whitespace-nowrap text-left">TDS on Incent.</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-white/90 whitespace-nowrap text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length > 0 ? (
                paginatedData.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 text-left">
                      <span className="font-mono text-[12px] font-black text-slate-800 uppercase tracking-tight whitespace-nowrap">
                        {row.id}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-left">
                      <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${row.product === 'Flight' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                        {row.product}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-left">
                      <p className="text-sm font-bold text-slate-700 whitespace-nowrap">{row.date}</p>
                    </td>
                    <td className="py-4 px-6 text-left">
                      <p className="text-sm font-bold text-slate-700 whitespace-nowrap">{row.corporate}</p>
                    </td>
                    <td className="py-4 px-6 text-left">
                      <p className="text-sm font-bold text-slate-600">₹{row.grossFare.toLocaleString()}</p>
                    </td>
                    <td className="py-4 px-6 text-left bg-emerald-50/30">
                      <p className="text-sm font-black text-emerald-600">₹{row.commissionEarned.toLocaleString()}</p>
                    </td>
                    <td className="py-4 px-6 text-left bg-emerald-50/10">
                      <p className={`text-sm font-black ${row.hasPlbData ? 'text-emerald-500' : 'text-slate-400 font-medium'}`}>
                        {row.hasPlbData ? `₹${row.plbEarned.toLocaleString()}` : "N/A"}
                      </p>
                    </td>
                    <td className="py-4 px-6 text-left bg-emerald-50/10">
                      <p className={`text-sm font-black ${row.hasIncentiveData ? 'text-emerald-400' : 'text-slate-400 font-medium'}`}>
                        {row.hasIncentiveData ? `₹${row.incentiveEarned.toLocaleString()}` : "N/A"}
                      </p>
                    </td>
                    <td className="py-4 px-6 text-left bg-amber-50/30">
                      <p className="text-sm font-black text-amber-600">₹{row.tdsOnCommission.toLocaleString()}</p>
                    </td>
                    <td className="py-4 px-6 text-left bg-amber-50/10">
                      <p className={`text-sm font-black ${row.hasPlbData ? 'text-amber-500' : 'text-slate-400 font-medium'}`}>
                        {row.hasPlbData ? `₹${row.tdsOnPlb.toLocaleString()}` : "N/A"}
                      </p>
                    </td>
                    <td className="py-4 px-6 text-left bg-amber-50/10">
                      <p className={`text-sm font-black ${row.hasIncentiveData ? 'text-amber-400' : 'text-slate-400 font-medium'}`}>
                        {row.hasIncentiveData ? `₹${row.tdsOnIncentive.toLocaleString()}` : "N/A"}
                      </p>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button 
                        onClick={() => setSelectedBooking(row)}
                        className="p-2 bg-slate-50 hover:bg-[#003399] text-[#003399] hover:text-white rounded-xl transition-all shadow-sm border border-slate-200 hover:border-[#003399]"
                        title="View Details"
                      >
                        <FiEye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-12 px-6 text-center text-sm font-bold text-slate-400">
                    No bookings found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap gap-3 items-center justify-between px-6 py-3 border-t border-slate-100 bg-white">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Page {currentPage} of {totalPages}
            </span>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              showFirstLast
            />
          </div>
        </div>
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 bg-linear-to-r from-[#003399] to-[#000d26] text-white">
              <div>
                <h3 className="text-lg font-black uppercase tracking-widest text-white/90">{selectedBooking.corporate} - Tax & Order Details</h3>
                <p className="text-[12px] font-mono font-bold text-white/60 uppercase tracking-wider mt-1">Order ID: {selectedBooking.id}</p>
              </div>
              <button 
                onClick={() => setSelectedBooking(null)} 
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <FiX size={20} className="text-white/80" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto bg-slate-50/50">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Type</p>
                  <p className="text-sm font-bold text-slate-800">{selectedBooking.product}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Corporate</p>
                  <p className="text-sm font-bold text-slate-800 truncate" title={selectedBooking.corporate}>{selectedBooking.corporate}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gross Fare</p>
                  <p className="text-sm font-bold text-slate-800">₹{selectedBooking.grossFare.toLocaleString()}</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 shadow-sm">
                  <p className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-1">Commission</p>
                  <p className="text-sm font-black text-emerald-600">₹{selectedBooking.commissionEarned.toLocaleString()}</p>
                </div>
              </div>

              {/* Full Pricing Details Section */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-8">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#C9A84C]"></span>
                  Pricing Details
                </h4>
                
                {selectedBooking.product === "Flight" && selectedBooking.originalData?.fareDetails && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-5 gap-x-6">
                    {Object.entries(selectedBooking.originalData.fareDetails).map(([k, v]) => {
                      if (typeof v === 'object' && v !== null) return null;
                      return (
                        <div key={k}>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{k.replace(/([A-Z])/g, ' $1').trim()}</p>
                          <p className="text-sm font-black text-slate-700">{typeof v === 'number' && k !== 'ServiceFeeDisplayType' ? `₹${v.toLocaleString()}` : v}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedBooking.product === "Hotel" && selectedBooking.originalData?.priceBreakdown && (
                  <div className="flex flex-col gap-4">
                    {selectedBooking.originalData.priceBreakdown.map((pb, idx) => (
                      <div key={idx} className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                         {Object.entries(pb).map(([k, v]) => {
                           if (typeof v === 'object' && v !== null) return null;
                           return (
                              <div key={k}>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{k.replace(/([A-Z])/g, ' $1').trim()}</p>
                                <p className="text-sm font-black text-slate-700">{typeof v === 'number' ? `₹${v.toLocaleString()}` : v}</p>
                              </div>
                           );
                         })}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tax Breakup Section */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#003399]"></span>
                  Tax Breakdown
                </h4>
                
                {selectedBooking.taxDetails && selectedBooking.taxDetails.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedBooking.taxDetails.map((t, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
                        <div className="flex items-start justify-between mb-3">
                          <p className="font-black text-[11px] text-[#003399] uppercase tracking-wider bg-[#003399]/10 px-2 py-1 rounded-md">
                            {t.type.replace('Tax_', '')}
                          </p>
                          <p className="font-black text-base text-slate-800">
                            ₹{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        
                        {(t.percentage !== null || t.taxableAmount !== null) && (
                          <div className="flex justify-between items-center text-[10px] bg-white px-3 py-2 rounded-lg border border-slate-100">
                            {t.percentage !== null && (
                              <div className="flex flex-col">
                                <span className="text-slate-400 font-bold uppercase tracking-wider">Rate</span>
                                <span className="font-black text-slate-700">{t.percentage}%</span>
                              </div>
                            )}
                            {t.taxableAmount !== null && (
                              <div className="flex flex-col text-right">
                                <span className="text-slate-400 font-bold uppercase tracking-wider">Taxable Amt</span>
                                <span className="font-black text-slate-700">₹{t.taxableAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[12px] font-bold text-slate-500">No detailed tax breakup available.</p>
                    <p className="text-[14px] font-black text-slate-700 mt-1">Total Tax: ₹{selectedBooking.tax.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
