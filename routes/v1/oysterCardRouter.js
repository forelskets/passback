const express = require("express");
const oysterCardRouter = express.Router();
const {
  oysterCardAddRow,
  oysterCardGetAllRow,
  oysterCardRowUpdate,
  oysterCardRowDelete,
  bookingList,
  oysterCardBooking,
} = require("../../controllers/v1/oysterCardController");
const { userAuth } = require("../../middlewares/Auth");
const { asyncTryCatchMiddleware } = require("../../middlewares/async");

oysterCardRouter.post("/addRow", asyncTryCatchMiddleware(oysterCardAddRow));
oysterCardRouter.get("/allRow", asyncTryCatchMiddleware(oysterCardGetAllRow));
oysterCardRouter.post(
  "/rowUpdate",
  asyncTryCatchMiddleware(oysterCardRowUpdate)
);
oysterCardRouter.post(
  "/rowDelete",
  asyncTryCatchMiddleware(oysterCardRowDelete)
);
oysterCardRouter.post(
  "/booking",
  userAuth,
  asyncTryCatchMiddleware(oysterCardBooking)
);
oysterCardRouter.post(
  "/bookingList",
  userAuth,
  asyncTryCatchMiddleware(bookingList)
);

module.exports = oysterCardRouter;
