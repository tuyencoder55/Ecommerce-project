const { get } = require("mongoose");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../middlewares/jwt");
const User = require("../models/user");
const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendMail = require("../ultils/sendMail");

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
  //check toke có trong cookie không ?
  if (!cookie && !cookie.refreshToken)
    throw new Error("No refresh token in cookie");

  //check token có hợp lệ hay không
  const rs = await jwt.verify(cookie.refreshToken, process.env.JWT_SECRET);
  const response = await User.findOne({
    _id: rs._id,
    refreshToken: cookie.refreshToken,
  });
  return res.status(200).json({
    success: response ? true : false,
    newAccessToken: response
      ? generateAccessToken(response._id, response.role)
      : "refreshToken invalid",
  });
});

const logout = asyncHandler(async (req, res) => {
  const cookie = req.cookies;
  if (!cookie || !cookie.refreshToken)
    throw new Error("No refresh token in cookie");
  //xoas refresh token ở trong DB
  await User.findOneAndUpdate(
    { refreshToken: cookie.refreshToken },
    { refreshToken: "" },
    { new: true }
  );
  //xoa refresh token ở cookie
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
  });
  return res.status(200).json({
    success: true,
    mes: "logout success",
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.query;
  if (!email) throw new Error("missing email");
  const user = await User.findOne({ email });
  if (!user) throw new Error("user not found");
  const resetToken = user.resetPasswordToken();
  await user.save();

  // const html = 'bấm hộ cái link dưới đây để thay đổi mật khẩu của bạn.Link này sẽ hết hạn sau 15 phút kể từ bây giờ.' + '<a style="color:red, font-size:70px" href=${process.env.URL_SERVER}/api/user/reset-password/

  const html = `
    <h1>This is a test email</h1>
    <p>Click the link below to change your password.</p>
    Click this <a href="${process.env.URL_SERVER}/api/user/reset-password/${resetToken}" style="color:red">Link </a> to set a new password.

  `;

  const data = {
    email,
    html,
  };
  const rs = await sendMail(data);
  return res.status(200).json({
    success: true,
    rs,
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { password, token } = req.body;
  if (!password || !token) throw new Error("missing input");
  const passwordResetToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  const user = await User.findOne({
    passwordResetToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) throw new Error("Invalid reset token");
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordChangeAt = Date.now();
  user.passwordResetExpires = undefined;
  await user.save();
  return res.status(200).json({
    success: user ? true : false,
    mes: user ? "update password successful" : "update password not successful",
  });
});

module.exports = {
  register,
  login,
  getOneUser,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword,
};
