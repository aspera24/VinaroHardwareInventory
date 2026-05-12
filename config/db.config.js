const mysql = require("mysql2");

const db = mysql.createPool({
  host: "localhost",
  port: "3306",
  user: "u859692781_vhi",
  password: "Vhiapp-05122026-449",
  database: "Vhiapp-05122026-449",
  timezone: "+08:00"
});

db.on("connection", (connection) => {
  connection.query("SET time_zone = '+08:00'");
});

module.exports = db;