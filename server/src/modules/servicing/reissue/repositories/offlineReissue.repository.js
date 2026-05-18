const OfflineReissueRequest = require("../schemas/OfflineReissueRequest.schema");
const mongoose = require("mongoose");

const detailPopulate = [
  {
    path: "assignedOpsMember",
    select: "name email role department status currentWorkload lastAssignedAt",
  },
  { path: "employeeId", select: "name email role corporateId" },
];

class OfflineReissueRepository {
  build(payload = {}) {
    return new OfflineReissueRequest(payload);
  }

  async create(payload, options = {}) {
    const [doc] = await OfflineReissueRequest.create([payload], options);
    return this.findById(doc._id, options);
  }

  async findById(id, options = {}) {
    return OfflineReissueRequest.findById(id, null, options).populate(detailPopulate);
  }

  async findByIdOrRequestId(idOrRequestId, options = {}) {
    const query = mongoose.Types.ObjectId.isValid(idOrRequestId)
      ? { $or: [{ _id: idOrRequestId }, { requestId: idOrRequestId }] }
      : { requestId: idOrRequestId };

    return OfflineReissueRequest.findOne(query, null, options).populate(detailPopulate);
  }

  async findOne(query, options = {}) {
    return OfflineReissueRequest.findOne(query, null, options).populate(detailPopulate);
  }

  async save(doc, options = {}) {
    return doc.save(options);
  }

  async updateById(id, update, options = {}) {
    return OfflineReissueRequest.findByIdAndUpdate(id, update, {
      new: true,
      ...options,
    });
  }

  async list(query = {}, { page = 1, limit = 20, sort = { createdAt: -1 } } = {}) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      OfflineReissueRequest.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(detailPopulate),
      OfflineReissueRequest.countDocuments(query),
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
    return OfflineReissueRequest.aggregate(pipeline);
  }
}

module.exports = new OfflineReissueRepository();
