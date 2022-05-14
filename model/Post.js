const mongoose = require("mongoose");
const postsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "name must be value."],
    },
    tags: [
      {
        type: String,
        required: [true, "the Posts tags must have value."],
      },
    ],
    type: {
      type: String,
      enum: ["group", "person"],
      required: [true, "Posts type must have value."],
    },
    image: {
      type: String,
      default: "",
    },
    createAt: {
      type: Date,
      default: Date.now,
      select: false,
    },
    content: {
      type: String,
      required: [true, "Content must have values."],
    },
    likes: {
      type: String,
      default: 0,
    },
    comments: {
      type: Number,
      default: 0,
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "users",
    },
  },
  {
    versionKey: false,
  }
);

const posts = mongoose.model("posts", postsSchema);

module.exports = posts;
