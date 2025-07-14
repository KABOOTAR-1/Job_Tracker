const User = require('../models/userModel');

const registerUser = async (req, res) => {
  try {
    const { username, name, email, password, browserIdentifier } = req.body;

    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({
        success: false,
        message: 'Username is already taken'
      });
    }

    if (email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email is already registered'
        });
      }
    }

    const userData = {
      username,
      password,
      browserIdentifier
    };

    if (name) userData.name = name;
    if (email) userData.email = email;

    const user = await User.create(userData);

    if (user) {
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

const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });

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

const getUserProfile = async (req, res) => {
  try {
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

const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      user.name = req.body.name || user.name;

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
