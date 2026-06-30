import React, { useMemo } from "react";
import { FiSearch, FiTag, FiCheck } from "react-icons/fi";
import {
  GOLD,
  GOLD_FADE,
  MUTED,
  BORDER,
  NAVY,
  OFF_WHITE,
} from "./blogConstants";

/**
 * BlogSidebar – search, category filter, and multi-select popular tags.
 */
export default function BlogSidebar({ 
  blogs = [],
  search, 
  onSearch, 
  activeCategory, 
  onCategoryChange,
  selectedTags = [],
  onTagToggle
}) {
  // Derive dynamic categories from blogs
  const categories = useMemo(() => {
    const cats = new Set();
    blogs.forEach(blog => {
      if (blog.categories) {
        blog.categories.forEach(cat => cats.add(cat));
      }
    });
    return ["All", ...Array.from(cats).sort()];
  }, [blogs]);

  // Derive dynamic popular tags from blogs
  const popularTags = useMemo(() => {
    const tags = new Set();
    blogs.forEach(blog => {
      if (blog.tags) blog.tags.forEach(t => tags.add(t));
      if (blog.meta_keywords) blog.meta_keywords.forEach(k => tags.add(k));
    });
    return Array.from(tags).sort().slice(0, 15);
  }, [blogs]);

  return (
    <aside className="w-full lg:w-[280px] flex-shrink-0 flex flex-col gap-6">

      {/* ── Search ── */}
      <div className="bg-white rounded-2xl p-5" style={{ border: `1px solid ${BORDER}` }}>
        <h3
          className="text-sm font-bold mb-3 uppercase tracking-wider"
          style={{ color: NAVY, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Search
        </h3>
        <div className="relative">
          <FiSearch
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: MUTED }}
          />
          <input
            type="text"
            placeholder="Search articles…"
            value={search}
            onChange={onSearch}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{
              border: `1px solid ${BORDER}`,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: NAVY,
              background: OFF_WHITE,
            }}
          />
        </div>
      </div>

      {/* ── Categories ── */}
      <div className="bg-white rounded-2xl p-5" style={{ border: `1px solid ${BORDER}` }}>
        <h3
          className="text-sm font-bold mb-4 uppercase tracking-wider"
          style={{ color: NAVY, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Categories
        </h3>
        <ul className="flex flex-col gap-1">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <li key={cat}>
                <button
                  onClick={() => onCategoryChange(cat)}
                  className="w-full flex items-center px-3 py-2 rounded-lg text-sm transition-all text-left"
                  style={{
                    background: isActive ? GOLD_FADE : "transparent",
                    color: isActive ? GOLD : MUTED,
                    fontWeight: isActive ? 700 : 400,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  <span>{cat}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── Popular Tags (Multi-select) ── */}
      <div className="bg-white rounded-2xl p-5" style={{ border: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-sm font-bold uppercase tracking-wider"
            style={{ color: NAVY, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Popular Keywords
          </h3>
          {selectedTags.length > 0 && (
            <span className="text-[10px] font-bold" style={{ color: GOLD }}>
              {selectedTags.length} selected
            </span>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          {popularTags.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => onTagToggle(tag)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background: isSelected ? GOLD : GOLD_FADE,
                  color: isSelected ? "#000" : GOLD,
                  border: `1px solid ${isSelected ? GOLD : "rgba(201,162,64,0.2)"}`,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                {isSelected ? <FiCheck size={11} /> : <FiTag size={10} />}
                {tag}
              </button>
            );
          })}
        </div>
        
        {selectedTags.length > 0 && (
          <p className="mt-4 text-[10px] text-gray-400 italic">
            Click tags to toggle. Filtering for posts that match any selected tag.
          </p>
        )}
      </div>
    </aside>
  );
}
