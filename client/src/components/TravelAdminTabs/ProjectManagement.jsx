import { useState, useRef, useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";
import { ToastWithTimer } from "../../utils/ToastConfirm";

import {
  HiDocumentText,
  HiXMark,
  HiCloudArrowUp,
  HiArrowDownTray,
  HiCheckCircle,
  HiExclamationCircle,
  HiExclamationTriangle,
  HiTableCells,
  HiUsers,
  HiCheckBadge,
  HiNoSymbol,
} from "react-icons/hi2";
import { MdOutlineFolder } from "react-icons/md";
import { HiArrowRight } from "react-icons/hi2";
import { uploadProjectsExcel } from "../../Redux/Actions/project.thunk";
import { fetchCorporateAdmin } from "../../Redux/Slice/corporateAdminSlice";

// ─── Constants ──────────────────────────────────────────────────────────────
const REQUIRED_HEADERS = ["Project Name", "Project Code ID", "Client Name"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(d) {
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtSize(bytes) {
  return (bytes / 1024).toFixed(1) + " KB";
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  borderColor,
  iconBg,
  iconColor,
}) {
  return (
    <div
      className={`bg-white rounded-xl p-5 shadow-sm border-l-4 ${borderColor} flex items-center gap-4`}
    >
      <div
        className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}
      >
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
          {label}
        </p>
        <p className="text-3xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function ValidationBox({ type, title, items }) {
  const styles = {
    success: "bg-emerald-50 border border-emerald-200 text-emerald-700",
    error: "bg-rose-50   border border-rose-200   text-rose-700",
    warning: "bg-amber-50  border border-amber-200  text-amber-700",
  };
  const Icon =
    type === "success"
      ? HiCheckCircle
      : type === "error"
        ? HiExclamationCircle
        : HiExclamationTriangle;
  return (
    <div className={`rounded-lg px-4 py-3 text-[13px] ${styles[type]}`}>
      <div className="flex items-start gap-2">
        <Icon className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">{title}</p>
          {items.length > 0 && (
            <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[12px]">
              {items.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ total, uploaded, skipped, failed }) {
  const pct = (v) => (total > 0 ? ((v / total) * 100).toFixed(1) + "%" : "0%");
  return (
    <div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden flex gap-px">
        <div
          className="h-full bg-emerald-500 rounded-l-full transition-all duration-700"
          style={{ width: pct(uploaded) }}
        />
        <div
          className="h-full bg-amber-400 transition-all duration-700"
          style={{ width: pct(skipped) }}
        />
        <div
          className="h-full bg-rose-500 rounded-r-full transition-all duration-700"
          style={{ width: pct(failed) }}
        />
      </div>
      <div className="flex gap-4 text-[11px] text-slate-400 mt-2">
        {[
          ["bg-emerald-500", "Uploaded"],
          ["bg-amber-400", "Skipped"],
          ["bg-rose-500", "Failed"],
        ].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${c} inline-block`} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ProjectManagement() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [validation, setValidation] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const { loading, insertedCount, skippedCount } = useSelector(
    (state) => state.corporateProject,
  );
  const { corporate } = useSelector((state) => state.corporateAdmin);

  useEffect(() => {
    if (!corporate) {
      dispatch(fetchCorporateAdmin());
    }
  }, [corporate, dispatch]);

  // ── File handling ────────────────────────────────────────────
  const loadFile = useCallback((file) => {
    if (!file) return;
    const allowed = [".xlsx", ".xls", ".csv"];
    if (!allowed.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      setValidation({
        type: "error",
        title: "Invalid file type. Please upload .xlsx, .xls, or .csv.",
        items: [],
      });
      return;
    }
    setSelectedFile(file);
    setValidation(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (!rows.length) {
          setValidation({ type: "error", title: "File is empty.", items: [] });
          return;
        }
        const headers = rows[0].map((h) => String(h || "").trim());
        const missing = REQUIRED_HEADERS.filter((r) => !headers.includes(r));
        if (missing.length) {
          setValidation({
            type: "error",
            title: "Missing required column headers:",
            items: missing.map((m) => `"${m}"`),
          });
        } else {
          const dataRows = rows
            .slice(1)
            .filter((r) => r.some((c) => c !== undefined && c !== ""));
          setValidation({
            type: "success",
            title: `File is valid — ${dataRows.length} data row(s) ready to process.`,
            items: [],
          });
        }
      } catch {
        setValidation({
          type: "error",
          title: "Cannot read file. Ensure it is a valid Excel or CSV format.",
          items: [],
        });
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      loadFile(e.dataTransfer.files[0]);
    },
    [loadFile],
  );

  const removeFile = () => {
    setSelectedFile(null);
    setValidation(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Process upload ───────────────────────────────────────────
  const processUpload = async () => {
    if (!selectedFile) return;
    try {
      const res = await dispatch(uploadProjectsExcel(selectedFile)).unwrap();
      setResult({
        total: res.insertedCount + res.skippedCount,
        uploaded: res.insertedCount,
        skipped: res.skippedCount,
        failed: 0,
        ts: new Date(),
      });
      ToastWithTimer({
        type: res.insertedCount > 0 ? "success" : "error",
        message:
          res.insertedCount > 0
            ? `${res.insertedCount} project(s) uploaded`
            : "No new projects added",
      });
      removeFile();
    } catch (err) {
      ToastWithTimer({
        type: "error",
        message: err.message || "Upload failed",
      });
    }
  };

  // ── Download template ────────────────────────────────────────
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["Project Name", "Project Code ID", "Client Name"],
      ["Alpha Portal", "PRJ-001", "Acme Corp"],
      ["Beta Dashboard", "PRJ-002", "TechVision Ltd"],
      ["Gamma Analytics", "PRJ-003", "Nexus Solutions"],
    ]);
    ws["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, ws, "Projects");
    XLSX.writeFile(wb, "project_upload_template.xlsx");
    ToastWithTimer({ type: "success", message: "Template downloaded!" });
  };

  // ── Derived ──────────────────────────────────────────────────
  const clients = [...new Set(projects.map((p) => p.client))].sort();
  const totalClients = clients.length;
  const activeCount = projects.filter((p) => p.active).length;
  const inactiveCount = projects.length - activeCount;
  const canUpload =
    selectedFile && validation?.type === "success" && !uploading;

  // ────────────────────────────────────────────────────────────
  return (
    <div
      className="flex min-h-screen bg-slate-100 font-sans"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <main className="flex-1 overflow-y-auto">
        {/* Page heading */}
        <div className="flex items-start gap-4 mb-7">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0">
            <MdOutlineFolder className="w-6 h-6 text-[#2a9d8f]" />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold text-slate-800">
              Project Management
            </h1>
            <p className="text-[13px] text-slate-500 mt-0.5">
              Manage and upload project records for{" "}
              <strong className="text-slate-700">
                {corporate?.ssoConfig?.domain || corporate?.corporateName || "your corporate"}
              </strong>{" "}domain
            </p>
          </div>
        </div>

        {/* Upload + Instructions */}
        <div className="grid grid-cols-5 gap-5 mb-7">
          {/* Upload card */}
          <div className="col-span-3 bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-[15px] font-semibold text-slate-800">
                Bulk Upload Projects
              </h2>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-[#2a9d8f] hover:text-[#228f82] transition"
              >
                <HiArrowDownTray className="w-3.5 h-3.5" />
                Download Template
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Drop zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                  ${
                    dragOver
                      ? "border-[#2a9d8f] bg-teal-50/60"
                      : "border-slate-200 hover:border-[#2a9d8f] hover:bg-teal-50/40"
                  }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => loadFile(e.target.files[0])}
                />
                <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mx-auto mb-3">
                  <HiCloudArrowUp className="w-6 h-6 text-[#2a9d8f]" />
                </div>
                <h3 className="text-[14px] font-semibold text-slate-700 mb-1">
                  Drag &amp; drop your Excel file here
                </h3>
                <p className="text-[12px] text-slate-400">
                  or{" "}
                  <span className="text-[#2a9d8f] font-semibold">
                    browse to upload
                  </span>
                  &nbsp;·&nbsp; .xlsx, .xls, .csv
                </p>
              </div>

              {/* Required columns */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                <p className="text-[12px] font-semibold text-slate-500 mb-2">
                  Required column headers:
                </p>
                <div className="flex flex-wrap gap-2">
                  {REQUIRED_HEADERS.map((h) => (
                    <span
                      key={h}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[11px] font-semibold rounded-full"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
                      {h}
                    </span>
                  ))}
                </div>
              </div>

              {/* File info bar */}
              {selectedFile && (
                <div className="flex items-center gap-3 px-4 py-2.5 bg-teal-50 border border-teal-200 rounded-lg">
                  <HiDocumentText className="w-4 h-4 text-[#2a9d8f] shrink-0" />
                  <span className="text-[13px] font-semibold text-slate-700 flex-1 truncate">
                    {selectedFile.name}
                  </span>
                  <span className="text-[12px] text-slate-500 whitespace-nowrap">
                    {fmtSize(selectedFile.size)}
                  </span>
                  <button
                    onClick={removeFile}
                    className="w-6 h-6 rounded-full bg-white/60 flex items-center justify-center hover:bg-white transition shrink-0"
                  >
                    <HiXMark className="w-3 h-3 text-slate-500" />
                  </button>
                </div>
              )}

              {/* Validation */}
              {validation && <ValidationBox {...validation} />}

              {/* Action buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={processUpload}
                  disabled={!canUpload || loading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-[13px] font-semibold transition
                    disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed
                    enabled:bg-[#1b3a4b] enabled:hover:bg-[#122838]"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <HiCloudArrowUp className="w-4 h-4" />
                      Upload Projects
                    </>
                  )}
                </button>
                <button
                  onClick={removeFile}
                  className="px-5 py-2.5 rounded-lg border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Instructions card */}
          <div className="col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-[15px] font-semibold text-slate-800">
                How to Upload
              </h2>
            </div>
            <div className="p-5">
              <ol className="space-y-4">
                {[
                  {
                    n: 1,
                    t: "Download the template",
                    d: "Use the provided template to ensure correct column headers.",
                  },
                  {
                    n: 2,
                    t: "Fill in project data",
                    d: "Add Project Name, Project Code ID, and Client Name for each row.",
                  },
                  {
                    n: 3,
                    t: "Upload the file",
                    d: "Drag & drop or browse to select your .xlsx / .csv file.",
                  },
                  {
                    n: 4,
                    t: "Review the results",
                    d: "Check uploaded, skipped & failed counts after processing.",
                  },
                ].map(({ n, t, d }) => (
                  <li key={n} className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#1b3a4b] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {n}
                    </span>
                    <div>
                      <strong className="text-[13px] font-semibold text-slate-700 block">
                        {t}
                      </strong>
                      <span className="text-[12px] text-slate-400">{d}</span>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <p className="text-[12px] font-semibold text-amber-700 mb-1.5 flex items-center gap-1.5">
                  <HiExclamationTriangle className="w-3.5 h-3.5" /> Rows will be
                  skipped if:
                </p>
                <ul className="text-[12px] text-amber-600 space-y-0.5 pl-4 list-disc">
                  <li>Project Code ID already exists</li>
                  <li>Any required field is empty or blank</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Result Summary */}
        {result && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-7">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-[15px] font-semibold text-slate-800">
                Upload Summary
              </h2>
              <span className="text-[12px] text-slate-400">
                Processed on {fmtDate(result.ts)} ·{" "}
                {result.ts.toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-4 gap-4 mb-5">
                {[
                  {
                    label: "Total Rows",
                    val: result.total,
                    bg: "bg-slate-50",
                    text: "text-slate-800",
                    iconBg: "bg-indigo-50",
                    icon: <HiTableCells className="w-4 h-4 text-indigo-500" />,
                  },
                  {
                    label: "Uploaded",
                    val: result.uploaded,
                    bg: "bg-emerald-50",
                    text: "text-emerald-700",
                    iconBg: "bg-emerald-100",
                    icon: (
                      <HiCheckCircle className="w-4 h-4 text-emerald-600" />
                    ),
                  },
                  {
                    label: "Skipped",
                    val: result.skipped,
                    bg: "bg-amber-50",
                    text: "text-amber-700",
                    iconBg: "bg-amber-100",
                    icon: (
                      <HiExclamationTriangle className="w-4 h-4 text-amber-600" />
                    ),
                  },
                  {
                    label: "Failed",
                    val: result.failed,
                    bg: "bg-rose-50",
                    text: "text-rose-700",
                    iconBg: "bg-rose-100",
                    icon: (
                      <HiExclamationCircle className="w-4 h-4 text-rose-600" />
                    ),
                  },
                ].map(({ label, val, bg, text, iconBg, icon }) => (
                  <div
                    key={label}
                    className={`text-center ${bg} rounded-xl p-4`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center mx-auto mb-2`}
                    >
                      {icon}
                    </div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                      {label}
                    </p>
                    <p className={`text-[28px] font-bold ${text}`}>{val}</p>
                  </div>
                ))}
              </div>
              <ProgressBar {...result} />
            </div>
          </div>
        )}

        {/* ── View Projects Button ── */}
        <div className="bg-white rounded-xl shadow-sm px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <HiTableCells className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-slate-800">
                Projects Directory
              </p>
              <p className="text-[12px] text-slate-400 mt-0.5">
                Browse, search and manage all uploaded project records
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/projects-table")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1b3a4b] hover:bg-[#122838] text-white text-[13px] font-semibold transition"
          >
            View All Projects
            <HiArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
}
