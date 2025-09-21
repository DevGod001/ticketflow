export default async function handler(req, res) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    res.status(200).json({
      hasAuthHeader: !!authHeader,
      hasToken: !!token,
      tokenLength: token?.length || 0,
      authHeader: authHeader ? authHeader.substring(0, 20) + '...' : null,
      allHeaders: Object.keys(req.headers),
      method: req.method,
      url: req.url
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      hasAuthHeader: !!req.headers.authorization
    });
  }
}
