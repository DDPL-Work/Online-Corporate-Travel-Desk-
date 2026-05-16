import React, { useMemo } from "react";
import {
  FiCalendar,
  FiClock,
  FiUser,
  FiX,
  FiChevronLeft,
  FiShare2,
  FiBookmark,
} from "react-icons/fi";

// Design Tokens from client constants
const GOLD = "#C9A240";
const NAVY = "#000D26";
const MUTED = "#64748B";
const BORDER = "#E2E8F0";
const OFF_WHITE = "#F8FAFC";
const HERO_GRAD = "radial-gradient(circle at top right, #001640, #000D26)";

const BlogPreviewModal = ({ isOpen, onClose, blogData }) => {
  // Table of Contents logic (Extract H2/H3 from content string)
  const toc = useMemo(() => {
    if (!blogData?.content) return [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(blogData.content, "text/html");
      const headings = Array.from(doc.querySelectorAll("h2, h3"));
      return headings.map((h, i) => ({
        id: `heading-${i}`,
        text: h.textContent,
        level: h.tagName.toLowerCase(),
      }));
    } catch (e) {
      return [];
    }
  }, [blogData.content]);

  if (!isOpen) return null;

  const previewBlog = {
    title: blogData.title || blogData.meta_title || "Untitled Blog Post",
    excerpt: blogData.meta_description || "No description provided.",
    content: blogData.content || "<p>No content yet...</p>",
    category: blogData.categories[0] || "General",
    author: blogData.author_name || "Author",
    image:
      blogData.featured_image?.url ||
      "https://images.unsplash.com/photo-1488646953014-85cb44e25838?w=1200&h=600&fit=crop",
    date: new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    readTime: "8 min read",
    tags: blogData.meta_keywords.length > 0 ? blogData.meta_keywords : ["preview"],
  };

  const scrollToHeading = (text) => {
    const previewContainer = document.getElementById("preview-scroll-container");
    if (!previewContainer) return;
    
    const headings = previewContainer.querySelectorAll("h2, h3");
    const target = Array.from(headings).find((h) => h.textContent === text);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-0 md:p-4">
      {/* Google Fonts Import */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
          
          .preview-modal-root {
            font-family: 'Plus_Jakarta_Sans', sans-serif;
          }

          .dm-serif {
            font-family: 'DM Serif Display', serif;
          }

          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

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
            border-radius: 0 1.5rem 1.5rem 0;
            font-style: italic;
            font-size: 1.25rem;
            color: ${NAVY};
            line-height: 1.6;
          }
          .blog-content-area img {
            border-radius: 1.5rem;
            box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
            margin: 3.5rem 0;
            max-width: 100%;
            height: auto;
          }
          .blog-content-area strong {
            color: ${NAVY};
            font-weight: 700;
          }
        `}
      </style>

      <div className="preview-modal-root relative w-full max-w-7xl h-full md:h-[95vh] bg-white md:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top Control Bar */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
          <div className="bg-yellow-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2">
            <span className="animate-pulse w-2 h-2 bg-white rounded-full"></span>
            LIVE PREVIEW
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/20 backdrop-blur-md hover:bg-white/40 text-white rounded-full flex items-center justify-center transition-all shadow-lg"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Scrollable Container */}
        <div id="preview-scroll-container" className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
          {/* ══ PREMIUM SPLIT HERO SECTION ════════════════════════════════════════ */}
          <section
            className="w-full pt-24 pb-16 px-6 md:px-12 relative overflow-hidden"
            style={{ background: HERO_GRAD }}
          >
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-white/[0.02] -skew-x-12 translate-x-20 pointer-events-none" />
            <div
              className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full blur-[100px] pointer-events-none"
              style={{ background: "rgba(201,162,64,0.08)" }}
            />

            <div className="max-w-7xl mx-auto relative z-10">
              <div className="flex flex-col lg:flex-row items-center gap-10 md:gap-16">
                {/* ── Left: Content ── */}
                <div className="flex-1 text-left">
                  <div className="inline-flex items-center gap-2 text-sm font-medium mb-6 opacity-60 text-white cursor-not-allowed">
                    <FiChevronLeft /> Back to Insights
                  </div>

                  <div className="flex items-center gap-3 mb-6">
                    <span
                      className="px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest"
                      style={{ background: GOLD, color: "#000" }}
                    >
                      {previewBlog.category}
                    </span>
                    <span className="text-white/40 text-[10px] uppercase tracking-widest font-bold">
                      {previewBlog.readTime}
                    </span>
                  </div>

                  <h1 className="text-3xl md:text-5xl lg:text-6xl dm-serif text-white mb-6 leading-[1.1]">
                    {previewBlog.title}
                  </h1>

                  <div className="flex flex-wrap items-center gap-6 text-white/60 text-sm mb-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 border border-white/20 text-white font-bold">
                        {previewBlog.author.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-white/40 text-[10px] uppercase font-bold tracking-wider leading-none mb-1">
                          Written By
                        </span>
                        <span className="text-white font-medium">
                          {previewBlog.author}
                        </span>
                      </div>
                    </div>
                    <div className="h-8 w-px bg-white/10 hidden sm:block" />
                    <div className="flex flex-col">
                      <span className="text-white/40 text-[10px] uppercase font-bold tracking-wider leading-none mb-1">
                        Published On
                      </span>
                      <span className="text-white font-medium">
                        {previewBlog.date}
                      </span>
                    </div>
                  </div>

                  {/* Quick Summary Card */}
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm max-w-lg">
                    <p className="text-white/70 text-sm leading-relaxed italic">
                      "{previewBlog.excerpt}"
                    </p>
                  </div>
                </div>

                {/* ── Right: Image ── */}
                <div className="w-full lg:w-[42%] relative mt-8 lg:mt-0">
                  <div className="relative z-10 rounded-[2.5rem] overflow-hidden aspect-[4/5] shadow-2xl border border-white/10">
                    <img
                      src={previewBlog.image}
                      alt={previewBlog.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#000D26]/40 to-transparent" />
                  </div>

                  <div className="absolute -top-6 -right-6 w-full h-full rounded-[2.5rem] border-2 border-white/10 -z-0" />
                  <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-3xl bg-[#C9A240]/20 blur-2xl -z-0" />
                </div>
              </div>
            </div>
          </section>

          {/* ══ MAIN CONTENT ══════════════════════════════════════════════════════ */}
          <section className="w-full py-16 px-6 md:px-12 bg-white">
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-12">
              {/* ── Table of Contents (Mobile: Top, Desktop: Right Sidebar) ── */}
              <aside className="w-full lg:w-[300px] flex-shrink-0 lg:order-2">
                <div className="sticky top-10 p-7 rounded-3xl bg-slate-50 border border-slate-100">
                  <h4
                    className="text-[10px] font-bold uppercase tracking-widest mb-6"
                    style={{ color: NAVY }}
                  >
                    Table of Contents
                  </h4>
                  <nav className="flex flex-col gap-4">
                    {toc.length > 0 ? (
                      toc.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => scrollToHeading(item.text)}
                          className="text-left text-xs transition-all hover:text-[#C9A240] leading-relaxed"
                          style={{
                            color: MUTED,
                            paddingLeft: item.level === "h3" ? "1rem" : "0",
                          }}
                        >
                          {item.text}
                        </button>
                      ))
                    ) : (
                      <p className="text-[10px] italic text-slate-400">
                        Main sections will appear here.
                      </p>
                    )}
                  </nav>

                  {/* Sidebar CTA */}
                  <div
                    className="mt-8 pt-8 border-t"
                    style={{ borderColor: "rgba(0,0,0,0.05)" }}
                  >
                    <div className="bg-[#000D26] rounded-xl p-5 text-center">
                      <h5 className="text-white text-sm font-medium mb-2">
                        Traveamer Business
                      </h5>
                      <p className="text-white/50 text-[10px] mb-4">
                        Manage your corporate travel with efficiency.
                      </p>
                      <button
                        className="w-full py-2 rounded-lg text-[10px] font-bold transition-all hover:brightness-110"
                        style={{ background: GOLD, color: "#000" }}
                      >
                        Request Demo
                      </button>
                    </div>
                  </div>
                </div>
              </aside>

              {/* ── Left Content ── */}
              <div className="flex-1 min-w-0 lg:order-1">
                <div
                  className="blog-content-area"
                  dangerouslySetInnerHTML={{ __html: previewBlog.content }}
                />

                {/* Tags & Share */}
                <div
                  className="mt-16 pt-8 border-t flex flex-wrap items-center justify-between gap-4"
                  style={{ borderColor: BORDER }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Tags:
                    </span>
                    {previewBlog.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-medium px-3 py-1 rounded-full bg-slate-100 text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      className="w-9 h-9 rounded-full border flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors"
                      style={{ borderColor: BORDER }}
                    >
                      <FiShare2 size={14} />
                    </button>
                    <button
                      className="w-9 h-9 rounded-full border flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors"
                      style={{ borderColor: BORDER }}
                    >
                      <FiBookmark size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer info bar */}
        <div className="bg-slate-50 px-8 py-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
          <div className="flex items-center gap-4">
            <span>DEVICE: DESKTOP MOCKUP</span>
            <span>RATIO: 16:9 VIEWPORT</span>
          </div>
          <div>© 2026 TRAVEAMER CORPORATE INSIGHTS</div>
        </div>
      </div>
    </div>
  );
};

export default BlogPreviewModal;
