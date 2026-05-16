// components/Modal/BlogViewModal.jsx
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FaTimes,
  FaUser,
  FaCalendar,
  FaTag,
  FaFolder,
  FaEye,
} from "react-icons/fa";
import {
  clearError,
} from "../../../Redux/Slice/blog.slice";
import { toast } from "sonner";

const BlogViewModal = ({ isOpen, onClose, blog }) => {
  const dispatch = useDispatch();

  // Get errors from Redux store
  const { error } = useSelector((state) => state.blogs || {});

  // Handle error notifications
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  if (!isOpen || !blog) return null;

  // Helper to check if URL is YouTube
  const isYouTubeUrl = (url) =>
    url && (url.includes("youtube.com") || url.includes("youtu.be"));

  // Convert YouTube URL to embed URL
  const getYouTubeEmbedUrl = (url) => {
    if (!url) return "";

    if (url.includes("youtu.be")) {
      const videoId = url.split("/").pop().split("?")[0];
      return `https://www.youtube.com/embed/${videoId}`;
    } else if (url.includes("youtube.com/watch")) {
      const params = new URLSearchParams(url.split("?")[1]);
      const videoId = params.get("v");
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  };

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return "Not published";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Helper to get featured image URL
  const getImageUrl = (featured_image) => {
    if (!featured_image) return null;
    if (typeof featured_image === "string") return featured_image;
    return featured_image.url || null;
  };

  // Helper to parse categories safely
  const getParsedCategories = (categories) => {
    if (!categories || !Array.isArray(categories)) return [];
    
    // Check if the first element is a stringified array (common in the provided API response)
    if (categories.length === 1 && typeof categories[0] === "string" && categories[0].startsWith("[")) {
      try {
        return JSON.parse(categories[0]);
      } catch (e) {
        return categories;
      }
    }
    return categories;
  };

  // Get status badge styling
  const getStatusBadge = (status) => {
    const statusStyles = {
      published: "bg-[#0A4D68]/10 text-slate-800 border-green-200",
      draft: "bg-[#0A4D68]/10 text-yellow-800 border-yellow-200",
      archived: "bg-gray-100 text-gray-800 border-gray-200",
    };

    return statusStyles[status] || statusStyles.draft;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 bg-opacity-70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Close Button */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#0A4D68]/20 rounded-full flex items-center justify-center">
              <FaEye className="w-5 h-5 text-[#0A4D68]" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Blog Details
              </h1>
              <p className="text-sm text-gray-500">View complete blog post</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
            title="Close"
          >
            <FaTimes className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-80px)]">
          <div className="p-6 space-y-6">
            {/* Blog Header Info */}
            <div className="space-y-4">
              {/* Title and Status */}
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-3xl font-bold text-gray-900 leading-tight">
                  {blog.title || blog.meta_title || "Untitled Blog"}
                </h2>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(
                    blog.status,
                  )}`}
                >
                  {blog.status
                    ? blog.status.charAt(0).toUpperCase() + blog.status.slice(1)
                    : "Draft"}
                </span>
              </div>

              {/* Meta Information */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <FaUser className="w-4 h-4 text-[#0A4D68]" />
                  <span className="font-medium">
                    {blog.author_name || blog.author || "Anonymous"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FaCalendar className="w-4 h-4 text-slate-700" />
                  <span>
                    {formatDate(blog.published_at || blog.created_at)}
                  </span>
                </div>
                {blog.view_count !== undefined && (
                  <div className="flex items-center gap-2">
                    <FaEye className="w-4 h-4 text-gray-500" />
                    <span>{blog.view_count} views</span>
                  </div>
                )}
              </div>

              {/* Meta Description */}
              {blog.meta_description && (
                <div className="bg-[#0A4D68]/10 border-l-4 border-[#05BFDB] p-4 rounded-r-lg">
                  <p className="text-blue-900 italic">
                    {blog.meta_description}
                  </p>
                </div>
              )}

              {/* Excerpt */}
              {blog.excerpt && (
                <div className="bg-slate-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                  <p className="text-green-900 italic">{blog.excerpt}</p>
                </div>
              )}
            </div>

            {/* Featured Image */}
            {getImageUrl(blog.featured_image) && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  Featured Image
                </h3>
                <div className="relative overflow-hidden rounded-lg shadow-md">
                  <img
                    src={getImageUrl(blog.featured_image)}
                    alt={
                      blog.image_alt_text ||
                      blog.featured_image_alt ||
                      blog.title
                    }
                    className="w-full h-48 md:h-80 object-cover hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {(blog.image_alt_text || blog.featured_image_alt) && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                      <p className="text-white text-sm">
                        {blog.image_alt_text || blog.featured_image_alt}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Video Content */}
            {blog.video_url && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  Video Content
                </h3>
                <div className="relative overflow-hidden rounded-lg shadow-md bg-black">
                  {isYouTubeUrl(blog.video_url) ? (
                    <iframe
                      width="100%"
                      src={getYouTubeEmbedUrl(blog.video_url)}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-48 sm:h-64 md:h-96 rounded-lg"
                    />
                  ) : (
                    <video
                      src={blog.video_url}
                      controls
                      className="w-full h-48 sm:h-64 md:h-96 object-contain rounded-lg"
                      controlsList="nodownload"
                    >
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>
              </div>
            )}

            {/* Blog Content */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">Content</h3>
              <style>{`
                    /* Base styles that work with editor styles */
                    .view-blog-content {
                      font-family: system-ui, -apple-system, sans-serif;
                      line-height: 1.6;
                      color: #374151;
                    }
                    
                    /* Heading spacing (sizes come from editor) */
                    .view-blog-content h1 {
                      font-weight: 700;
                      line-height: 1.2;
                      margin-top: 2rem;
                      margin-bottom: 1rem;
                    }
                    
                    .view-blog-content h2 {
                      font-weight: 700;
                      line-height: 1.3;
                      margin-top: 1.75rem;
                      margin-bottom: 0.875rem;
                    }
                    
                    .view-blog-content h3 {
                      font-weight: 600;
                      line-height: 1.4;
                      margin-top: 1.5rem;
                      margin-bottom: 0.75rem;
                    }
                    
                    .view-blog-content h4 {
                      font-weight: 600;
                      line-height: 1.4;
                      margin-top: 1.25rem;
                      margin-bottom: 0.625rem;
                    }
                    
                    .view-blog-content h5 {
                      font-weight: 600;
                      line-height: 1.5;
                      margin-top: 1rem;
                      margin-bottom: 0.5rem;
                    }
                    
                    .view-blog-content h6 {
                      font-weight: 600;
                      line-height: 1.5;
                      margin-top: 0.875rem;
                      margin-bottom: 0.5rem;
                    }
                    
                    /* Paragraph spacing */
                    .view-blog-content p {
                      margin-bottom: 1rem;
                      line-height: 1.8;
                    }
                    
                    /* Lists */
                    .view-blog-content ul,
                    .view-blog-content ol {
                      padding-left: 2rem;
                      margin-bottom: 1rem;
                    }
                    
                    .view-blog-content ul {
                      list-style-type: disc;
                    }
                    
                    .view-blog-content ol {
                      list-style-type: decimal;
                    }
                    
                    .view-blog-content li {
                      margin-bottom: 0.5rem;
                      line-height: 1.8;
                    }
                    
                    .view-blog-content li p {
                      margin-bottom: 0.25rem;
                    }
                    
                    /* Links */
                    .view-blog-content a {
                      color: #3b82f6;
                      text-decoration: underline;
                    }
                    
                    .view-blog-content a:hover {
                      color: #2563eb;
                    }
                    
                    /* Blockquotes */
                    .view-blog-content blockquote {
                      border-left: 4px solid #e5e7eb;
                      padding-left: 1.5rem;
                      margin: 1.5rem 0;
                      font-style: italic;
                      color: #6b7280;
                    }
                    
                    /* Code blocks */
                    .view-blog-content pre {
                      background-color: #1f2937;
                      color: #f9fafb;
                      padding: 1.25rem;
                      border-radius: 0.5rem;
                      overflow-x: auto;
                      margin: 1.5rem 0;
                      font-family: 'Courier New', Consolas, Monaco, monospace;
                    }
                    
                    .view-blog-content pre code {
                      background-color: transparent;
                      padding: 0;
                      color: inherit;
                      font-size: 0.875rem;
                    }
                    
                    /* Inline code */
                    .view-blog-content code {
                      background-color: #f3f4f6;
                      padding: 0.125rem 0.375rem;
                      border-radius: 0.25rem;
                      font-family: 'Courier New', Consolas, Monaco, monospace;
                      font-size: 0.9em;
                      color: #ef4444;
                    }
                    
                    /* Images - preserve all styles from editor */
                    .view-blog-content img {
                      max-width: 100%;
                      height: auto;
                    }
                    
                    /* Horizontal rule */
                    .view-blog-content hr {
                      border: none;
                      border-top: 2px solid #e5e7eb;
                      margin: 2rem 0;
                    }
                    
                    /* Tables */
                    .view-blog-content table {
                      width: 100%;
                      border-collapse: collapse;
                      margin: 1.5rem 0;
                    }
                    
                    .view-blog-content th,
                    .view-blog-content td {
                      border: 1px solid #e5e7eb;
                      padding: 0.75rem;
                      text-align: left;
                    }
                    
                    .view-blog-content th {
                      background-color: #f9fafb;
                      font-weight: 600;
                    }
                    
                    /* Text formatting */
                    .view-blog-content strong {
                      font-weight: 700;
                    }
                    
                    .view-blog-content em {
                      font-style: italic;
                    }
                    
                    .view-blog-content u {
                      text-decoration: underline;
                    }
                    
                    .view-blog-content s {
                      text-decoration: line-through;
                    }
                    
                    /* Subscript and Superscript */
                    .view-blog-content sub {
                      vertical-align: sub;
                      font-size: smaller;
                    }
                    
                    .view-blog-content sup {
                      vertical-align: super;
                      font-size: smaller;
                    }
                    
                    /* First and last element margins */
                    .view-blog-content > *:first-child {
                      margin-top: 0;
                    }
                    
                    .view-blog-content > *:last-child {
                      margin-bottom: 0;
                    }
                  `}</style>
              <div
                className="view-blog-content"
                style={{ minHeight: "200px" }}
                dangerouslySetInnerHTML={{
                  __html:
                    blog.content ||
                    '<p class="text-gray-500 italic">No content available.</p>',
                }}
              />
            </div>

            {/* Tags and Categories Section */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Tags */}
              {blog.tags && blog.tags.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FaTag className="w-4 h-4 text-[#0A4D68]" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {blog.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-[#0A4D68]/20 text-blue-800 text-sm font-medium rounded-full hover:bg-blue-200 transition-colors duration-200"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Categories */}
              {getParsedCategories(blog.categories).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FaFolder className="w-4 h-4 text-slate-700" />
                    Categories
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {getParsedCategories(blog.categories).map((category, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-[#0A4D68]/10 text-slate-800 text-sm font-medium rounded-full hover:bg-green-200 transition-colors duration-200"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Meta Keywords */}
            {blog.meta_keywords && blog.meta_keywords.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Meta Keywords
                </h3>
                <div className="flex flex-wrap gap-2">
                  {blog.meta_keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-[#088395]/10 text-[#0A4D68] text-sm font-medium rounded-full"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* SEO Information */}
            {(blog.meta_title ||
              blog.meta_description ||
              blog.slug ||
              blog.blog_url) && (
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  SEO Information
                </h3>

                {blog.meta_title && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Meta Title
                    </label>
                    <p className="text-gray-900 bg-white p-3 rounded border">
                      {blog.meta_title}
                    </p>
                  </div>
                )}

                {blog.meta_description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Meta Description
                    </label>
                    <p className="text-gray-900 bg-white p-3 rounded border">
                      {blog.meta_description}
                    </p>
                  </div>
                )}

                {blog.slug && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Slug
                    </label>
                    <p className="text-gray-900 bg-white p-3 rounded border font-mono text-sm">
                      {blog.slug}
                    </p>
                  </div>
                )}

                {blog.blog_url && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Blog URL
                    </label>
                    <a
                      href={blog.blog_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0A4D68] hover:text-[#088395] underline bg-white p-3 rounded border block break-all"
                    >
                      {blog.blog_url}
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Additional Information */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Additional Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Blog ID:</span>
                  <p className="text-gray-600 font-mono bg-white px-2 py-1 rounded mt-1 text-xs">
                    {blog._id || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Author ID:</span>
                  <p className="text-gray-600 font-mono bg-white px-2 py-1 rounded mt-1 text-xs">
                    {blog.author_id || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Created:</span>
                  <p className="text-gray-600 mt-1">
                    {formatDate(blog.created_at)}
                  </p>
                </div>
                {blog.updated_at && blog.updated_at !== blog.created_at && (
                  <div>
                    <span className="font-medium text-gray-700">
                      Last Updated:
                    </span>
                    <p className="text-gray-600 mt-1">
                      {formatDate(blog.updated_at)}
                    </p>
                  </div>
                )}
                {blog.published_at && (
                  <div>
                    <span className="font-medium text-gray-700">
                      Published:
                    </span>
                    <p className="text-gray-600 mt-1">
                      {formatDate(blog.published_at)}
                    </p>
                  </div>
                )}
                {blog.seo_score !== undefined && (
                  <div>
                    <span className="font-medium text-gray-700">
                      SEO Score:
                    </span>
                    <p className="text-gray-600 mt-1">{blog.seo_score}/100</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogViewModal;
