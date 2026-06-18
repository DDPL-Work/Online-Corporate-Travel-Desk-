const fs = require('fs');
const p = 'C:\\DDPL\\Work\\Corporate-travel-desk\\Online-Corporate-Travel-Desk-\\super-admin\\src\\components\\SuperAdminTabs\\TotalRevenueBreakdown.jsx';
let code = fs.readFileSync(p, 'utf-8');

// Replace thunks import
code = code.replace(/import \{\n\s*fetchRevenueSummary[\s\S]*?\} from "\.\.\/\.\.\/Redux\/Actions\/corporate\.related\.thunks";/g, '');

// Replace state variables
code = code.replace(/const \[monthly, setMonthly\] = useState\(\[\]\);\n/g, '');
code = code.replace(/const \[quarterly, setQuarterly\] = useState\(\[\]\);\n/g, '');
code = code.replace(/const \[halfYearly, setHalfYearly\] = useState\(\[\]\);\n/g, '');
code = code.replace(/const \[yearly, setYearly\] = useState\(\[\]\);\n/g, '');

// Replace fetchData function
const newFetchData = `const fetchData = async () => {
    setLoading(true);
    const params = {
      fromDate: computedDates.from,
      toDate: computedDates.to,
      corporateId: selectedCorporate,
      bookingType,
    };

    try {
      const res = await api.get('/corporate-related/revenue/total-breakdown', { params });
      const data = res.data.data;
      setSummary(data.summary);
      setCompanyWise(data.companyWise);
      setDaily(data.daily);
      setDrillDownData(data.drillDownData);
      setLeaderboardPage(1);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch revenue breakdown');
    } finally {
      setLoading(false);
    }
  };`;

code = code.replace(/const fetchData = async \(\) => \{[\s\S]*?finally \{\n\s*setLoading\(false\);\n\s*\}\n\s*\};/g, newFetchData);

fs.writeFileSync(p, code);
console.log('Done replacement');
