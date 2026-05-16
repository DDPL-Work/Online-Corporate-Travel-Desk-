import React, { useState, useMemo, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import LandingHeader from "../../../layout/LandingHeader";
import LandingFooter from "../../../layout/LandingFooter";
import { Helmet } from "react-helmet";
import { 
  FiClock, 
  FiCalendar, 
  FiUser, 
  FiChevronLeft, 
  FiChevronRight,
  FiShare2,
  FiBookmark,
  FiEye,
  FiFacebook,
  FiTwitter,
  FiInstagram,
  FiLink
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import {
  FacebookShareButton,
  TwitterShareButton,
  WhatsappShareButton,
} from "react-share";
import { toast } from "sonner";

// Components & Constants
import BlogCard from "./Components/BlogCard";
import { 
  POSTS_PER_PAGE, 
  GOLD, 
  GOLD_FADE, 
  MUTED, 
  BORDER, 
  NAVY, 
  OFF_WHITE,
  HERO_GRAD 
} from "./Components/blogConstants";

import { useDispatch, useSelector } from "react-redux";
import { fetchBlogBySlug, fetchPublishedBlogs } from "../../../Redux/Actions/blog.thunks";

export default function BlogDetails() {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const { selectedBlog: post, items: allBlogs, loading } = useSelector((state) => state.blogs);
  
  const [scrollX, setScrollX] = useState(0);
  const relatedRef = useRef(null);
  const shareMenuRef = useRef(null);

  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard!");
    setShowShareMenu(false);
  };

  // Bookmark Logic
  useEffect(() => {
    if (post?._id) {
      const savedBlogs = JSON.parse(localStorage.getItem("savedBlogs") || "[]");
      setIsSaved(savedBlogs.includes(post._id));
    }
  }, [post?._id]);

  const toggleSave = () => {
    const savedBlogs = JSON.parse(localStorage.getItem("savedBlogs") || "[]");
    if (isSaved) {
      const updated = savedBlogs.filter(id => id !== post._id);
      localStorage.setItem("savedBlogs", JSON.stringify(updated));
      setIsSaved(false);
      toast.info("Removed from bookmarks");
    } else {
      savedBlogs.push(post._id);
      localStorage.setItem("savedBlogs", JSON.stringify(savedBlogs));
      setIsSaved(true);
      toast.success("Saved to bookmarks!");
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target)) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    dispatch(fetchBlogBySlug(slug));
    // Also fetch all blogs for related section if not already loaded
    if (allBlogs.length === 0) {
      dispatch(fetchPublishedBlogs());
    }
  }, [dispatch, slug, allBlogs.length]);

  // Find related blogs (same category or shared tags, excluding current)
  const relatedBlogs = useMemo(() => {
    if (!post || !allBlogs) return [];
    return allBlogs.filter((p) => 
      p._id !== post._id && 
      (
        (p.categories && post.categories && p.categories.some(cat => post.categories.includes(cat))) || 
        (p.tags && post.tags && p.tags.some(t => post.tags.includes(t)))
      )
    );
  }, [post, allBlogs]);

  // Scroll to top on load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  // Table of Contents logic (Extract H2/H3 from content string)
  const toc = useMemo(() => {
    if (!post?.content) return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(post.content, "text/html");
    const headings = Array.from(doc.querySelectorAll("h2, h3"));
    return headings.map((h, i) => ({
      id: `heading-${i}`,
      text: h.textContent,
      level: h.tagName.toLowerCase(),
    }));
  }, [post]);

  // Related Blogs scroll logic
  const scrollRelated = (direction) => {
    if (relatedRef.current) {
      const { scrollLeft, clientWidth } = relatedRef.current;
      const scrollAmount = clientWidth;
      relatedRef.current.scrollTo({
        left: direction === "left" ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Scroll to heading handler
  const scrollToHeading = (text) => {
    const headings = document.querySelectorAll("h2, h3");
    const target = Array.from(headings).find(h => h.textContent === text);
    if (target) {
      window.scrollTo({
        top: target.offsetTop - 120, // Offset for sticky header
        behavior: "smooth"
      });
    }
  };

  if (loading) return (
    <div className="w-full min-h-screen bg-white flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-t-transparent animate-spin rounded-full" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
      <p className="text-sm font-medium" style={{ color: MUTED }}>Loading article...</p>
    </div>
  );

  if (!post) return (
    <div className="w-full min-h-screen bg-white flex flex-col items-center justify-center gap-4">
      <p className="text-xl font-medium" style={{ color: NAVY }}>Post not found</p>
      <Link to="/blog" className="text-sm font-bold" style={{ color: GOLD }}>Back to Blog</Link>
    </div>
  );

  const displayDate = post.published_at 
    ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Recently';

  const category = post.categories?.[0] || "General";

  // Dynamic Read Time Calculation
  const calculateReadTime = (content) => {
    if (!content) return "1 min read";
    const wordsPerMinute = 200;
    const text = content.replace(/<[^>]*>/g, '');
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute) + " min read";
  };

  const readTime = post.readTime || calculateReadTime(post.content);
  const pageTitle = post.meta_title || post.title || "Blog";
  const pageDesc = post.meta_description || post.excerpt || "";
  const pageKeywords = [...(post.meta_keywords || []), ...(post.tags || [])].join(", ");

  return (
    <div className="w-full min-h-screen bg-white font-['Plus_Jakarta_Sans']">
      <Helmet>
        <title>{pageTitle} | Traveamer</title>
        <meta name="description" content={pageDesc} />
        {pageKeywords && <meta name="keywords" content={pageKeywords} />}
        {post.blog_url && <link rel="canonical" href={post.blog_url} />}
      </Helmet>
      <LandingHeader />

      {/* ══ PREMIUM SPLIT HERO SECTION ════════════════════════════════════════ */}
      <section 
        className="w-full pt-32 pb-20 px-6 relative overflow-hidden"
        style={{ background: HERO_GRAD }}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-white/[0.02] -skew-x-12 translate-x-20 pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full blur-[100px] pointer-events-none" style={{ background: "rgba(201,162,64,0.08)" }} />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            
            {/* ── Left: Content ── */}
            <div className="flex-1 text-left">
              <Link 
                to="/blog"
                className="inline-flex items-center gap-2 text-sm font-medium mb-10 transition-all hover:translate-x-[-4px]"
                style={{ color: GOLD }}
              >
                <FiChevronLeft /> Back to Insights
              </Link>

              <div className="flex items-center gap-4 mb-6">
                <span 
                  className="px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest"
                  style={{ background: GOLD, color: "#000" }}
                >
                  {category}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-white/40 text-[10px] uppercase tracking-widest font-bold">
                    {readTime}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  
                  {/* View Count */}
                  <div className="flex items-center gap-2 text-white/60 text-[10px] uppercase tracking-widest font-bold">
                    <FiEye className="text-green-400" />
                    <span>{post.view_count || 0}</span>
                  </div>

                  <span className="w-1 h-1 rounded-full bg-white/20" />

                  {/* Share & Save Group */}
                  <div className="flex items-center gap-2 relative" ref={shareMenuRef}>
                    <button 
                      onClick={() => setShowShareMenu(!showShareMenu)}
                      className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all"
                      title="Share Article"
                    >
                      <FiShare2 size={14} />
                    </button>

                    {/* Share Dropdown */}
                    {showShareMenu && (
                      <div className="absolute top-full left-0 mt-2 w-48 bg-[#000D26] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-2 flex flex-col gap-1">
                          <WhatsappShareButton url={shareUrl} title={post.title} onClick={() => setShowShareMenu(false)}>
                            <div className="flex items-center gap-3 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all w-full text-left">
                              <FaWhatsapp className="text-green-500" /> WhatsApp
                            </div>
                          </WhatsappShareButton>
                          
                          <FacebookShareButton url={shareUrl} quote={post.title} onClick={() => setShowShareMenu(false)}>
                            <div className="flex items-center gap-3 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all w-full text-left">
                              <FiFacebook className="text-blue-500" /> Facebook
                            </div>
                          </FacebookShareButton>
                          
                          <TwitterShareButton url={shareUrl} title={post.title} onClick={() => setShowShareMenu(false)}>
                            <div className="flex items-center gap-3 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all w-full text-left">
                              <FiTwitter className="text-sky-500" /> Twitter (X)
                            </div>
                          </TwitterShareButton>

                          <button onClick={handleCopyLink} className="flex items-center gap-3 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all w-full text-left">
                            <FiInstagram className="text-pink-500" /> Instagram
                          </button>

                          <div className="h-px bg-white/10 my-1" />

                          <button onClick={handleCopyLink} className="flex items-center gap-3 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all w-full text-left">
                            <FiLink className="text-white/40" /> Copy Link
                          </button>
                        </div>
                      </div>
                    )}

                    <button 
                      onClick={toggleSave}
                      className={`p-1.5 rounded-full border transition-all ${
                        isSaved 
                          ? "bg-amber-400 border-amber-400 text-black" 
                          : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                      }`}
                      title={isSaved ? "Saved" : "Save Article"}
                    >
                      <FiBookmark size={14} fill={isSaved ? "currentColor" : "none"} />
                    </button>
                  </div>
                </div>
              </div>

              <h1 
                className="text-4xl md:text-5xl lg:text-7xl font-normal text-white mb-8 leading-[1.1]"
                style={{ fontFamily: "'DM Serif Display', serif" }}
              >
                {post.title}
              </h1>

              <div className="flex flex-wrap items-center gap-8 text-white/60 text-sm mb-12">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 border border-white/20 text-white font-bold">
                    {(post.author || "A").charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white/40 text-[10px] uppercase font-bold tracking-wider leading-none mb-1">Written By</span>
                    <span className="text-white font-medium">{post.author || "Admin"}</span>
                  </div>
                </div>
                <div className="h-8 w-px bg-white/10 hidden sm:block" />
                <div className="flex flex-col">
                  <span className="text-white/40 text-[10px] uppercase font-bold tracking-wider leading-none mb-1">Published On</span>
                  <span className="text-white font-medium">{displayDate}</span>
                </div>
              </div>


              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm max-w-lg">
                <p className="text-white/70 text-sm leading-relaxed italic">
                  "{post.meta_description || post.excerpt}"
                </p>
              </div>
            </div>

            {/* ── Right: Image ── */}
            <div className="w-full lg:w-[45%] relative">
              {/* Image Frame with offset border */}
              <div className="relative z-10 rounded-[3rem] overflow-hidden aspect-[4/5] shadow-2xl">
                <img 
                  src={post.featured_image || "https://images.unsplash.com/photo-1436491865332-7a61a109c0f3?w=800&q=80"} 
                  alt={post.featured_image_alt || post.image_alt_text || post.title} 
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                />
                {/* Subtle overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#000D26]/40 to-transparent" />
              </div>
              
              {/* Decorative behind image */}
              <div 
                className="absolute -top-6 -right-6 w-full h-full rounded-[3rem] border-2 border-white/10 -z-0"
              />
              <div 
                className="absolute -bottom-8 -left-8 w-32 h-32 rounded-3xl bg-[#C9A240]/20 blur-2xl -z-0"
              />
            </div>

          </div>
        </div>
      </section>

      {/* ══ MAIN CONTENT ══════════════════════════════════════════════════════ */}
      <section className="w-full py-20 px-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-12">
          
          {/* ── Table of Contents (Mobile: Top, Desktop: Right Sidebar) ── */}
          <aside className="w-full lg:w-[320px] flex-shrink-0 lg:order-2">
            <div className="sticky top-28 p-8 rounded-3xl bg-slate-50 border" style={{ borderColor: BORDER }}>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: NAVY }}>Table of Contents</h4>
              <nav className="flex flex-col gap-4 max-h-[200px] lg:max-h-none overflow-y-auto pr-2 custom-scrollbar">
                {toc.length > 0 ? toc.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToHeading(item.text)}
                    className="text-left text-sm transition-all hover:text-[#C9A240]"
                    style={{ 
                      color: MUTED,
                      paddingLeft: item.level === 'h3' ? '1.5rem' : '0'
                    }}
                  >
                    {item.text}
                  </button>
                )) : (
                  <p className="text-xs italic text-slate-400">Main sections of the article will appear here.</p>
                )}
              </nav>

              <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar {
                  width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: rgba(0,0,0,0.05);
                  border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: ${GOLD};
                  border-radius: 10px;
                }
                @media (min-width: 1024px) {
                  .custom-scrollbar {
                    overflow-y: visible;
                    max-height: none;
                    padding-right: 0;
                  }
                  .custom-scrollbar::-webkit-scrollbar {
                    display: none;
                  }
                }
              `}} />

              {/* Sidebar CTA - Only visible on Desktop (lg) */}
              <div className="mt-10 pt-10 border-t hidden lg:block" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                <div className="bg-[#000D26] rounded-2xl p-6 text-center">
                  <h5 className="text-white font-medium mb-2">Need a Travel Platform?</h5>
                  <p className="text-white/60 text-xs mb-4">Start managing your corporate travel with Traveamer today.</p>
                  <button className="w-full py-2.5 rounded-lg text-xs font-bold transition-all hover:brightness-110" style={{ background: GOLD, color: "#000" }}>Get Started</button>
                </div>
              </div>
            </div>
          </aside>

          {/* ── Left Content ── */}
          <div className="flex-1 min-w-0 lg:order-1">
            {/* Blog Body with Explicit Styling */}
            <div 
              className="blog-content-area"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            <style dangerouslySetInnerHTML={{ __html: `
              .blog-content-area h2 {
                font-size: 2.25rem;
                color: ${NAVY};
                font-family: 'DM Serif Display', serif;
                margin-top: 3rem;
                margin-bottom: 1.5rem;
                font-weight: 500;
                line-height: 1.2;
              }
              .blog-content-area h3 {
                font-size: 1.5rem;
                color: ${NAVY};
                margin-top: 2.5rem;
                margin-bottom: 1rem;
                font-weight: 600;
                line-height: 1.4;
              }
              .blog-content-area p {
                font-size: 1.125rem;
                line-height: 1.8;
                color: #475569;
                margin-bottom: 1.5rem;
              }
              .blog-content-area ul, .blog-content-area ol {
                margin-bottom: 2rem;
                padding-left: 1.5rem;
              }
              .blog-content-area li {
                font-size: 1.125rem;
                line-height: 1.8;
                color: #475569;
                margin-bottom: 0.75rem;
                position: relative;
              }
              .blog-content-area ul li::before {
                content: "•";
                color: ${GOLD};
                font-weight: bold;
                display: inline-block; 
                width: 1em;
                margin-left: -1em;
              }
              .blog-content-area blockquote {
                border-left: 4px solid ${GOLD};
                background: #f8fafc;
                padding: 2rem;
                margin: 3rem 0;
                border-radius: 0 1rem 1rem 0;
                font-style: italic;
                font-size: 1.25rem;
                color: ${NAVY};
              }
              .blog-content-area img {
                border-radius: 1.5rem;
                box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
                margin: 3rem 0;
              }
              .blog-content-area strong {
                color: ${NAVY};
                font-weight: 700;
              }
              .blog-content-area em, .blog-content-area i {
                font-style: italic;
                color: #334155;
              }
            `}} />

            {/* Share & Actions */}
            <div className="mt-16 pt-8 border-t flex items-center justify-between" style={{ borderColor: BORDER }}>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Keywords:</span>
                {[...new Set([...(post.tags || []), ...(post.meta_keywords || [])])].map(kw => (
                  <span key={kw} className="text-xs font-medium px-3 py-1 rounded-full bg-slate-100 text-slate-600">{kw}</span>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={toggleSave}
                  className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
                    isSaved ? "bg-amber-50 border-amber-200 text-amber-600" : "hover:bg-slate-50"
                  }`} 
                  style={{ borderColor: isSaved ? "transparent" : BORDER }}
                >
                  <FiBookmark fill={isSaved ? "currentColor" : "none"} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ RELATED BLOGS ═════════════════════════════════════════════════════ */}
      {relatedBlogs.length > 0 && (
        <section className="w-full py-20 px-6 bg-slate-50 border-t" style={{ borderColor: BORDER }}>
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-normal mb-2" style={{ fontFamily: "'DM Serif Display', serif", color: NAVY }}>Related Articles</h2>
                <p className="text-sm" style={{ color: MUTED }}>Curated insights similar to what you just read.</p>
              </div>

              {/* Navigation Controls (At top) */}
              {relatedBlogs.length > 3 && (
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => scrollRelated("left")}
                    className="w-10 h-10 rounded-full border flex items-center justify-center bg-white transition-all hover:bg-[#C9A240] hover:text-white"
                    style={{ borderColor: BORDER, color: NAVY }}
                  >
                    <FiChevronLeft size={20} />
                  </button>
                  <button 
                    onClick={() => scrollRelated("right")}
                    className="w-10 h-10 rounded-full border flex items-center justify-center bg-white transition-all hover:bg-[#C9A240] hover:text-white"
                    style={{ borderColor: BORDER, color: NAVY }}
                  >
                    <FiChevronRight size={20} />
                  </button>
                </div>
              )}
            </div>

            {/* Related Carousel */}
            <div className="relative group">
              <div 
                ref={relatedRef}
                className={`flex gap-8 overflow-x-auto pb-12 scroll-smooth no-scrollbar ${
                  relatedBlogs.length < 3 ? "justify-center" : "justify-start"
                }`}
              >
                {relatedBlogs.map((r) => (
                  <div 
                    key={r._id} 
                    className={`flex-shrink-0 transition-all duration-300 ${
                      relatedBlogs.length === 1 ? "w-full max-w-xl" : 
                      relatedBlogs.length === 2 ? "w-full md:w-[calc(50%-1rem)] max-w-md" : 
                      "w-full md:w-[calc(33.333%-1.35rem)] min-w-[300px]"
                    }`}
                  >
                    <BlogCard post={r} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <LandingFooter />
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .scroll-snap-align-start { scroll-snap-align: start; }
      `}</style>
    </div>
  );
}
