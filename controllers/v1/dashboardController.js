const user = require('../../models/user')
const booking = require('../../models/booking')
const seasonTicket = require('../../models/seasonTicket')
const messages = require('../../helpers/appConstants')
const dashboard = async function (req, res) {
    const totalUsers = await user.find({}).count()
    const totalseasonTicket = await seasonTicket.find({}).count()
    const totalOverground = await booking.find({ type: "overground" }).count()
    const totalUnderground = await booking.find({ type: "underground" }).count()
    const data = {
        totalUsers: totalUsers,
        totalSeasonticket: totalseasonTicket,
        totalOverground: totalOverground,
        totalUnderground: totalUnderground
    }
    res.status(200).json({ success: true, data, message: messages.dashFetch })

}
module.exports = dashboard