import authService from "../services/authService.js";
import { responseFormat } from "../lib/helperFunctions.js";

export const login = async (req, res) => {
  try {
    const result = await authService.login(req.body, res);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json(responseFormat({ message: "Internal server error", status: 500 }));
  }
};

export const register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Register error:", error);
    return res
      .status(500)
      .json(responseFormat({ message: "Internal server error", status: 500 }));
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const result = await authService.verifyOtp(req.body);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res
      .status(500)
      .json(responseFormat({ message: "Internal server error", status: 500 }));
  }
};

export const resendOtp = async (req, res) => {
  try {
    const result = await authService.resendOtp(req.body);
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("Resend OTP error:", error);
    return res
      .status(500)
      .json(responseFormat({ message: "Internal server error", status: 500 }));
  }
};
