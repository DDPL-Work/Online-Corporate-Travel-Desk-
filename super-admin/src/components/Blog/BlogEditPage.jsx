import React, { useState, useEffect } from "react";
import {
  FaTag,
  FaEye,
  FaSave,
  FaSyncAlt,
  FaFileAlt,
  FaUser,
  FaImage,
  FaHashtag,
  FaTimes
} from "react-icons/fa";
import { FiPlus, FiArrowLeft, FiX } from "react-icons/fi";
import TipTapEditor from "./TipTapEditor";
import Swal from "sweetalert2";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { BlogPreviewModal } from "./components";
import { uploadEditorImagesAndReplace } from "../../utils/uploadEditorImagesAndReplace";
import {
  fetchBlogById,
  updateBlog,
} from "../../Redux/Actions/blog.thunks";
import { clearSelectedBlog } from "../../Redux/Slice/blog.slice";

export default function BlogEditPage() {
  const { id: blogId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const user = useSelector((state) => state.auth?.user);
  const {
    selectedBlog,
    fetchBlogLoading: loading,
    updateLoading: saving,
    error: fetchError,
  } = useSelector((state) => state.blogs);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    author_name: "",
    author_id: "",
    featured_image: { url: "", alt: "", file: null },
    categories: [],
    meta_title: "",
    meta_description: "",
    blog_url: "",
    slug: "",
    meta_keywords: [],
    image_alt_text: "",
    status: "draft",
    published_at: "",
  });

  const [newKeyword, setNewKeyword] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [activeTab, setActiveTab] = useState("content");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (blogId) {
      dispatch(fetchBlogById(blogId));
    }
    return () => {
      dispatch(clearSelectedBlog());
    };
  }, [dispatch, blogId]);

  useEffect(() => {
    if (selectedBlog) {
      const resolveFeaturedImage = (img) => {
        if (!img) return { url: "", alt: "", file: null };
        if (typeof img === "string") return { url: img, alt: selectedBlog.featured_image_alt || selectedBlog.image_alt_text || "", file: null };
        return {
          url: img.url || "",
          alt: img.alt || "",
          file: null
        };
      };

      const resolveCategories = (cats) => {
        if (!cats || !Array.isArray(cats)) return [];
        if (cats.length === 1 && typeof cats[0] === "string" && cats[0].startsWith("[")) {
          try { return JSON.parse(cats[0]); } catch (e) { return cats; }
        }
        return cats;
      };

      const initialData = {
        title: selectedBlog.title || selectedBlog.meta_title || "",
        content: selectedBlog.content || "",
        author_name: selectedBlog.author_name || selectedBlog.author || "",
        author_id: selectedBlog.author_id || "",
        featured_image: resolveFeaturedImage(selectedBlog.featured_image),
        categories: resolveCategories(selectedBlog.categories),
        meta_title: selectedBlog.meta_title || selectedBlog.title || "",
        meta_description: selectedBlog.meta_description || "",
        blog_url: selectedBlog.blog_url || "",
        slug: selectedBlog.slug || "",
        meta_keywords: resolveCategories(selectedBlog.meta_keywords),
        image_alt_text: selectedBlog.image_alt_text || selectedBlog.featured_image_alt || "",
        status: selectedBlog.status || "draft",
        published_at: selectedBlog.published_at || "",
      };

      setFormData(initialData);
      if (initialData.featured_image?.url) {
        setImagePreview(initialData.featured_image.url);
      }
    }
  }, [selectedBlog]);

  useEffect(() => {
    if (fetchError) {
      Swal.fire({ icon: "error", title: "Error", text: fetchError || "Failed to load blog" });
      navigate("/blog-and-articles");
    }
  }, [fetchError, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
        Swal.fire({ icon: "error", title: "Invalid File Type", text: "Please upload JPEG, PNG or WEBP image" });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({ icon: "error", title: "File Too Large", text: "Image must be less than 5MB" });
        return;
      }
      const imageUrl = URL.createObjectURL(file);
      setImagePreview(imageUrl);
      setFormData((prev) => ({
        ...prev,
        featured_image: { ...prev.featured_image, file, url: imageUrl },
      }));
    }
  };

  const removeImage = () => {
    if (imagePreview && imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImagePreview("");
    setFormData((prev) => ({
      ...prev,
      featured_image: { url: "", alt: "", file: null },
    }));
  };

  const handleMetaTitleChange = (e) => {
    const title = e.target.value;
    const slug = title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
    const blogUrl = `https://traveamer.com/blog/${slug}`;
    setFormData((prev) => ({
      ...prev,
      meta_title: title,
      title,
      slug,
      blog_url: blogUrl,
    }));
  };

  const handleCategoryChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({ ...prev, categories: [val] }));
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !formData.meta_keywords.includes(newKeyword.trim())) {
      setFormData((prev) => ({ ...prev, meta_keywords: [...prev.meta_keywords, newKeyword.trim()] }));
      setNewKeyword("");
    }
  };

  const removeKeyword = (keyword) =>
    setFormData((prev) => ({ ...prev, meta_keywords: prev.meta_keywords.filter((k) => k !== keyword) }));

  const handleSubmit = async (e, targetStatus) => {
    if (e && e.preventDefault) e.preventDefault();
    const finalStatus = targetStatus || formData.status;
    const finalAuthorId = user?.email || formData.author_id || "";

    if (!formData.title || !formData.content || formData.categories.length === 0) {
      Swal.fire({ icon: "error", title: "Validation Error", text: "Title, Content, and Category are required!" });
      return;
    }

    try {
      Swal.fire({ title: "Updating...", text: "Saving changes...", allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
      const updatedContent = await uploadEditorImagesAndReplace(formData.content);

      let submitData;
      if (formData.featured_image.file) {
        submitData = new FormData();
        Object.keys(formData).forEach((key) => {
          if (!["featured_image", "status", "author_id", "content"].includes(key)) {
            submitData.append(key, Array.isArray(formData[key]) ? JSON.stringify(formData[key]) : formData[key] || "");
          }
        });
        submitData.append("status", finalStatus);
        submitData.append("author_id", finalAuthorId);
        submitData.append("content", updatedContent);
        submitData.append("featured_image", formData.featured_image.file);
        submitData.append("featured_image_alt", formData.featured_image.alt || formData.title);
      } else {
        submitData = { ...formData, content: updatedContent, status: finalStatus, author_id: finalAuthorId, featured_image: { url: formData.featured_image.url, alt: formData.featured_image.alt } };
        delete submitData.featured_image.file;
      }

      await dispatch(updateBlog({ id: blogId, formData: submitData })).unwrap();
      Swal.close();
      Swal.fire({ icon: "success", title: "Saved!", text: "Blog updated successfully", timer: 1500, showConfirmButton: false });
      navigate("/blog-and-articles");
    } catch (err) {
      Swal.close();
      Swal.fire({ icon: "error", title: "Error", text: err.message || "Failed to save blog" });
    }
  };

  const tabs = [
    { id: "content", label: "Article Content", icon: FaFileAlt },
    { id: "seo", label: "SEO & Category", icon: FaTag },
    { id: "settings", label: "Settings", icon: FaUser },
  ];

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-[#F8FAFC]">
        <FaSyncAlt className="animate-spin w-10 h-10 text-[#0A4D68] mb-4" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Article Data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#F8FAFC" }}>
      <BlogPreviewModal isOpen={showPreview} onClose={() => setShowPreview(false)} blogData={formData} />

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shadow-lg text-white text-xl"><FaFileAlt /></div>
            <div className="text-left">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">Edit Article</h1>
              <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">Refine your published content</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => navigate("/blog-and-articles")} className="flex items-center gap-2 px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-all shadow-md text-xs font-bold uppercase"><FiArrowLeft className="w-3 h-3" /><span>Back</span></button>
            <button type="button" onClick={() => setShowPreview(true)} className="flex items-center gap-2 px-4 py-2 bg-[#088395] text-white rounded-lg hover:bg-[#0A4D68] transition-all shadow-md text-xs font-bold uppercase"><FaEye className="w-3 h-3" /><span>Preview</span></button>
            <button type="button" onClick={(e) => handleSubmit(e, "draft")} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-all shadow-md text-xs font-bold uppercase disabled:opacity-50"><FaSave className="w-3 h-3" /><span>{saving ? "Saving..." : "Save Draft"}</span></button>
            <button type="button" onClick={(e) => handleSubmit(e, "published")} disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-[#0A4D68] text-white rounded-lg hover:bg-[#088395] transition-all shadow-md text-xs font-bold uppercase disabled:opacity-50"><FiPlus className="w-3 h-3" /><span>{saving ? "Updating..." : "Update & Publish"}</span></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-100">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex items-center justify-center space-x-2 py-4 text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? "bg-slate-50 text-[#0A4D68] border-b-2 border-[#0A4D68]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50/50"}`}>
                  <Icon className="w-4 h-4" /><span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-6">
            <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
              {activeTab === "content" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Article Title <span className="text-rose-500">*</span></label>
                    <input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0A4D68] outline-none text-xl font-bold text-slate-800" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Featured Image</label>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="relative h-48 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center justify-center group hover:border-[#0A4D68] cursor-pointer overflow-hidden">
                          {imagePreview ? (
                            <>
                              <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"><button onClick={removeImage} className="p-3 bg-rose-600 text-white rounded-full shadow-xl"><FiX size={20}/></button></div>
                            </>
                          ) : (
                            <>
                              <FaImage className="w-10 h-10 text-slate-200 mb-2" />
                              <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </>
                          )}
                        </div>
                        {imagePreview && (
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alt Text</label>
                            <input type="text" value={formData.featured_image.alt} onChange={(e) => setFormData(prev => ({ ...prev, featured_image: { ...prev.featured_image, alt: e.target.value } }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none" />
                          </div>
                        )}
                      </div>
                      <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 flex flex-col justify-center text-xs text-slate-500 space-y-2">
                        <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Status Information</p>
                        <p>Current Status: <span className="font-bold uppercase text-[#0A4D68]">{formData.status}</span></p>
                        <p>URL: <span className="font-mono text-[10px] break-all">{formData.blog_url}</span></p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Editor</label>
                    <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm"><TipTapEditor content={formData.content} onChange={(content) => setFormData(prev => ({ ...prev, content }))} /></div>
                  </div>
                </div>
              )}

              {activeTab === "seo" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meta Title</label>
                        <input type="text" name="meta_title" value={formData.meta_title} onChange={handleMetaTitleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0A4D68] text-sm font-medium" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meta Description</label>
                        <textarea name="meta_description" value={formData.meta_description} onChange={handleChange} rows={4} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0A4D68] text-sm font-medium resize-none" />
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Slug</label>
                        <input type="text" name="slug" value={formData.slug} onChange={handleChange} className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-mono text-slate-500" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</label>
                        <div className="relative">
                          <FaHashtag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                          <input type="text" value={formData.categories[0] || ""} onChange={handleCategoryChange} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0A4D68] text-sm font-bold" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Keywords</label>
                        <div className="flex gap-2"><input type="text" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())} className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" placeholder="Add keyword..." /></div>
                        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 min-h-[50px]">
                          {formData.meta_keywords.map((kw, i) => (
                            <span key={i} className="px-3 py-1 bg-white border border-slate-100 rounded-full text-[10px] font-black uppercase tracking-tight text-[#0A4D68] flex items-center gap-1.5 shadow-sm">
                              {kw} <button onClick={() => removeKeyword(kw)} className="text-rose-400"><FiX /></button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "settings" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="max-w-xl bg-slate-50 rounded-2xl border border-slate-100 p-8 space-y-6">
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2"><FaUser className="text-[#0A4D68]" /> Author Configuration</h3>
                    <div className="space-y-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Author ID</label>
                        <input type="text" value={formData.author_id} readOnly className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl text-sm text-slate-400 font-mono" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Display Name</label>
                        <input type="text" name="author_name" value={formData.author_name} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#0A4D68]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
