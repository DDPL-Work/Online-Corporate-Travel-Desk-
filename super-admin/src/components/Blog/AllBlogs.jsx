import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchBlogs,
  deleteBlog,
} from "../../Redux/Actions/blog.thunks";
import { clearError } from "../../Redux/Slice/blog.slice";
import {
  FaTrash,
  FaEdit,
  FaPlus,
  FaEye,
  FaSyncAlt,
  FaSearch,
  FaFilter,
  FaCalendar,
  FaUser,
  FaTag,
  FaThLarge,
  FaList,
  FaSort,
  FaFolder,
  FaGlobe,
  FaFileAlt,
  FaDownload,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { BlogViewModal } from "./components";
import useCsvExporter from "../../services/export/useCsvExporter";
import { blogArticlesExportTemplate } from "../../templates/exportTemplates/superAdminExportTemplates";

const BlogListPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { exportCsv, exportingKey } = useCsvExporter();
  const { items: blogs, loading, error } = useSelector((state) => state.blogs);

  // Modal states
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  // Filter, search, sort, pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [viewMode, setViewMode] = useState("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const blogsPerPage = 9;

  useEffect(() => {
    dispatch(fetchBlogs());
  }, [dispatch]);

  const filteredAndSortedBlogs = blogs
    .filter((blog) => {
      const matchesSearch =
        blog.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        blog.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        blog.summary?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || blog.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      if (sortBy === "created_at" || sortBy === "updated_at") {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      }
      return sortOrder === "asc"
        ? aValue > bValue
          ? 1
          : -1
        : aValue < bValue
        ? 1
        : -1;
    });

  const indexOfLastBlog = currentPage * blogsPerPage;
  const indexOfFirstBlog = indexOfLastBlog - blogsPerPage;
  const currentBlogs = filteredAndSortedBlogs.slice(
    indexOfFirstBlog,
    indexOfLastBlog
  );
  const totalPages = Math.ceil(filteredAndSortedBlogs.length / blogsPerPage);
  const isExporting = exportingKey === "blog_articles";

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: "Delete Blog?",
      text: "This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });
    if (result.isConfirmed) {
      try {
        await dispatch(deleteBlog(id)).unwrap();
        Swal.fire("Deleted!", "The blog has been deleted.", "success");
      } catch (err) {
        Swal.fire("Error!", err || "Failed to delete blog.", "error");
      }
    }
  };

  const handleEdit = (blog, e) => {
    e.stopPropagation();
    navigate(`/blog-and-articles/${blog._id}/edit`);
  };

  const handleView = (blog, e) => {
    if (e) e.stopPropagation();
    setSelectedBlog(blog);
    setIsViewOpen(true);
  };

  const handleRefresh = async () => {
    try {
      await dispatch(fetchBlogs()).unwrap();
    } catch (err) {
      Swal.fire("Error!", err || "Failed to refresh blogs", "error");
    }
  };

  const handleExport = () => {
    if (loading) return;

    exportCsv({
      key: "blog_articles",
      data: currentBlogs,
      columns: blogArticlesExportTemplate,
      filenamePrefix: "blog_articles_export",
      emptyMessage: "No blog articles available to export",
      successMessage: "Blog articles exported",
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      published: "bg-emerald-50 text-emerald-700 border-emerald-100",
      draft: "bg-amber-50 text-amber-700 border-amber-100",
      archived: "bg-slate-100 text-slate-700 border-slate-200",
    };
    return styles[status] || styles.draft;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSortBy("created_at");
    setSortOrder("desc");
    setCurrentPage(1);
  };

  const getImageUrl = (featured_image) => {
    if (!featured_image) return null;
    if (typeof featured_image === "string") return featured_image;
    return featured_image.url || null;
  };

  const getParsedCategories = (categories) => {
    if (!categories || !Array.isArray(categories)) return [];
    if (categories.length === 1 && typeof categories[0] === "string" && categories[0].startsWith("[")) {
      try { return JSON.parse(categories[0]); } catch (e) { return categories; }
    }
    return categories;
  };

  const BlogCard = ({ blog, onClick }) => (
    <div
      className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group flex flex-col h-full"
      onClick={() => onClick(blog)}
    >
      <div className="relative overflow-hidden">
        {getImageUrl(blog.featured_image) ? (
          <img
            src={getImageUrl(blog.featured_image)}
            alt={blog.title}
            className="h-48 w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="h-48 w-full bg-gradient-to-br from-[#0A4D68]/20 to-[#088395]/10 flex items-center justify-center">
            <FaFileAlt className="w-12 h-12 text-slate-300" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter border shadow-sm ${getStatusBadge(blog.status)}`}>
            {blog.status || "Draft"}
          </span>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex-grow">
          <h3 className="text-lg font-bold text-slate-800 mb-2 line-clamp-2 group-hover:text-[#0A4D68] transition-colors leading-tight">
            {blog.title || "Untitled"}
          </h3>
          <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">
            {blog.meta_description || blog.excerpt || "No description available"}
          </p>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center"><FaUser size={10} className="mr-1 text-[#088395]" />{blog.author || "Admin"}</div>
            <div className="flex items-center"><FaCalendar size={10} className="mr-1 text-[#088395]" />{formatDate(blog.created_at)}</div>
          </div>
          <div className="flex items-center text-[#0A4D68]"><FaEye size={10} className="mr-1" />{blog.view_count || 0}</div>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
          <div className="flex gap-2">
            <button onClick={(e) => handleView(blog, e)} className="p-2 text-slate-400 hover:text-[#0A4D68] hover:bg-[#0A4D68]/5 rounded-lg transition-all"><FaEye size={14} /></button>
            <button onClick={(e) => handleEdit(blog, e)} className="p-2 text-slate-400 hover:text-[#088395] hover:bg-[#088395]/5 rounded-lg transition-all"><FaEdit size={14} /></button>
          </div>
          <button onClick={(e) => handleDelete(blog._id, e)} className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><FaTrash size={14} /></button>
        </div>
      </div>
    </div>
  );

  const BlogListItem = ({ blog }) => (
    <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 cursor-pointer group" onClick={() => handleView(blog)}>
      <div className="flex flex-col sm:flex-row">
        <div className="relative sm:w-48 h-32 sm:h-auto flex-shrink-0 overflow-hidden">
          {getImageUrl(blog.featured_image) ? (
            <img src={getImageUrl(blog.featured_image)} alt={blog.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full bg-slate-100 flex items-center justify-center"><FaFileAlt className="w-8 h-8 text-slate-300" /></div>
          )}
          <div className="absolute top-2 left-2">
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border shadow-sm ${getStatusBadge(blog.status)}`}>{blog.status || "Draft"}</span>
          </div>
        </div>
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 mb-1 group-hover:text-[#0A4D68] transition-colors line-clamp-1">{blog.title || "Untitled"}</h3>
            <p className="text-xs text-slate-500 line-clamp-1 mb-2">{blog.meta_description || "No description available"}</p>
            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span className="flex items-center gap-1"><FaUser size={10} className="text-[#088395]" /> {blog.author || "Admin"}</span>
              <span className="flex items-center gap-1"><FaCalendar size={10} className="text-[#088395]" /> {formatDate(blog.created_at)}</span>
              <span className="flex items-center gap-1"><FaEye size={10} className="text-[#0A4D68]" /> {blog.view_count || 0}</span>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={(e) => handleView(blog, e)} className="p-1.5 text-slate-400 hover:text-[#0A4D68] rounded-md"><FaEye size={14} /></button>
            <button onClick={(e) => handleEdit(blog, e)} className="p-1.5 text-slate-400 hover:text-[#088395] rounded-md"><FaEdit size={14} /></button>
            <button onClick={(e) => handleDelete(blog._id, e)} className="p-1.5 text-rose-300 hover:text-rose-600 rounded-md"><FaTrash size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#F8FAFC" }}>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shadow-lg text-white text-xl"><FaFileAlt /></div>
            <div className="text-left">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">Blog Management</h1>
              <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">Create and manage your resource center</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={handleExport} disabled={loading || isExporting} className="flex items-center justify-center space-x-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-all shadow-md text-xs font-bold uppercase disabled:opacity-50">
              <FaDownload className="w-3 h-3" /><span>{isExporting ? "Exporting..." : "Export"}</span>
            </button>
            <button onClick={handleRefresh} disabled={loading} className="flex items-center justify-center space-x-2 px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-all shadow-md text-xs font-bold uppercase disabled:opacity-50">
              <FaSyncAlt className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /><span>Refresh</span>
            </button>
            <button onClick={() => navigate("/blog-and-articles/add")} className="flex items-center justify-center space-x-2 px-6 py-2 bg-[#0A4D68] text-white rounded-lg hover:bg-[#088395] transition-all shadow-md text-xs font-bold uppercase">
              <FaPlus className="w-3 h-3" /><span>Add New Blog</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Articles" value={blogs.length} Icon={FaFolder} borderCls="border-[#0A4D68]" iconBgCls="bg-[#0A4D68]/10" iconColorCls="text-[#0A4D68]" />
          <StatCard label="Published" value={blogs.filter(b => b.status === 'published').length} Icon={FaGlobe} borderCls="border-emerald-500" iconBgCls="bg-emerald-50" iconColorCls="text-emerald-600" />
          <StatCard label="Drafts" value={blogs.filter(b => b.status === 'draft').length} Icon={FaEdit} borderCls="border-amber-500" iconBgCls="bg-amber-50" iconColorCls="text-amber-600" />
          <StatCard label="Total Views" value={blogs.reduce((acc, b) => acc + (b.view_count || 0), 0)} Icon={FaEye} borderCls="border-[#05BFDB]" iconBgCls="bg-[#05BFDB]/10" iconColorCls="text-[#05BFDB]" />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Search</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-3 h-3" />
                <input type="text" placeholder="Search articles..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A4D68] text-sm" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A4D68] cursor-pointer">
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sort By</label>
              <div className="flex gap-2">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A4D68] cursor-pointer">
                  <option value="created_at">Date Created</option>
                  <option value="title">Title</option>
                  <option value="view_count">Views</option>
                </select>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0A4D68] cursor-pointer">
                  <option value="desc">DESC</option>
                  <option value="asc">ASC</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Layout & Reset</label>
              <div className="flex items-center gap-2 h-full">
                <div className="flex items-center space-x-1 bg-slate-100 rounded-lg p-1">
                  <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-md ${viewMode === "grid" ? "bg-white text-[#0A4D68] shadow-sm" : "text-slate-400"}`}><FaThLarge size={14} /></button>
                  <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md ${viewMode === "list" ? "bg-white text-[#0A4D68] shadow-sm" : "text-slate-400"}`}><FaList size={14} /></button>
                </div>
                <button onClick={resetFilters} className="flex-1 px-3 py-2 text-[10px] font-black uppercase text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-all border border-rose-100">Reset</button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center"><FaSyncAlt className="animate-spin mx-auto text-[#0A4D68] mb-4" size={32} /><p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Blogs...</p></div>
        ) : filteredAndSortedBlogs.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 py-20 text-center">
            <FaFolder className="mx-auto text-slate-200 mb-4" size={64} />
            <h3 className="text-xl font-bold text-slate-800 uppercase tracking-tight">No Articles Found</h3>
            <p className="text-slate-400 text-sm mt-1 mb-6">Try adjusting your filters or search terms.</p>
            <button onClick={resetFilters} className="px-6 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg">Clear All Filters</button>
          </div>
        ) : (
          <div className={viewMode === "grid" ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-3" : "space-y-4"}>
            {currentBlogs.map((blog) => (
              viewMode === "grid" ? <BlogCard key={blog._id} blog={blog} onClick={handleView} /> : <BlogListItem key={blog._id} blog={blog} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {currentPage} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm">Prev</button>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm">Next</button>
            </div>
          </div>
        )}
      </div>

      {isViewOpen && <BlogViewModal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} blog={selectedBlog} />}
    </div>
  );
};

function StatCard({ label, value, Icon, borderCls, iconBgCls, iconColorCls }) {
  return (
    <div className={`bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border-l-4 ${borderCls}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgCls}`}>
        <Icon size={18} className={iconColorCls} />
      </div>
      <div className="text-left flex-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-xl font-black text-slate-900 leading-none">{value}</p>
      </div>
    </div>
  );
}

export default BlogListPage;
