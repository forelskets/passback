const booking = require("../../models/booking");
const user = require("../../models/user");
const messages = require("../../helpers/appConstants");
const {
  paginationData,
  createSuccessResponse,
  createErrorResponse,
  randomAlphaNumericCode,
} = require("../../helpers/utils");
const mongoose = require("mongoose");
const axios = require("axios");

const listUnderground = async function (req, res) {
  let { offset, order, sort, search, limit, status } = req.body;
  let query = [];
  let searchObj = { $regex: new RegExp(".*" + search + ".*", "i") };
  let pagination = [];
  if (offset && limit) {
    pagination = [{ $skip: offset }, { $limit: limit }];
  } else pagination = [{ $skip: 0 }, { $limit: 10 }];

  query.push(
    {
      $lookup: {
        from: "users",
        let: { id: "$user" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$_id", "$$id"],
              },
            },
          },
          {
            $project: {
              firstName: 1,
              lastName: 1,
              fullName: 1,
              userId: { $toString: "$userId" },
            },
          },
        ],
        as: "user",
      },
    },
    { $unwind: { path: "$user" } },
    { $match: { type: "underground" } }
  );
  if (status) {
    query.push({ $match: { bookingType: status } });
  }
  if (search) {
    query.push({
      $match: {
        $or: [
          // {
          //     'user.firstName': { $regex: new RegExp(('.*' + search + '.*'), "i") }
          // },
          // {
          //     'user.email': { $regex: new RegExp(('.*' + search + '.*'), "i") }
          // },
          {
            source: searchObj,
          },
          {
            destination: searchObj,
          },
          {
            "user.fullName": searchObj,
          },
          {
            "user.userId": searchObj,
          },
          {
            ticketId: searchObj,
          },
          {
            status: searchObj,
          },
        ],
      },
    });
  }

  let sortQry = {};
  let sort_element;
  let userId = "user.";
  if (sort == "ticketId") {
    sort_element = sort;
  } else {
    sort_element = userId.concat(sort);
  }
  if (sort && order) {
    sortQry[sort_element] = order;
    query.push({
      $sort: sortQry,
    });
  } else {
    sortQry["createdAt"] = -1;
    query.push({
      $sort: sortQry,
    });
  }
  let project = {
    $project: {
      ticketId: 1,
      source: 1,
      destination: 1,
      bookingDate: 1,
      user: 1,
      status: 1,
      idsss: 1,
      isPaid: 1,
    },
  };
  query.push(project);
  query.push(
    {
      $facet: {
        data: pagination,
        totalCount: [
          {
            $count: "count",
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$totalCount",
        preserveNullAndEmptyArrays: true,
      },
    }
  );
  const undergroundList = await booking.aggregate(query);
  let TotalCount =
    undergroundList && undergroundList[0] && undergroundList[0].totalCount
      ? undergroundList[0].totalCount.count
      : 0;
  return res.status(200).json({
    success: true,
    data: {
      undergroundList:
        undergroundList && undergroundList[0] && undergroundList[0].data
          ? undergroundList[0].data
          : [],
      paginateData: paginationData(TotalCount, limit, offset),
    },
    message: messages.dataFetch,
  });
};
const viewUnderground = async function (req, res) {
  const checkId = mongoose.isValidObjectId(req.body.id);
  if (!checkId)
    return res
      .status(400)
      .json({ success: false, message: messages.invalidId });

  const data = await booking
    .findOne({ _id: req.body.id, type: "underground" })
    .populate(
      "user",
      "userId  email fullName phoneNumber address postalCode city ",
      user
    )
    .select(
      "price source status courierDetails  duration  bookingDate passengerType duration destination ticketId  status isPaid"
    );
  if (data)
    return res
      .status(200)
      .json({ success: true, data, message: messages.dataFetch });
  else
    return res.status(400).json({ success: false, message: messages.noData });
};
const courierDetails = async function (req, res) {
  const checkId = mongoose.isValidObjectId(req.body.bookingId);
  if (!checkId)
    return res
      .status(400)
      .json({ success: false, message: messages.invalidId });
  let bookingDetails = await booking.findOne({ _id: req.body.bookingId });
  if (bookingDetails) {
    if (bookingDetails.status == "Delivered") {
      return res
        .status(400)
        .json({ success: false, message: messages.alreadyDelivered });
    } else {
      const obj = {
        courierCompanyname: req.body.courierCompanyname,
        trackingId: req.body.trackingId,
        trackingUrl: req.body.trackingUrl,
        status: "Under Deliver",
      };

      booking
        .findOneAndUpdate(
          { _id: req.body.bookingId, BookingType: "Long Ticket" },
          {
            courierDetails: obj,
          }
        )
        .then(
          res
            .status(200)
            .json({ success: false, message: messages.courierDetails })
        );
    }
  } else
    return res
      .status(400)
      .json({ success: false, message: messages.invalidId });
};

const changeStatus = async function (req, res) {
  const checkId = mongoose.isValidObjectId(req.body.bookingId);
  if (!checkId)
    return res
      .status(400)
      .json({ success: false, message: messages.invalidId });
  let bookingDetails = await booking.findOne({ _id: req.body.bookingId });
  if (bookingDetails) {
    if (bookingDetails.status == "Delivered") {
      return res
        .status(400)
        .json({ success: false, message: messages.alreadyDelivered });
    } else {
      booking
        .findOneAndUpdate(
          { _id: req.body.bookingId },
          {
            status: "Delivered",
          }
        )
        .then(
          res
            .status(200)
            .json({ success: false, message: messages.statusChange })
        );
    }
  } else
    return res
      .status(400)
      .json({ success: false, message: messages.invalidId });
};

const stopPointsList = async (req, res) => {
  let search = "";

  if (req.query.search && req.query.serch != "") {
    search = req.query.search;
    let data = await axios.get(
      `https://api.tfl.gov.uk/Stoppoint/Search/${search}?modes=tube`
    );
    if (data)
      return res.status(200).json(
        createSuccessResponse(messages.stopPointFetched, {
          list: data.data.matches,
          totalCount: data.data.total,
        })
      );
    else
      return res
        .status(400)
        .json(createErrorResponse(messages.stopPointNotFetched));
  } else
    return res.status(200).json(
      createSuccessResponse(messages.stopPointFetched, {
        list: [],
        totalCount: 0,
      })
    );
};

const underGroundBooking = async (req, res) => {
  let keys = ["source", "destination", "duration"];
  let dataObject = Object.assign({});
  for (let i of keys) {
    if (!req.body[i])
      return res.status(400).json(createErrorResponse(`Please enter ${i}.`));
    else dataObject[i] = req.body[i];
  }
  dataObject["type"] = "underground";
  dataObject["ticketId"] = randomAlphaNumericCode();
  dataObject["bookingType"] = "Long Ticket";
  dataObject["passengerType"] = req.body.passengerType;
  dataObject["bookingDate"] = new Date();
  dataObject["user"] = req.token._id;

  let booked = await booking(dataObject).save();
  if (booked)
    return res
      .status(200)
      .json(createSuccessResponse(messages.ticketBookedSuccessfully));
  else
    return res.status(400).json(createErrorResponse(messages.ticketNotBooked));
};

const markAsPaid = async (req, res) => {
  let bookingDetail = await booking.findOne({ _id: req.params.id });
  if (bookingDetail) {
    if (bookingDetail.isPaid == false) {
      let updated = await booking.updateOne(
        { _id: bookingDetail._id },
        { isPaid: true }
      );

      if (updated)
        return res
          .status(200)
          .json(createSuccessResponse(messages.markedAsPaid));
      else
        return res
          .status(400)
          .json(createErrorResponse(messages.notMarkedAsPaid));
    } else
      return res
        .status(400)
        .json(createErrorResponse(messages.alreadyMarkedAsPaid));
  } else return res.status(400).json(createErrorResponse(messages.invalidId));
};

module.exports = {
  listUnderground,
  viewUnderground,
  courierDetails,
  changeStatus,
  stopPointsList,
  underGroundBooking,
  markAsPaid,
};
