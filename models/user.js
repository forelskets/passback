const mongoose = require('mongoose');
autoIncrement = require('mongoose-auto-increment');
const Schema = mongoose.Schema;
const user = new Schema({
    userId: { type: Number, unique: true },
    image: { type: String, default: null },
    title: { type: String, required: true },
    firstName: { type: String, default: null },
    lastName: { type: String, default: null },
    fullName: { type: String, required: true },
    address: { type: String, required: true },
    postalCode: { type: String, required: true },
    city: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    password: { type: String, required: true },
    countryCode: { type: String, required: true, default: null },
    isEmailverified: { type: Boolean, required: true, default: false },
    otp: { type: String, required: true },
    phoneNumber: { type: String, required: true, default: null },
    countryCode: { type: String, required: true, default: null },
    isBlock: { type: Boolean, default: false, required: true },
    card: {
        brand: {
            type: String,
            default: null
        },
        name: {
            type: String,
            default: null
        },
        cardExpMonth: {
            type: Number,
            default: null
        },
        cardExpYear: {
            type: Number,
            default: null
        },
        stripeCustomerId: {
            type: String,
            default: null
        },
        cardNumber: {
            type: Number,
            default: null
        },
        cardType: {
            type: String,
            default: null
        }
    },
    billing: {
        firstName: {
            type: String,
            default: null
        },
        lastName: {
            type: String,
            default: null
        },
        // cardNumber: {
        //     type: Number,
        //     default: null
        // },
        phoneNumber: {
            type: Number,
            default: null
        },
        countryCode: {
            type: String,
            default: null
        },
        address: {
            type: String,
            default: null
        },
        fax: {
            type: String,
            default: null
        },
        email: {
            type: String,
            default: null
        }
    },
    deviceToken: { type: String },
    forgotToken: { type: String },
    transactionIdentifier: {
        type: String,
        default: null
    }
}, { timestamps: true });
autoIncrement.initialize(mongoose.connection);
user.plugin(autoIncrement.plugin, {
    model: 'user',
    field: 'userId',
    startAt: 1,
    incrementBy: 1
});
module.exports = mongoose.model('user', user)