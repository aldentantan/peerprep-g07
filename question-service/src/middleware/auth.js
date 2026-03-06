import axios from 'axios';
/**
 * Middleware to verify that the current user is an Admin.
 * Calls the User Service to check the user's role.
 *
 * Expects the caller to pass a header: Authorization: Bearer <token>
 */
const requireAdmin = async (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid Authorization header. Expected: Bearer <token>',
    });
  }

  const token = authHeader.split(' ')[1];
  const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3000';

  try {
    const response = await axios.get(`${userServiceUrl}/auth/internal/role-check`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 5000,
    });

    const user = response.data;

    if (!user || (user.role !== 'admin' && user.role !== 'root-admin')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins and root admins can perform this action.',
      });
    }

    // Attach user to request for downstream use
    req.user = user;
    return next();
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.response === undefined) {
      // User Service is not reachable yet
      return res.status(503).json({
        error: 'Service Unavailable',
        message:
          'User Service is not reachable. Cannot verify admin status. ' +
          'Please ensure the User Service is running at: ' +
          userServiceUrl,
      });
    }

    if (err.response) {
      // User Service returned an error (e.g. 401 invalid token)
      return res.status(err.response.status).json({
        error: 'Authentication Failed',
        message: err.response.data?.message || 'User Service rejected the token.',
      });
    }

    console.error('[requireAdmin] Unexpected error:', err.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while verifying admin status.',
    });
  }
};

export { requireAdmin };