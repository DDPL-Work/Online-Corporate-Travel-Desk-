import React from "react";
import { Link } from "react-router-dom";
import { FiEye } from "react-icons/fi";
import { GOLD, GOLD_FADE, MUTED, BORDER, NAVY } from "./blogConstants";
import LazyImage from "../../../../components/common/LazyImage";

/**
 * BlogCard – vertical card matching the reference screenshot layout.
 * Image top (fixed 200px) → date → bold title → excerpt → category tag pill.
 */
export default function BlogCard({ post }) {
  const date = post.published_at 
    ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Recently';

  // Strip HTML from content if excerpt is missing
  const displayExcerpt = post.excerpt || 
    (post.content ? post.content.replace(/<[^>]*>/g, '').slice(0, 100) + "..." : "");

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg h-full"
      style={{ border: `1px solid ${BORDER}`, background: "#fff" }}
    >
      {/* ── Thumbnail ── */}
      <div className="relative overflow-hidden flex-shrink-0" style={{ height: "200px" }}>
        <LazyImage
          src={post.featured_image || "https://images.unsplash.com/photo-1436491865332-7a61a109c0f3?w=800&q=80"}
          alt={post.title}
          className="w-full h-full"
          imgClassName="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      {/* ── Content ── */}
      <div className="flex flex-col gap-2 p-5 flex-1">
        <div className="flex items-center justify-between">
          <p
            className="text-[11px] font-medium"
            style={{ color: MUTED, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {date}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: MUTED }}>
            <FiEye size={12} className="text-gray-400" />
            <span>{post.view_count || 0}</span>
          </div>
        </div>

        <h3
          className="font-bold leading-snug line-clamp-2"
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: "16px",
            color: NAVY,
          }}
        >
          {post.title}
        </h3>

        <p
          className="text-sm leading-relaxed line-clamp-2"
          style={{ color: MUTED, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {displayExcerpt}
        </p>

        <div className="flex-1" />

        <div className="flex flex-wrap gap-2 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
          {post.categories && post.categories.slice(0, 1).map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-medium"
              style={{ background: "#E0F2FE", color: "#0369A1" }}
            >
              {cat}
            </span>
          ))}
          
          {(post.tags || []).slice(0, 2).map(tag => (
            <span
              key={tag}
              className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-medium"
              style={{ background: "#DCFCE7", color: "#15803D" }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
