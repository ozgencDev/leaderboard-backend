const UserModel = require("../models/user.model");
/* Route to create changes in scores for testing purposes */
exports.addCoin = async (req, res) => {
  const id = req.params.id;
  const value = req.params.value;
  const user = await UserModel.addCoin(id, value);
  res.send(user);
};
