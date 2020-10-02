var mongoose = require("mongoose");

var commentSchema = mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: "post", required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: "comment" },
  text: { type: String, required: [true, "text is required!"] },
  isDeleted: { type: Boolean },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

commentSchema
  .virtual("childComments") //4
  .get(function () {
    return this._childComments;
  })
  .set(function (value) {
    this._childComments = value;
  });

var Comment = mongoose.model("comment", commentSchema);
module.exports = Comment;
