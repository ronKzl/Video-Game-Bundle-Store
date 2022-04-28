const e = require('express');
const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();

let app = express();
let today = new Date();

app.use(session({ secret: 'big secret'}));

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.set("view engine", "pug");

//Express Routes
app.get("/", (req, res, next)=> {res.render("bundles",{session : req.session});  });
app.get("/login", (req, res, next)=> {res.render("login",{session : req.session});  });

app.post("/login", login); //look for user in db and give him a session token if found.
app.get("/logout", logout);

app.get("/register", (req, res, next)=> {res.render("register",{session : req.session}); });
app.post("/register", register); //add user to db

app.post("/buy",buyBundle); //put a bundle into orders for the specific user

app.get("/bundles",sendAllBundles); // see all bundles in DB

app.get("/bundle/:bundleID",loadBundleGames); //see all games in a bundle (refinment query)

app.get("/bundleSearch", sendMatchingBundles); //query by genre or publisher

app.get("/user/:userID",loadUser);//view a user profile + his bundle order history

function buyBundle(req,res,next){
  if(req.session.loggedin != true){
    res.status(404).send("Log in or register to buy bundles");
    return;
  }
  //query to see if the user already bought the bundle
  let sqlBundleSearch = `select orderDate from orders where (userId = ${req.session.userId} AND bundleId = '${req.body.bId}')`
  db.all(sqlBundleSearch, (err, rows) => {
    if(err){
      res.status(500).send("Error searching database.");
      return;
    }
    //user bought the bundle already
    if(rows.length != 0){
      res.status(403).send("You have already bought this bundle on date: " + `${rows[0].orderDate}`);
      return;
    }
    //get system date for the orderDate
    let date = today.getDate()+'/'+(today.getMonth()+1)+'/'+today.getFullYear();
    let sqlInsert = `INSERT INTO ORDERS VALUES('${req.session.userId}','${req.body.bId}','${date}')`;
    //new bundle to user, insert into db
    db.run(sqlInsert, function(err) {
      if (err) {
        res.status(500).send("Error inserting into database.");
        return;
      }
      else{
        res.status(200).send("Success");
        return;
      }
    });
  });
}

function loadUser(req,res,next){
  let id = req.params.userID;
  let sqlQuery = `select name,email,address,temp.bundleId,bundle_title,price,orderDate from users join 
                  (bundle join orders on (bundle.bundleId = orders.bundleId)) 
	                as temp on (users.userId = temp.userId) where (users.userId = ${id});`;
  
  db.all(sqlQuery, (err, rows) => {
      if (err) {
        res.status(500).send("Error searching database.");
        return;
      }
      if(rows.length == 0){
        res.status(404).send("This user does not have any order history");
        return;
      }
      else{                      
        res.status(200).render("user", {session : req.session, results: rows});
        return;
      }
      
  });
}



function register(req,res,next){
  if(req.session.loggedin){
    res.status(200).send("You are currently logged in");
    return;
  }
  else{
    let name = req.body.username;
    let password = req.body.password;
    let address = req.body.address;
    let email = req.body.email;

    if(name == "" || password == "" ||address == ""|| email =="" ){
      res.status(401).render("register",{session : req.session, noInput : true});
      return;
    }

    //insert user into db
    let sqlInsert = `INSERT INTO USERS (name,password,email,address) VALUES ('${name}','${password}','${email}','${address}');`;
    let sqlUserSearch = `select * from users where (name = '${name}' AND password = '${password}');`
    //first search db an look if user exists
    db.all(sqlUserSearch, (err, rows) => {
      if (err) {
          res.status(500).send("Error reading database.");
          return;
      }
      if(rows.length == 0){
        //no user found insert user into db
        db.run(sqlInsert, function(err) {
          if (err) {
            res.status(500).send("Error inserting into database.");
            return;
          }
            //now retreive the user
            db.all(sqlUserSearch, (err, rows) => {
              if (err) {
                  res.status(500).send("Error reading database.");
                  return;
              }
              req.session.loggedin = true;
              req.session.username = rows[0].name;
              req.session.userId = rows[0].userId;
              res.status(200).redirect("/");
              return;
            
            });
        });

      }
    });
  }
}



function login(req,res,next){
  if(req.session.loggedin){
		res.status(200).send("Already logged in.");
		return;
	}

	let name = req.body.username;
  let password = req.body.password;

  //find in db
  let sqlUserSearch = `select * from users where (name = '${name}' AND password = '${password}');`
  db.all(sqlUserSearch, (err, rows) => {
    if (err) {
        res.status(500).send("Error reading database.");
        return;
    }
    if(rows.length == 0){
      res.status(404).render("login",{session : req.session, error : true});
      return;
    }
    else{
      req.session.loggedin = true;
      req.session.username = rows[0].name;
      req.session.userId = rows[0].userId;
      res.status(200).redirect("/");
      return;
    }
  });

}

function sendMatchingBundles(req,res,next){
    let sqlSearchQuery;
    
    if((req.query.words == "") || (req.query.type != "genre" && req.query.type != "publisher")){
        res.status(403).send("Query is either empty or not supported");
        return;
    }
    if(req.query.type == "genre"){
        sqlSearchQuery = `SELECT * from bundle where bundleId IN
        (select distinct bundleId from contains_a join game on (contains_a.gameId = game.gameId) where (genre = '${req.query.words}' COLLATE NOCASE));`;
    }
    if(req.query.type == "publisher"){
        sqlSearchQuery = `SELECT * from bundle where bundleId IN
        (select distinct bundleId from contains_a join game on (contains_a.gameId = game.gameId) where (publisher = '${req.query.words}' COLLATE NOCASE));`;
    }
    db.all(sqlSearchQuery, (err, rows) => {
        if (err) {
            res.status(500).send("Error reading database.");
            return;
        }
        if(rows.length == 0){
            res.status(404).json(req.query.words);
            return;
        }
        else{
            res.status(200).json(rows);
            return;
        }
      });
}

function loadBundleGames(req,res,next){
    let id = req.params.bundleID;
    let sqlRefinmentQuery = `select game_title,genre,game_date,publisher,platform,score from game where gameId IN
    (select distinct gameId from contains_a join bundle on (contains_a.bundleId = bundle.bundleId) where (bundle.bundleId = '${id}'));`;

    db.all(sqlRefinmentQuery, (err, rows) => {
        if (err) {
            res.status(500).send("Error reading database.");
            return;
        }
        else{
          res.status(200).render("bundle", {session : req.session, bundleGames: rows});
          return;
        }
      });
}

function sendAllBundles(req,res,next){
    let sqlAllQuery = `select * from bundle;`;

    db.all(sqlAllQuery, (err, rows) => {
            if (err) {
                res.status(500).send("Error reading database.");
			          return;
            }
            res.status(200).json(rows);
            return;
          });
}



function logout(req,res,next){
    if(req.session.loggedin){
        req.session.loggedin = false;
        req.session.username = null;
        req.session.userId = null;
        res.status(200).redirect("/");
        return;
    }
    else{
      res.status(401).send("You are not logged in");
      return;
    }
  }


  
let db = new sqlite3.Database('./database/project.db', (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log("Connected to the project database.");
    app.listen(3000);
    console.log("Listening on port http://localhost:3000");
  });

  