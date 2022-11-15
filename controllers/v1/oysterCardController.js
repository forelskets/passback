const OysterCard = require("../../models/oysterCard");
const booking = require("../../models/booking");
const { HTTP_STATUS } = require("http-status-code");
const messages = require("../../helpers/appConstants");
const { paymentStripe } = require("../../helpers/stripe");
const {
  compare,
  hash,
  verifyJwt,
  paginationData,
  escapeSpecialCharacter,
  isNotNullAndUndefined,
  createSuccessResponse,
  createErrorResponse,
  generateToken,
  randomAlphaNumericCode,
  transformTripName,
} = require("../../helpers/utils");

exports.oysterCardAddRow = async (req, res, next) => {
  const create = await OysterCard(req.body).save();
  await create.save();
  return res.status(200).json({
    status: "1",
    msg: "Data stored successfully",
  });
};

exports.oysterCardGetAllRow = async (req, res, next) => {
  const getAll = await OysterCard.find();
  console.log(getAll, "getAll");
  if (getAll.length > 0) {
    return res.status(200).json({
      result: getAll,
      status: 1,
    });
  } else {
    return res.status(401).json({
      msg: "no data found",
      status: 0,
    });
  }
};

exports.oysterCardRowUpdate = async (req, res, next) => {
  console.log("oysterCardRowUpdate");

  const update = await OysterCard.findById(req.body._id);
  console.log(update, "update");
  update.zones = req.body.zones;
  update.oneDayAnyTime = req.body.oneDayAnyTime;
  update.oneDayOffPeak = req.body.oneDayOffPeak;
  update.sevenday = req.body.sevenday;
  update.monthly = req.body.monthly;
  update.annual = req.body.annual;
  update.percent = req.body.percent;
  const updateValueSaved = await update.save();
  console.log(updateValueSaved, "updateRow");
  res.status(200).json({
    status: 1,
    ms: "Dada__update__successfully",
  });
};

exports.oysterCardRowDelete = async (req, res, next) => {
  console.log("oysterCardRowDelete");

  const update = await OysterCard.findByIdAndDelete(req.body.id);
  console.log(update, "updateRow");
  res.status(200).json({
    status: 1,
    ms: "Dada__update__successfully",
  });
};

exports.oysterCardBooking = async (req, res) => {
  const userDetails = req.token;
  console.log("underbooking", req.body);
  let keys = ["source", "duration"];
  let dataObject = Object.assign({});
  for (let i of keys) {
    if (!req.body[i])
      return res.status(400).json(createErrorResponse(`Please enter ${i}.`));
    else dataObject[i] = req.body[i];
  }
  dataObject["type"] = "underground";
  dataObject["ticketId"] = randomAlphaNumericCode();
  if (req.body.duration === "1 Day" || req.body.duration === "1 Day off-Peak") {
    dataObject["bookingType"] = "One Day Ticket";
  } else {
    dataObject["bookingType"] = "Long Ticket";
  }
  dataObject["passengerType"] = req.body.passengerType;
  dataObject["bookingDate"] = new Date();
  dataObject["user"] = req.token._id;
  paymentStripe(userDetails.card.stripeCustomerId, parseInt(req.body.price))
    .then(async (success) => {
      console.log("success", success);
      await booking(dataObject).save();
      return res
        .status(200)
        .json(createSuccessResponse(messages.paymentSuccessfully));
    })
    .catch((err) => {
      console.log("err", err);
      return res.status(400).json(createErrorResponse(err.raw.message));
    });
};

exports.bookingList = async function (req, res) {
  console.log(
    "bookingList...............",
    req.body.bookingStatus,
    req.body.status
  );
  let { offset, order, sort, search, limit, status, bookingStatus } = req.body;
  let SEARCH = escapeSpecialCharacter(search);
  let query = [];
  let searchObj = { $regex: new RegExp(".*" + SEARCH + ".*", "i") };
  let pagination = [];
  if (offset && limit) pagination = [{ $skip: offset }, { $limit: limit }];
  else pagination = [{ $skip: 0 }, { $limit: 10 }];

  query.push({
    $match: {
      user: req.token._id,
    },
  });

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
              email: 1,
              phoneNumber: 1,
              card: 1,
              billing: 1,
            },
          },
        ],
        as: "user",
      },
    },
    { $unwind: { path: "$user" } }
  );

  if (bookingStatus == "trainBookings") {
    if (status == "pastBookings") {
      query.push({
        $match: {
          type: "overground",
          bookingDate: { $lt: new Date(moment().startOf("d")) },
        },
      });
    }
    if (status == "futureBookings") {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      query.push({
        $match: {
          type: "overground",
          bookingDate: { $gte: new Date(moment().endOf("d")) },
        },
      });
    }
    if (status == "activeBookings") {
      const today = moment().format("YYYY-MM-DD");
      const date = today.toString();
      query.push({
        $match: {
          type: "overground",
          bookingDate: {
            $gte: new Date(moment().startOf("d")),
            $lte: new Date(moment().endOf("d")),
          },
        },
      });
    }
  } else if (bookingStatus == "tubeBookings") {
    console.log(bookingStatus);
    if (status == "One Day Ticket") {
      query.push({
        $match: {
          type: "underground",
          bookingType: "One Day Ticket",
        },
      });
    } else if (status == "Long Ticket") {
      query.push({
        $match: {
          type: "underground",
          bookingType: "Long Ticket",
        },
      });
    }
  }

  let sortQry = {};
  let sort_element;
  let userId = "user.";
  if (sort == "ticketId") {
    sort_element = sort;
  } else if (sort == "price") {
    sort_element = sort;
  } else if (sort == "source") {
    sort_element = sort;
  } else if (sort == "destination") {
    sort_element = sort;
  } else if (sort == "duration") {
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
      isCancel: 1,
      user: 1,
      price: 1,
      duration: 1,
      status: 1,
    },
  };
  query.push(project);
  if (isNotNullAndUndefined(SEARCH) && SEARCH !== "") {
    query.push({
      $match: {
        $or: [
          {
            "user.email": searchObj,
          },
          {
            "user.phone": searchObj,
          },
          {
            source: searchObj,
          },
          {
            destination: searchObj,
          },
          {
            ticketId: searchObj,
          },
          {
            price: searchObj,
          },
        ],
      },
    });
  }
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
  const bookingList = await booking.aggregate(query);
  let TotalCount =
    bookingList && bookingList[0] && bookingList[0].totalCount
      ? bookingList[0].totalCount.count
      : 0;

  console.log(bookingList[0].data);
  res.status(200).json({
    success: true,
    data: {
      bookingList:
        bookingList && bookingList[0] && bookingList[0].data
          ? bookingList[0].data
          : [],
      paginateData: paginationData(TotalCount, limit, offset),
    },
    message: messages.dataFetch,
  });
};
