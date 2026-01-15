const mysql = require("mysql2");

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "customer-service",
  timezone: "+08:00"
});

module.exports = db;
