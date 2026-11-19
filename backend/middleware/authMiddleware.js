const jwt = require('jsonwebtoken');


// ==========================================
// AUTHENTICATE TOKEN
// ==========================================
exports.authenticateToken = (req, res, next) => {

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Authorization token required'
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Invalid authorization format'
    });
  }

  try {

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'digital_cooperative_secret_2026'
    );

    req.user = decoded;

    next();

  } catch (error) {

    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};


// ==========================================
// ADMIN ONLY
// ==========================================
exports.requireAdmin = (req, res, next) => {

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (Number(req.user.role_id) !== 1) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};