const user = require("../../models/user");
const axios = require("axios");
var xml2js = require("xml2js");
const parsers = new xml2js.Parser({ explicitArray: false });
const booking = require("../../models/booking");
const messages = require("../../helpers/appConstants");
const jwt = require("jsonwebtoken");
const { Email, adminEmail } = require("../../helpers/email");
const { savingUserCard, paymentStripe } = require("../../helpers/stripe");
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
const fs = require("fs");
const { seatReservation } = require("../../controllers/v1/evolviController");
const moment = require("moment");

const userRegister = async function (req, res) {
  const email = await user.findOne({ email: req.body.email });
  if (email && email.isEmailverified == true)
    return res
      .status(400)
      .json({ success: false, message: messages.emailExists });
  if (email && email.isEmailverified == false)
    await user.findOneAndDelete({ email: req.body.email });

  const phone = await user.findOne({ phoneNumber: req.body.phoneNumber });
  if (phone)
    return res
      .status(400)
      .json({ success: false, message: messages.phoneExists });
  let hashVal = await hash(req.body.password, parseInt(process.env.JWT_SALT));
  req.body.password = hashVal;
  req.body["fullName"] = `${req.body.firstName} ${req.body.lastName}`;
  const addUser = new user(req.body);
  if (req.file && req.file.path) {
    addUser.image = req.file.path;
  }
  if (req.body.card) {
    addUser.card = {
      name: req.body.card.name,
      cardExpMonth: req.body.card.expMonth,
      cardExpYear: req.body.card.expYear,
      cardNumber: req.body.card.number,
    };
  }
  addUser.otp = Math.floor(100000 + Math.random() * 900000);
  addUser.save().then(async (result) => {
    let subject = "Verify email address";
    let text = "Verify email address";
    let tokenDetails = await generateToken({ userId: result._id });
    fs.readFile("html/verifyemail.html", "utf-8", function (err, data) {
      let responseData = data.replace("tokenDetails", `${tokenDetails}`);
      responseData = responseData.replace("SERVER_URL", process.env.SERVER_URL);
      responseData = responseData.replace(/Users/g, req.body.fullName);
      Email(req, res, subject, text, responseData);
      return res
        .status(200)
        .json({ success: true, message: messages.userRegister });
    });
  });
};
const userLogin = async function (req, res) {
  let User = await user.findOne({ email: req.body.email });
  if (User) {
    if (User.isBlock)
      return res
        .status(401)
        .json({ success: false, message: messages.userBlock });
    if (User.isEmailverified == false)
      return res
        .status(400)
        .json({ success: false, message: messages.emailNotverify });
    let deviceToken = Math.floor(Math.random() * 1e16);
    await user.findOneAndUpdate(
      { email: req.body.email },
      { deviceToken: deviceToken }
    );
    let checkPassword = await compare(req.body.password, User.password);
    if (checkPassword) {
      let token = jwt.sign(
        {
          id: User._id,
          password: User.password,
          deviceToken: deviceToken,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "24h",
        }
      );
      return res.status(200).json({
        success: true,
        message: messages.login,
        token,
        data: {
          _id: User._id,
          firstName: User.firstName,
          lastName: User.lastName,
          fullName: User.fullName,
          profileImage: User.image,
        },
      });
    } else {
      return res
        .status(400)
        .json({ success: false, message: messages.wrongPassword });
    }
  } else {
    res.status(400).json({ success: false, message: messages.wrongEmail });
  }
};
const forgotPassword = async function (req, res) {
  let User = await user.findOne({ email: req.body.email });
  if (!User)
    return res
      .status(400)
      .json({ success: false, message: messages.emailNotregister });
  let random = Math.floor(Math.random() * 1e16);
  let token = jwt.sign(
    {
      id: User._id,
      password: User.password,
      time: Date.now(),
      forgotToken: random,
    },
    process.env.JWT_SECRET
  );
  let subject = "Reset Password Link";
  let text = token;
  fs.readFile("html/forgotmail.html", "utf-8", function (err, data) {
    var result = data.replace(/token/g, token);
    result = result.replace(/URL/g, process.env.WEB_URL);
    result = result.replace(/Admin/g, User.fullName);
    Email(req, res, subject, text, result);
    user
      .findOneAndUpdate(
        { email: req.body.email },
        {
          forgotToken: random,
        }
      )
      .then(
        res.status(200).json({ success: true, message: messages.forgotLink })
      );
  });
};
const resetPassword = async function (req, res) {
  let newPassword = req.body.password;
  let token = verifyJwt(req.body.token);
  let User = await user.findOne({ _id: token.id });
  let checkPassword = await compare(newPassword, User.password);
  if (checkPassword)
    return res.status(400).json({ success: false, message: messages.passErr });
  if (!User)
    return res
      .status(400)
      .json({ success: false, message: messages.wrongEmail });
  let time = token.time;
  let timeDiff = (new Date() - time) / 60000;
  if (timeDiff > 10)
    return res
      .status(400)
      .json({ success: false, message: messages.linkexpire });
  let forgotToken = token.forgotToken;
  if (User.forgotToken != forgotToken)
    return res
      .status(400)
      .json({ success: false, message: messages.linkexpire });
  hash(newPassword, parseInt(process.env.JWT_SALT)).then(function (hash) {
    user
      .findOneAndUpdate(
        { _id: token.id },
        {
          password: hash,
          forgotToken: "",
        }
      )
      .then(
        res.status(200).json({ success: true, message: messages.passChange })
      );
  });
};
const changePassword = async function (req, res) {
  let userDetails = req.token;
  let check = await compare(req.body.oldPassword, userDetails.password);
  if (!check)
    return res
      .status(400)
      .json({ success: false, message: messages.passMatch });
  if (req.body.oldPassword == req.body.newPassword)
    return res.status(400).json({ success: false, message: messages.passErr });
  hash(req.body.newPassword, parseInt(process.env.JWT_SALT)).then(
    async function (hash) {
      userDetails.password = hash;
      const savePassword = await userDetails.save();
      if (savePassword)
        return res
          .status(200)
          .json({ success: true, message: messages.passChange });
      else
        return res
          .status(400)
          .json({ success: false, message: messages.passNotChange });
    }
  );
};
const viewProfile = async function (req, res) {
  const userDetails = req.token;
  let profile = await user.findOne({ _id: userDetails._id }).select("");
  res
    .status(200)
    .json({ success: true, data: profile, message: messages.profileFetch });
};
const editProfile = async function (req, res) {
  const id = req.token._id;
  if (req.file && req.file.path) req.body["image"] = req.file.path;
  user.findOneAndUpdate({ _id: id }, req.body).then(async () => {
    let userDetails = await user
      .findOne({ _id: id })
      .select("_id firstName lastName fullName image");
    res.status(200).json({
      success: true,
      message: messages.userUpdate,
      data: {
        _id: userDetails._id,
        firstName: userDetails.firstName,
        lastName: userDetails.lastName,
        fullName: userDetails.fullName,
        profileImage: userDetails.image,
      },
    });
  });
};
const verifyEmail = async function (req, res) {
  let tokenDetails = await verifyJwt(req.query.token);
  if (tokenDetails) {
    let userDetails = await user.findOne({ _id: tokenDetails.userId });
    console.log(":::::::::::::::::::::::::", userDetails);

    if (userDetails) {
      if (userDetails.isEmailverified == false) {
        await user.updateOne(
          { _id: userDetails._id },
          { isEmailverified: true }
        );
        fs.readFile("html/emailVerified.html", "utf-8", function (err, data) {
          res.status(200).send(data);
        });
      } else {
        fs.readFile("html/linkExpired.html", "utf-8", function (err, data) {
          res.status(200).send(data);
        });
      }
    } else {
      fs.readFile("html/linkExpired.html", "utf-8", function (err, data) {
        res.status(200).send(data);
      });
    }
  } else {
    fs.readFile("html/linkExpired.html", "utf-8", function (err, data) {
      res.status(200).send(data);
    });
  }
};
const verifyOtp = async function (req, res) {
  const id = verifyJwt(req.body.token).id;
  const data = await user.findOne({ _id: id });
  if (data.otp == req.body.otp) {
    user
      .findOneAndUpdate({ _id: id }, { otp: null })
      .then(
        res.status(200).json({ success: true, message: messages.otpVerify })
      );
  } else if (data.otp == null) {
    return res
      .status(400)
      .json({ success: true, message: messages.wrongOtpal });
  } else {
    return res.status(400).json({ success: true, message: messages.wrongOtp });
  }
};
const contact = async function (req, res) {
  fs.readFile("html/contactmail.html", "utf8", function (err, data) {
    if (err) return console.log(err);
    var result = data.replace(/messagetodisplay/g, req.body.message);
    let subject = "contact email";
    let text = req.body.message;
    adminEmail(req, res, subject, text, result);
    res.status(200).json({ success: true, message: messages.msgSent });
  });
};
const billingDetails = async function (req, res) {
  const id = req.token._id;
  user
    .findOneAndUpdate(
      { _id: id },
      {
        billing: req.body,
      }
    )
    .then(
      res.status(200).json({ success: true, message: messages.billingSave })
    );
};
const forgotLinkvalid = async function (req, res) {
  let token = verifyJwt(req.body.token);
  if (token) {
    let id = token.id;
    let User = await user.findOne({ _id: id });
    if (User) {
      let time = token.time;
      let timeDiff = (new Date() - time) / 60000;
      if (timeDiff > 10)
        return res.status(400).json({
          success: false,
          message: messages.linkexpire,
          data: { reset: false },
        });
      let forgotToken = token.forgotToken;
      if (User.forgotToken != forgotToken)
        return res.status(400).json({
          success: false,
          message: messages.linkexpire,
          data: { reset: false },
        });
      res.status(200).json({
        success: true,
        message: messages.linkValid,
        data: { reset: true },
      });
    } else
      return res.status(400).json({
        success: false,
        message: messages.linkexpire,
        data: { reset: false },
      });
  } else
    return res.status(400).json({
      success: false,
      message: messages.linkexpire,
      data: { reset: false },
    });
};
const bookingList = async function (req, res) {
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
      zone: 1,
      destination: 1,
      bookingDate: 1,
      isCancel: 1,
      user: 1,
      price: 1,
      duration: 1,
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
            zone: searchObj,
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

const saveCreditCard = async (req, res) => {
  let userDetail = req.token;
  let customer = await savingUserCard(
    req,
    res,
    req.body.token,
    userDetail.email
  );
  if (!customer)
    return res
      .status(400)
      .json(
        createErrorResponse("Your card details not saved.Please try again.")
      );
  userDetail.card.stripeCustomerId = customer.id;
  userDetail.card.cardNumber = req.body.card.last4;
  userDetail.card.brand = req.body.card.brand;
  if (req.body.card.name == null) userDetail.card.name = req.body.name;
  else userDetail.card.name = req.body.card.name;
  if (
    isNotNullAndUndefined(req.body.card.exp_month) &&
    isNotNullAndUndefined(req.body.card.exp_year)
  ) {
    userDetail.card.cardExpMonth = req.body.card.exp_month;
    userDetail.card.cardExpYear = req.body.card.exp_year;
  } else
    return res
      .status(400)
      .json(
        createErrorResponse("please provide expiry month and year of card.")
      );
  userDetail.card.cardType = req.body.card.funding;
  const cardDetails = await userDetail.save();
  return res.status(200).json({
    success: true,
    message: messages.cardSaved,
    data: cardDetails.card,
  });
};

const removeCardDetails = async (req, res, next) => {
  let userDetails = req.token;
  userDetails.card.cardExpMonth = null;
  userDetails.card.cardExpYear = null;
  userDetails.card.name = null;
  userDetails.card.cardNumber = null;
  userDetails.card.stripeCustomerId = null;
  userDetails.card.brand = null;
  userDetails.card.cardType = null;
  const removeCard = await userDetails.save();
  if (removeCard)
    return res
      .status(200)
      .json(createSuccessResponse(messages.removeCardDetails));
  else
    return res
      .status(400)
      .json(createErrorResponse("Failed to remove card details."));
};

// train book
const trainBook = async (req, res, next) => {
  const userDetail = req.token;
  // seatReservation(req, res)
  //     .then((data) => {
  //         if (data) {
  //             parsers.parseString(data.data, async function (err, result) {
  //                 if (err) return res.status(400).json(createErrorResponse(err))
  //                 console.log(result.Envelope.Body.SeatReservationRS.Errors.Error)
  //                 if (result.Envelope.Body.SeatReservationRS.Errors && result.Envelope.Body.SeatReservationRS.Errors.Error) return res.status(400).json(createErrorResponse(result.Envelope.Body.SeatReservationRS.Errors.Error[0]._))

  const obj = Object.assign({
    returnDetails: {},
  });
  let trainData;
  if (req.body.selectedReturnJourney) {
    trainData = `<TrainSegment DepartureDateTime="${req.body.selectedSingleJourney.DepartureDateTime}" TrainNumber="${req.body.selectedSingleJourney.TrainNumber}" >
                                <ClassCode Code="${req.body.selectedSingleJourney.FareId}"></ClassCode>
                            </TrainSegment>
                        <TrainSegment DepartureDateTime="${req.body.selectedReturnJourney.DepartureDateTime}" TrainNumber="${req.body.selectedReturnJourney.TrainNumber}" >
                                <ClassCode Code="${req.body.selectedReturnJourney.FareId}"></ClassCode>
                            </TrainSegment>`;
  } else {
    trainData = `<TrainSegment DepartureDateTime="${req.body.selectedSingleJourney.DepartureDateTime}" TrainNumber="${req.body.selectedSingleJourney.TrainNumber}" >
                                <ClassCode Code="${req.body.selectedSingleJourney.FareId}"></ClassCode>
                            </TrainSegment>`;
  }

  let traveller = ``;
  for (i = 0; i < parseInt(req.body.ChildrenCount); i++) {
    traveller =
      `<TravelerName>
            <GivenName>${userDetail.firstName}</GivenName>
            <Surname>${userDetail.lastName}</Surname>
            <NameTitle>${userDetail.title}</NameTitle>
            <NamePrefix>Child</NamePrefix>
        </TravelerName> ` + traveller;
  }
  for (i = 0; i < parseInt(req.body.AdultCount); i++) {
    traveller =
      `<TravelerName>
            <GivenName>${userDetail.firstName}</GivenName>
            <Surname>${userDetail.lastName}</Surname>
            <NameTitle>${userDetail.title}</NameTitle>
            <NamePrefix>Adult</NamePrefix>
        </TravelerName> ` + traveller;
  }

  const xml = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
    <soap:Header>
        <wsa:Action>http://www.opentravel.org/OTA/2003/05/otaRailBook</wsa:Action>
        <wsa:MessageID>urn:uuid:dc72983d-8871-431a-97d5-8f386f984592</wsa:MessageID>
        <wsa:ReplyTo>
            <wsa:Address>http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous</wsa:Address>
        </wsa:ReplyTo>
        <wsa:To>https://thepassengerhub.evolviuat.com/evolvi.webapi/soapapi</wsa:To>
        <wsse:Security>
            <wsse:UsernameToken wsu:Id="SecurityToken-a60b73fb-8dba-457b-9ca0-954e32ebe1f4">
                <wsse:Username>Passenger</wsse:Username>
                <wsse:Password>PH47yrj$</wsse:Password>
            </wsse:UsernameToken>
        </wsse:Security>
    </soap:Header>
    <soap:Body>
        <OTA_RailBookRQ TimeStamp="2022-11-08T04:01:42.6912635" Version="2.0" TransactionIdentifier="${userDetail.transactionIdentifier}" SequenceNmbr="1" EvolviVersionNumber="21.00.01-20211105.1" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.opentravel.org/OTA/2003/05">
            <POS xmlns="http://www.opentravel.org/OTA/2003/05">
                <Source>
                    <RequestorID Type="22" ID="richard@thepassengerhub.com" MessagePassword="Tph321???" />
                    <BookingChannel>
                        <CompanyName xsi:type="CompanyNamePrefType" CompanyShortName="thepassengerhub" />
                    </BookingChannel>
                </Source>
            </POS>
            <RailBookInfo ConfirmBasket="true" ReturnAllOrderItems="true">
                <OriginDestinationOptions>
                    <OriginDestinationOption>
                        <TrainSegments>
                            ${trainData}
                        </TrainSegments>
                    </OriginDestinationOption>
                </OriginDestinationOptions>
                <TravelerNames>
                ${traveller}
                 </TravelerNames>
                <Seat></Seat>
                <TravellerCostCentre></TravellerCostCentre>
                <CostCentres></CostCentres>
            </RailBookInfo>
                <TPA_Extensions>
                <TicketQueueID>1479</TicketQueueID>
                <TodLocationCode>ECP</TodLocationCode>
            </TPA_Extensions>
        </OTA_RailBookRQ>
    </soap:Body>
</soap:Envelope>`;

  // console.log("xml :: ", xml)

  let config = {
    headers: { "Content-Type": "application/xml" },
  };

  let data = await axios.post(
    "https://thepassengerhub.evolviuat.com/evolvi.webapi/soapapi",
    xml,
    config
  );
  if (data) {
    parsers.parseString(data.data, async function (err, result) {
      // require("fs").writeFile("response.txt", JSON.stringify(result), () => {});
      // if (result.Envelope.Body.OTA_RailBookRS.Errors) return res.status(400).json(createErrorResponse(result.Envelope.Body.OTA_RailBookRS.Errors.Error.$.ShortText))
      // console.log(result.Envelope.Body.OTA_RailBookRS.OrderSummary.OrderItem.Journey[1].Fare.Total.$.Amount)
      // return res.json(result)
      if (req.body.selectedReturnJourney) {
        obj.price =
          parseFloat(
            result.Envelope.Body.OTA_RailBookRS.OrderSummary.OrderItem
              .Journey[0].Fare.Total.$.Amount
          ) +
          parseFloat(
            result.Envelope.Body.OTA_RailBookRS.OrderSummary.OrderItem
              .Journey[1].Fare.Total.$.Amount
          ); // parseFloat(req.body.totalFare)
      } else {
        obj.price = parseFloat(
          result.Envelope.Body.OTA_RailBookRS.OrderSummary.OrderItem.Journey
            .Fare.Total.$.Amount
        );
      }

      obj.type = "overground";
      obj.transactionId = userDetail.transactionIdentifier;
      obj.bookingDate = moment(req.body.BookingDate).utc();
      obj.trainNumber = req.body.TrainNumber;
      obj.source = req.body.FromStation.StationName;
      obj.sourceCRSCode = req.body.FromStation.StationCRSCode;
      obj.destination = req.body.destination.StationName;
      obj.destinationCRSCode = req.body.destination.StationCRSCode;
      obj.childrenCount = req.body.ChildrenCount;
      obj.adultCount = req.body.AdultCount;
      obj.bookingType = transformTripName(req.body.JourneyType);
      obj.fareType = req.body.BookingType;
      obj.ticketId = randomAlphaNumericCode();
      obj.user = req.token._id;
      obj.arrivalTime = req.body.ArrivalDateTime;
      obj.departureTime = req.body.DepartureDate;
      if (req.body.JourneyType == "roundTrip") {
        obj.price = obj.price.toFixed(2);
        obj["returnDetails"]["trainName"] = req.body.returnTrainNumber;
        obj["returnDetails"]["source"] = req.body.returnFromStation.StationName;
        obj["returnDetails"]["sourceCRSCode"] =
          req.body.returnFromStation.StationCRSCode;
        obj["returnDetails"]["destination"] =
          req.body.returnDestination.StationName;
        obj["returnDetails"]["destinationCRSCode"] =
          req.body.returnDestination.StationCRSCode;
        obj["returnDetails"]["adultCount"] = req.body.returnAdultCount;
        obj["returnDetails"]["childrenCount"] = req.body.returnChildrenCount;
        obj["returnDetails"]["returnDate"] = req.body.returnDepartureDate;
        obj["returnDetails"]["trainNumber"] = req.body.returnTrainNumber;
      }
      paymentStripe(req.token.card.stripeCustomerId, parseInt(obj.price))
        .then(async (success) => {
          // console.log('success', success)
          const saveDetail = await new booking(obj).save();
          if (saveDetail) {
            userDetail.transactionIdentifier = null;
            await userDetail.save();
            return res
              .status(200)
              .json(
                createSuccessResponse(messages.paymentSuccessfully, saveDetail)
              );
          } else
            return res.status(400).json(createErrorResponse("Payment failed."));
        })
        .catch((err) => {
          return res.status(400).json(createErrorResponse(err.raw.message));
        });
    });
  }

  // })
  //     } else {
  //         return res.status(400).json(createErrorResponse('Seat reservation is not completed.'))
  //     }
  // })
  // .catch((err) => {
  //     return res.status(400).json(createErrorResponse(err))
  // })
};

module.exports = {
  userRegister,
  userLogin,
  forgotPassword,
  resetPassword,
  changePassword,
  viewProfile,
  editProfile,
  verifyEmail,
  verifyOtp,
  contact,
  billingDetails,
  forgotLinkvalid,
  bookingList,
  saveCreditCard,
  removeCardDetails,
  trainBook,
};
