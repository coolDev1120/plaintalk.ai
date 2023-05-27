const Question = require('./question.model')
const Memo = require('./memo.model')

// const addQuestion = (User) =>
//     ({ email, question, answer }) => {
//         const user = new Question({ email, question, answer });
//         return true
//     };
// const getUsers = (User) => () => {
//   return User.find({});
// };

// const getUserByUsername = (User) => async (username) => {
//   return await User.findOne({ username });
// };

// const getUserByEmail = (User) => async (email) => {
//   return await User.findOne({ email });
// };

// const getUserByBillingID = (User) => async (billingID) => {
//   return await User.findOne({ billingID });
// };

// const updatePlan = (User) => (email, plan) => {
//   return User.findOneAndUpdate({ email, plan });
// };


const addQuestion = async function ({ email, question, answer }) {
    const user = new Question({ email, question, answer });
    return true
}


module.exports = UserService(Question)
