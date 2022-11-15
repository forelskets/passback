const express = require('express')
const evolviRouter = express.Router();
const { StationSearch, bookingSearch, bookingDetail } = require('../../controllers/v1/evolviController')
const { userAuth } = require('../../middlewares/Auth')
const { asyncTryCatchMiddleware } = require('../../middlewares/async')

evolviRouter.post("/searchStation", asyncTryCatchMiddleware(StationSearch))

evolviRouter.post("/bookingSearch", userAuth, asyncTryCatchMiddleware(bookingSearch))

evolviRouter.post("/bookingDetail", userAuth, asyncTryCatchMiddleware(bookingDetail))

module.exports = evolviRouter