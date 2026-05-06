// utils/incrementAlpha.js

const incrementAlpha = (str) => {
  let arr = str.split("");
  let i = arr.length - 1;

  while (i >= 0) {
    if (arr[i] === "Z") {
      arr[i] = "A";
      i--;
    } else {
      arr[i] = String.fromCharCode(arr[i].charCodeAt(0) + 1);
      return arr.join("");
    }
  }

  return "AAA"; // overflow case (handled outside)
};

module.exports = incrementAlpha;