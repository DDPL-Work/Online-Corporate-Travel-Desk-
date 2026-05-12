import React, { useState, useMemo, useEffect, useCallback } from "react";
import LandingHeader from "../../../layout/LandingHeader";
import LandingFooter from "../../../layout/LandingFooter";
import { FiSearch, FiChevronLeft, FiChevronRight } from "react-icons/fi";

// Components
import FeaturedCard from "./Components/FeaturedCard";
import BlogCard     from "./Components/BlogCard";
import Pagination   from "./Components/Pagination";
import BlogSidebar  from "./Components/BlogSidebar";

// Constants & data
import {
  POSTS_PER_PAGE,
  GOLD,
  GOLD_FADE,
  MUTED,
  BORDER,
  OFF_WHITE,
  HERO_GRAD,
} from "./Components/blogConstants";

import { useDispatch, useSelector } from "react-redux";
import { fetchPublishedBlogs } from "../../../Redux/Actions/blog.thunks";

const CAROUSEL_INTERVAL = 4000; // ms
const TRANSITION_TIME   = 700;  // ms

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BlogList() {
  const dispatch = useDispatch();
  const { items: blogs, loading, error } = useSelector((state) => state.blogs);

  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedTags, setSelectedTags]     = useState([]);
  const [search, setSearch]                 = useState("");
  const [currentPage, setCurrentPage]       = useState(1);
  
  // Carousel state
  const [slideIndex, setSlideIndex]         = useState(0);
  const [paused, setPaused]                 = useState(false);
  const [transitionEnabled, setTransitionEnabled] = useState(true);

  useEffect(() => {
    dispatch(fetchPublishedBlogs());
  }, [dispatch]);

  const featuredPosts = useMemo(() => {
    // Show the top 5 most viewed blogs in the hero carousel
    return [...blogs]
      .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
      .slice(0, 5);
  }, [blogs]);

  const total = featuredPosts.length || 1;

  // Auto-advance carousel
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setSlideIndex((prev) => prev + 1);
    }, CAROUSEL_INTERVAL);
    return () => clearInterval(id);
  }, [paused]);

  // Handle the seamless jump at the end of carousel
  useEffect(() => {
    if (slideIndex >= total) {
      const timer = setTimeout(() => {
        setTransitionEnabled(false);
        setSlideIndex(0);
        // Force reflow and re-enable transition for next movement
        setTimeout(() => setTransitionEnabled(true), 50);
      }, TRANSITION_TIME);
      return () => clearTimeout(timer);
    }
    if (slideIndex < 0) {
      // Handle manual previous on first slide
      setTransitionEnabled(false);
      setSlideIndex(total - 1);
      setTimeout(() => setTransitionEnabled(true), 50);
    }
  }, [slideIndex, total]);

  const goTo = useCallback((idx) => {
    setTransitionEnabled(true);
    setSlideIndex(idx);
  }, []);

  // Toggle tag selection
  const handleTagToggle = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
    setCurrentPage(1);
  };

  // Filter posts by category, tags, and search query
  const filtered = useMemo(() => {
    let posts = blogs;
    
    // Category Filter
    if (activeCategory !== "All") {
      posts = posts.filter((p) => p.categories && p.categories.includes(activeCategory));
    }
    
    // Multi-Tag Filter
    if (selectedTags.length > 0) {
      posts = posts.filter((p) => 
        (p.tags || []).some(t => selectedTags.includes(t)) ||
        (p.meta_keywords || []).some(k => selectedTags.includes(k))
      );
    }
    
    // Search Filter
    if (search.trim()) {
      const q = search.toLowerCase();
      posts = posts.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.excerpt && p.excerpt.toLowerCase().includes(q)) ||
          (p.content && p.content.toLowerCase().includes(q)) ||
          (p.categories && p.categories.some(cat => cat.toLowerCase().includes(q)))
      );
    }
    return posts;
  }, [blogs, activeCategory, selectedTags, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / POSTS_PER_PAGE));
  const paginated  = filtered.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  function handleCategoryChange(cat) {
    setActiveCategory(cat);
    setCurrentPage(1);
  }

  function handleSearch(e) {
    setSearch(e.target.value);
    setCurrentPage(1);
  }

  function handlePageChange(page) {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="w-full min-h-screen bg-white font-['Plus_Jakarta_Sans']">
      <LandingHeader />

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <section
        style={{ background: HERO_GRAD }}
        className="w-full pt-28 pb-20 px-6 relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: "linear-gradient(90deg,rgba(255,255,255,0.07) 1px,transparent 1px), linear-gradient(180deg,rgba(255,255,255,0.07) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-[80px] pointer-events-none" style={{ background: "rgba(201,162,64,0.12)" }} />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="mb-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full" style={{ background: GOLD_FADE, border: "1px solid rgba(201,162,64,0.25)" }}>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: GOLD }}>Resource Hub · Blog</span>
          </div>

          <h1 className="mb-4 font-normal leading-tight" style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(32px,4.5vw,56px)", color: "#fff" }}>
            Insights for the <em style={{ color: GOLD, fontStyle: "italic" }}>modern</em><br />corporate travel manager.
          </h1>

          <p className="mb-10 text-base max-w-xl leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
            Practical guides, cost-saving strategies, and product updates — everything you need to run smarter business travel.
          </p>

          {/* ── Auto-scrolling Carousel ── */}
          {featuredPosts.length > 0 ? (
            <div className="relative w-full overflow-hidden" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
              <div
                className="flex"
                style={{ 
                  transform: `translateX(-${slideIndex * 100}%)`,
                  transition: transitionEnabled ? `transform ${TRANSITION_TIME}ms ease-in-out` : "none"
                }}
              >
                {[...featuredPosts, featuredPosts[0]].map((post, idx) => (
                  <div key={`${post?._id || idx}-${idx}`} className="w-full flex-shrink-0 px-1">
                    {post && <FeaturedCard post={post} />}
                  </div>
                ))}
              </div>

              {/* Controls row */}
              <div className="flex items-center justify-between mt-5">
                <div className="flex items-center gap-2">
                  {featuredPosts.map((_, i) => (
                    <button key={i} onClick={() => goTo(i)} className="rounded-full transition-all duration-300" style={{ width: (slideIndex % total) === i ? "24px" : "8px", height: "8px", background: (slideIndex % total) === i ? GOLD : "rgba(255,255,255,0.35)" }} />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goTo(slideIndex - 1)}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300"
                    style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff" }}
                    onMouseOver={(e) => { e.currentTarget.style.background = GOLD; e.currentTarget.style.color = "#000"; e.currentTarget.style.border = `1px solid ${GOLD}`; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.border = "1px solid rgba(255,255,255,0.2)"; }}
                  >
                    <FiChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => goTo(slideIndex + 1)}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300"
                    style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff" }}
                    onMouseOver={(e) => { e.currentTarget.style.background = GOLD; e.currentTarget.style.color = "#000"; e.currentTarget.style.border = `1px solid ${GOLD}`; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.border = "1px solid rgba(255,255,255,0.2)"; }}
                  >
                    <FiChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full py-10 bg-white/5 border border-white/10 rounded-2xl text-center">
              <p className="text-white/60 text-sm">No featured articles at the moment.</p>
            </div>
          )}
        </div>
      </section>

      {/* ══ MAIN CONTENT ══════════════════════════════════════════════════════ */}
      <section className="w-full py-16 px-6" style={{ background: OFF_WHITE }}>
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-10">
          <BlogSidebar
            blogs={blogs}
            search={search}
            onSearch={handleSearch}
            activeCategory={activeCategory}
            onCategoryChange={handleCategoryChange}
            selectedTags={selectedTags}
            onTagToggle={handleTagToggle}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="inline-block mb-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ background: GOLD, color: "#000" }}>
                  {activeCategory === "All" ? "All Articles" : activeCategory}
                </span>
                {selectedTags.length > 0 && (
                  <span className="ml-2 text-[10px] font-medium text-gray-500">
                    + {selectedTags.length} tag{selectedTags.length !== 1 ? "s" : ""} active
                  </span>
                )}
                <p className="text-sm mt-1" style={{ color: MUTED }}>Showing {filtered.length} article{filtered.length !== 1 ? "s" : ""}</p>
              </div>
              {selectedTags.length > 0 && (
                <button onClick={() => setSelectedTags([])} className="text-xs font-semibold underline" style={{ color: GOLD }}>Clear tags</button>
              )}
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 border-4 border-t-transparent animate-spin rounded-full" style={{ borderColor: GOLD, borderTopColor: "transparent" }} />
                <p className="text-sm font-medium" style={{ color: MUTED }}>Loading articles...</p>
              </div>
            ) : paginated.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {paginated.map((post) => (
                  <BlogCard key={post._id} post={post} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-2xl" style={{ border: `1px solid ${BORDER}` }}>
                <FiSearch size={32} style={{ color: MUTED }} />
                <p className="text-sm font-medium" style={{ color: MUTED }}>{error ? "Failed to load articles." : "No articles found."}</p>
                <button onClick={() => { setSearch(""); setActiveCategory("All"); setSelectedTags([]); }} className="text-xs font-semibold px-4 py-2 rounded-lg" style={{ background: GOLD_FADE, color: GOLD }}>Clear filters</button>
              </div>
            )}

            {totalPages > 1 && <Pagination current={currentPage} total={totalPages} onChange={handlePageChange} />}
          </div>
        </div>
      </section>
      <LandingFooter />
    </div>
  );
}
