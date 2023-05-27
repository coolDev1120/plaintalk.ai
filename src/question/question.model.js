const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const questionSchema = new Schema({
  email: String,
  question: String,
  answer: String,
  mainID: Number,
  createdAt: { type: Date, default: Date.now },
});

const questionModel = mongoose.model("question", questionSchema, "question");

module.exports = questionModel;
