var express = require("express");
var router = express.Router();
var util = require("../config/util");
var User = require("../models/User");

// router.get("/", function (req, res) {
//   User.find({})
//     .sort({ username: 1 })
//     .exec(function (err, result) {
//       if (err) return res.send(err);
//       res.render("users/index", { users: result });
//     });
// });

// New
router.get("/new", function (req, res) {
  var user = req.flash("user")[0] || {};
  var errors = req.flash("errors")[0] || {};
  res.render("users/new", { user: user, errors: errors });
});

// create
router.post("/", function (req, res) {
  User.create(req.body, function (err, user) {
    if (err) {
      req.flash("user", req.body);
      req.flash("errors", util.parseError(err));
      return res.redirect("/users/new");
    }
    res.redirect("/");
  });
});

// show
router.get("/:username", util.isLoggedin, checkPermission, function (req, res) {
  User.findOne({ username: req.params.username }, function (err, user) {
    if (err) return res.json(err);
    res.render("users/show", { user: user });
  });
});

// edit
router.get("/:username/edit", util.isLoggedin, checkPermission, function (req, res) {
  var user = req.flash("user")[0];
  var errors = req.flash("errors")[0] || {};
  if (!user) {
    User.findOne({ username: req.params.username }, function (err, user) {
      if (err) return res.json(err);
      res.render("users/edit", { username: req.params.username, user: user, errors: errors });
    });
  } else {
    res.render("users/edit", { username: req.params.username, user: user, errors: errors });
  }
});

// update
router.put("/:username", util.isLoggedin, checkPermission, function (req, res, next) {
  User.findOne({ username: req.params.username })
    .select("password")
    .exec(function (err, user) {
      if (err) return res.json(err);

      // update user object
      user.originalPassword = user.password;
      user.password = req.body.newPassword ? req.body.newPassword : user.password;
      for (var i in req.body) {
        user[i] = req.body[i];
      }

      // save updated user
      user.save(function (err, user) {
        if (err) {
          req.flash("user", req.body);
          req.flash("errors", util.parseError(err));
          return res.redirect("/users/" + req.params.username + "/edit");
        }
        res.redirect("/users/" + user.username);
      });
    });
});

// router.delete("/:username", function (req, res) {
//   User.deleteOne({ username: req.params.username }, function (err) {
//     if (err) return res.send(err);
//     res.redirect("/users");
//   });
// });

module.exports = router;

function checkPermission(req, res, next) {
  User.findOne({ username: req.params.username }, function (err, user) {
    if (err) return res.json(err);
    if (user.id != req.user.id) return util.noPermission(req, res);

    next();
  });
}
