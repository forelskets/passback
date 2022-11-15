const express = require('express')
const undergroundRouter = express.Router();
const { listUnderground, viewUnderground, courierDetails, changeStatus, stopPointsList, underGroundBooking,markAsPaid } = require('../../controllers/v1/undergroundController');
//middleware
const { adminAuth, userAuth } = require('../../middlewares/Auth')
const { asyncTryCatchMiddleware } = require('../../middlewares/async');
undergroundRouter.post("/list", adminAuth, asyncTryCatchMiddleware(listUnderground))
undergroundRouter.post("/view", adminAuth, asyncTryCatchMiddleware(viewUnderground))
undergroundRouter.post("/courierDetails", adminAuth, asyncTryCatchMiddleware(courierDetails))
undergroundRouter.post("/changeStatus", adminAuth, asyncTryCatchMiddleware(changeStatus))
undergroundRouter.get("/stopPoints", asyncTryCatchMiddleware(stopPointsList))
undergroundRouter.post("/booking", userAuth, asyncTryCatchMiddleware(underGroundBooking))
undergroundRouter.get("/markAsPaid/:id", adminAuth, asyncTryCatchMiddleware(markAsPaid))

module.exports = undergroundRouter
