const admin = require('../../models/admin')
const user = require('../../models/user')
const messages = require('../../helpers/appConstants')
const { Email } = require('../../helpers/email')
const { paginationData, compare, hash, verifyJwt } = require('../../helpers/utils')
const jwt = require('jsonwebtoken')
const fs = require('fs')

const adminLogin = async function (req, res) {
    let User = await admin.findOne({ email: req.body.email })
    let deviceToken = Math.floor(Math.random() * 1E16)
    if (User) {
        await admin.findOneAndUpdate({ email: req.body.email }, { "deviceToken": deviceToken })
        let checkPassword = await compare(req.body.password, User.password);
        if (checkPassword) {
            let token = jwt.sign({
                id: User._id,
                password: User.password,
                deviceToken: deviceToken,
            }, process.env.JWT_SECRET, {
                expiresIn: "24h"
            });
            res.status(200).json({ success: true, message: messages.login, token })
        }
        else {
            res.status(400).json({ success: false, message: messages.wrongPassword })
        }
    }
    else {
        res.status(400).json({ success: false, message: messages.wrongEmail })
    }
}
const forgotPassword = async function (req, res) {
    let User = await admin.findOne({ email: req.body.email })
    if (!User) {
        return res.status(400).json({ success: false, message: messages.registerEmail })
    }
    let random = Math.floor(Math.random() * 1E16)
    let token = jwt.sign({
        id: User._id,
        password: User.password,
        time: Date.now(),
        forgotToken: random
    }, process.env.JWT_SECRET)
    let subject = "Reset Password Link"
    let text = token
    fs.readFile('html/forgotmail.html', 'utf-8', function (err, data) {
        if (err) {
            console.log(err)
        }
        var result = data.replace(/token/g, token)
        result = result.replace(/URL/g, process.env.CLIENT_URL)
        Email(req, res, subject, text, result)
        admin.findOneAndUpdate({ email: req.body.email }, {
            "forgotToken": random
        }).then(
            res.status(200).json({ success: true, message: messages.forgotLink })
        )
    });
}

const resetPassword = async function (req, res) {
    let newPassword = req.body.password
    let tokenDetails = await verifyJwt(req.body.token);
    let User = await admin.findOne({ _id: tokenDetails.id })
    if (!User) {
        return res.status(400).json({ success: false, message: messages.wrongEmail })
    }
    let timeDiff = (new Date() - tokenDetails.time) / 60000
    if (timeDiff > 10) return res.status(400).json({ success: false, message: messages.linkexpire })

    let forgotToken = tokenDetails.forgotToken
    if (User.forgotToken != forgotToken) return res.status(400).json({ success: false, message: messages.linkexpire })
    let checkPassword = await compare(newPassword, User.password);
    if (checkPassword) return res.status(400).json({ success: false, message: messages.passErr })
    hash(newPassword, parseInt(process.env.JWT_SALT)).then(function (hash) {
        admin.findOneAndUpdate({ _id: User.id }, {
            password: hash,
            "forgotToken": ""
        }).then(
            res.status(200).json({ success: true, message: messages.passReset })
        )
    });
}
const changePassword = async function (req, res) {
    const bearer = req.headers.authorization
    const token = bearer.slice(7)
    let id = jwt.verify(token, process.env.JWT_SECRET).id
    let data = await admin.findOne({ _id: id })
    let check = await compare(req.body.oldPassword, data.password)
    if (!check) {
        return res.status(400).json({ success: false, message: messages.passMatch })
    }
    if (req.body.oldPassword == req.body.newPassword) {
        return res.status(400).json({ success: false, message: messages.passErr })
    }
    hash(req.body.newPassword, parseInt(process.env.JWT_SALT)).then(function (hash) {
        admin.findOneAndUpdate({ _id: id }, {
            password: hash
        }).then(
            res.status(200).json({ success: true, message: messages.passChange })
        )
    });
}
const listUser = async function (req, res) {
    let { order, sort, search, limit, offset } = req.body;
    let totalCount
    let searchObj = { $regex: new RegExp(('.*' + search + '.*'), "i") }
    let query = []
    let pagination = []
    if (offset && limit) {
        pagination = [{ $skip: offset }, { $limit: limit }]

    }
    else pagination = [{ $skip: 0 }, { $limit: 10 }]
    if (search) {
        query.push({
            $match: {
                $or: [
                    // { firstName: { $regex: new RegExp(('.*' + search + '.*'), "i") } },
                    { title: searchObj },
                    // { lastName: { $regex: new RegExp(('.*' + searchObj + '.*'), "i") } },
                    { email: searchObj },
                    { fullName: searchObj },
                    { city: searchObj },
                    { phoneNumber: searchObj },
                ]
            }
        })
    }
    else {
        totalCount = await user.find({}).count()
    }
    let sortQry = {}
    let sort_element = sort
    if (sort && order) {
        sortQry[sort_element] = order
        query.push({
            $sort: sortQry
        })
    }

    let project = {
        $project: {
            firstName: 1,
            lastName: 1,
            title: 1,
            email: 1,
            city: 1,
            phoneNumber: 1,
            userId: 1,
            name: 1,
            isBlock: 1,
            address: 1,
            fullName: 1,
            createdAt: 1,
            updatedAt: 1,
            postalCode: 1,
            billing: 1
        }
    }
    query.push(project)
    query.push({

        "$facet": {
            data: pagination,
            totalCount: [
                {
                    $count: 'count'
                }
            ]
        }
    },
        {
            $unwind: {
                path: "$totalCount",
                preserveNullAndEmptyArrays: true
            }
        })

    const users = await user.aggregate(query)
    let TotalCount = users && users[0] && users[0].totalCount ? users[0].totalCount.count : 0
    res.status(200).json({
        success: true,
        data: {
            users: users && users[0] && users[0].data ? users[0].data : [],
            paginateData: paginationData(TotalCount, limit, offset)
        },
        message: messages.userFetched
    })
}

