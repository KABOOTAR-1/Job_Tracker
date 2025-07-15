const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

const authenticateExtension = async (req, res) => {
  try {
    const { browserIdentifier } = req.body;
    
    if (!browserIdentifier) {
      return res.status(400).json({
        success: false,
        message: 'Browser identifier is required'
      });
    }

    let user = await User.findOne({ browserIdentifier });
    
    if (!user) {

      const tempPassword = Math.random().toString(36).slice(-10) + 
                         Math.random().toString(36).slice(-10);
      
      user = await User.create({
        name: `Extension User ${browserIdentifier.substring(0, 8)}`,
        email: `extension_${browserIdentifier.substring(0, 8)}@jobtracker.temp`,
        password: tempPassword,
        browserIdentifier
      });
    }
    
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


const linkExtensionToAccount = async (req, res) => {
  try {
    const { browserIdentifier } = req.body;
    
    if (!browserIdentifier) {
      return res.status(400).json({
        success: false,
        message: 'Browser identifier is required'
      });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
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
