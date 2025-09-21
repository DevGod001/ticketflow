export default async function handler(req, res) {
  try {
    // Simple test endpoint to verify API routing is working
    res.status(200).json({ 
      success: true, 
      message: 'API connection working!',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
