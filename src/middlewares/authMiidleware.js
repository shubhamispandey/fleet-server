import jwt from "jsonwebtoken";
import { generateAccessToken, responseFormat } from "../lib/helperFunctions.js";
import User from "../models/User.js";

const authMiddleware = (req, res, next) => {
  const { accessToken, refreshToken } = req.cookies;

  if (!accessToken) {
    return res
      .status(401)
      .json(responseFormat({ message: "Access token missing", status: 0 }));
  }

  jwt.verify(accessToken, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === "TokenExpiredError" && refreshToken) {
        // Token expired, check the refresh token
        jwt.verify(
          refreshToken,
          process.env.JWT_SECRET_REFRESH,
          async (err, decodedRefreshToken) => {
            if (err) {
              return res.status(403).json(
                responseFormat({
                  message: "Refresh token invalid",
                  status: 0,
                })
              );
            }

            // Refresh token is valid, generate a new access token
            const user = await User.findOne({
              email: decodedRefreshToken?.email,
            });
            const newAccessToken = generateAccessToken(user);

            res.cookie("accessToken", newAccessToken, { httpOnly: true });
            req.cookies.accessToken = newAccessToken;
            req.cookies.refreshToken = refreshToken;

            req.user = decodedRefreshToken;
            next();
          }
        );
      } else {
        return res
          .status(403)
          .json(responseFormat({ message: "Access token invalid", status: 0 }));
      }
    } else {
      req.user = decoded;
      next();
    }
  });
};

export default authMiddleware;
