/**
 * Generate a sequential Order ID for Traveamer
 * Format: TVR + (F/H) + 3 digits (000-999) + 3 letters (AAA-ZZZ)
 * Example: TVRF000AAA -> TVRF999AAA -> TVRF000AAB
 */
const generateSequentialOrderId = async (type) => {
  const bookingType = type.toLowerCase();
  if (bookingType !== "flight" && bookingType !== "hotel") {
    throw new Error("Invalid booking type for Order ID generation");
  }

  const prefix = bookingType === "flight" ? "TVRF" : "TVRH";
  
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";

  const getRandom = (chars, len) => {
    let result = "";
    for (let i = 0; i < len; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const numericPart = getRandom(numbers, 3);
  const alphaPart = getRandom(letters, 3);

  return `${prefix}${numericPart}${alphaPart}`;
};

module.exports = { generateSequentialOrderId };