const editUser = async function (req, res) {
    if (req.body.phoneNumber) {
        let userCheck = await user.findOne({ _id: { $ne: req.body.id }, phoneNumber: req.body.phoneNumber });
        if (userCheck) return res.status(400).json({ success: false, message: messages.phoneExists })
    }
    user.findOne({ _id: req.body.id }).then(result => {
        if (result) {
            user.findOneAndUpdate({ _id: req.body.id }, req.body).then(
                res.status(200).json({ success: true, message: messages.userUpdate })
            )
        }
        else {
            res.status(400).json({ success: false, message: messages.noUser })
        }
    })
        .catch(
            error => res.status(400).json({ success: false, message: messages.noUser })
        );

}
const blockUser = async function (req, res) {
    user.findOne({ _id: req.body.id }).then(result => {
        if (result) {
            if (result.isBlock == false) {
                user.findOneAndUpdate({ _id: req.body.id }, { "isBlock": "true" }).then(
                    res.status(200).json({ success: true, message: messages.userBlocked })
                )
            }
            if (result.isBlock == true) {
                user.findOneAndUpdate({ _id: req.body.id }, { "isBlock": "false" }).then(
                    res.status(200).json({ success: true, message: messages.userunBlocked })
                )
            }
        }
        else {
            res.status(400).json({ success: false, message: messages.noUser })
        }
    })
        .catch(
            error => res.status(400).json({ success: false, message: messages.noUser })
        );

}
const viewUser = async function (req, res) {
    user.findOne({ _id: req.body.id }).select('title firstName lastName  fullName  userId createdAt email  address phoneNumber postalCode city createdAt card.cardNumber'
    ).then(result => {
        if (result) {
            res.status(200).json({ success: true, data: result, message: messages.userFetched })
        }
        else {
            res.status(400).json({ success: false, message: messages.noUser })
        }
    })
        .catch(
            error => res.status(400).json({ success: false, message: messages.noUser })
        );
}
const forgotLinkvalid = async function (req, res) {
    let id = jwt.verify(req.body.token, process.env.JWT_SECRET).id;
    let User = await admin.findOne({ _id: id })
    let time = jwt.verify(req.body.token, process.env.JWT_SECRET).time;
    let timeDiff = (new Date() - time) / 60000
    if (timeDiff > 10) return res.status(400).json({ success: false, message: messages.linkexpire, data: { reset: false } })
    let forgotToken = jwt.verify(req.body.token, process.env.JWT_SECRET).forgotToken
    if (User && User.forgotToken != forgotToken) return res.status(400).json({ success: false, message: messages.linkexpire, data: { reset: false } })
    res.status(200).json({ success: true, message: messages.linkValid, data: { reset: true } })

}

module.exports = {
    adminLogin,
    forgotPassword,
    resetPassword,
    changePassword,
    listUser,
    editUser,
    blockUser,
    viewUser,
    forgotLinkvalid
}