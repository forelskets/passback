const express = require('express')
const userRouter = express.Router();
const { userRegister, userLogin, forgotPassword,
    resetPassword, changePassword, viewProfile, editProfile,
    verifyEmail, verifyOtp, contact, billingDetails, forgotLinkvalid, bookingList, saveCreditCard, removeCardDetails,trainBook } = require('../../controllers/v1/userController')
//middleware//
const { userAuth } = require('../../middlewares/Auth')
const { profile } = require('../../middlewares/multer')
const { asyncTryCatchMiddleware } = require('../../middlewares/async');
const { validationRuleslogin, validationRulesChange,
    validationRulesReset, validationRulesforgot, validatonRulesregister } = require('../../middlewares/validator')

userRouter.post('/register', profile, validatonRulesregister, asyncTryCatchMiddleware(userRegister))
userRouter.post('/login', validationRuleslogin, asyncTryCatchMiddleware(userLogin))
userRouter.post('/forgotPassword', validationRulesforgot, asyncTryCatchMiddleware(forgotPassword))
userRouter.post('/resetPassword', validationRulesReset, asyncTryCatchMiddleware(resetPassword))
userRouter.post('/changePassword', validationRulesChange, userAuth, asyncTryCatchMiddleware(changePassword))
userRouter.post('/viewProfile', userAuth, asyncTryCatchMiddleware(viewProfile))
userRouter.post('/editProfile', userAuth, profile, asyncTryCatchMiddleware(editProfile))
userRouter.get('/verifyEmail', asyncTryCatchMiddleware(verifyEmail))
userRouter.post('/verifyOtp', asyncTryCatchMiddleware(verifyOtp))
userRouter.post('/contact', asyncTryCatchMiddleware(contact))
userRouter.post('/billingDetails', userAuth, asyncTryCatchMiddleware(billingDetails))
userRouter.post('/link', asyncTryCatchMiddleware(forgotLinkvalid))
userRouter.post('/bookingList', userAuth, asyncTryCatchMiddleware(bookingList))
userRouter.post('/saveCard', userAuth, asyncTryCatchMiddleware(saveCreditCard))
userRouter.get('/removeCardDetails', userAuth, asyncTryCatchMiddleware(removeCardDetails))
userRouter.post('/trainBook',userAuth,asyncTryCatchMiddleware(trainBook))
module.exports = userRouter