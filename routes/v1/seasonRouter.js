const express = require("express");
const seasonRouter = express.Router();
const {
  listSeasonticket,
  editSeasonticket,
  viewSeasonticket,
  accrejSeasonticket,
  addSeasonTicket,
  cancelSeasonTicket,
  seasonDetail,
  seasonPayment,
} = require("../../controllers/v1/seasonController");
//middleware
const { adminAuth, userAuth } = require("../../middlewares/Auth");
const { asyncTryCatchMiddleware } = require("../../middlewares/async");
seasonRouter.post(
  "/list",
  adminAuth,
  asyncTryCatchMiddleware(listSeasonticket)
);
seasonRouter.post(
  "/edit",
  adminAuth,
  asyncTryCatchMiddleware(editSeasonticket)
);
seasonRouter.post(
  "/view",
  adminAuth,
  asyncTryCatchMiddleware(viewSeasonticket)
);
seasonRouter.post(
  "/status",
  adminAuth,
  asyncTryCatchMiddleware(accrejSeasonticket)
);
seasonRouter.post("/detail", userAuth, asyncTryCatchMiddleware(seasonDetail));
seasonRouter.post("/add", userAuth, asyncTryCatchMiddleware(addSeasonTicket));
seasonRouter.post(
  "/cancel",
  userAuth,
  asyncTryCatchMiddleware(cancelSeasonTicket)
);
seasonRouter.post("/payment", userAuth, asyncTryCatchMiddleware(seasonPayment));
module.exports = seasonRouter;
