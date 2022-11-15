const express = require("express");
const router = express.Router();
const adminRoutes = require("./adminRouter");
const userRoutes = require("./userRouter");
const seasonRoutes = require("./seasonRouter");
const flexiRoutes = require("./flexiRouter");
const overgroundRoutes = require("./overgroundRouter");
const undergroundRoutes = require("./undergroundRouter");
const dashboardRoutes = require("./dashboardRouter");
const oysterCardRouter = require("./oysterCardRouter");
const evolviRoutes = require("./evolviRouter");

router.use("/user", userRoutes);
router.use("/admin", adminRoutes);
router.use("/season", seasonRoutes);
router.use("/flexi", flexiRoutes);
router.use("/overground", overgroundRoutes);
router.use("/underground", undergroundRoutes);

router.use("/oysterCard", oysterCardRouter);
router.use("/dashboard", dashboardRoutes);
router.use("/station", evolviRoutes);
module.exports = router;
