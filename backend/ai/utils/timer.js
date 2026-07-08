/**
 * Returns a timer object that tracks elapsed time.
 */
function startTimer() {
  const start = process.hrtime.bigint();
  return {
    stop: () => {
      const end = process.hrtime.bigint();
      const elapsedNs = end - start;
      return Number(elapsedNs) / 1_000_000; // Milliseconds
    },
    stopSeconds: () => {
      const end = process.hrtime.bigint();
      const elapsedNs = end - start;
      return Number(elapsedNs) / 1_000_000_000; // Seconds
    }
  };
}

module.exports = {
  startTimer
};
