const UserModel = require("../models/user.model");
const LeaderBoardModel = require("../models/board.model");

const axios = require("axios");

const boardModel = new LeaderBoardModel();

const addUsers = async () => {
  try {
    const users = await UserModel.getUserInfo();
    await boardModel.addUsersForLeaderboard(users);
  } catch (e) {
    console.log("error", "getUsers mw");
  }
};

exports.getTopUsers = async (req, res) => {
  try {
    const id = req.params.id;
    /* Handles non-id requests and serves redis caching */
    if (!id) {
      boardModel.leaderboard.redisClient.exists(
        "leaderboard",
        async (err, reply) => {
          if (reply === 1) {
            const users = await boardModel.getTopUsers();

            res.status(200).json(users);
          } else {
            addUsers();
            axios
              .get("https://panteon-backend.herokuapp.com/api/leaderboard")
              .then((response) => {
                res.json(response.data);
                return;
              })
              .catch((e) => {
                res.end();
                return;
              });
          }
        }
      );
      return;
    }
    /* Doesn't make requests for the first 100 people. It only sends requests for those close to id */
    boardModel.leaderboard.redisClient.exists(
      "leaderboard",
      async (err, reply) => {
        if (err) {
          throw err;
        }
        if (reply) {
          const topUsers = await boardModel.getTopUsers();
          const countryTopUsers = await UserModel.getTopUsers(topUsers);
          const around = await boardModel.getArounds(id); //json
          if (!around) {
            res.status(404).json({
              message: "User not found",
            });
            return;
          }
          const countryAroundUsers = await UserModel.getTopUsers(around);

          Promise.all(countryTopUsers)
            .then((usersInfoWithCountry) => {
              const arr = topUsers.map((user, index) => {
                return Object.assign(user, usersInfoWithCountry[index]);
              });
              return arr;
            })
            .then((top100WithCountryArr) => {
              Promise.all(countryAroundUsers)
                .then((arounUsersInfoWithCountry) => {
                  const aroundArr = around.map((user, index) => {
                    return Object.assign(
                      user,
                      arounUsersInfoWithCountry[index]
                    );
                  });
                  const resp = top100WithCountryArr.concat(aroundArr);
                  res.json(resp);
                })
                .catch((e) => {
                  console.log(e);
                });
            });
        } else {
          /* If the cache is empty, it fills and re-requests */
          addUsers();
          axios
            .get("http://localhost:3000/api/leaderboard/" + id)
            .then((response) => {
              res.json(response.data);
              return;
            })
            .catch((e) => {
              res.end();
              return;
            });
        }
      }
    );
  } catch (e) {
    console.log("error", "getTopUsers mw");
  }
};
