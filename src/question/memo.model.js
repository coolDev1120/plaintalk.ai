const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const memoSchema = new Schema({
  email: String,
  memo: String,
  mainID: Number,
  createdAt: { type: Date, default: Date.now },
});

const memoModel = mongoose.model("memo", memoSchema, "memo");

module.exports = memoModel;
