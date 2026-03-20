// TravelDocument.jsx


import React, { useEffect, useState, useRef } from "react";
import {
  FiUpload,
  FiTrash2,
  FiEye,
  FiFileText,
  FiCreditCard,
  FiGlobe,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
} from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchMyDocuments,
  uploadDocument,
  deleteDocument,
} from "../../Redux/Slice/documentSlice";
import { ToastWithTimer } from "../../utils/ToastConfirm";
import Swal from "sweetalert2";

const DOC_TYPES = [
  { value: "passport", label: "Passport", icon: FiGlobe },
  { value: "visa", label: "Visa", icon: FiFileText },
  { value: "pan", label: "PAN Card", icon: FiCreditCard },
];

const STATUS_MAP = {
  expired: {
    label: "Expired",
    icon: FiAlertCircle,
    badge: "bg-red-50 text-red-600 border border-red-200",
  },
  soon: {
    label: "Expiring Soon",
    icon: FiClock,
    badge: "bg-amber-50 text-amber-600 border border-amber-200",
  },
  valid: {
    label: "Valid",
    icon: FiCheckCircle,
    badge: "bg-green-50 text-green-600 border border-green-200",
  },
};

export default function TravelDocuments() {
  const dispatch = useDispatch();
  const { documents, uploading, error } = useSelector((s) => s.documents);
  const fileRef = useRef();
  const [dragOver, setDragOver] = useState(false);
  const [form, setForm] = useState({
    type: "visa",
    name: "",
    number: "",
    expiry: "",
    file: null,
  });

  useEffect(() => {
    dispatch(fetchMyDocuments());
  }, [dispatch]);

  useEffect(() => {
    if (error) ToastWithTimer({ message: error, type: "error" });
  }, [error]);

  const getStatus = (expiry, type) => {
    if (type === "pan") return null; // ✅ PAN has no status

    if (!expiry) return null;

    const diff = (new Date(expiry) - new Date()) / 86400000;

    if (diff < 0) return STATUS_MAP.expired;
    if (diff <= 30) return STATUS_MAP.soon;
    return STATUS_MAP.valid;
  };

  const handleUpload = async () => {
    if (!form.file) {
      ToastWithTimer({ message: "Please select a file first", type: "error" });
      return;
    }
    try {
      const res = await dispatch(uploadDocument(form)).unwrap();
      ToastWithTimer({
        message: "Document uploaded successfully",
        type: "success",
      });
      if (res?.extracted) {
        setForm({
          type: form.type,
          name: "",
          number: res.extracted.number || "",
          expiry: res.extracted.expiry || "",
          file: null,
        });
      } else {
        setForm((f) => ({
          ...f,
          name: "",
          number: "",
          expiry: "",
          file: null,
        }));
      }
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      ToastWithTimer({ message: err || "Upload failed", type: "error" });
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This document will be permanently deleted",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        await dispatch(deleteDocument(id)).unwrap();

        // ✅ success toast (keep using sonner)
        ToastWithTimer({
          message: "Document deleted successfully",
          type: "success",
        });

        // optional success popup
        // Swal.fire("Deleted!", "Your document has been deleted.", "success");
      } catch (err) {
        ToastWithTimer({
          message: err || "Delete failed",
          type: "error",
        });
      }
    }
  };

  const expiringCount = documents.filter(
    (d) => getStatus(d.expiry)?.label === "Expiring Soon",
  ).length;

  const passport = documents.find((d) => d.type === "passport");
  const visas = documents.filter((d) => d.type === "visa");
  const pan = documents.find((d) => d.type === "pan");

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Travel Documents
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage your passports, visas &amp; IDs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center px-5 py-2.5 bg-white border border-slate-200 rounded-xl">
            <span className="text-xl font-bold text-[#0A4D68]">
              {documents.length}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-slate-400 mt-0.5">
              Total
            </span>
          </div>
          <div className="flex flex-col items-center px-5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
            <span className="text-xl font-bold text-amber-600">
              {expiringCount}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-amber-400 mt-0.5">
              Expiring
            </span>
          </div>
        </div>
      </div>

      {/* ── Upload Card ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-10">
        {/* Card header */}
        <div className="flex items-center gap-2.5 mb-5">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#0A4D68]/10 text-[#0A4D68]">
            <FiUpload size={15} />
          </span>
          <span className="text-sm font-semibold text-slate-700">
            Upload New Document
          </span>
        </div>

        {/* Type pills */}
        <div className="flex flex-wrap gap-2 mb-5">
          {DOC_TYPES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  type: value,
                  expiry: value === "pan" ? "" : f.expiry, // ✅ reset expiry
                }))
              }
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-150
                ${
                  form.type === value
                    ? "bg-[#0A4D68] text-white border-[#0A4D68]"
                    : "bg-slate-50 text-slate-500 border-slate-200 hover:border-[#0A4D68]/40 hover:text-[#0A4D68]"
                }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {[
            {
              label: "Document Name",
              key: "name",
              type: "text",
            },
            {
              label: "Document Number",
              key: "number",
              type: "text",
            },
            ...(form.type !== "pan"
              ? [
                  {
                    label: "Expiry Date",
                    key: "expiry",
                    type: "date",
                  },
                ]
              : []),
          ].map(({ label, placeholder, key, type }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {label}
              </label>
              <input
                type={type}
                placeholder={placeholder}
                value={form[key]}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [key]: e.target.value }))
                }
                className="px-3 py-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg
                  outline-none focus:border-[#0A4D68] focus:ring-2 focus:ring-[#0A4D68]/10 transition"
              />
            </div>
          ))}
        </div>

        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) setForm((s) => ({ ...s, file: f }));
          }}
          className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-8 cursor-pointer
            transition-all duration-200 mb-4
            ${
              dragOver || form.file
                ? "border-[#0A4D68] bg-[#0A4D68]/5"
                : "border-slate-200 bg-slate-50 hover:border-[#0A4D68]/50 hover:bg-[#0A4D68]/5"
            }`}
        >
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) =>
              setForm((f) => ({ ...f, file: e.target.files[0] }))
            }
          />
          {form.file ? (
            <>
              <FiFileText size={22} className="text-[#0A4D68]" />
              <span className="text-sm font-medium text-[#0A4D68]">
                {form.file.name}
              </span>
              <span className="text-xs text-slate-400">
                Click to change file
              </span>
            </>
          ) : (
            <>
              <FiUpload size={22} className="text-slate-300" />
              <span className="text-sm text-slate-500">
                Drop file here or{" "}
                <span className="text-[#0A4D68] font-semibold underline">
                  browse
                </span>
              </span>
              <span className="text-xs text-slate-400">
                PDF, JPG, PNG up to 10MB
              </span>
            </>
          )}
        </div>

        {/* OCR badge */}
        {form.number && (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 mb-4">
            <FiCheckCircle size={12} />
            OCR extracted: <strong>{form.number}</strong>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleUpload}
          disabled={uploading}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150
            ${
              uploading
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-[#0A4D68] text-white hover:bg-[#083d52] active:scale-[0.99]"
            }`}
        >
          <FiUpload size={14} />
          {uploading ? "Uploading…" : "Upload Document"}
        </button>
      </div>

      {/* ── Document Sections ── */}
      <DocSection
        title="Passport"
        icon={FiGlobe}
        data={passport ? [passport] : []}
        getStatus={getStatus}
        onDelete={handleDelete}
      />
      <DocSection
        title="Visas"
        icon={FiFileText}
        data={visas}
        getStatus={getStatus}
        onDelete={handleDelete}
      />
      <DocSection
        title="PAN Card"
        icon={FiCreditCard}
        data={pan ? [pan] : []}
        getStatus={getStatus}
        onDelete={handleDelete}
      />
    </div>
  );
}

