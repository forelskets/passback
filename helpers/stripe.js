const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createErrorResponse } = require('../helpers/utils')
const currency = process.env.CURRENCY;

module.exports.savingUserCard = async (req, res, token, email) => {
    try {
        const customer = await stripe.customers.create({
            source: token,
            email
        })
        return customer;
    } catch (err) {
        console.log("error ::::::  ", err.raw.message)
        return res.status(400).json(createErrorResponse(err.raw.message))
    }
}

module.exports.paymentStripe = async (customerId, amount) => {
    return stripe.charges.create({
        amount: amount * 100,
        currency,
        customer: customerId,
    });
}