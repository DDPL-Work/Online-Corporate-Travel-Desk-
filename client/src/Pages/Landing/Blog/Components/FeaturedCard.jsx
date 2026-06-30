import React from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiClock, FiCalendar, FiEye } from "react-icons/fi";
import { GOLD, MUTED, BORDER, NAVY } from "./blogConstants";

/**
 * FeaturedCard – horizontal layout (image left, content right).
 * Used inside the hero carousel — shows one card at a time.
 * Fixed image height of 280px on the left panel.
 */
export default function FeaturedCard({ post }) {
  const date = post.published_at 
    ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Recently';

  const category = post.categories?.[0] || "General";
  const displayExcerpt = post.meta_description || post.excerpt || 
    (post.content ? post.content.replace(/<[^>]*>/g, '').slice(0, 300) : "");

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex flex-col sm:flex-row w-full overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-xl"
      style={{ background: "#fff" }}
    >
      {/* ── Image (left) ── */}
      <div
        className="relative overflow-hidden flex-shrink-0"
        style={{ width: "100%", maxWidth: "320px", height: "280px" }}
      >
        <img src={post.featured_image || "https://images.unsplash.com/photo-1436491865332-7a61a109c0f3?w=800&q=80"}
          alt={post.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        <span
          className="absolute top-4 left-4 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full"
          style={{ background: GOLD, color: "#000" }}
        >
          {category}
        </span>
      </div>

      {/* ── Content (right) ── */}
      <div className="flex flex-col justify-between p-6 flex-1 gap-4">
        <div className="flex flex-col gap-3">
          <h3
            className="font-normal leading-snug group-hover:opacity-80 transition-opacity"
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "22px",
              color: NAVY,
            }}
          >
            {post.title}
          </h3>
          <p
            className="text-sm leading-relaxed"
            style={{ color: MUTED, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {displayExcerpt}
          </p>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between pt-4"
          style={{ borderTop: `1px solid ${BORDER}` }}
        >
          <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: MUTED, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <span className="flex items-center gap-1.5">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ background: `rgba(201,162,64,0.15)`, color: GOLD }}
              >
                {(post.author || "A").charAt(0)}
              </div>
              {post.author || "Admin"}
            </span>
            <span className="flex items-center gap-1"><FiCalendar size={11} />{date}</span>
            <span className="flex items-center gap-1"><FiEye size={11} />{post.view_count || 0}</span>
          </div>
          <span
            className="flex items-center gap-1 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: GOLD, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Read more <FiArrowRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}
