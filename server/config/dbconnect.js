const { default: mongoose } = require("mongoose");

const dbConnect = async () => {
  try {
    const conn = await mongoose.connect(process.env.URL_DB);
    if (conn.connection.readyState === 1)
      console.log("DB connection is successfully!!!");
    else console.log("DB connecting!!!");
  } catch (error) {
    console.log("DB connect is failed: " + error);
    throw new Error();
  }
};

module.exports = dbConnect;
