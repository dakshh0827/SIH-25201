/*
 * =====================================================
 * backend/middlewares/auth.js (FIXED)
 * =====================================================
 */
import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. No token provided.",
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Token is empty.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // CRITICAL: Ensure req.user has all necessary fields
    req.user = {
      userId: decoded.userId || decoded.id, // Support both userId and id
      id: decoded.userId || decoded.id, // Also set id for compatibility
      email: decoded.email,
      role: decoded.role,
      instituteId: decoded.instituteId || decoded.institute,
      institute: decoded.institute || decoded.instituteId,
      department: decoded.department,
      labId: decoded.labId,
    };

    // Log for debugging (remove in production)
    logger.debug("Auth middleware - req.user:", {
      userId: req.user.userId,
      email: req.user.email,
      role: req.user.role,
    });

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please refresh your session.",
        code: "TOKEN_EXPIRED",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please login again.",
        code: "INVALID_TOKEN",
      });
    }

    logger.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};

export default authMiddleware;