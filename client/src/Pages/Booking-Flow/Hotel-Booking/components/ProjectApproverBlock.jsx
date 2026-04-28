// ProjectApproverBlock.jsx
// Drop this component into HotelReviewBooking.jsx and place <ProjectApproverBlock /> just above the confirm button

import React, { useState, useRef, useEffect } from "react";
import {
  FiBriefcase,
  FiSearch,
  FiUser,
  FiMail,
  FiChevronDown,
  FiX,
  FiCheck,
  FiEdit3,
  FiHash,
} from "react-icons/fi";
import { MdBusiness } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { fetchProjects } from "../../../../Redux/Actions/project.thunk";
import { fetchEmployees } from "../../../../Redux/Slice/employeeActionSlice";

/* ─────────────────────────────────────────────────────────────── */
/*  Dropdown with search                                            */
/* ─────────────────────────────────────────────────────────────── */
function SearchDropdown({
  placeholder,
  items,
  onSelect,
  renderItem,
  renderSelected,
  selectedItem,
  filterFn,
  getLabel = () => "",
  showAllOnEmpty = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered =
    query?.trim() || showAllOnEmpty ? items.filter((i) => filterFn(i, query)) : [];

  const displayValue =
    query !== "" ? query : selectedItem ? getLabel(selectedItem) : "";

  return (
    <div ref={ref} className="">
      <div className="relative">
        <FiSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={displayValue}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          placeholder={placeholder}
          className="w-full h-10 pl-8 pr-3 text-sm bg-white border border-slate-200 rounded-lg hover:border-[#0A203E]/40 focus:outline-none focus:border-[#0A203E] focus:ring-2 focus:ring-[#0A203E]/10 transition text-left text-slate-700 placeholder:text-slate-400"
        />
      </div>

      {open && (query?.trim() || showAllOnEmpty) && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-[12px] text-slate-400 text-center py-4">No results found</p>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { onSelect(item); setOpen(false); setQuery(""); }}
                  className="w-full text-left px-3 py-2.5 hover:bg-[#0A203E]/5 transition flex items-center justify-between group"
                >
                  {renderItem(item)}
                  {selectedItem?.id === item.id && (
                    <FiCheck size={13} className="text-[#0A203E] shrink-0 ml-2" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Main Block                                                      */
/* ─────────────────────────────────────────────────────────────── */
export function ProjectApproverBlock({ onChange }) {
  const getDisplayName = (item) => {
    if (!item) return "Unnamed";
    if (typeof item.name === "string") return item.name || "Unnamed";
    return `${item.name?.firstName || ""} ${item.name?.lastName || ""}`.trim() || "Unnamed";
  };

  const getInitials = (item) => {
    const nameStr = getDisplayName(item);
    return (
      nameStr
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "NA"
    );
  };

  // Project state
  const [selectedProject, setSelectedProject] = useState(null);
  const [manualProject, setManualProject] = useState(false);
  const [projectManual, setProjectManual] = useState({ id: "", name: "", client: "" });

  // Approver state
  const [selectedApprover, setSelectedApprover] = useState(null);
  const [manualApprover, setManualApprover] = useState(false);
  const [approverEmail, setApproverEmail] = useState("");

  const dispatch = useDispatch();
  const { projects } = useSelector((state) => state.corporateProject);
  const { employees } = useSelector((state) => state.employee);
  const { user } = useSelector((state) => state.auth);
  const { myPolicy } = useSelector((state) => state.ssrPolicy);
  const corporateId = user?.corporateId;

  const isTravelAdmin = user?.role === "travel-admin";
  const approvalRequired = !isTravelAdmin && myPolicy?.approvalRequired !== false;

  useEffect(() => {
    if (corporateId) {
      dispatch(fetchProjects(corporateId));
    }
    if (approvalRequired) {
      dispatch(fetchEmployees());
    }
  }, [corporateId, dispatch, approvalRequired]);

  // Notify parent whenever values change
  useEffect(() => {
    const project = manualProject ? projectManual : selectedProject;
    const isProjectValid = manualProject 
      ? (projectManual.id?.trim() && projectManual.name?.trim() && projectManual.client?.trim())
      : !!selectedProject;

    const approver = !approvalRequired 
      ? { 
          id: user?.id || user?._id || user?.userId, 
          email: user?.email, 
          name: `${user?.name?.firstName || ''} ${user?.name?.lastName || ''}`.trim(), 
          role: user?.role 
        }
      : manualApprover
        ? (approverEmail?.trim() ? { email: approverEmail } : null)
        : selectedApprover;

    onChange?.({
      project: isProjectValid ? project : null,
      approver: approver,
    });
  }, [selectedProject, projectManual, manualProject, selectedApprover, approverEmail, manualApprover, approvalRequired, user]);

  const clearProject = () => { setSelectedProject(null); setProjectManual({ id: "", name: "", client: "" }); };
  const clearApprover = () => { setSelectedApprover(null); setApproverEmail(""); };

  const matchingApprovers = (query) => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return employees.filter((e) => {
      const nameStr =
        typeof e.name === "string"
          ? e.name
          : `${e.name?.firstName || ""} ${e.name?.lastName || ""}`.trim();
      return (
        (nameStr && nameStr.toLowerCase().includes(q)) ||
        (e.email || "").toLowerCase().includes(q)
      );
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4">
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-[#C9A84C] to-[#C9A84C] px-5 py-4 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          {approvalRequired ? <FiBriefcase size={15} className="text-[#0A203E]" /> : <MdBusiness size={18} className="text-[#0A203E]" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-[#0A203E] truncate">
            {approvalRequired ? "Project & Approver" : "Project Details"}
          </h3>
          <p className="text-[11px] text-[#0A203E]/70 font-medium truncate">
            {approvalRequired 
              ? "Link booking to a project and assign an approver" 
              : "Link this booking to a project for tracking"}
          </p>
        </div>
        {!approvalRequired && (
          <div className="ml-auto shrink-0 pl-2">
            <span className="inline-block px-2 py-1 rounded text-[10px] font-bold text-[#0A203E] bg-white/20 border border-[#0A203E]/30 uppercase tracking-widest whitespace-nowrap leading-none">
              Auto Approved
            </span>
          </div>
        )}
      </div>

      <div className="divide-y divide-slate-100">

        {/* ════════════════════════════════════════ */}
        {/*  PART 1 — Project Selection              */}
        {/* ════════════════════════════════════════ */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <MdBusiness size={14} className="text-slate-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Project Selection <span className="text-red-500">*</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => { setManualProject((v) => !v); clearProject(); }}
              className="flex items-center gap-1 text-[11px] font-semibold text-[#0A203E]/70 hover:text-[#0A203E] transition"
            >
              <FiEdit3 size={11} />
              {manualProject ? "Search instead" : "Enter manually"}
            </button>
          </div>

          {!manualProject ? (
            <>
              <SearchDropdown
                placeholder="Search by project name, ID or client…"
                items={projects.map(p => ({ name: p.projectName, id: p.projectCodeId, client: p.clientName, _id: p._id }))}
                selectedItem={selectedProject}
                onSelect={setSelectedProject}
                getLabel={(item) => item.name || item.id || ""}
                showAllOnEmpty={true}
                filterFn={(item, q) =>
                  item.name.toLowerCase().includes(q.toLowerCase()) ||
                  item.id.toLowerCase().includes(q.toLowerCase()) ||
                  item.client.toLowerCase().includes(q.toLowerCase())
                }
                renderItem={(item) => (
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[13px] font-semibold text-slate-700 truncate">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-600 bg-slate-50 px-1.5 py-0.5 rounded">{item.id}</span>
                      <span className="text-[11px] text-slate-400 truncate">{item.client}</span>
                    </div>
                  </div>
                )}
                renderSelected={(item) => (
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-bold text-gray-600 bg-slate-50 px-1.5 py-0.5 rounded shrink-0">{item.id}</span>
                    <span className="text-[13px] font-semibold text-slate-700 truncate">{item.name}</span>
                    <span className="text-[11px] text-slate-400 truncate hidden sm:block">· {item.client}</span>
                  </div>
                )}
              />
              {selectedProject && (
                <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <FiCheck size={13} className="text-slate-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-gray-800 truncate">{selectedProject.name}</p>
                      <p className="text-[11px] text-slate-500">{selectedProject.id} · {selectedProject.client}</p>
                    </div>
                  </div>
                  <button type="button" onClick={clearProject} className="text-slate-400 hover:text-gray-700 ml-2 shrink-0">
                    <FiX size={14} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Project ID
                  </label>
                  <div className="relative">
                    <FiHash size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. PRJ-001"
                      value={projectManual.id}
                      onChange={(e) => setProjectManual((p) => ({ ...p, id: e.target.value }))}
                      className="h-10 w-full pl-7 pr-3 text-[13px] bg-white border border-slate-200 rounded-lg outline-none focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/10 transition text-slate-700 placeholder:text-slate-300"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Client Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corp"
                    value={projectManual.client}
                    onChange={(e) => setProjectManual((p) => ({ ...p, client: e.target.value }))}
                    className="h-10 w-full px-3 text-[13px] bg-white border border-slate-200 rounded-lg outline-none focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/10 transition text-slate-700 placeholder:text-slate-300"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Project Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Website Redesign"
                  value={projectManual.name}
                  onChange={(e) => setProjectManual((p) => ({ ...p, name: e.target.value }))}
                  className="h-10 w-full px-3 text-[13px] bg-white border border-slate-200 rounded-lg outline-none focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/10 transition text-slate-700 placeholder:text-slate-300"
                />
              </div>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════ */}
        {/*  PART 2 — Approver Selection             */}
        {/* ════════════════════════════════════════ */}
        {approvalRequired && (
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <FiUser size={13} className="text-[#0A203E]" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Approver / Manager <span className="text-red-500">*</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => { setManualApprover((v) => !v); clearApprover(); }}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#0A203E]/70 hover:text-[#0A203E] transition"
              >
                <FiEdit3 size={11} />
                {manualApprover ? "Search instead" : "Enter email manually"}
              </button>
            </div>

            {!manualApprover ? (
              <>
                <SearchDropdown
                  placeholder="Search manager by name or email…"
                  items={employees.map(e => ({
                    id: e.userId || e._id,
                    userId: e.userId,
                    employeeId: e._id,
                    name: e.name,
                    email: e.email,
                    role: e.role,
                  }))}
                  selectedItem={selectedApprover}
                  onSelect={setSelectedApprover}
                  getLabel={(item) => `${getDisplayName(item)} (${item.email || ""})`}
                  showAllOnEmpty={false}
                  filterFn={(item, q) => {
                    const nameStr =
                      typeof item.name === "string"
                        ? item.name
                        : `${item.name?.firstName || ""} ${item.name?.lastName || ""}`.trim();
                    return (
                      nameStr.toLowerCase().includes(q.toLowerCase()) ||
                      (item.email || "").toLowerCase().includes(q.toLowerCase())
                    );
                  }}
                  renderItem={(item) => (
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-bold text-slate-700 shrink-0">
                        {getInitials(item)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-slate-700">
                          {getDisplayName(item)}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {item.email} · {item.role}
                        </p>
                      </div>
                    </div>
                  )}
                  renderSelected={(item) => (
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-[#0A203E] shrink-0">
                        {getInitials(item)}
                      </div>
                      <span className="text-[13px] font-semibold text-slate-700 truncate">
                        {getDisplayName(item)}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate hidden sm:block">· {item.role}</span>
                    </div>
                  )}
                />
                {selectedApprover && (
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-bold text-[#0A203E] shrink-0">
                        {getInitials(selectedApprover)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-[#0A203E]">
                          {getDisplayName(selectedApprover)}
                        </p>
                        <p className="text-[11px] text-[#0A203E]/50 truncate">{selectedApprover.email}</p>
                      </div>
                    </div>
                    <button type="button" onClick={clearApprover} className="text-[#0A203E]/40 hover:text-[#0A203E] ml-2 shrink-0">
                      <FiX size={14} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Manager Email Address
                </label>
                <div className="relative">
                  <FiMail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    placeholder="e.g. manager@company.com"
                    value={approverEmail}
                    onChange={(e) => setApproverEmail(e.target.value)}
                    className="h-10 w-full pl-9 pr-3 text-[13px] bg-white border border-slate-200 rounded-lg outline-none focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/10 transition text-slate-700 placeholder:text-slate-300"
                  />
                </div>

                {approverEmail && matchingApprovers(approverEmail).length > 0 && (
                  <div className="border border-slate-200 rounded-lg mt-1 max-h-40 overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
                    {matchingApprovers(approverEmail).map((emp) => (
                      <button
                        key={emp._id || emp.userId}
                        type="button"
                        onClick={() => {
                          setSelectedApprover({
                            id: emp.userId || emp._id,
                            userId: emp.userId,
                            employeeId: emp._id,
                            name: emp.name,
                            email: emp.email,
                            role: emp.role,
                          });
                          setManualApprover(false);
                          setApproverEmail("");
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-white transition flex items-center gap-2"
                      >
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-[#0A203E] shrink-0">
                          {getInitials(emp)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-slate-700 truncate">
                            {getDisplayName(emp)}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">{emp.email} · {emp.role}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {approverEmail && /\S+@\S+\.\S+/.test(approverEmail) && (
                  <div className="flex items-center gap-2 mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[12px] text-[#0A203E] font-semibold">
                    <FiCheck size={12} className="text-[#C9A84C]" />
                    Approval request will be sent to <strong>{approverEmail}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Usage in HotelReviewBooking.jsx                               */
/*                                                                 */
/*  1. Import:                                                     */
/*     import { ProjectApproverBlock } from "./ProjectApproverBlock";
/*                                                                 */
/*  2. Add state near the top of HotelReviewBooking:              */
/*     const [projectApproverData, setProjectApproverData] =      */
/*        useState({ project: null, approver: null });             */
/*                                                                 */
/*  3. Place just above the confirm button in the price summary:   */
/*     <ProjectApproverBlock onChange={setProjectApproverData} />  */
/*                                                                 */
/*  4. Include in your payload (handleRequestApproval):            */
/*     projectName: projectApproverData.project?.name,             */
/*     projectId: projectApproverData.project?.id,                 */
/*     approverId: projectApproverData.approver?.id,               */
/*     approverEmail: projectApproverData.approver?.email,         */
/* ─────────────────────────────────────────────────────────────── */
