// This utility function processes an array of stamping records and returns an array of stamping pairs (come/go).
async function getStampingPairs(stampings) {
  let currentIn = null;
  const pairs = [];

  // creates Paar-Bildungs-Logik
  for (const stamp of stampings) {
    if (stamp.stampingType === "in") {
      if (currentIn) {
        pairs.push({ come: currentIn.toObject(), go: null });
      }
      currentIn = stamp;
    } else if (stamp.stampingType === "out") {
      if (currentIn) {
        // A fitting 'out' found
        pairs.push({ come: currentIn.toObject(), go: stamp.toObject() });
        currentIn = null;
      }
    }
  }

  if (currentIn) {
    // The last entry is an 'in' without a matching 'out'
    pairs.push({ come: currentIn.toObject(), go: null });
  }

  // Sort the pairs for display in descending order (newest pairs first)
  return pairs.reverse();
}

module.exports = { getStampingPairs };
