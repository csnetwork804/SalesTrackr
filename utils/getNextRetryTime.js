function getNextRetryTime(count, createdAt) {
  const base = new Date(createdAt);

  switch (count) {
    case 1: return new Date(base.getTime() + 3 * 60 * 60 * 1000); // +3 hours
    case 2: {
      const pm8 = new Date(base);
      pm8.setHours(20, 0, 0, 0); // 8:00 PM same day
      return pm8;
    }
    case 3:
      return new Date(base.getTime() + 24 * 60 * 60 * 1000); // +1 day
    case 4:
      return new Date(base.getTime() + 2 * 24 * 60 * 60 * 1000); // +2 days
    default:
      return null;
  }
}

module.exports = getNextRetryTime;
