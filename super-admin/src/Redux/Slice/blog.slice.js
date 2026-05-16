import { createSlice } from "@reduxjs/toolkit";
import {
  createBlog,
  deleteBlog,
  deleteComment,
  fetchAllComments,
  fetchBlogById,
  fetchBlogs,
  fetchComments,
  moderateComment,
  updateBlog,
} from "../Actions/blog.thunks";

const blogSlice = createSlice({
  name: "blogs",
  initialState: {
    // Blog states
    items: [],
    selectedBlog: null,
    loading: false,
    error: null,
    createLoading: false,
    updateLoading: false,
    deleteLoading: false,
    fetchBlogLoading: false,

    // Comment states
    comments: [],
    allComments: [],
    commentsLoading: false,
    moderating: false,
    deletingComment: false,
    commentError: null,
    commentSuccess: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.commentError = null;
    },
    clearCommentSuccess: (state) => {
      state.commentSuccess = null;
    },
    resetCreateState: (state) => {
      state.createLoading = false;
      state.error = null;
    },
    clearSelectedBlog: (state) => {
      state.selectedBlog = null;
      state.fetchBlogLoading = false;
    },
    resetComments: (state) => {
      state.comments = [];
      state.commentsLoading = false;
      state.moderating = false;
      state.deletingComment = false;
      state.commentError = null;
      state.commentSuccess = null;
    },
    // CRITICAL: Add this to manually reset moderating state
    resetModeratingState: (state) => {
      state.moderating = false;
      console.log("Moderating state manually reset to FALSE");
    },
    // Local state update for optimistic UI
    updateCommentStatusLocally: (state, action) => {
      const { commentId, status } = action.payload;

      // Update in comments array
      const comment = state.comments.find((c) => c._id === commentId);
      if (comment) {
        comment.status = status;
      }

      // Update in allComments array if exists
      const allComment = state.allComments.find((c) => c._id === commentId);
      if (allComment) {
        allComment.status = status;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // ============================================
      // BLOG REDUCERS
      // ============================================

      // Fetch all blogs
      .addCase(fetchBlogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBlogs.fulfilled, (state, action) => {
        state.loading = false;
        state.items = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchBlogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch single blog
      .addCase(fetchBlogById.pending, (state) => {
        state.fetchBlogLoading = true;
        state.error = null;
      })
      .addCase(fetchBlogById.fulfilled, (state, action) => {
        state.fetchBlogLoading = false;
        state.selectedBlog = action.payload;
      })
      .addCase(fetchBlogById.rejected, (state, action) => {
        state.fetchBlogLoading = false;
        state.error = action.payload;
      })

      // Create blog
      .addCase(createBlog.pending, (state) => {
        state.createLoading = true;
        state.error = null;
      })
      .addCase(createBlog.fulfilled, (state, action) => {
        state.createLoading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createBlog.rejected, (state, action) => {
        state.createLoading = false;
        state.error = action.payload;
      })

      // Update blog
      .addCase(updateBlog.pending, (state) => {
        state.updateLoading = true;
        state.error = null;
      })
      .addCase(updateBlog.fulfilled, (state, action) => {
        state.updateLoading = false;
        const updated = action.payload;
        const index = state.items.findIndex((b) => b._id === updated._id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...updated };
        }
        if (state.selectedBlog && state.selectedBlog._id === updated._id) {
          state.selectedBlog = { ...state.selectedBlog, ...updated };
        }
      })
      .addCase(updateBlog.rejected, (state, action) => {
        state.updateLoading = false;
        state.error = action.payload;
      })

      // Delete blog
      .addCase(deleteBlog.pending, (state) => {
        state.deleteLoading = true;
        state.error = null;
      })
      .addCase(deleteBlog.fulfilled, (state, action) => {
        state.deleteLoading = false;
        state.error = null;
        state.items = state.items.filter((b) => b._id !== action.payload);
        if (state.selectedBlog && state.selectedBlog._id === action.payload) {
          state.selectedBlog = null;
        }
      })
      .addCase(deleteBlog.rejected, (state, action) => {
        state.deleteLoading = false;
        state.error = action.payload;
      })

      // ============================================
      // COMMENT REDUCERS
      // ============================================

      // Fetch Comments
      .addCase(fetchComments.pending, (state) => {
        state.commentsLoading = true;
        state.commentError = null;
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        state.commentsLoading = false;
        state.comments = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchComments.rejected, (state, action) => {
        state.commentsLoading = false;
        state.commentError = action.payload || "Failed to fetch comments";
      })

      // Fetch All Comments (Admin)
      .addCase(fetchAllComments.pending, (state) => {
        state.commentsLoading = true;
        state.commentError = null;
      })
      .addCase(fetchAllComments.fulfilled, (state, action) => {
        state.commentsLoading = false;
        state.allComments = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchAllComments.rejected, (state, action) => {
        state.commentsLoading = false;
        state.commentError = action.payload || "Failed to fetch all comments";
      })

      // Moderate Comment (Approve/Reject)
      .addCase(moderateComment.pending, (state) => {
        state.moderating = true;
        state.commentError = null;
        state.commentSuccess = null;
        console.log("Moderation started - moderating set to TRUE");
      })
      .addCase(moderateComment.fulfilled, (state, action) => {
        state.moderating = false; // CRITICAL: Must reset to false
        state.commentSuccess = "Comment moderated successfully";
        console.log("Moderation successful - moderating set to FALSE");

        const updatedComment = action.payload;

        if (updatedComment && updatedComment._id) {
          // Update in comments array
          const index = state.comments.findIndex(
            (c) => c._id === updatedComment._id,
          );
          if (index !== -1) {
            state.comments[index] = updatedComment;
          }

          // Update in allComments array
          const allIndex = state.allComments.findIndex(
            (c) => c._id === updatedComment._id,
          );
          if (allIndex !== -1) {
            state.allComments[allIndex] = updatedComment;
          }
        }
      })
      .addCase(moderateComment.rejected, (state, action) => {
        state.moderating = false; // CRITICAL: Must reset to false even on error
        state.commentError = action.payload || "Failed to moderate comment";
        console.log(
          "Moderation failed - moderating set to FALSE",
          action.payload,
        );
      })

      // Delete Comment
      .addCase(deleteComment.pending, (state) => {
        state.deletingComment = true;
        state.commentError = null;
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        state.deletingComment = false;
        state.commentSuccess = "Comment deleted successfully";

        const deletedId = action.payload;

        // Remove from comments array
        state.comments = state.comments.filter((c) => c._id !== deletedId);

        // Remove from allComments array
        state.allComments = state.allComments.filter(
          (c) => c._id !== deletedId,
        );
      })
      .addCase(deleteComment.rejected, (state, action) => {
        state.deletingComment = false;
        state.commentError = action.payload || "Failed to delete comment";
      });
  },
});

export const {
  clearError,
  clearCommentSuccess,
  resetCreateState,
  clearSelectedBlog,
  resetComments,
  resetModeratingState, // Export the new action
  updateCommentStatusLocally,
} = blogSlice.actions;

export default blogSlice.reducer;
