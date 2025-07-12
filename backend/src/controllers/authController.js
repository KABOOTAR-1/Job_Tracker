const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

/**
 * Authenticate browser extension using browserIdentifier
 * Create a new user if needed and return JWT token
 */
const authenticateExtension = async (req, res) => {
  try {
    const { browserIdentifier } = req.body;
    
    if (!browserIdentifier) {
      return res.status(400).json({
        success: false,
        message: 'Browser identifier is required'
      });
    }

    // Check if user with this browserIdentifier exists
    let user = await User.findOne({ browserIdentifier });
    
    // If no user exists with this browserIdentifier, create one
    if (!user) {
      // Create a temporary username/email based on the browserIdentifier
      // Generate a random secure password
      const tempPassword = Math.random().toString(36).slice(-10) + 
                         Math.random().toString(36).slice(-10);
      
      user = await User.create({
        name: `Extension User ${browserIdentifier.substring(0, 8)}`,
        email: `extension_${browserIdentifier.substring(0, 8)}@jobtracker.temp`,
        password: tempPassword,
        browserIdentifier
      });
    }
    
    // Generate and return JWT token
    const token = user.generateToken();
    
    res.status(200).json({
      success: true,
      data: {
        token,
        userId: user._id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Associate an existing user account with a browser extension
 */
const linkExtensionToAccount = async (req, res) => {
  try {
    const { browserIdentifier } = req.body;
    
    if (!browserIdentifier) {
      return res.status(400).json({
        success: false,
        message: 'Browser identifier is required'
      });
    }
    
    // Get user from auth middleware
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update the user's browserIdentifier
    user.browserIdentifier = browserIdentifier;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Browser extension linked successfully',
      data: {
        userId: user._id,
        browserIdentifier: user.browserIdentifier
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  authenticateExtension,
  linkExtensionToAccount
};
