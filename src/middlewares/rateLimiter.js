import { responseFormat } from "../lib/helperFunctions.js";
import { redisClient } from "../lib/redis.js";

const rateLimiter = async (req, res, next) => {
  const ip = req.ip;
  const currentTime = Date.now();
  const windowSize = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100; // Max requests allowed in the window

  try {
    let data = await redisClient.get(ip);
    let requestData = data
      ? JSON.parse(data)
      : { count: 0, startTime: currentTime };

    if (currentTime - requestData.startTime > windowSize) {
      requestData = { count: 1, startTime: currentTime };
    } else {
      requestData.count += 1;
    }

    if (requestData.count > maxRequests) {
      return res.status(429).json(
        responseFormat({
          message: "Too many requests, please try again later.",
          status: 429,
        })
      );
    }

    await redisClient.set(
      ip,
      JSON.stringify(requestData),
      "EX",
      Math.ceil(windowSize / 1000)
    );
    next();
  } catch (err) {
    console.error("Redis error:", err);
    return res.status(500).json(
      responseFormat({
        message: "Internal server error",
        status: 500,
        error: "Redis error",
      })
    );
  }
};

export default rateLimiter;
