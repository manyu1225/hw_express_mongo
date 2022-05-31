const usersModel = require("../models/User");
const httpStatus = require("../utils/httpStatus");
const handleSuccess = require("../service/handleSuccess");
const handleErrorAsync = require("../service/handleErrorAsync");
const appError = require("../service/appError");
const axios = require("axios");
const jsonwebtoken = require("jwt-decode");
const qs = require("qs");

const lineAPIController = {
  async authorize(req, res, next) {
    const client_id = process.env.client_id;
    const redirect_uri = process.env.redirect_uri;
    const scope = process.env.scope;
    const authorization_endpoint = process.env.authorization_endpoint;
    let url =
      authorization_endpoint +
      "?response_type=code&client_id=" +
      client_id +
      "&redirect_uri=" +
      encodeURIComponent(redirect_uri) +
      "&state=" +
      process.env.state +
      "&scope=" +
      scope;
    res.redirect(url);
  },
  async callback(req, res, next) {
    console.log("=======>", req.query.code);
    if (!req.query.code) {
      return appError(httpStatus.BAD_REQUEST, "code 必須有值!", next);
    } else {
      let reqPramater = qs.stringify({
        grant_type: "authorization_code",
        code: req.query.code,
        redirect_uri: process.env.redirect_uri,
        client_id: process.env.client_id,
        client_secret: process.env.client_secret,
      });
      axios
        .post(process.env.token_endpoint, reqPramater, {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        })
        .then(function (response) {
          console.log("response.data=>", response.data);
          let decoded = jsonwebtoken(response.data.id_token);
          console.log("decoded.email=>", decoded.email);
          response.data.email = decoded.email;
          const user = usersModel
            .findOne({ email: decoded.email })
            .select("+password");
          if (!user) {
            return appError(
              httpStatus.BAD_REQUEST,
              "請先註冊會員，謝謝！",
              next
            );
          }
          const editedUser = usersModel.findByIdAndUpdate(
            user._id,
            {
              token: response.data.access_token,
            },
            { new: true, runValidators: true }
          );
          if (!editedUser) {
            console.log("取得TOKEN失敗!");
          }
          handleSuccess(res, httpStatus.OK, response.data);
        })
        .catch(function (error) {
          console.log("err=====>", error);
          return appError(httpStatus.BAD_REQUEST, error, next);
        });
    }
  },
  async getLineUserInfo(req, res, next) {
    console.log("==========access_token=======>" + req.body.access_token);
    axios
      .get("https://api.line.me/v2/profile", {
        headers: {
          Authorization: "Bearer " + req.body.access_token,
        },
      })
      .then(function (response) {
        console.log("response.data===>", response.data);
        handleSuccess(res, httpStatus.OK, response.data);
      })
      .catch(function (error) {
        console.log("err=====>", error);
        return appError(httpStatus.BAD_REQUEST, "ERR.", next);
      });
  },
};
module.exports = lineAPIController;