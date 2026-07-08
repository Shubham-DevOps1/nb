const { faker } = require('@faker-js/faker');

/**
 * Returns a random element from an array.
 */
function randomElement(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Returns a random range of elements from an array (unique items).
 */
function randomElements(arr, count) {
  if (!arr || arr.length === 0) return [];
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, arr.length));
}

/**
 * Returns a random integer between min and max (inclusive).
 */
function randomRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Returns a random float between min and max (inclusive) with a specific precision.
 */
function randomFloat(min, max, precision = 1) {
  const val = Math.random() * (max - min) + min;
  return parseFloat(val.toFixed(precision));
}

/**
 * Returns a random date between start and end date objects.
 */
function randomDate(start, end) {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Shuffles an array in place (Fisher-Yates style).
 */
function shuffle(arr) {
  const newArr = [...arr];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

module.exports = {
  randomElement,
  randomElements,
  randomRange,
  randomFloat,
  randomDate,
  shuffle
};
