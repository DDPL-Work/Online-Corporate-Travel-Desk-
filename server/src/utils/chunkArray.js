const chunkArray = (items = [], chunkSize = 100) => {
  if (!Array.isArray(items) || items.length === 0) return [];

  const safeChunkSize = Math.max(1, Number(chunkSize) || 100);
  const chunks = [];

  for (let index = 0; index < items.length; index += safeChunkSize) {
    chunks.push(items.slice(index, index + safeChunkSize));
  }

  return chunks;
};

module.exports = chunkArray;
