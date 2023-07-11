const express = require("express");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5515;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/", (req, res) => {
  res.send("server is running");
});

app.listen(port, () => {
  console.log("server running on the port " + port);
});
