import validator from "validator";
import bcrypt from "bcrypt";
import sendMail from "../lib/sendMail.js";
import {
  generateAccessToken,
  generateRefreshToken,
  responseFormat,
} from "../lib/helperFunctions.js";
import User from "../models/User.js";
import Otp from "../models/Otp.js";
import Token from "../models/Token.js";

const authService = {
  async login({ email, password }, res) {
    if (!email || !password) {
      return responseFormat({
        message: "Invalid email or password",
        status: 403,
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return responseFormat({ message: "User not found", status: 404 });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return responseFormat({
        message: "Invalid email or password",
        status: 403,
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await Token.create({ userId: user._id, refreshToken });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });

    return responseFormat({
      message: "Login successful",
      status: 200,
      data: {
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isVerified: user.isVerified,
        accessToken,
      },
    });
  },

  async register({ name, email, password, confirmPassword, avatar }) {
    if (!name || !email || !password || !confirmPassword || !avatar) {
      return responseFormat({
        message: "All fields are required",
        status: 400,
      });
    }

    if (!validator.isEmail(email)) {
      return responseFormat({ message: "Invalid email", status: 400 });
    }

    if (password !== confirmPassword) {
      return responseFormat({ message: "Passwords do not match", status: 400 });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return responseFormat({ message: "User already exists", status: 409 });
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      avatar,
    });

    const mailRes = await sendMail(newUser);
    if (mailRes.status !== 200) {
      await User.findOneAndDelete({ email });
      return responseFormat({
        message: "Couldn't send email verification",
        status: 500,
      });
    }

    return responseFormat({
      message: "User registered successfully, Please verify your account",
      status: 201,
      data: {
        name,
        email,
        avatar: newUser.avatar,
        isVerified: newUser.isVerified,
      },
    });
  },

  async verifyOtp({ email, otp }) {
    if (!validator.isEmail(email)) {
      return responseFormat({ message: "Invalid email format", status: 400 });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return responseFormat({ message: "User not found", status: 404 });
    }

    if (user.isVerified) {
      return responseFormat({
        message: "User is already verified, please login",
        status: 400,
      });
    }

    console.log("user==>", user);

    const otpInDb = await Otp.findOne({ userId: user._id });
    const allOtp = await Otp.find();
    console.log("otpInDb==>", otpInDb);
    console.log("allOtp==>", allOtp);
    if (!otpInDb) {
      const mailRes = await sendMail(user);
      return mailRes.status === 200
        ? responseFormat({ message: "Invalid OTP, new OTP sent", status: 400 })
        : responseFormat({
            message: "Failed to send OTP. Try again",
            status: 500,
          });
    }
    console.log("1.otpInDb.otp==>", otpInDb.otp);
    console.log("2.otp==>", otp);
    if (otp === otpInDb.otp) {
      const expiresAt = new Date(otpInDb.expiresAt).getTime();
      const currentTime = Date.now();

      if (expiresAt > currentTime) {
        await Otp.findOneAndDelete({ userId: otpInDb.userId });
        await User.findOneAndUpdate(
          { _id: otpInDb.userId },
          { isVerified: true }
        );
        return responseFormat({
          message: "Verification successful. Please login",
          status: 200,
        });
      } else {
        return responseFormat({
          message: "OTP has expired. Request new OTP",
          status: 400,
        });
      }
    }

    return responseFormat({ message: "Invalid OTP", status: 400 });
  },

  async resendOtp({ email }) {
    if (!validator.isEmail(email)) {
      return responseFormat({ message: "Invalid email format", status: 400 });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return responseFormat({ message: "User not found", status: 404 });
    }

    if (user.isVerified) {
      return responseFormat({
        message: "User already verified, please login",
        status: 400,
      });
    }

    await Otp.deleteMany({ userId: user._id });

    const mailRes = await sendMail(user);
    if (mailRes.status !== 200) {
      return responseFormat({
        message: "Failed to send OTP. Try again",
        status: 500,
      });
    }

    return responseFormat({
      message: "A new OTP has been sent to your email",
      status: 200,
    });
  },
};

export default authService;