// ── Section ──────────────────────────────────────────────
function DocSection({ title, icon: Icon, data, getStatus, onDelete }) {
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-[#0A4D68]" />
          <h2 className="text-base font-semibold text-slate-700">{title}</h2>
        </div>
        <span className="text-xs font-semibold text-[#0A4D68] bg-[#0A4D68]/10 px-3 py-0.5 rounded-full">
          {data.length}
        </span>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 bg-white rounded-xl border-2 border-dashed border-slate-200">
          <Icon size={26} className="text-slate-200" />
          <p className="text-sm text-slate-400">
            No {title.toLowerCase()} uploaded yet
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((doc) => (
            <DocumentCard
              key={doc._id}
              doc={doc}
              getStatus={getStatus}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────
function DocumentCard({ doc, getStatus, onDelete }) {
  const status = getStatus(doc.expiry, doc.type);

  return (
    <div
      className="group bg-white rounded-xl border border-slate-200 overflow-hidden
      hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Accent bar */}
      <div className="h-1 bg-linear-to-r from-[#0A4D68] to-[#088395]" />

      <div className="p-4">
        {/* Top */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 leading-tight">
              {doc.name || doc.type}
            </h3>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-0.5">
              {doc.type}
            </p>
          </div>
          {status && (
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${status.badge}`}
            >
              <status.icon size={10} />
              {status.label}
            </span>
          )}
        </div>

        {/* Meta */}
        <div className="flex gap-5 mb-4">
          {doc.number && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">
                Number
              </p>
              <p className="text-sm font-semibold text-slate-700">
                {doc.number}
              </p>
            </div>
          )}
          {doc.type !== "pan" && doc.expiry && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">
                Expires
              </p>
              <p className="text-sm font-semibold text-slate-700">
                {new Date(doc.expiry).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          )}
          {doc.type === "pan" && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">
                PAN Card
              </p>
              <p className="text-sm font-semibold text-slate-700">
                No expiry / issue date
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <a
            href={doc.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0A4D68]
              bg-[#0A4D68]/8 hover:bg-[#0A4D68]/15 border border-[#0A4D68]/20
              px-3 py-1.5 rounded-lg transition"
          >
            <FiEye size={12} /> View Document
          </a>
          <button
            onClick={() => onDelete(doc._id)}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-red-100
              bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition"
          >
            <FiTrash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
