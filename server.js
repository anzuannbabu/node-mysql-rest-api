var express = require('express');
var app = express();
var mysql = require('mysql');
var bodyParser = require('body-parser');
var multer = require('multer');//Step 1
var path = require('path');
const { json } = require('body-parser');

var bcrypt = require("bcrypt");
const saltRounds = 10

const jwt = require('jsonwebtoken');
const JWT_SECRET_KEY = 'my_secret_key'
  
// TOKEN_HEADER_KEY = gfg_token_header_key

app.all("/*", function (req, res, next) {
    res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Origin", "*"); 
    return next();
});

app.use(express.static(__dirname ));//Step 2

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

var con = {
    host:"127.0.0.1",
    user:"root",
    password:"",
    database:"mydb1"
};


var connection;

function handleDisconnect() {
  
    connection = mysql.createConnection(con);
    connection.connect(function(err) {              // The server is either down
        if(err) {                                     // or restarting (takes a while sometimes).
            console.log('error when connecting to db:', err);
            setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
        }  
        else
        {
            console.log("i got it");
        }                                   // to avoid a hot loop, and to allow our node script to
    });

    connection.on('error', function(err) {
        console.log('db error', err);
        if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
            handleDisconnect();                         // lost due to either server restart, or a
        } else {                                      // connnection idle timeout (the wait_timeout
            throw err;                                  // server variable configures this)
        }
    });
}

handleDisconnect();

//Step 3: Configure multer
var storage = multer.diskStorage({ //multers disk storage settings
    destination: function (req, file, cb) { //Default folder config
        cb(null, __dirname+'/uploads');
    },
    filename: function (req, file, cb) {
        //Attach timestamp beside file name
        var datetimestamp = Date.now();
        cb(null, file.originalname.replace(
            path.extname(file.originalname)) 
        + '-' + Date.now() + path.extname(file.originalname))
    }
});

var upload = multer({ //multer settings
    storage: storage
}).single('file');


/* confirgure uploads for employees */
//Step 3: Configure multer
var storage = multer.diskStorage({ //multers disk storage settings
    destination: function (req, file, cb) { //Default folder config
        cb(null, __dirname+'/uploads');
    },
    filename: function (req, file, cb) {
        //Attach timestamp beside file name
        var datetimestamp = Date.now();
        cb(null, file.originalname.replace(
            path.extname(file.originalname)) 
        + '-' + Date.now() + path.extname(file.originalname))
    }
});

var uploadEmployeeProfile = multer({ //multer settings
    storage: storage
}).single('file');

/*API path that will upload the files */    
app.post('/upload', function(req, res) {
    console.log('hi');
    console.log(req.body);
    upload(req,res,function(err){
        if(err){
            res.json({error_code:1,err_desc:err});
            return;
        }
        //res.json({error_code:0,err_desc:null});
        res.json({"filename":"uploads/"+req.file.filename});
        //console.log(req.file);
    });
});
app.get('/books',function(req,res){
    var querystring = "select * from books" ; 
    console.log("query::" +querystring)
    connection.query(querystring,function(err,results){
        if(err)
        {
            throw err;
        }
        else
        {          
            console.log(results);
            res.json(results);
        }
    });
});
app.post('/books',function(req, res){
    console.log(req.body);
    var sqlList = "Insert into books(bookname,author,price) values("+
                    "'" + req.body.bookname + "','" + req.body.author + "'," +req.body.price+ ")";
    console.log(sqlList);
    var query = connection.query(sqlList,function(err,result){
        if(err)
        {
            console.log(err);
        }
        else
        {
            console.log(result.insertId);
            res.json(result);
        }
    });
});

//update book
app.put('/books/:bookid',function(req, res){
    console.log(req.body);
    var sqlUpdate = `Update books set bookname='${req.body.bookname}',price='${req.body.price}',author='${req.body.author}' where bookid='${parseInt(req.params.bookid)}'`;
    console.log(sqlUpdate);
    console.log(sqlUpdate);
    var query = connection.query(sqlUpdate,function(err,result){
        if(err)
        {
            console.log(err);
        }
        else
        {
            console.log(result.insertId);
            res.json(result);
        }
    });
});

//delete a book
app.delete('/books/:bookid',function(req, res){
    console.log(req.body);
   
    var sqlDelete = `DELETE from books where bookid='${parseInt(req.params.bookid)}'`;
                    console.log(sqlDelete);
    var query = connection.query(sqlDelete,function(err,result){
        if(err)
        {
            console.log(err);
        }
        else
        {
            console.log(result.insertId);
            res.json(result);
        }
    });
});



