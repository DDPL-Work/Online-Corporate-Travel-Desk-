import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiArrowLeft,
  FiSave,
  FiEye,
  FiPlus,
  FiX,
} from "react-icons/fi";
import {
  clearError,
  resetCreateState,
} from "../../Redux/Slice/blog.slice";
import { createBlog } from "../../Redux/Actions/blog.thunks";
import { uploadEditorImagesAndReplace } from "../../utils/uploadEditorImagesAndReplace";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import TipTapEditor from "./TipTapEditor";
import { BlogPreviewModal } from "./components";
import { 
  FaTag, 
  FaFileAlt,
  FaImage,
  FaUser,
  FaHashtag
} from "react-icons/fa";

const CreateBlogPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { createLoading, error } = useSelector((state) => state.blogs);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("content");

  const tabs = [
    { id: "content", label: "Article Content", icon: FaFileAlt },
    { id: "seo", label: "SEO & Category", icon: FaTag },
    { id: "settings", label: "Publish Settings", icon: FaUser },
  ];

  const user = useSelector((state) => state.auth?.user);

  const [formData, setFormData] = useState({
    author_id: user?.email || "", 
    author_name: user?.name || user?.username || "",
    title: "",
    content: "",
    featured_image: { url: "", alt: "", file: null },
    categories: ["General"],
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

  useEffect(() => {
    return () => {
      dispatch(clearError());
      dispatch(resetCreateState());
    };
  }, [dispatch]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "title" || name === "meta_title") {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      
      const blogUrl = `https://traveamer.com/blog/${slug}`;

      setFormData((prev) => ({
        ...prev,
        [name]: value,
        slug,
        blog_url: blogUrl,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire("Error", "Image size should be less than 5MB", "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          featured_image: { ...prev.featured_image, url: reader.result, file },
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData((prev) => ({
      ...prev,
      featured_image: { url: "", alt: "", file: null },
    }));
  };

  const handleCategoryChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      categories: [val],
    }));
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !formData.meta_keywords.includes(newKeyword.trim())) {
      setFormData((prev) => ({
        ...prev,
        meta_keywords: [...prev.meta_keywords, newKeyword.trim()],
      }));
      setNewKeyword("");
    }
  };

  const removeKeyword = (keywordToRemove) => {
    setFormData((prev) => ({
      ...prev,
      meta_keywords: prev.meta_keywords.filter((kw) => kw !== keywordToRemove),
    }));
  };

  const handlePreview = () => {
    if (!formData.title || !formData.content) {
      Swal.fire("Warning", "Please add title and content to preview", "warning");
      return;
    }
    setShowPreview(true);
  };

  const handleSaveBlog = async (status) => {
    if (!formData.title || !formData.content || formData.categories.length === 0) {
      Swal.fire("Validation Error", "Title, Content, and Category are required!", "error");
      setActiveTab("content");
      return;
    }

    try {
      Swal.fire({
        title: "Processing...",
        text: "Saving your article",
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); },
      });

      const updatedContent = await uploadEditorImagesAndReplace(formData.content);

      const finalData = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key !== "featured_image" && key !== "categories" && key !== "meta_keywords") {
          finalData.append(key, formData[key]);
        }
      });

      finalData.set("content", updatedContent);
      finalData.set("status", status);
      finalData.append("categories", JSON.stringify(formData.categories));
      finalData.append("meta_keywords", JSON.stringify(formData.meta_keywords));
      
      if (formData.featured_image.file) {
        finalData.append("featured_image", formData.featured_image.file);
      }
      finalData.append("featured_image_alt", formData.featured_image.alt || formData.title);

      await dispatch(createBlog({ formData: finalData })).unwrap();
      
      Swal.close();
      Swal.fire({
        icon: "success",
        title: "Success!",
        text: "Article saved successfully",
        timer: 2000,
        showConfirmButton: false
      });
      navigate("/blog-and-articles");
    } catch (err) {
      Swal.close();
      Swal.fire("Error", err || "Failed to save blog", "error");
    }
  };

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#F8FAFC" }}>
      <BlogPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        blogData={formData}
      />

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0A4D68] to-[#088395] flex items-center justify-center shadow-lg text-white text-xl">
              <FaFileAlt />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">
                Create Article
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">
                Compose your next masterpiece
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate("/blog-and-articles")}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-all shadow-md text-xs font-bold uppercase"
            >
              <FiArrowLeft className="w-3 h-3" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={handlePreview}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-[#088395] text-white rounded-lg hover:bg-[#0A4D68] transition-all shadow-md text-xs font-bold uppercase"
            >
              <FiEye className="w-3 h-3" />
              <span>Preview</span>
            </button>
            <button
              type="button"
              onClick={() => handleSaveBlog("draft")}
              disabled={createLoading}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-all shadow-md text-xs font-bold uppercase disabled:opacity-50"
            >
              <FiSave className="w-3 h-3" />
              <span>Save Draft</span>
            </button>
            <button
              type="button"
              onClick={() => handleSaveBlog("published")}
              disabled={createLoading}
              className="flex items-center justify-center space-x-2 px-6 py-2 bg-[#0A4D68] text-white rounded-lg hover:bg-[#088395] transition-all shadow-md text-xs font-bold uppercase disabled:opacity-50"
            >
              <FiPlus className="w-3 h-3" />
              <span>Publish Now</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-100">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 py-4 text-[11px] font-black uppercase tracking-widest transition-all ${
                    activeTab === tab.id
                      ? "bg-slate-50 text-[#0A4D68] border-b-2 border-[#0A4D68]"
                      : "text-slate-400 hover:text-slate-600 hover:bg-slate-50/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-6">
            <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
              {activeTab === "content" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      Article Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Enter a compelling headline..."
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0A4D68] focus:border-transparent outline-none text-xl font-bold text-slate-800 placeholder:text-slate-300"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      Featured Image <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="relative h-48 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-center group hover:border-[#0A4D68] transition-all cursor-pointer overflow-hidden">
                          {formData.featured_image.url ? (
                            <>
                              <img src={formData.featured_image.url} className="w-full h-full object-cover" alt="Preview" />
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                <button onClick={(e) => {e.stopPropagation(); removeImage();}} className="p-3 bg-rose-600 text-white rounded-full shadow-xl"><FiX size={20}/></button>
                              </div>
                            </>
                          ) : (
                            <>
                              <FaImage className="w-10 h-10 text-slate-200 mb-2" />
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Click to upload</span>
                              <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </>
                          )}
                        </div>
                        {formData.featured_image.url && (
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Image Alt Text</label>
                            <input
                              type="text"
                              value={formData.featured_image.alt}
                              onChange={(e) => setFormData(prev => ({ ...prev, featured_image: { ...prev.featured_image, alt: e.target.value } }))}
                              placeholder="Describe this image for accessibility..."
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#0A4D68]"
                            />
                          </div>
                        )}
                      </div>
                      <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 flex flex-col justify-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Editor Guidelines</p>
                        <ul className="text-xs text-slate-500 space-y-2 list-disc pl-4">
                          <li>Use high-resolution images (min 1200x630px)</li>
                          <li>Keep file size under 5MB for optimal performance</li>
                          <li>Ensure alt text describes the image content accurately</li>
                          <li>Supported formats: JPG, PNG, WEBP</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      Editor <span className="text-rose-500">*</span>
                    </label>
                    <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                      <TipTapEditor
                        content={formData.content}
                        onChange={(content) => setFormData((prev) => ({ ...prev, content }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "seo" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meta Title (SEO)</label>
                        <input
                          type="text"
                          name="meta_title"
                          value={formData.meta_title}
                          onChange={handleInputChange}
                          maxLength={60}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0A4D68] text-sm font-medium"
                          placeholder="Headline for search engines..."
                        />
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Optimal length: 50-60 characters</span>
                          <span className={`text-[10px] font-black ${formData.meta_title.length > 60 ? 'text-rose-500' : 'text-slate-400'}`}>{formData.meta_title.length}/60</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meta Description</label>
                        <textarea
                          name="meta_description"
                          value={formData.meta_description}
                          onChange={handleInputChange}
                          maxLength={160}
                          rows={4}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0A4D68] text-sm font-medium resize-none"
                          placeholder="Brief summary for search results..."
                        />
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Optimal length: 150-160 characters</span>
                          <span className={`text-[10px] font-black ${formData.meta_description.length > 160 ? 'text-rose-500' : 'text-slate-400'}`}>{formData.meta_description.length}/160</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL Structure (Slug)</label>
                        <div className="flex">
                          <div className="bg-slate-100 border border-slate-200 border-r-0 px-4 py-3 rounded-l-xl text-slate-400 text-xs font-bold flex items-center">/blog/</div>
                          <input
                            type="text"
                            name="slug"
                            value={formData.slug}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-r-xl outline-none focus:ring-2 focus:ring-[#0A4D68] text-sm font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Category <span className="text-rose-500">*</span></label>
                        <div className="relative">
                          <FaHashtag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                          <input
                            type="text"
                            value={formData.categories[0] || ""}
                            onChange={handleCategoryChange}
                            placeholder="e.g. Technology, Travel Tips..."
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0A4D68] text-sm font-bold"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meta Keywords</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newKeyword}
                            onChange={(e) => setNewKeyword(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#0A4D68]"
                            placeholder="Type and press Enter..."
                          />
                        </div>
                        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 min-h-[50px]">
                          {formData.meta_keywords.length === 0 ? (
                            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">No keywords added</span>
                          ) : (
                            formData.meta_keywords.map((kw, i) => (
                              <span key={i} className="px-3 py-1 bg-white border border-slate-100 rounded-full text-[10px] font-black uppercase tracking-tight text-[#0A4D68] flex items-center gap-1.5 shadow-sm">
                                {kw} <button onClick={() => removeKeyword(kw)} className="text-rose-400 hover:text-rose-600 transition-colors"><FiX /></button>
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "settings" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="max-w-xl bg-slate-50 rounded-2xl border border-slate-100 p-8 space-y-6">
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                      <FaUser className="text-[#0A4D68]" /> Author Configuration
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Author Email (Reference)</label>
                        <input type="text" value={formData.author_id} readOnly className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl text-sm text-slate-400 font-mono" />
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Display Name</label>
                        <input
                          type="text"
                          name="author_name"
                          value={formData.author_name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#0A4D68]"
                          placeholder="Your public author name..."
                        />
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-200/50">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                        These settings will determine how the author profile appears on the public blog post. Ensure the display name is professional.
                      </p>
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
};

export default CreateBlogPage;
