const booking = require('../../models/booking')
const user = require('../../models/user')
const messages = require('../../helpers/appConstants')
const { paginationData, createErrorResponse, createSuccessResponse, randomAlphaNumericCode } = require('../../helpers/utils')
const mongoose = require('mongoose');
const keyConstants = require('../../helpers/keyConstants')
const axios = require('axios')
const { XMLParser } = require('fast-xml-parser');
const parser = new XMLParser();
var convert = require('xml-js');
const moment = require('moment');

const listOverground = async function (req, res) {
    let { offset, order, sort, search, limit, status } = req.body;
    let query = []
    let searchObj = { $regex: new RegExp(('.*' + search + '.*'), "i") }
    let pagination = []
    if (offset && limit) {
        pagination = [{ $skip: offset }, { $limit: limit }]

    }
    else pagination = [{ $skip: 0 }, { $limit: 10 }]
    query.push({
        $lookup: {
            from: "users",
            let: { "id": "$user" },
            "pipeline": [{
                $match: {
                    $expr: {
                        $eq: ['$_id', "$$id"]
                    }
                }
            }, {
                $project: {
                    firstName: 1,
                    lastName: 1,
                    fullName: 1
                }
            }],
            "as": "user"
        }
    },
        {
            $match: { 'type': "overground" }
        },
        { $unwind: { path: "$user" } }
    )
    if (status == "pastBooking") {
        query.push({
            $match: {
                'bookingDate': { $lt: new Date(moment.utc().subtract(330, 'minute')) }
            }
        })
    }
    else if (status == "upComings") {
        query.push({
            $match: {
                'bookingDate': { $gte: new Date(moment.utc().subtract(330, 'minute')) }
            }
        })
    }
    if (search) {
        query.push({
            $match: {
                $or: [
                    // {
                    //     'user.firstName': { $regex: new RegExp(('.*' + search + '.*'), "i") }
                    // },
                    {
                        'ticketId': searchObj
                    },
                    // {
                    //     'user.lastName': searchObj
                    // },
                    {
                        'user.fullName': searchObj
                    },
                    {
                        'source': searchObj
                    },
                    {
                        'destination': searchObj
                    }
                ]
            }
        })
    }
    let sortQry = {}
    let sort_element
    let userId = "user."
    if (sort == "ticketId") {
        sort_element = sort
    }
    else {
        sort_element = userId.concat(sort)
    }
    if (sort && order) {
        sortQry[sort_element] = order
        query.push({
            $sort: sortQry
        })
    }
    else {
        sortQry['createdAt'] = -1
        query.push({
            $sort: sortQry
        })
    }

    let project = {
        $project: {
            ticketId: 1, source: 1, destination: 1, bookingDate: 1, isCancel: 1, user: 1, createdAt: 1
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

    const overgroundList = await booking.aggregate(query)
    let TotalCount = overgroundList && overgroundList[0] && overgroundList[0].totalCount ? overgroundList[0].totalCount.count : 0

    res.status(200).json({
        success: true,
        data: {
            overgroundList: overgroundList && overgroundList[0] && overgroundList[0].data ? overgroundList[0].data : [],
            paginateData: paginationData(TotalCount, limit, offset)
        },
        message: messages.dataFetch
    })
}
const viewOverground = async function (req, res) {
    const checkId = mongoose.isValidObjectId(req.body.id)
    if (!checkId) return res.status(400).json({ success: false, message: messages.invalidId })
    const data = await booking.findOne({ _id: req.body.id, type: "overground" })
        .populate('user', 'email userId fullName card.cardNumber ', user)
        .select('price  paymentType leaveAftertime trainName trainNumber ticketId source isCancel isRefund destination trainNumber ticketCancelreason returnDetails childrenCount isRefund refundRejectreason adultCount bookingDate seatNumber bookingType')
    if (data) return res.status(200).json({ success: true, data, message: messages.dataFetch })
    else return res.status(400).json({ success: false, message: messages.noData })
}
const cancelBooking = async function (req, res) {
    const checkId = mongoose.isValidObjectId(req.body.bookingId)
    if (!checkId) return res.status(400).json({ success: false, message: messages.invalidId })
    const checkisCancel = await booking.findOne({ _id: req.body.bookingId, isCancel: "true" })
    if (checkisCancel) return res.status(400).json({ success: false, message: messages.ticketAlready })
    booking.findOneAndUpdate({ _id: req.body.bookingId }, {
        isCancel: true,
        isRefund: "Pending",
        ticketCancelreason: req.body.reason,
    }).then(
        res.status(200).json({ success: false, message: messages.ticketCancel })
    )
}
const accrejCancel = async function (req, res) {
    const checkId = mongoose.isValidObjectId(req.body.bookingId)
    if (!checkId) return res.status(400).json({ success: false, message: messages.invalidId })
    const checkaccepted = await booking.findOne({ _id: req.body.bookingId, isRefund: "Accepted", isCancel: true })
    if (checkaccepted) return res.status(400).json({ success: false, message: messages.ticketAcceptalr })
    const checkrejected = await booking.findOne({ _id: req.body.bookingId, isRefund: "Rejected", isCancel: true })
    if (checkrejected) return res.status(400).json({ success: false, message: messages.ticketRejectalr })
    if (req.body.status == "accept") {
        booking.findOneAndUpdate({ _id: req.body.bookingId }, {
            isRefund: "Accepted",
        }).then(
            res.status(200).json({ success: true, message: messages.ticketCancelaccept })
        )
    }
    else if (req.body.status == "reject") {
        booking.findOneAndUpdate({ _id: req.body.bookingId }, {
            refundRejectreason: req.body.refundRejectreason,
            isRefund: "Rejected"
        }).then(
            res.status(200).json({ success: true, message: messages.ticketCancelreject })
        )
    }
    else {
        res.status(200).json({ success: false, message: messages.statusNot })
    }
}

const searchOverground = async (req, res) => {
    return res.status(200).json(createSuccessResponse(messages.trainsFetchedSuccessfully, req.body))
}

const bookOvergroundTicket = async (req, res) => {
    let dataObject = Object.assign({})
    for (let i of keyConstants.overgroundBookingKeys) {
        if (!req.body[i]) return res.status(400).json(createErrorResponse(`Please enter ${i}.`))
        else dataObject[i] = req.body[i]
    }
    dataObject['type'] = 'overground'
    dataObject['user'] = req.token._id
    dataObject['ticketId'] = await randomAlphaNumericCode()
    if (dataObject.bookingType == 'One Day Ticket') {
        let ticketBooked = await booking(dataObject).save()
        if (ticketBooked) return res.status(200).json(createSuccessResponse(messages.ticketBookedSuccessfully))
        else return res.status(400).json(createErrorResponse(messages.ticketNotBooked))
    }
    else if (dataObject.bookingType == 'Round Trip') {
        if (!req.body.returnDetails) return res.status(400).json(createErrorResponse("Please enter return details."))
        else {
            let returnDetails = req.body.returnDetails
            for (let i of keyConstants.overgroundBookingReturnKeys) {
                if (!req.body.returnDetails[i]) return res.status(400).json(createErrorResponse(`Please enter ${i} in return details.`))
                else returnDetails[i] = req.body.returnDetails[i]
            }
            dataObject['returnDetails'] = returnDetails
            let ticketBooked = await booking(dataObject).save()
            if (ticketBooked) return res.status(200).json(createSuccessResponse(messages.ticketBookedSuccessfully))
            else return res.status(400).json(createErrorResponse(messages.ticketNotBooked))
        }
    }
    else return res.status(400).json(createErrorResponse(messages.invalidBookingType))
}

const bookingDetails = async (req, res) => {
    let keys = ['bookingId']
    for (let i of keys) {
        if (!req.body[i]) return res.status(400).json(createErrorResponse(`Please enter ${i}.`))
    }
    let bookingDetail = await (await booking.findOne({ _id: req.body['bookingId'] })).populate({
        path: "user",
        select: '_id userId image title firstName lastName fullName email countryCode phoneNumber address postalCode city'
    })
    if (bookingDetail) return res.status(200).json(createSuccessResponse(messages.bookingDetailsFetched, bookingDetail))
    else return res.status(400).json(createErrorResponse(messages.bookingDetailsNotFetched))
}

const cancelBookingForUser = async (req, res) => {
    let keys = ['bookingId', 'reason']
    for (let i of keys) {
        if (!req.body[i]) return res.status(400).json(createErrorResponse(`Please enter ${i}.`))
    }
    const checkId = mongoose.isValidObjectId(req.body.bookingId)
    if (checkId) {
        const boookingDetails = await booking.findOne({ _id: req.body['bookingId'] })
        if (boookingDetails) {
            if (boookingDetails.isCancel == true) return res.status(400).json(createErrorResponse(messages.bookingAlreadyCancelled))
            else {
                let cancelled = await booking.updateOne({ _id: boookingDetails._id }, {
                    isCancel: true,
                    ticketCancelreason: req.body['reason']
                })
                if (cancelled) return res.status(400).json(createSuccessResponse(messages.bookingCancelled))
                else return res.status(400).json(createErrorResponse(messages.bookingNotCancelled))
            }
        }
        else return res.status(400).json(createErrorResponse(messages.bookingNotFound))
    }
    else return res.status(400).json(createErrorResponse(messages.invalidId))
}

const searchTrain = async (req, res) => {
    let xml = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
    <soap:Header>
        <wsa:Action>http://www.opentravel.org/OTA/2003/05/otaRailAvail</wsa:Action>
        <wsa:MessageID>urn:uuid:dc72983d-8871-431a-97d5-8f386f984592</wsa:MessageID>
        <wsa:ReplyTo>
            <wsa:Address>http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous</wsa:Address>
        </wsa:ReplyTo>
        <wsa:To> https://thepassengerhub.evolviuat.com/evolvi.webapi/soapapi</wsa:To>
        <wsse:Security>
            <wsse:UsernameToken wsu:Id="SecurityToken-a60b73fb-8dba-457b-9ca0-954e32ebe1f4">
                <wsse:Username>Passenger</wsse:Username>
                <wsse:Password>PH47yrj$</wsse:Password>
            </wsse:UsernameToken>
        </wsse:Security>
    </soap:Header>
    <soap:Body>
        <OTA_RailAvailRQ xmlns="http://www.opentravel.org/OTA/2003/05" TimeStamp="2022-02-06T07:00:00.7939026Z" Target="Test" Version="2.8" TransactionIdentifier="cCy1Fh8CfUC251kwoxCswQ==" SequenceNmbr="1" ResponseType="Fares">
            <POS xmlns="http://www.opentravel.org/OTA/2003/05">
                <Source>
                    <RequestorID Type="22" ID="ioannis@thepassengerhub.com" MessagePassword="Iliana2010Meli!?" />
                    <BookingChannel>
                        <CompanyName xsi:type="CompanyNamePrefType" CompanyShortName="thepassengerhub" />
                    </BookingChannel>
                </Source>
            </POS>
            <RailAvailInfo TrainNumber="SingleJourney" Class="All" xmlns="http://www.opentravel.org/OTA/2003/05">
                <OriginDestinationInformation>
                    <DepartureDateTime>2022-02-11T07:00:00</DepartureDateTime>
                    <OriginLocation LocationCode="LAN" CodeContext="CRS" />
                    <DestinationLocation LocationCode="PAD" CodeContext="CRS" />
                </OriginDestinationInformation>
                <PassengerType Code="Adult" Quantity="1" />
                <ReturnDateTime xsi:type="OriginDestinationInformationType">
                    <DepartureDateTime>2022-02-10T16:00:00</DepartureDateTime>
                </ReturnDateTime>
            </RailAvailInfo>
        </OTA_RailAvailRQ>
    </soap:Body>
</soap:Envelope>`
    let config = {
        headers: { "Content-Type": "application/xml" }
    }
    let data = await axios.post('https://thepassengerhub.evolviuat.com/evolvi.webapi/soapapi', xml, config)
    if (data) {
        const opn = { compact: true, ignoreComment: true, spaces: 4 }
        let response = JSON.parse(convert.xml2json(data.data, opn))
        res.status(200).json(createSuccessResponse(messages.stationsFetchedSuccessfully, response.Envelope.Body.OTA_RailAvailRS.OriginDestinationOptions.OriginDestinationOption.Journeys.Journey))
    }
    else res.status(400).json(createErrorResponse(messages.stationListNotFetched))
}

module.exports = {
    listOverground,
    viewOverground,
    cancelBooking,
    accrejCancel,
    bookOvergroundTicket,
    searchOverground,
    bookingDetails,
    searchTrain,
    cancelBookingForUser
}