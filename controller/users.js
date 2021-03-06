const bcrypt = require("bcrypt"); //處理密碼，獲得 hashed password
const jwt = require("jsonwebtoken"); //JWT 產生與驗證
const { isLength, isNumeric, isAlpha } = require("validator");

const usersModel = require("../models/User");
const Likes = require("../models/Likes");
const httpStatus = require("../utils/httpStatus");
const handleSuccess = require("../service/handleSuccess");
const appError = require("../service/appError");
const filterObject = require("../utils/filterObject");

const generateAndSendToken = async (res, statusCode, user) => {
  const token = jwt.sign(
    { id: user._id, name: user.name },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_DAY,
    }
  );
  const resData = {
    token,
    user,
  };
  handleSuccess(res, statusCode, resData);
};

const usersController = {
  async register(req, res, next) {
    const data = req.body;
    let { name, email, password } = data; //解構
    if (!name || !email || !password) {
      return appError(httpStatus.BAD_REQUEST, "請確認欄位", next);
    }
    const user = await usersModel.findOne({ email });
    if (user) {
      return appError(httpStatus.BAD_REQUEST, "Mail已被註冊！", next);
    }
    const psd = await bcrypt.hash(password, 8);
    const newUser = await usersModel.create({
      name,
      email,
      password: psd,
    });
    await generateAndSendToken(res, httpStatus.CREATED, newUser);
  },
  async signin(req, res, next) {
    const data = req.body;
    let { email, password } = data; //解構
    if (!email || !password) {
      return appError(httpStatus.BAD_REQUEST, "請確認欄位", next);
    }
    const user = await usersModel.findOne({ email }).select("+password");
    if (!user) {
      return appError(httpStatus.BAD_REQUEST, "帳號或密碼有誤！", next);
    }
    const isValidated = await bcrypt.compare(password, user.password);
    if (!isValidated) {
      return appError(httpStatus.BAD_REQUEST, "密碼錯誤！", next);
    }

    await generateAndSendToken(res, httpStatus.OK, user);
  },
  //從 Middleware 之 JWT 取得 User 資訊
  async updatePassword(req, res, next) {
    const { password, passwordConfirm } = req.body;

    if (!password || !passwordConfirm) {
      return appError(httpStatus.BAD_REQUEST, "欄位不可為空", next);
    }

    if (password !== passwordConfirm) {
      return appError(httpStatus.BAD_REQUEST, "密碼輸入不一致", next);
    }

    if (
      !isLength(password, { min: 8 }) ||
      isNumeric(password) ||
      isAlpha(password)
    ) {
      return appError(
        httpStatus.BAD_REQUEST,
        "密碼需至少 8 碼以上，並數字與英文或符號混合",
        next
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const editedUser = await usersModel.findByIdAndUpdate(
      req.user._id,
      {
        password: hashedPassword,
      },
      { new: true }
    );

    await generateAndSendToken(res, httpStatus.OK, editedUser);
  },
  //從 Middleware 之 JWT 取得 User 資訊
  async getProfile(req, res, next) {
    handleSuccess(res, httpStatus.OK, req.user);
  },
  async updateProfile(req, res, next) {
    const allowFileds = ["name", "photo", "gender"];
    const filteredBody = filterObject(req.body, allowFileds);

    if (Object.keys(filteredBody).length === 0) {
      return appError(httpStatus.BAD_REQUEST, "請輸入正確欄位", next);
    }

    const editedUser = await usersModel.findByIdAndUpdate(
      req.user._id,
      filteredBody,
      { new: true, runValidators: true }
    );

    if (!editedUser) {
      return appError(httpStatus.NOT_FOUND, "查無此使用者", next);
    }

    await generateAndSendToken(res, httpStatus.OK, editedUser);
  },
  async getlikeList(req, res, next) {
    const likes = await Likes.find({ user: req.params.id })
      .populate({
        path: "user",
        select: "name photo",
      })
      .populate({
        path: "post",
        select: "createAt",
      });

    handleSuccess(res, httpStatus.OK, likes);
  },
  async getUser(req, res, next) {
    const email = req.params.id;
    const data = await usersModel.find({ email: email });
    if (!data.length) {
      return appError(httpStatus.BAD_REQUES, "email 不存在", next);
    }
    handleSuccess(res, httpStatus.OK, data);
  },
  async getAllUsers(req, res, next) {
    const timeSort = req.query.timeSort === "asc" ? "createAt" : "-createAt";
    const limit = req.query.limit;
    const all = await usersModel.find().sort(timeSort).limit(limit);
    handleSuccess(res, httpStatus.OK, all);
  },
  async delUser(req, res, next) {
    const id = req.params.id;
    const originalUrl = req.originalUrl;
    if (!id || !originalUrl) {
      return appError(httpStatus.BAD_REQUEST, "參數有缺", next);
    }
    const user = await usersModel.find({ _id: id });
    if (!user.length) {
      return appError(httpStatus.BAD_REQUEST, "無此人", next);
    }
    const data = await usersModel.findByIdAndDelete(user);
    handleSuccess(res, httpStatus.OK, data);
  },
};
module.exports = usersController;
