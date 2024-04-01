const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const validator = require("validator");
const { isPasswordValid } = require("../utils/validators");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Email is not valid"],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    min: [8, "MinLength should be 8"],
    validate: {
      validator: function () {
        return isPasswordValid(this.password); // False triggers an error
      },
      message:
        "Password must include a number, an alphabet character, a symbol, and an uppercase letter.",
    },
    select: false, // This doesn't work on create and save
  },
  confirmPassword: {
    type: String,
    required: [true, "Password is required"],
    validate: {
      // Custom validator. works on save and create.
      validator: function (el) {
        return el === this.password;
      },
      message: "Passwords does not match",
    },
    select: false,
  },
  verified: {
    type: Boolean,
    default: false,
    select: false,
  },
  active: {
    type: Boolean,
    default: true,
    select: false,
  },

  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpiresIn: String,
  emailVerificationToken: String,
  emailVerificationTokenExpiresIn: String,
});

userSchema.pre("save", async function (next) {
  // Prevents the confirmPassword from entering DB
  this.confirmPassword = undefined;

  // If password path/field is unmodified (create or save) returns
  if (!this.isModified("password")) return next();

  // Salts and Hashes the password
  const hashedPassword = await bcrypt.hash(this.password, 12);
  this.password = hashedPassword;

  next();
});

userSchema.methods.genEmailVerificationToken = function () {
  const emailVerificationToken = crypto.randomBytes(32).toString("hex");
  this.emailVerificationToken = crypto
    .createHash("sha256")
    .update(emailVerificationToken)
    .digest("hex");
  this.emailVerificationTokenExpiresIn = Date.now() + 60 * 60 * 1000;
  return emailVerificationToken;
};

userSchema.methods.correctPassword = async function (claimedPassword) {
  return await bcrypt.compare(claimedPassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
