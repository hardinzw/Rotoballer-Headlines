var path = require("path");
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var exphbs = require("express-handlebars");

// Initialize Express
var app = express();

// Our scraping tools
var request = require("request");
var cheerio = require("cheerio");

// Require all models
var Comment = require("./models/Comment");
var Article = require("./models/Article");

var PORT = process.env.PORT || 3000 ;

// Configure middleware
app.engine(
    "handlebars",
    exphbs({
        defaultLayout: "main"
    })
);
app.set("view engine", "handlebars");

// Use morgan logger for logging requests
app.use(logger("dev"));
// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ type: "application/json" }));
// Use express.static to serve the public folder as a static directory
app.use("/public", express.static(__dirname + "/public"));
app.use("/views/layouts", express.static(__dirname + "/views/layouts"));

// If deployed, use the deployed database. Otherwise use the local mongoHeadlines database
var MONGODB_URI = process.env.MONGODB_URI  || "mongodb://admin:admin1@ds127962.mlab.com:27962/heroku_v8bt56n8";
// Set mongoose to leverage built in JavaScript ES6 Promises
// Connect to the Mongo DB
mongoose.Promise = Promise;
mongoose.connect(MONGODB_URI);
mongoose.connection.once("open", function () {
    console.log("Connection has been made");
}).on("error", function (error) {
    console.log("Connection error", error)
});


//Routes==================================================================
// ============= ROUTES FOR HOME PAGE =============//
app.get("/", (req, res) => {
    res.render("index");
  });
  
  app.get("/saved", (req, res) => {
      res.render("saved");
  });

// Scrape data from Rotballer website and save to mongodb
app.get("/scrape", function(req, res) {
    // Grab the body of the html with request
    request("https://www.rotoballer.com/category/nfl/fantasy-football-advice-analysis/", function(error, response, html) {
      // Load that into cheerio and save it to $ for a shorthand selector
      var $ = cheerio.load(html);
      // Grab every part of the html that contains a separate article
      $("div.mainSectionContentItem").each(function(i, element) {
  
        // Save an empty result object
        var result = {};
  
        // Get the title and description of every article, and save them as properties of the result object
        result.title = $(element).find("h2").text();
        result.synopsis = $(element).children("p").text();
        result.link = $(element).find("a").attr("href");
        
        // Using our Article model, create a new entry
        var entry = new Article(result);
  
        // Now, save that entry to the db
        entry.save(function(err, doc) {
          // Log any errors
          if (err) {
            console.log(err);
          }
          // Or log the doc
          else {
            console.log(doc);
          }
        });
  
      });
      // Reload the page so that newly scraped articles will be shown on the page
      res.redirect("/");
    });  
  });
  
  
  // This will get the articles we scraped from the mongoDB
  app.get("/articles", function(req, res) {
    // Grab every doc in the Articles array
    Article.find({})
    // Execute the above query
    .exec(function(err, doc) {
      // Log any errors
      if (err) {
        console.log(error);
      }
      // Or send the doc to the browser as a json object
      else {
        res.json(doc);
      }
    });
  });
  
  // Save an article
  app.post("/save/:id", function(req, res) {
    // Use the article id to find and update it's saved property to true
    Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": true })
    // Execute the above query
    .exec(function(err, doc) {
      // Log any errors
      if (err) {
        console.log(err);
      }
      // Log result
      else {
        console.log("doc: ", doc);
      }
    });
  });
  
  
  // ============= ROUTES FOR SAVED ARTICLES PAGE =============//
  
  // Grab an article by it's ObjectId
  app.get("/articles/:id", function(req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    Article.findOne({ "_id": req.params.id })
    // ..and populate all of the comments associated with it
    .populate("comments")
    // now, execute our query
    .exec(function(error, doc) {
      // Log any errors
      if (error) {
        console.log(error);
      }
      // Otherwise, send the doc to the browser as a json object
      else {
        res.json(doc);
      }
    });
  });
  
  // Create a new comment
  app.post("/comment/:id", function(req, res) {
    // Create a new comment and pass the req.body to the entry
    var newComment = new Comment(req.body);
    // And save the new comment the db
    newComment.save(function(error, newComment) {
      // Log any errors
      if (error) {
        console.log(error);
      }
      // Otherwise
      else {
        // Use the article id to find and update it's comment
        Article.findOneAndUpdate({ "_id": req.params.id }, { $push: { "comments": newComment._id }}, { new: true })
        // Execute the above query
        .exec(function(err, doc) {
          // Log any errors
          if (err) {
            console.log(err);
          }
          else {
            console.log("doc: ", doc);
            // Or send the document to the browser
            res.send(doc);
          }
        });
      }
    });
  });
  
  // Remove a saved article
  app.post("/unsave/:id", function(req, res) {
    // Use the article id to find and update it's saved property to false
    Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": false })
    // Execute the above query
    .exec(function(err, doc) {
      // Log any errors
      if (err) {
        console.log(err);
      }
      // Log result
      else {
        console.log("Article Removed");
      }
    });
    res.redirect("/saved");
  });

// Start the server
app.listen(PORT, function () {
    console.log("App running on port " + PORT + "!");
});