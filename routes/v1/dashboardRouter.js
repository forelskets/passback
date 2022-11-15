const express = require('express')
const dashboardRouter = express.Router();
const dashboard = require('../../controllers/v1/dashboardController')
const { adminAuth } = require('../../middlewares/Auth')
const { asyncTryCatchMiddleware } = require('../../middlewares/async');
dashboardRouter.get("/", adminAuth, asyncTryCatchMiddleware(dashboard))
module.exports = dashboardRouter


