/**
 * Group stampings by user ID
 */
const groupStampingsByUser = (stampings) => {
  return stampings.reduce((acc, stamp) => {
    const userId = stamp.userId.toString();
    if (!acc[userId]) {
      acc[userId] = [];
    }
    acc[userId].push(stamp);
    return acc;
  }, {});
};

module.exports = {
  groupStampingsByUser,
};
