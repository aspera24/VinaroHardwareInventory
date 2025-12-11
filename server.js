const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.json());
app.use(express.static("public")); 

const routes = require("./routes");
app.use("/backend", routes);   

io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);
});

// MOVE THIS TO THE BOTTOM
// Handles SPA front-end routes
app.get("*", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

http.listen(3000, () => console.log("Server running on port 3000"));
