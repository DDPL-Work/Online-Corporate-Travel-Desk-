import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { ToastWithTimer } from "../../utils/ToastConfirm";
import { fetchProjects, deleteProject as deleteProjectAction } from "../../Redux/Actions/project.thunk";

import {
  HiMagnifyingGlass,
  HiEye,
  HiTrash,
  HiTableCells,
  HiUsers,
  HiCheckBadge,
  HiNoSymbol,
  HiChevronDown,
  HiDocumentText,
  HiArrowLeft,
} from "react-icons/hi2";
import { MdOutlineFolder } from "react-icons/md";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const AVATAR_PALETTES = [
  { bg: "bg-teal-100",   text: "text-teal-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-blue-100",   text: "text-blue-700" },
  { bg: "bg-orange-100", text: "text-orange-700" },
  { bg: "bg-emerald-100",text: "text-emerald-700" },
  { bg: "bg-rose-100",   text: "text-rose-700" },
  { bg: "bg-amber-100",  text: "text-amber-700" },
  { bg: "bg-cyan-100",   text: "text-cyan-700" },
];

function getAvatar(str) {
  const safeStr = String(str ?? "");
  let h = 0;
  for (const c of safeStr) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_PALETTES[h % AVATAR_PALETTES.length];
}

function initials(str) {
  const safeStr = String(str ?? "").trim();
  return safeStr
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function fmtDate(d) {
  const date = d ? new Date(d) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, borderColor, iconBg, iconColor }) {
  return (
    <div className={`bg-white rounded-xl p-5 shadow-sm border-l-4 ${borderColor} flex items-center gap-4`}>
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-3xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ProjectsTable({ projects, setProjects }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { projects: storedProjects, deleteLoading } = useSelector((state) => state.corporateProject);
  const { user } = useSelector((state) => state.auth);

  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [localProjects, setLocalProjects] = useState([]);

  const effectiveProjects = Array.isArray(projects) ? projects : localProjects;

  useEffect(() => {
    if (Array.isArray(storedProjects) && storedProjects.length > 0) {
      setLocalProjects(storedProjects);
    }
  }, [storedProjects]);

  const storedUser = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();

  const authUser = user ?? storedUser;
  const corporateId = authUser?.corporateId || authUser?.corporate?._id || authUser?._id;

  useEffect(() => {
    if (corporateId) {
      dispatch(fetchProjects(corporateId));
    }
  }, [dispatch, corporateId]);

  const handleDeleteProject = async (project) => {
    const projectId = project._id || project.id;
    if (!projectId || !corporateId) {
      ToastWithTimer({ type: "error", message: "Unable to delete project." });
      return;
    }

    const result = await Swal.fire({
      title: "Delete project?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await dispatch(
        deleteProjectAction({ id: projectId, corporateId })
      ).unwrap();

      ToastWithTimer({ type: "success", message: "Project deleted." });
      setLocalProjects((prev) => prev.filter((p) => (p._id || p.id) !== projectId));
    } catch (err) {
      ToastWithTimer({
        type: "error",
        message: err.message || "Failed to delete project.",
      });
    }
  };

  // ── Derived values ──────────────────────────────────────────
  const clients = [...new Set(effectiveProjects.map((p) => p.clientName || p.client || ""))]
    .filter(Boolean)
    .sort();
  const totalClients = clients.length;

  const filtered = effectiveProjects.filter((p) => {
    const q = search.toLowerCase();

    const name = (p.projectName || p.name || "").toLowerCase();
    const code = (p.projectCodeId || p.code || "").toLowerCase();
    const client = (p.clientName || p.client || "").toLowerCase();

    const matchQ = !q || name.includes(q) || code.includes(q) || client.includes(q);
    const matchC = !clientFilter || client === clientFilter.toLowerCase();
    return matchQ;
  });

  // ────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-slate-100 font-sans" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <main className="flex-1 overflow-y-auto p-6">

        {/* Page heading */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <HiTableCells className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <h1 className="text-[22px] font-semibold text-slate-800">Projects Directory</h1>
              <p className="text-[13px] text-slate-500 mt-0.5">
                All uploaded project records for <strong className="text-slate-700">acme.com</strong>
              </p>
            </div>
          </div>

          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            <HiArrowLeft className="w-4 h-4" />
            Back to Upload
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4 mb-7">
          <StatCard label="Total Projects" value={effectiveProjects.length} icon={HiTableCells}  borderColor="border-[#2a9d8f]"  iconBg="bg-teal-50"    iconColor="text-[#2a9d8f]" />
          <StatCard label="Total Clients"  value={totalClients}    icon={HiUsers}        borderColor="border-violet-500"  iconBg="bg-violet-50"  iconColor="text-violet-500" />
        </div>

        {/* Projects Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2">
              Projects
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-500 rounded-full">
                {filtered.length} record{filtered.length !== 1 ? "s" : ""}
              </span>
            </h2>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg w-56">
                <HiMagnifyingGlass className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search projects…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent border-none outline-none text-[13px] text-slate-700 placeholder-slate-400 w-full"
                />
              </div>

              {/* Client filter */}
              <div className="relative">
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-600 outline-none cursor-pointer"
                >
                  <option value="">All Clients</option>
                  {clients.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <HiChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "#1b3a4b" }}>
                  {["#", "Project", "Project Code ID", "Client Name", "Added On", "Actions"].map((h) => (
                    <th
                      key={h}
                      className={`px-5 py-3.5 text-[11px] font-semibold text-white/80 uppercase tracking-wider whitespace-nowrap
                        ${h === "Actions" ? "text-center" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const projectName = p.projectName || p.name || "Untitled Project";
                  const objectId = p._id || "";
                  const projectCode = p.projectCodeId || p.code || "—";
                  const clientName = p.clientName || p.client || "—";
                  const createdAt = p.createdAt || p.addedOn;
                  const av = getAvatar(projectName);
                  return (
                    <tr key={p._id || p.id || i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 text-[13px] text-slate-400 font-medium">{objectId}</td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${av.bg} ${av.text} flex items-center justify-center text-[12px] font-bold shrink-0`}>
                            {initials(projectName)}
                          </div>
                          <span className="text-[13px] font-semibold text-slate-800">{projectName}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[12px] font-mono font-semibold rounded-md">
                          {projectCode}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-[12px] font-semibold rounded-full border border-blue-100">
                          {clientName}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-[13px] text-slate-500">
                        {fmtDate(createdAt)}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            title="Delete"
                            onClick={() => handleDeleteProject(p)}
                            disabled={deleteLoading}
                            className="w-7 h-7 rounded-md border border-rose-200 bg-rose-50 flex items-center justify-center hover:bg-rose-100 transition disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <HiTrash className="w-3.5 h-3.5 text-rose-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Empty state */}
            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <HiDocumentText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-[14px] text-slate-400 font-medium">
                  {effectiveProjects.length === 0 ? "No projects yet" : "No projects match your search"}
                </p>
                <p className="text-[12px] text-slate-300 mt-1">
                  {effectiveProjects.length === 0
                    ? "Upload an Excel file on the previous page to get started"
                    : "Try adjusting your search or filters"}
                </p>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}