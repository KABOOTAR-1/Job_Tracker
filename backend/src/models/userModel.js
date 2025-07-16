const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true
    },
    name: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters']
    },
    companies: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company'
    }],
    // browserIdentifier field removed
  },
  {
    timestamps: true
  }
);

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};
userSchema.methods.generateToken = function() {
  return jwt.sign({ 
    id: this._id,
    username: this.username 
  }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

module.exports = mongoose.model('User', userSchema);
