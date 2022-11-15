const express = require('express')
const adminRouter = express.Router();
const { adminLogin, forgotPassword, resetPassword,
    changePassword, listUser, editUser, blockUser, viewUser, forgotLinkvalid } = require('../../controllers/v1/adminController');
//middlewares
const { asyncTryCatchMiddleware } = require('../../middlewares/async');
const { adminAuth } = require('../../middlewares/Auth')
const { validationRuleslogin, validationRulesChange,
    validationRulesReset, validationRulesforgot } = require('../../middlewares/validator')

adminRouter.post("/login", validationRuleslogin, asyncTryCatchMiddleware(adminLogin))
adminRouter.post("/forgotPassword", validationRulesforgot, asyncTryCatchMiddleware(forgotPassword))
adminRouter.post("/resetPassword", validationRulesReset, asyncTryCatchMiddleware(resetPassword))
adminRouter.post("/changePassword", adminAuth, validationRulesChange, asyncTryCatchMiddleware(changePassword))
adminRouter.post("/listUser", adminAuth, asyncTryCatchMiddleware(listUser))
adminRouter.post("/editUser", adminAuth, asyncTryCatchMiddleware(editUser))
adminRouter.post("/blockUser", adminAuth, asyncTryCatchMiddleware(blockUser))
adminRouter.post("/viewUser", adminAuth, asyncTryCatchMiddleware(viewUser))
adminRouter.post("/forgotLinkvalid", asyncTryCatchMiddleware(forgotLinkvalid))
module.exports = adminRouter