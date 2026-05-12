const { Blog } = require("../models/blog.model");
const SuperAdmin = require("../models/SuperAdmin.model");
const OpsMember = require("../models/OpsMember");
const mongoose = require("mongoose");

const createBlog = async (req, res) => {
  if (!req.body) {
    return res.status(400).json({
      success: false,
      message: "Request body is missing",
    });
  }

  const {
    title,
    slug,
    excerpt,
    content,
    featured_image,
    featured_image_alt,
    meta_title,
    meta_description,
    meta_keywords,
    blog_url,
    image_alt_text,
    tags,
    categories,
    status,
  } = req.body;

  // Use author from logged in user session (populated by verifyToken middleware)
  const author_id = req.user?.id || req.user?._id;

  if (!author_id || !title || !content || !slug) {
    return res.status(400).json({
      success: false,
      message: "Title, content, and slug are required. Make sure you are logged in.",
    });
  }

  try {
    const authorDoc = req.user; 

    if (!authorDoc) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const existing = await Blog.findOne({ slug: slug.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A blog with this slug already exists",
      });
    }

    // Handle categories and tags if they are sent as stringified JSON
    let parsedCategories = categories;
    if (typeof categories === "string" && categories.trim().startsWith("[")) {
      try {
        parsedCategories = JSON.parse(categories);
      } catch (e) {
        parsedCategories = categories.split(",").map((c) => c.trim()).filter(Boolean);
      }
    } else if (typeof categories === "string") {
      parsedCategories = categories.split(",").map((c) => c.trim()).filter(Boolean);
    }

    let parsedTags = tags;
    if (typeof tags === "string" && tags.trim().startsWith("[")) {
      try {
        parsedTags = JSON.parse(tags);
      } catch (e) {
        parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
      }
    } else if (typeof tags === "string") {
      parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
    }

    let parsedKeywords = meta_keywords;
    if (typeof meta_keywords === "string" && meta_keywords.trim().startsWith("[")) {
      try {
        parsedKeywords = JSON.parse(meta_keywords);
      } catch (e) {
        parsedKeywords = meta_keywords.split(",").map((k) => k.trim()).filter(Boolean);
      }
    } else if (typeof meta_keywords === "string") {
      parsedKeywords = meta_keywords.split(",").map((k) => k.trim()).filter(Boolean);
    }

    // Handle featured image from multer
    let finalFeaturedImage = featured_image;
    if (req.file) {
      finalFeaturedImage = req.file.path;
    }

    const blog = new Blog({
      author: authorDoc.name || "Admin",
      author_id: authorDoc._id || authorDoc.id,
      title,
      slug: slug.toLowerCase(),
      excerpt,
      content,
      featured_image: finalFeaturedImage,
      featured_image_alt,
      meta_title,
      meta_description,
      meta_keywords: parsedKeywords,
      blog_url,
      image_alt_text,
      tags: parsedTags,
      categories: parsedCategories,
      status: status || "draft",
      published_at: status === "published" ? new Date() : null,
    });

    const savedBlog = await blog.save();

    return res.status(201).json({
      success: true,
      message: "Blog created successfully",
      data: savedBlog,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Blog creation failed",
      error: error.message,
    });
  }
};

const deleteBlog = async (req, res) => {
  const { id: _id } = req.params;

  if (!_id || !mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid blog ID",
    });
  }

  try {
    const blog = await Blog.findByIdAndDelete(_id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
      data: blog,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Blog deletion failed",
      error: error.message,
    });
  }
};

const getAllBlogs = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const blogs = await Blog.find(filter).sort({ createdAt: -1 });
    if (blogs.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No blogs found",
      });
    }
    return res.status(200).json({
      success: true,
      data: blogs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve blogs",
      error: error.message,
    });
  }
};

