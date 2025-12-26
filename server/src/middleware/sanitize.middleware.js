/**
 * Trim selected fields in req.body
 * Supports nested fields (dot notation)
 */
module.exports = (fields = []) => {
  return (req, res, next) => {
    if (!req.body) return next();

    fields.forEach((field) => {
      const keys = field.split(".");
      let obj = req.body;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) return;
        obj = obj[keys[i]];
      }

      const lastKey = keys[keys.length - 1];
      if (typeof obj[lastKey] === "string") {
        obj[lastKey] = obj[lastKey].trim();
      }
    });

    next();
  };
};
