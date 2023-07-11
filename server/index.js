const express = require("express");
require("dotenv").config();
const dbConnect = require("./config/dbconnect");
const initRoutes = require("./routes");

const app = express();
const port = process.env.PORT || 5515;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
dbConnect();

initRoutes(app);

app.listen(port, () => {
  console.log("server running on the port " + port);
});
