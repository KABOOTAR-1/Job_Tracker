const User = require('../models/userModel');

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { username, name, email, password, browserIdentifier } = req.body;

    // Check if user with this username already exists
    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({
        success: false,
        message: 'Username is already taken'
      });
    }

    // If email provided, check if it's already in use
    if (email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email is already registered'
        });
      }
    }

    // Create new user
    const userData = {
      username,
      password,
      browserIdentifier
    };

    // Add optional fields if provided
    if (name) userData.name = name;
    if (email) userData.email = email;

    const user = await User.create(userData);

    if (user) {
      // Create response with user data and token
      res.status(201).json({
        success: true,
        token: user.generateToken(),
        user: {
          _id: user._id,
          username: user.username,
          name: user.name || '',
          email: user.email || '',
          browserIdentifier: user.browserIdentifier
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid user data'
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during registration'
    });
  }
};

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findOne({ username });

    // Check if user exists and password matches
    if (user && (await user.matchPassword(password))) {
      res.status(200).json({
        success: true,
        token: user.generateToken(),
        user: {
          _id: user._id,
          username: user.username,
          name: user.name || '',
          email: user.email || '',
          browserIdentifier: user.browserIdentifier
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during login'
    });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    // User is already attached to req from protect middleware
    const user = await User.findById(req.user.id).populate('companies');

    if (user) {
      res.status(200).json({
        success: true,
        user: {
          _id: user._id,
          username: user.username,
          name: user.name || '',
          email: user.email || '',
          browserIdentifier: user.browserIdentifier,
          companies: user.companies
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while fetching profile'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      // Don't allow username changes for security
      user.name = req.body.name || user.name;
      
      // Check if email is being updated and not already in use
      if (req.body.email && req.body.email !== user.email) {
        const emailExists = await User.findOne({ email: req.body.email });
        if (emailExists) {
          return res.status(400).json({
            success: false,
            message: 'Email is already in use by another account'
          });
        }
        user.email = req.body.email;
      }
      
      // Only update password if provided
      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      res.status(200).json({
        success: true,
        token: updatedUser.generateToken(),
        user: {
          _id: updatedUser._id,
          username: updatedUser.username,
          name: updatedUser.name || '',
          email: updatedUser.email || '',
          browserIdentifier: updatedUser.browserIdentifier
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while updating profile'
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile
};