app.get('/getAllProducts',function(req,res){
    var querystring = "select * from products" ; 
    console.log("query::" +querystring)
    connection.query(querystring,function(err,results){
        if(err)
        {
            throw err;
        }
        else
        {          
            console.log(results);
            res.json(results);
        }
    });
});
app.get('/getProduct/:productid',function(req,res){
    var querystring = "select productname,vendor,unitprice from products where productid="+req.params.productid ; 
    console.log("query::" +querystring)
    connection.query(querystring,function(err,results){
        if(err)
        {
            throw err;
        }
        else
        {          
            console.log(results);
            res.json(results);
        }
    });
});
app.post('/newcategory',function(req, res){
    console.log(req.body);
    var sqlList = "Insert into categories(cetegoryname) values("+
                    "'" + req.body.categoryname + "')";
    console.log(sqlList);
    var query = connection.query(sqlList,function(err,result){
        if(err)
        {
            console.log(err);
        }
        else
        {
            console.log(result.insertId);
            res.json(result);
        }
    });
});


/* empoyee endpoints */

//get all employees
app.get('/employees',function(req, res){


    try {
        const token = req.header("Authorization");
  
        const verified = jwt.verify(token, JWT_SECRET_KEY);
        if(verified){
            console.log(req.body);
            var sqlQuery = `SELECT * FROM employees`;
            console.log(sqlQuery);
            var query = connection.query(sqlQuery,function(err,result){
                if(err)
                {
                    console.log(err);
                }
                else
                {
                    console.log(result.insertId);
                    res.json(result);
                }
            });
        }else{
            // Access Denied
            return res.status(401).send(error);
        }
    } catch (error) {
        // Access Denied
        return res.status(401).send(error);
    }

    
});

//get single employee
app.get('/employees/:id',function(req, res){
    console.log(req.body);
    var sqlQuery = `SELECT * FROM employees where empid='${req.params.id}'`;
    console.log(sqlQuery);
    var query = connection.query(sqlQuery,function(err,result){
        if(err)
        {
            console.log(err);
        }
        else
        {
            console.log(result.insertId);
            res.json(result);
        }
    });
});

//add employee
app.post('/employees',function(req, res){
    /* console.log(req.form);
    var sqlList = `Insert into employees(empname,job,dateofjoin,salary) values('${req.body.empname}', '${req.body.job}','${req.body.dateofjoin}','${req.body.salary}')`;
    console.log(sqlList);
    var query = connection.query(sqlList,function(err,result){
        if(err)
        {
            console.log(err);
        }
        else
        {
            console.log(result.insertId);
            res.json(result);
        }
    }); */

    console.log(req.body);
    uploadEmployeeProfile(req,res,function(err){
        if(err){
            res.json({error_code:1,err_desc:err}).status(400);
            return;
        }

        var filePath = `uploads/${req.file.filename}`;
        //res.json({error_code:0,err_desc:null});
        //res.json({"filename":"img/profiles/"+req.file.filename});
        //console.log(req.file);

        //save to the database
        console.log(req.body);
        var sqlQuery = `Insert into employees(empname,job,dateofjoin,salary,profilepic) values('${req.body.empname}', '${req.body.job}','${req.body.dateofjoin}','${req.body.salary}','${filePath}')`;
        console.log(sqlQuery);
        var query = connection.query(sqlQuery,function(err,result){
            if(err)
            {
                console.log(err);
            }
            else
            {
                console.log(result.insertId);
                res.json(result);
            }
        });
    });


});

//update employee profile
app.put('/employees/:id/profile',function(req, res){

    //get the employee first

    var getUserSqlQuery = `Select * from employees where empid='${req.params.id}'`;

    var query = connection.query(getUserSqlQuery,function(err,result){
        if(err) {
            console.log(err);
            return res.json({
                "message": "Internal Server Error"
            }).status(500);
        } else if(result.length == 0)
        {
            console.log(result);
            return res.json({
                "message" : "Employee details not found"
            }).status(404);
        }
        else
        {
           //upload profile pic and update user details
           //get pic from the request
    console.log(req.body);
    uploadEmployeeProfile(req,res,function(err){
        if(err){
            res.json({error_code:1,err_desc:err}).status(400);
            return;
        }

        var filePath = `uploads/${req.file.filename}`;
        //res.json({error_code:0,err_desc:null});
        //res.json({"filename":"img/profiles/"+req.file.filename});
        //console.log(req.file);

        //save to the database
        console.log(req.body);
        var sqlQuery = `UPDATE employees SET profilepic='${filePath}' WHERE empid='${req.params.id}'`;
        console.log(sqlQuery);
        var query = connection.query(sqlQuery,function(err,result){
            if(err)
            {
                console.log(err);
            }
            else
            {
                console.log(result.insertId);
                res.json(result);
            }
        });
    });
        }
    });

    

   
});

