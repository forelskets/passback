const express = require('express')
const overgroundRouter = express.Router();
const { listOverground, viewOverground, cancelBooking, accrejCancel, bookOvergroundTicket, searchOverground, bookingDetails, searchTrain, cancelBookingForUser } = require('../../controllers/v1/overgroundController');
//middleware
const { adminAuth, userAuth } = require('../../middlewares/Auth')
const { asyncTryCatchMiddleware } = require('../../middlewares/async');
overgroundRouter.post("/list", adminAuth, asyncTryCatchMiddleware(listOverground))
overgroundRouter.post("/view", adminAuth, asyncTryCatchMiddleware(viewOverground))
overgroundRouter.post("/cancelBooking", asyncTryCatchMiddleware(cancelBooking))
overgroundRouter.post("/status", adminAuth, asyncTryCatchMiddleware(accrejCancel))
overgroundRouter.post("/booking", userAuth, asyncTryCatchMiddleware(bookOvergroundTicket))
overgroundRouter.post("/search", userAuth, asyncTryCatchMiddleware(searchOverground))
overgroundRouter.post("/bookingDetails", userAuth, asyncTryCatchMiddleware(bookingDetails))
overgroundRouter.post("/searchTrain", asyncTryCatchMiddleware(searchTrain))
overgroundRouter.post("/cancelBooking", userAuth, asyncTryCatchMiddleware(cancelBookingForUser))

module.exports = overgroundRouter
