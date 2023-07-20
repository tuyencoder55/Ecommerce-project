const { get } = require("mongoose");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../middlewares/jwt");
const User = require("../models/user");
const asyncHandler = require("express-async-handler");

const register = asyncHandler(async (req, res) => {
  const { email, password, firstname, lastname } = req.body;
  if (!email || !password || !lastname || !firstname)
    return res.status(400).json({
      success: false,
      mes: "missing inputs",
    });
  const user = await User.findOne({ email });
  if (user) {
    throw new Error("user has existed!");
  } else {
    const newUser = await User.create(req.body);
    return res.status(200).json({
      success: newUser ? true : false,
      mes: newUser
        ? "Register is successfully. Please go login"
        : "Something went wrong",
    });
  }
});

//RF token ->  cấp mới AC token
//AC  token -> xác thực + phân quyền người dùng
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({
      success: false,
      mes: "missing inputs",
    });

  const response = await User.findOne({ email });
  if (response && (await response.isCorrectPassword(password))) {
    const { password, role, ...userData } = response.toObject();
    const acccessToken = generateAccessToken(response._id, role);

    //tạo acccess token
    const refreshToken = generateRefreshToken(response._id);

    //lưu refresh token vào database
    await User.findByIdAndUpdate(response._id, { refreshToken }, { new: true });

    //lưu refresh token vào cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, //7 days
    });
    return res.status(200).json({
      success: true,
      acccessToken,
      userData,
    });
  } else {
    throw new Error("Invalid authentication");
  }
});

const getOneUser = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const user = await User.findById(_id).select("-refreshToken -password -role");
  return res.status(200).json({
    success: false,
    result: user ? user : "user not found",
  });
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const cookie = req.cookies;
  // const {_id} =

  //check toke có trong cookie không ?
  if (!cookie && !cookie.refreshToken)
    throw new Error("No refresh token in cookie");

  //check token có hợp lệ hay không
  JsonWebTokenError.ver;
});

module.exports = {
  register,
  login,
  getOneUser,
};
