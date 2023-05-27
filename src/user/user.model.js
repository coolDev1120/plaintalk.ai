const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new Schema({
  email: String,
  billingID: String,
  plan: { type: String, enum: ["none", "basic", "pro"], default: "none" },
  hasTrial: { type: Boolean, default: false },
  credits: {
    type: Number,
    default: 3,
  },
  endDate: { type: Date, default: null },
});

userSchema.plugin(passportLocalMongoose);
const userModel = mongoose.model("user", userSchema, "user");

module.exports = userModel;
