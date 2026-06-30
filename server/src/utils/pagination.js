exports.paginate = async (Model, query = {}, options = {}) => {
  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 20;
  const skip = (page - 1) * limit;

  const sort = options.sort || { createdAt: -1 };

  const [results, total] = await Promise.all([
    Model.find(query).sort(sort).skip(skip).limit(limit),
    Model.countDocuments(query)
  ]);

  return {
    results,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1
    }
  };
};
