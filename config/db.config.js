const mysql = require("mysql2");

// const db = mysql.createPool({
//   host: "srv2050.hstgr.io",
//   user: "u859692781_custservice",
//   password: "Customerservice!051824",
//   database: "u859692781_custservice",
//   timezone: "+08:00"
// });

const db = mysql.createPool({
  host: "localhost",
  port: "3306",
  user: "root",
  password: "",
  database: "vinarohardwareinventory",
  timezone: "+08:00"
});

db.on("connection", (connection) => {
  connection.query("SET time_zone = '+08:00'");
});

module.exports = db;