//update employee details
app.put('/employees/:id',function(req, res){

    //get the employee first

    var getUserSqlQuery = `Select * from employees where empid='${req.params.id}'`;

    var query = connection.query(getUserSqlQuery,function(err,result){
        if(err) {
            console.log(err);
            return res.json({
                "message": "Internal Server Error"
            }).status(500);
        } else if(result.length == 0)
        {
            console.log(result);
            return res.json({
                "message" : "Employee details not found"
            }).status(404);
        }
        else
        {
         //save to the database
        console.log(req.body);
        var sqlQuery = `UPDATE employees SET empname='${req.body.empname}', job='${req.body.job}', dateofjoin='${req.body.dateofjoin}', salary='${req.body.salary}' WHERE empid='${req.params.id}'`;
        console.log(sqlQuery);
        var query = connection.query(sqlQuery,function(err,result){
            if(err)
            {
                console.log(err);
            }
            else
            {
                console.log(result.insertId);
                res.json(result);
            }
        });
        }
    });

    

   
});

//delete employee
app.delete('/employees/:id',function(req, res){
    console.log(req.body);
    var sqlQuery = `DELETE FROM employees WHERE empid='${req.params.id}'`;
    console.log(sqlQuery);
    var query = connection.query(sqlQuery,function(err,result){
        if(err)
        {
            console.log(err);
        }
        else
        {
            console.log(result.insertId);
            res.json(result);
        }
    });
});
/* ./empoyee endpoints */

/* registration endpoint */
app.post('/register',function(req, res){
    console.log(req.body);

    //generate salt and hash theh pawd before save the account into the database
    bcrypt
  .genSalt(saltRounds)
  .then(salt => {
    console.log('Salt: ', salt)
    return bcrypt.hash(req.body.pwd, salt)
  })
  .then(hash => {
   // console.log('Hash: ', hash)
//    store ther user into the database
    // var password = bcrypt.hash(req.body.pwd);
    var sqlQuery = `INSERT INTO users(email,pwd,name) values('${req.body.email}','${hash}','${req.body.name}') `;
    console.log(sqlQuery);
    var query = connection.query(sqlQuery,function(err,result){
        if(err)
        {
            console.log(err);
        }
        else
        {
            console.log(result.insertId);
            res.json(result);
        }
    });
  })
  .catch(err => console.error(err.message))

    //validate the pwd
   
});

/* ./registration endpoint */
/* registration endpoint */
app.post('/token',function(req, res){
    console.log(req.body);

    setTimeout(() => {
//validate the pwd
    // var password = bcrypt.hash(req.body.pwd);
    var sqlQuery = `SELECT * FROM users where email='${req.body.email}'`;
    console.log(sqlQuery);
    var query = connection.query(sqlQuery,function(err,result){
        if(err)
        {
            console.log(err);
        }
        else
        {

            if(result.length > 0) {
                var userPwd = result[0].pwd;
console.log("stored user pwd => ", userPwd);
                bcrypt
                .hash(req.body.pwd, saltRounds)
                .then(hash => {
                        //compare two hashes
                        console.log("logn user pwd =>", req.body.pwd);
                        console.log("logn user pwd hash =>", hash);
                        bcrypt.compare(req.body.pwd,userPwd)
                    .then(res_ => {
                        // console.log(res) // return true
                        if(res_) {
                            //generate user token
                            let jwtSecretKey = JWT_SECRET_KEY;
                            let data = {
                                time: Date(),
                                email: req.body.email,
                                name: result[0].name,
                            }

                            const token = jwt.sign(data, jwtSecretKey,{
                                expiresIn: 3600
                            });

                            res.json({
                            token : token
                            });
                        } else {
                          res.status(400).json({
                                message : "Invalid credentials"
                            })
                        }
                    })
                    .catch(err => console.error(err.message)) 
                 })
                .catch(err => console.error(err.message))
            } else {
                res.json({
                    message : "Invalid credentials"
                }).status(400).status(400);
            }
            //

           
            //console.log(result.insertId);
           // res.json(result);
        }
    });
    },0)


   

    
});
/* ./registration endpoint */


var server = app.listen(8081, function () {

   var host = server.address().address
   var port = server.address().port

   console.log("Example app listening at http://%s:%s", host, port)
})