const ReissueRequest = require("../schemas/ReissueRequest.schema");

class ReissueRepository {
  async create(payload, options = {}) {
    const [doc] = await ReissueRequest.create([payload], options);
    return doc;
  }

  async findById(id, options = {}) {
    return ReissueRequest.findById(id, null, options)
      .populate("userId", "name email")
      .populate("corporateId", "corporateName");
  }

  async findOne(query, options = {}) {
    return ReissueRequest.findOne(query, null, options)
      .populate("userId", "name email")
      .populate("corporateId", "corporateName");
  }

  async save(doc, options = {}) {
    return doc.save(options);
  }

  async updateById(id, update, options = {}) {
    return ReissueRequest.findByIdAndUpdate(id, update, {
      new: true,
      ...options,
    });
  }

  async list(query = {}, { page = 1, limit = 20, sort = { createdAt: -1 } } = {}) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      ReissueRequest.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("userId", "name email")
        .populate("corporateId", "corporateName"),
      ReissueRequest.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
        limit,
      },
    };
  }

  async aggregate(pipeline) {
    return ReissueRequest.aggregate(pipeline);
  }
}

module.exports = new ReissueRepository();
