const express = require("express");
const flexiRouter = express.Router();
const {
  listFlexiticket,
  editFlexiticket,
  viewFlexiticket,
  accrejFlexiticket,
  addFlexiSeason,
  flexiDetail,
  flexiPayment,
} = require("../../controllers/v1/flexiController");
//middleware
const { adminAuth, userAuth } = require("../../middlewares/Auth");
const { asyncTryCatchMiddleware } = require("../../middlewares/async");
flexiRouter.post("/list", adminAuth, asyncTryCatchMiddleware(listFlexiticket));
flexiRouter.post("/edit", adminAuth, asyncTryCatchMiddleware(editFlexiticket));
flexiRouter.post("/view", adminAuth, asyncTryCatchMiddleware(viewFlexiticket));
flexiRouter.post(
  "/status",
  adminAuth,
  asyncTryCatchMiddleware(accrejFlexiticket)
);
flexiRouter.post("/detail", userAuth, asyncTryCatchMiddleware(flexiDetail));
flexiRouter.post("/add", userAuth, asyncTryCatchMiddleware(addFlexiSeason));
flexiRouter.post("/payment", userAuth, asyncTryCatchMiddleware(flexiPayment));
module.exports = flexiRouter;
