const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/signup", authController.signup);
router.patch(
  "/verify_email/:emailVerificationToken",
  authController.verifyEmail
);
router.post("/login", authController.login);

module.exports = router;
