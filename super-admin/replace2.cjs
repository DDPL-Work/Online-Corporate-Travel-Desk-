const fs = require('fs');
const p = 'C:\\DDPL\\Work\\Corporate-travel-desk\\Online-Corporate-Travel-Desk-\\super-admin\\src\\components\\SuperAdminTabs\\TotalRevenueBreakdown.jsx';
let code = fs.readFileSync(p, 'utf-8');

const oldKPI = `<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <KPICard
            label="Total Revenue"
            value={inr(summary?.totalRevenue)}
            trend={summary?.revenueGrowth}
            icon={<FaRupeeSign />}
            borderCls="border-[#000D26]"
            iconBgCls="bg-slate-100"
            iconColorCls="text-[#000D26]"
          />
          <KPICard
            label="Flight Revenue"
            value={inr(summary?.flights?.totalRevenue)}
            trend={summary?.flights?.growth}
            icon={<FaPlane />}
            borderCls="border-sky-500"
            iconBgCls="bg-sky-50"
            iconColorCls="text-sky-600"
          />
          <KPICard
            label="Hotel Revenue"
            value={inr(summary?.hotels?.totalRevenue)}
            trend={summary?.hotels?.growth}
            icon={<FaBuilding />}
            borderCls="border-violet-500"
            iconBgCls="bg-violet-50"
            iconColorCls="text-violet-600"
          />
          <KPICard
            label="Avg Booking Value"
            value={inr(summary?.avgBookingValue)}
            trend={summary?.avgValueGrowth}
            icon={<FaChartLine />}
            borderCls="border-emerald-500"
            iconBgCls="bg-emerald-50"
            iconColorCls="text-emerald-600"
          />
        </div>`;

const newKPI = `<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <KPICard
            label="Grand Total Revenue"
            value={inr(summary?.grandTotal)}
            icon={<FaRupeeSign />}
            borderCls="border-[#000D26]"
            iconBgCls="bg-slate-100"
            iconColorCls="text-[#000D26]"
          />
          <KPICard
            label="Total Supplier Fares"
            value={inr(summary?.totalSupplierFare)}
            icon={<FaPlane />}
            borderCls="border-sky-500"
            iconBgCls="bg-sky-50"
            iconColorCls="text-sky-600"
          />
          <KPICard
            label="Total Markup"
            value={inr(summary?.totalMarkup)}
            icon={<FiTrendingUp />}
            borderCls="border-emerald-500"
            iconBgCls="bg-emerald-50"
            iconColorCls="text-emerald-600"
          />
          <KPICard
            label="Service Charges"
            value={inr(summary?.totalServiceCharge)}
            icon={<FaChartLine />}
            borderCls="border-amber-500"
            iconBgCls="bg-amber-50"
            iconColorCls="text-amber-600"
          />
        </div>`;

code = code.replace(/<div className="grid grid-cols-1 md:grid-cols-4 gap-6">[\s\S]*?<\/div>/, newKPI);

fs.writeFileSync(p, code);
console.log('KPI replaced');
