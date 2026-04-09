// utils/documentParser.js
exports.parseDocumentData = (text, type) => {
  const cleaned = text.replace(/\n/g, " ").toUpperCase();

  const panMatch = cleaned.match(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/);

  const normalDates = cleaned.match(/\b\d{2}[\/\-]\d{2}[\/\-]\d{4}\b/g) || [];

  const compactDates =
    cleaned.match(/\b\d{8}\b/g)?.map((d) => {
      return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
    }) || [];

  let allDates = [...normalDates, ...compactDates];

  // ================= PAN FIX =================
  if (type === "pan") {
    const dobMatch = cleaned.match(
      /(DATE OF BIRTH|DOB)[^0-9]*([0-9\/\-]{8,10})/,
    );

    let dob = null;

    if (dobMatch) {
      dob = dobMatch[2]
        .replace(/-/g, "/")
        .replace(/(\d{2})(\d{2})(\d{4})/, "$1/$2/$3");
    }

    // 🔥 Convert all dates to comparable format
    const parsedDates = allDates.map((d) => {
      const [day, month, year] = d.split("/").map(Number);
      return {
        raw: d,
        date: new Date(year, month - 1, day),
        year,
      };
    });

    // ❌ Remove DOB
    const filtered = parsedDates.filter((d) => d.raw !== dob);

    // ✅ Pick MOST RECENT date → Issue Date
    const issueDateObj = filtered.sort((a, b) => b.date - a.date)[0];

    return {
      number: panMatch?.[0] || "",
      issueDate: issueDateObj ? issueDateObj.raw : null,
      expiry: null,
    };
  }

  // ================= NORMAL =================
  return {
    number: panMatch?.[0] || "",
    issueDate: allDates[0] || "",
    expiry: allDates.length > 1 ? allDates[allDates.length - 1] : "",
  };
};
