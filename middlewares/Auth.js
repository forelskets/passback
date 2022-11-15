const jwt = require('jsonwebtoken')
const admin = require('../models/admin')
const messages = require('../helpers/appConstants')
const user = require('../models/user')
const { verifyJwt } = require('../helpers/utils')
const adminAuth = async function (req, res, next) {
    const bearer = req.headers.authorization
    if (!bearer) return res.status(401).json({ success: false, message: messages.authRequire })
    const checkBearer = bearer.startsWith("Bearer")
    if (!checkBearer) return res.status(401).json({ success: false, message: messages.wrongAuth })
    let token = bearer.replace("Bearer", '')
    const verifyToken = verifyJwt(token.trim())
    if (!verifyToken) return res.status(401).json({ success: false, message: messages.wrongJwt })
    const data = await admin.findOne({ _id: verifyToken.id })
    if (data) {
        if (verifyToken.password != data.password) return res.status(401).json({ success: false, message: messages.passResetLogin })
        else if (data.deviceToken != verifyToken.deviceToken) return res.status(401).json({ success: false, message: messages.deviceErr })
        else next();
    } else {
        res.status(401).json({ success: false, message: messages.adminNot })
    }
}
const userAuth = async function (req, res, next) {
    const bearer = req.headers['access-token']
    if (!bearer) return res.status(401).json({ success: false, message: messages.authRequire })
    const checkBearer = bearer.startsWith("Bearer")
    if (!checkBearer) return res.status(401).json({ success: false, message: messages.wrongAuth })
    let token = bearer.replace("Bearer", '')
    const verifyToken = verifyJwt(token.trim())
    if (!verifyToken) return res.status(401).json({ success: false, message: messages.wrongJwt })
    const data = await user.findOne({ _id: verifyToken.id })
    if (!data) return res.status(401).json({ success: false, message: messages.userNot })
    if(data.isBlock == true) return res.status(401).json({ success: false, message: messages.userBlock })
    req.token = data
    if (data.deviceToken != verifyToken.deviceToken) return res.status(401).json({ success: false, message: messages.deviceErr })
    let checkPassword = (verifyToken.password == data.password)
    if (data && checkPassword) {
        next();
    }
    else {
        res.status(401).json({ success: false, message: messages.userNot })
    }
}
module.exports = { adminAuth, userAuth }