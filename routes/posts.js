var express = require("express");
var router = express.Router();
var Post = require("../models/Post");
var User = require("../models/User");
var Comment = require("../models/Comment");
var util = require("../config/util");
var multer = require("multer");
var upload = multer({ dest: "uploadedFiles/" });
var File = require("../models/File");

// index
router.get("/", async function (req, res) {
  // 1
  var page = Math.max(1, parseInt(req.query.page)); // 2
  var limit = Math.max(1, parseInt(req.query.limit)); // 2
  page = !isNaN(page) ? page : 1; // 현재 페이지
  limit = !isNaN(limit) ? limit : 10; // 페이지당 게시물수

  var searchQuery = createSearchQuery(req.query);

  var skip = (page - 1) * limit; // 4
  var count = await Post.countDocuments(searchQuery); // 전체 게시물수
  var totalPage = Math.ceil(count / limit); // 전체 페이지수
  var totalSet = Math.ceil(totalPage / 10); // 전체 세트수
  var curSet = Math.ceil(page / 10); // 현재 세트번호
  var startPage = (curSet - 1) * 10 + 1; // 현재 세트내 출력 시작 페이지 1, 11, 21 ~
  var endPage = startPage + 10 - 1; // 현재 세트내 출력 마지막 페이지 10, 20, 30 ~
  var posts = await Post.find(searchQuery) // 7
    .populate("author")
    .sort("-createdAt")
    .skip(skip) // 8
    .limit(limit) // 8
    .exec();

  // console.log(posts);

  res.render("posts/index", {
    posts: posts,
    currentPage: page,
    limit: limit,
    totalPage: totalPage,
    totalSet: totalSet,
    curSet: curSet,
    startPage: startPage,
    endPage: endPage,
    searchType: req.query.searchType, // 2
    searchText: req.query.searchText,
  });
});

// new
router.get("/new", util.isLoggedin, function (req, res) {
  var post = req.flash("post")[0] || {};
  var errors = req.flash("errors")[0] || {};
  res.render("posts/new", { post: post, errors: errors });
});

// create
router.post("/", util.isLoggedin, upload.single("attachment"), async function (req, res) {
  var attachment = req.file ? await File.createNewInstance(req.file, req.user._id) : undefined;
  req.body.attachment = attachment;
  req.body.author = req.user._id;
  Post.create(req.body, function (err, post) {
    if (err) {
      req.flash("post", req.body);
      req.flash("errors", util.parseError(err));
      return res.redirect("/posts/new" + res.locals.getPostQueryString());
    }

    if (attachment) {
      attachment.postId = post._id;
      attachment.save();
    }

    res.redirect("/posts" + res.locals.getPostQueryString(false, { page: 1, searchText: "" }));
  });
});

// show
router.get("/:id", function (req, res) {
  // 2
  var commentForm = req.flash("commentForm")[0] || { _id: null, form: {} };
  var commentError = req.flash("commentError")[0] || { _id: null, parentComment: null, errors: {} };

  Promise.all([
    Post.findOne({ _id: req.params.id })
      .populate({ path: "author", select: "username" })
      .populate({ path: "attachment", match: { isDeleted: false } }),
    Comment.find({ post: req.params.id }).sort("createdAt").populate({ path: "author", select: "username" }),
  ])
    .then(([post, comments]) => {
      res.render("posts/show", {
        post: post,
        comments: comments,
        commentForm: commentForm,
        commentError: commentError,
      });
    })
    .catch((err) => {
      console.log("err: ", err);
      return res.json(err);
    });
});

// edit
router.get("/:id/edit", util.isLoggedin, checkPermission, function (req, res) {
  var post = req.flash("post")[0];
  var errors = req.flash("errors")[0] || {};
  if (!post) {
    Post.findOne({ _id: req.params.id }, function (err, post) {
      if (err) return res.send(err);
      res.render("posts/edit", { post: post, errors: errors });
    });
  } else {
    post._id = req.params.id;
    res.render("posts/edit", { post: post, errors: errors });
  }
});

// update
router.put("/:id", util.isLoggedin, checkPermission, function (req, res) {
  req.body.updatedAt = Date.now();
  Post.findOneAndUpdate({ _id: req.params.id }, req.body, { runValidators: true }, function (err, result) {
    if (err) {
      req.flash("post", req.body);
      req.flash(errors, util.parseError(err));
      return res.redirect("/posts/" + req.params.id + "/edit" + res.locals.getPostQueryString()); // 1
    }
    res.redirect("/posts/" + req.params.id + res.locals.getPostQueryString());
  });
});

// destory
router.delete("/:id", util.isLoggedin, checkPermission, function (req, res) {
  Post.deleteOne({ _id: req.params.id }, function (err) {
    if (err) return res.send(err);
    res.redirect("/posts" + res.locals.getPostQueryString());
  });
});

module.exports = router;

function checkPermission(req, res, next) {
  Post.findOne({ _id: req.params.id }, function (err, post) {
    if (err) return res.json(err);
    if (post.author != req.user.id) return util.noPermission(req, res);

    next();
  });
}

function createSearchQuery(queries) {
  // 4
  var searchQuery = {};
  if (queries.searchType && queries.searchText && queries.searchText.length >= 3) {
    var searchTypes = queries.searchType.toLowerCase().split(",");
    var postQueries = [];
    if (searchTypes.indexOf("title") >= 0) {
      postQueries.push({ title: { $regex: new RegExp(queries.searchText, "i") } });
    }
    if (searchTypes.indexOf("body") >= 0) {
      postQueries.push({ body: { $regex: new RegExp(queries.searchText, "i") } });
    }
    if (postQueries.length > 0) searchQuery = { $or: postQueries };
  }

  console.log(searchQuery);

  return searchQuery;
}