const getOneBlog = async (req, res) => {
  const filters = {};
  const {
    id,
    author_id,
    title,
    slug,
    excerpt,
    content,
    meta_title,
    meta_description,
    tags,
    categories,
    status,
    search,
  } = req.query;

  if (id && mongoose.Types.ObjectId.isValid(id)) filters._id = id;
  if (author_id) filters.author_id = author_id;
  if (slug) filters.slug = slug.toLowerCase();
  if (status) filters.status = status;
  if (title) filters.title = { $regex: title, $options: "i" };
  if (excerpt) filters.excerpt = { $regex: excerpt, $options: "i" };
  if (content) filters.content = { $regex: content, $options: "i" };
  if (meta_title) filters.meta_title = { $regex: meta_title, $options: "i" };
  if (meta_description)
    filters.meta_description = { $regex: meta_description, $options: "i" };

  if (tags) filters.tags = { $in: Array.isArray(tags) ? tags : [tags] };
  if (categories)
    filters.categories = {
      $in: Array.isArray(categories) ? categories : [categories],
    };

  if (search) {
    filters.$text = { $search: search };
  }

  try {
    const blog = await Blog.findOne(filters);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // IP-based view counting logic
    try {
      const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      // Handle potential comma-separated list from proxies
      const clientIp = typeof rawIp === "string" ? rawIp.split(",")[0].trim() : rawIp;

      if (clientIp && !blog.viewed_by_ips.includes(clientIp)) {
        blog.view_count += 1;
        blog.viewed_by_ips.push(clientIp);
        await blog.save();
      }
    } catch (viewError) {
      console.error("View count increment failed:", viewError);
      // We don't want to fail the whole request if view counting fails
    }

    return res.status(200).json({
      success: true,
      data: blog,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Search failed",
      error: error.message,
    });
  }
};

const updateBlog = async (req, res) => {
  const { id: _id } = req.params;
  const {
    title,
    content,
    excerpt,
    tags,
    categories,
    status,
    featured_image_alt,
    meta_title,
    meta_description,
    meta_keywords,
    blog_url,
    image_alt_text,
  } = req.body;

  // Use admin_id from session
  const admin_id = req.user?.id || req.user?._id;

  if (!_id || !mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid blog ID",
    });
  }

  if (!admin_id) {
    return res.status(401).json({
      success: false,
      message: "Authentication required to update blog",
    });
  }

  try {
    const adminDoc = req.user;

    if (!adminDoc) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to update blog",
      });
    }

    const blog = await Blog.findById(_id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // Handle categories and tags if they are sent as stringified JSON
    let parsedCategories = categories;
    if (typeof categories === "string" && categories.trim().startsWith("[")) {
      try {
        parsedCategories = JSON.parse(categories);
      } catch (e) {
        parsedCategories = categories.split(",").map((c) => c.trim()).filter(Boolean);
      }
    } else if (typeof categories === "string") {
      parsedCategories = categories.split(",").map((c) => c.trim()).filter(Boolean);
    }

    let parsedTags = tags;
    if (typeof tags === "string" && tags.trim().startsWith("[")) {
      try {
        parsedTags = JSON.parse(tags);
      } catch (e) {
        parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
      }
    } else if (typeof tags === "string") {
      parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
    }

    let parsedKeywords = meta_keywords;
    if (typeof meta_keywords === "string" && meta_keywords.trim().startsWith("[")) {
      try {
        parsedKeywords = JSON.parse(meta_keywords);
      } catch (e) {
        parsedKeywords = meta_keywords.split(",").map((k) => k.trim()).filter(Boolean);
      }
    } else if (typeof meta_keywords === "string") {
      parsedKeywords = meta_keywords.split(",").map((k) => k.trim()).filter(Boolean);
    }

    // Handle featured image from multer
    if (req.file) {
      blog.featured_image = req.file.path;
    }

    blog.title = title || blog.title;
    blog.content = content || blog.content;
    blog.excerpt = excerpt || blog.excerpt;
    blog.tags = parsedTags !== undefined ? parsedTags : blog.tags;
    blog.categories = parsedCategories !== undefined ? parsedCategories : blog.categories;
    blog.status = status || blog.status;
    blog.featured_image_alt = featured_image_alt || blog.featured_image_alt;
    blog.meta_title = meta_title || blog.meta_title;
    blog.meta_description = meta_description || blog.meta_description;
    blog.meta_keywords = parsedKeywords !== undefined ? parsedKeywords : blog.meta_keywords;
    blog.blog_url = blog_url || blog.blog_url;
    blog.image_alt_text = image_alt_text || blog.image_alt_text;

    if (status === "published" && !blog.published_at) {
      blog.published_at = Date.now();
    }

    const updatedBlog = await blog.save();

    return res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      data: updatedBlog,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Blog update failed",
      error: error.message,
    });
  }
};

module.exports = {
  createBlog,
  deleteBlog,
  getAllBlogs,
  getOneBlog,
  updateBlog,
};
