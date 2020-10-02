var express = require("express");
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var methodOverride = require("method-override");
var flash = require("connect-flash"); // 1
var session = require("express-session"); // 1
var passport = require("./config/passport");
var util = require("./config/util");
var app = express();

// DB setting
mongoose.set("useNewUrlParser", true);
mongoose.set("useFindAndModify", false);
mongoose.set("useCreateIndex", true);
mongoose.set("useUnifiedTopology", true);
mongoose.connect("mongodb+srv://park:park123@cluster0.4bvqg.mongodb.net/board?retryWrites=true&w=majority");
var db = mongoose.connection;
db.once("open", function () {
  console.log("DB connected");
});
db.on("error", function (err) {
  console.log("DB ERROR : ", err);
});

// Other Setting
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(flash()); // 2
app.use(session({ secret: "MySecret", resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(function (req, res, next) {
  res.locals.isAuthenticated = req.isAuthenticated();
  res.locals.currentUser = req.user;
  next();
});

// Routes
app.use("/", require("./routes/home"));
app.use("/posts", util.getPostQueryString, require("./routes/posts"));
app.use("/users", require("./routes/users"));
app.use("/comments", util.getPostQueryString, require("./routes/comments"));
app.use("/files", require("./routes/files"));

// Port Setting
var port = 9900;
app.listen(port, function () {
  console.log("listening on " + port);
});
