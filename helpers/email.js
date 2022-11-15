const nodemailer = require("nodemailer");
const Email = async function (req, res, subject, text, html) {
    let mailTransporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        },
    });
    let mailDetails = {
        from: `PassengerHub<${process.env.EMAIL_USER}>`,
        to: req.body.email,
        subject: subject,
        text: text,
        html: html
    };

    mailTransporter.sendMail(mailDetails, function (err, data) {
        if (err) {
            console.log('Error Occurs');
        } else {
            console.log('Email sent successfully');
        }
    });
}
const adminEmail = async function (req, res, subject, text, html) {
    let mailTransporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        },
    });
    let mailDetails = {
        from: process.env.EMAIL_USER,
        to: "amq@yopmail.com",
        subject: subject,
        text: text,
        html: html
    };
    mailTransporter.sendMail(mailDetails, function (err, data) {
        if (err) {
            console.log('Error Occurs');
        } else {
            console.log('Email sent successfully');
        }
    });
}

module.exports = {
    Email,
    adminEmail
}