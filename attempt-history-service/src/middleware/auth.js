import jwt from 'jsonwebtoken';

export function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization failed' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authorization failed' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id ?? decoded.sub ?? decoded.email,
      email: decoded.email ?? '',
      username: decoded.username ?? decoded.email ?? decoded.id ?? 'unknown-user',
    };

    if (!req.user.id) {
      return res.status(401).json({ error: 'Authorization failed' });
    }

    return next();
  } catch (error) {
    console.error('Error verifying attempt-history token:', error);
    return res.status(401).json({ error: 'Unable to verify access token' });
  }
}
