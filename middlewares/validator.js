const { body } = require('express-validator')
const validatonRulesregister = [
    body('email').notEmpty().withMessage('Please enter email').isEmail().withMessage('Invalid email'),
    body('password').exists().withMessage('Please enter password').isLength({ min: 6 })
        .withMessage("Password length must be minimun 6 digits in length"),
    body('phoneNumber').notEmpty().withMessage('Please enter phoneNumber'),
    body('title').notEmpty().withMessage("Please enter title"),
    body('firstName').notEmpty().withMessage("Please enter firstName"),
    body('lastName').notEmpty().withMessage("Please enter lastName"),
    body('address').notEmpty().withMessage("Please enter address"),
    body('city').notEmpty().withMessage("Please enter city"),
    body('postalCode').notEmpty().withMessage("Please enter postalCode"),
    body('countryCode').notEmpty().withMessage("Please enter countryCode")

]

const validationRuleslogin = [
    body('email').notEmpty().withMessage('Please enter email'),
    body('password').notEmpty().withMessage("Please enter Password")
]
const validationRulesforgot = [
    body('email').notEmpty().withMessage('Please enter email')
]
const validationRulesChange = [
    body('newPassword').notEmpty().withMessage('Please enter newpassword').isLength({ min: 6 }).withMessage("Password length must be minimun 6 digits in length")
]
const validationRulesReset = [
    body('password').notEmpty().withMessage('Please enter password').isLength({ min: 6 }).withMessage("Password length must be minimun 6 digits in length")
]

module.exports = {
    validationRuleslogin, validationRulesforgot,
    validationRulesChange, validationRulesReset, validatonRulesregister
}