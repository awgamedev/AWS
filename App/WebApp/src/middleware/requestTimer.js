/**
 * Express-Middleware, which logs request duration for requests taking longer than 1 second.
 */
function requestTimer(req, res, next) {
  const start = process.hrtime();
  const logger = req.logger;

  res.on("finish", () => {
    const [seconds, nanoseconds] = process.hrtime(start);

    // convert to milliseconds
    const durationInMs = seconds * 1000 + nanoseconds / 1e6;

    if (durationInMs < 1000) {
      // only log requests that take 1 second or more
      return;
    }

    if (logger) {
      logger.info("Request verarbeitet", {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: `${durationInMs.toFixed(3)} ms`,
      });
    }
  });

  next();
}

module.exports = { requestTimer };
