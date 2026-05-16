const mongoose = require('mongoose');
const { Schema } = mongoose;

// Blog Schema
const blogSchema = new Schema({
  author: { type: String, required: true },
  title: { type: String, required: true },
  slug: { type: String, unique: true },
  excerpt: String,
  content: { type: String, required: true },
  featured_image: String,
  featured_image_alt: String,
  author_id: { type: Schema.Types.ObjectId, required: true },
  status: { 
    type: String, 
    enum: ['draft', 'published', 'archived'], 
    default: 'draft' 
  },
  published_at: Date,
  meta_title: String,
  meta_description: String,
  meta_keywords: [String],
  blog_url: String,
  image_alt_text: String, // This is what the user is sending
  tags: [String],
  categories: [String],
  view_count: { type: Number, default: 0 },
  viewed_by_ips: [String],
  seo_score: Number,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

const Blog = mongoose.model('Blog', blogSchema);

module.exports = { Blog };