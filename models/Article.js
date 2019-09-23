var mongoose = require("mongoose");

var Schema = mongoose.Schema;

var ArticleSchema = new Schema({
  title: {
    type: String,
    required: false,
  },
  synopsis: {
    type: String,
    require: false,
  },
  link: {
    type: String,
    required: true,
  },
  saved: {
    type: Boolean,
    default: false
  },
  comments: [{
    type: Schema.ObjectId,
    ref: "Comment"
  }]
});

// This creates our model from the above schema, using mongoose's model method
var Article = mongoose.model("Article", ArticleSchema);

// Export the Article model
module.exports = Article;