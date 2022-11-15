const fs = require('fs')
const { validationResult } = require('express-validator')
function asyncTryCatchMiddleware(handler) {
    return async (req, res, next) => {
        const OBJECT = Object.assign({});
        OBJECT.BODY = req.body;
        OBJECT.METHOD = req.method;
        OBJECT.PATH = req.originalUrl;
        OBJECT.PARAMS = req.params;
        OBJECT.QUERY = req.query;
        OBJECT.HEADERS = req.headers;
        OBJECT.DATE = new Date();
        const LINE = '----------------------------------------'
        fs.appendFileSync('requestLogs.txt', `${JSON.stringify(OBJECT)}\n${LINE}\n\n`);
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            const error = []
            errors.array().map(err => error.push(err.msg))
            return res.status(400).json({ success: false, messsage: error[0] })
        }
        try { await handler(req, res) }
        catch (err) {
            console.error("caught inside error")
            next(err)
        }
    }
}
module.exports = { asyncTryCatchMiddleware }