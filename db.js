// const mysql = require("mysql2");

// const db = mysql.createPool({
//   host: "localhost",
//   user: "root",
//   password: "",
//   database: "customer-service",
//   timezone: "+08:00"
// });

// module.exports = db;

const mysql = require("mysql2");

const db = mysql.createPool({
  // host: "localhost",
  host: "localhost",
  user: "u859692781_custservice",
  password: "Customerservice!051824",
  database: "u859692781_custservice",
  timezone: "+08:00"
});

module.exports = db;
