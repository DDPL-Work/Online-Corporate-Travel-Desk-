import { createSlice } from "@reduxjs/toolkit";
import { fetchPublishedBlogs, fetchBlogBySlug } from "../Actions/blog.thunks";

const blogSlice = createSlice({
  name: "blogs",
  initialState: {
    items: [],
    selectedBlog: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearBlogError: (state) => {
      state.error = null;
    },
    resetSelectedBlog: (state) => {
      state.selectedBlog = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Published Blogs
      .addCase(fetchPublishedBlogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPublishedBlogs.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchPublishedBlogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Blog By Slug
      .addCase(fetchBlogBySlug.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBlogBySlug.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedBlog = action.payload;
      })
      .addCase(fetchBlogBySlug.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearBlogError, resetSelectedBlog } = blogSlice.actions;
export default blogSlice.reducer;
