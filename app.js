const express = require("express");
const app = express();
const logger = require("morgan");
const util= require('util');
const encoder = new util.TextEncoder('utf-8');

const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const {
  customCORSHandler,
  escapeSpecialCharacter,
} = require("./helpers/utils");

app.use(express.json());
app.use(cors());
app.use(customCORSHandler);
app.use(logger("dev"));

const MONOGO_CONNECT_URL = process.env.MONGO_CONNECT_URL;
const mongoDbOptions = {
  useNewUrlParser: true,
};
const autoIncrement = require("mongoose-auto-increment");
mongoose.connect(MONOGO_CONNECT_URL, mongoDbOptions, (err) => {
  if (err) console.log(`Database not connected::::::=>${err}`);
  else console.log(`Database connected::: ${MONOGO_CONNECT_URL}`);
});
autoIncrement.initialize(mongoose.connection);

app.use("/public", express.static("public"));

app.use((req, res, next) => {
  if (req.body.email) req.body.email = req.body.email.toLowerCase();
  let offset = req.body.offset;
  let limit = req.body.limit;
  let order = req.body.order;
  if (offset) req.body.offset = offset ? parseInt(offset) : 0;
  if (limit) req.body.limit = limit ? parseInt(limit) : 10;
  if (order) req.body.order = order ? parseInt(order) : 1;
  if (req.body.filter) req.body.filter = req.body.filter.toLowerCase();
  if (req.body.search && req.body.search != "")
    req.body.search = escapeSpecialCharacter(req.body.search);
  next();
});

const v1 = require("./routes/v1/index");
app.use("/api/v1", v1);

app.listen(5000, function () {
  console.log(`Server listing on PORT ${port}`);
});
