const flexiSeason = require("../../models/flexiSeason");
const axios = require("axios");
const xml2js = require("xml2js");

const parsers = new xml2js.Parser({ explicitArray: false });
const user = require("../../models/user");
const mongoose = require("mongoose");
const messages = require("../../helpers/appConstants");
const moment = require("moment");
const { paymentStripe } = require("../../helpers/stripe");
const {
  paginationData,
  randomAlphaNumericCode,
  createErrorResponse,
  createSuccessResponse,
} = require("../../helpers/utils");
const flexiSeasonKeys = [
  "passengerType",
  "financeBy",
  "duration",
  "paymentType",
  // "leave",
  "startDate",
  "endDate",
];

const listFlexiseason = async function (req, res) {
  let { offset, order, sort, search, limit, filter } = req.body;
  let query = [];
  let pagination = [];
  let searchObj = { $regex: new RegExp(".*" + search + ".*", "i") };
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
              fullName: 1,
              email: 1,
              city: 1,
              userId: 1,
              billing: 1,
            },
          },
        ],
        as: "user",
      },
    },
    { $unwind: { path: "$user" } }
  );
  if (search) {
    query.push({
      $match: {
        $or: [
          {
            "user.fullName": searchObj,
          },
          {
            "user.email": searchObj,
          },
          // {
          //     'user.lastName': searchObj
          // },
          {
            seasonId: searchObj,
          },
          {
            "user.city": searchObj,
          },
        ],
      },
    });
  }

  let project = {
    $project: {
      createdAt: 1,
      updatedAt: -1,
      user: 1,
      seasonId: 1,
      price: 1,
      source: 1,
      destination: 1,
      passengerType: 1,
      duration: 1,
      financeBy: 1,
      paymentType: 1,
      isApproved: 1,
      isRejected: 1,
      isPending: 1,
      validUpto: 1,
      status: {
        $cond: {
          if: {
            $eq: ["$isApproved", true],
          },
          then: "Approved",
          else: {
            $cond: [{ $eq: ["$isRejected", true] }, "Rejected", "Pending"],
          },
        },
      },
    },
  };
  query.push(project);

  if (filter == "approved") {
    query.push({
      $match: {
        isApproved: true,
      },
    });
  } else if (filter == "rejected") {
    query.push({
      $match: {
        isRejected: true,
      },
    });
  } else if (filter == "pending") {
    query.push({
      $match: {
        isPending: true,
      },
    });
  } else if (filter == "all") {
    query.push({ $match: {} });
  }

  let sortQry = {};
  let userId = "user.";
  let sort_element;
  if (sort == "seasonId" || sort == "paymentType") sort_element = sort;
  else sort_element = userId.concat(sort);

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
  const flexiseasonList = await flexiSeason.aggregate(query);
  let TotalCount =
    flexiseasonList && flexiseasonList[0] && flexiseasonList[0].totalCount
      ? flexiseasonList[0].totalCount.count
      : 0;
  res.status(200).json({
    success: true,
    data: {
      flexiseasonList:
        flexiseasonList && flexiseasonList[0] && flexiseasonList[0].data
          ? flexiseasonList[0].data
          : [],
      paginateData: paginationData(TotalCount, limit, offset),
    },
    message: messages.dataFetch,
  });
};
const editFlexiseason = async function (req, res) {
  user
    .findOneAndUpdate(
      { _id: req.body.userId },
      {
        fullName: req.body.fullName,
        phoneNumber: req.body.phoneNumber,
        address: req.body.address,
        city: req.body.city,
        postalCode: req.body.postalCode,
      }
    )
    .then(
      res
        .status(200)
        .json({ success: true, message: messages.flexiSeasonupdate })
    );
};
const viewFlexiseason = async function (req, res) {
  const checkId = mongoose.isValidObjectId(req.body.id);
  if (!checkId)
    return res
      .status(400)
      .json({ success: false, message: messages.invalidId });
  const data = await flexiSeason
    .findOne({ _id: req.body.id })
    .populate(
      "user",
      "email fullName  userId postalCode city address phoneNumber createdAt billing card.cardNumber",
      user
    )
    .select("");
  if (data)
    return res
      .status(200)
      .json({ success: true, data, message: messages.dataFetch });
  else
    return res.status(400).json({ success: false, message: messages.noData });
};
const accrejFlexiseason = async function (req, res) {
  const checkId = mongoose.isValidObjectId(req.body.id);
  if (!checkId)
    return res
      .status(400)
      .json({ success: false, message: messages.invalidId });
  const check = await flexiSeason.findOne({ _id: req.body.id });
  if (!check)
    return res.status(400).json({ success: false, message: messages.userNot });
  if (req.body.status == "approve") {
    const checkReq = await flexiSeason.findOne({
      _id: req.body.id,
      isApproved: "true",
    });
    if (checkReq)
      return res
        .status(400)
        .json({ success: false, message: messages.acceptAl });
    await flexiSeason.findOneAndUpdate(
      { _id: req.body.id },
      {
        isApproved: "true",
        isPending: "false",
        isRejected: "false",
      }
    );
    return res
      .status(200)
      .json({ success: true, message: messages.requestAccept });
  } else if (req.body.status == "reject") {
    const checkReq = await flexiSeason.findOne({
      _id: req.body.id,
      isRejected: "true",
    });
    if (checkReq)
      return res
        .status(400)
        .json({ success: false, message: messages.rejectAl });
    await flexiSeason.findOneAndUpdate(
      { _id: req.body.id },
      {
        isRejected: "true",
        isPending: "false",
        isApproved: "false",
      }
    );
    return res
      .status(200)
      .json({ success: true, message: messages.requestReject });
  } else {
    return res
      .status(400)
      .json({ success: false, message: messages.statusNot });
  }
};

const flexiDetail = async (req, res, next) => {
  const checkSeason = await flexiSeason
    .findOne({ user: req.token._id })
    .populate("user", "card");
  if (checkSeason)
    return res
      .status(200)
      .json(createSuccessResponse(messages.addFlexiSeason, checkSeason));
  else
    return res
      .status(200)
      .json(createSuccessResponse(messages.addFlexiSeason, null));
};

const addFlexiSeason = async (req, res, next) => {
  const userDetails = req.token;
  const checkSeason = await flexiSeason.findOne({ user: req.token._id });
  if (checkSeason)
    return res
      .status(200)
      .json(createSuccessResponse("You already have a flexi season."));

  const startDate = moment(req.body.startDate).format("YYYY-MM-DDTHH:mm:ss");
  const returnDate = moment(req.body.startDate)
    .add(1, "M")
    .format("YYYY-MM-DDTHH:mm:ss");

  let passengerType;
  if (req.body.passengerType.toLowerCase() == "adult") {
    passengerType = `<PassengerType Code="Adult" Quantity="1" />`;
  } else {
    passengerType = `<PassengerType Code="Children" Quantity="1" />`;
  }

  const xmlFirst = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
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
        <OTA_RailAvailRQ xmlns="http://www.opentravel.org/OTA/2003/05" TimeStamp="2022-02-21T07:00:00.7939026Z" Target="Test" Version="2.8" TransactionIdentifier="8317120d-8e2e-4dfd-bb4d-5cc8756d3b30" SequenceNmbr="1" ResponseType="Fares">
            <POS xmlns="http://www.opentravel.org/OTA/2003/05">
                <Source AgentSine="" PseudoCityCode="">
                    <RequestorID Type="" ID="richard@thepassengerhub.com" MessagePassword="Tph321???" />
                    <BookingChannel>
                        <CompanyName xsi:type="CompanyNamePrefType" CompanyShortName="thepassengerhub" />
                    </BookingChannel>
                </Source>
            </POS>
            <RailAvailInfo TrainNumber="Season" Class="First" xmlns="http://www.opentravel.org/OTA/2003/05">
                <OriginDestinationInformation>
                    <DepartureDateTime>${startDate}</DepartureDateTime>
                    <OriginLocation LocationCode="${req.body.source.StationCRSCode}" CodeContext="CRS"/>
                    <DestinationLocation LocationCode="${req.body.destination.StationCRSCode}" CodeContext="CRS"/>
                </OriginDestinationInformation>
                ${passengerType}
                <ReturnDateTime>
                    <DepartureDateTime>${returnDate}</DepartureDateTime>
                </ReturnDateTime>
            </RailAvailInfo>
            <TPA_Extensions xmlns="http://www.opentravel.org/OTA/2003/05">
                <AutoApplyDiscounts>true</AutoApplyDiscounts>
                <TreatReturnFaresAsHalfPrice>false</TreatReturnFaresAsHalfPrice>
                <ShowAdditionalJourneyFareAttributes>false</ShowAdditionalJourneyFareAttributes>
                <PreferNlcToCrs>false</PreferNlcToCrs>
                <OmitItxWithoutMatchingRouteCode>false</OmitItxWithoutMatchingRouteCode>
                <ExtraTimeToChange>true</ExtraTimeToChange>
                <Prioritise>Unknown</Prioritise>
            </TPA_Extensions>
        </OTA_RailAvailRQ>
    </soap:Body>
</soap:Envelope>`;

  const xmlStandard = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
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
        <OTA_RailAvailRQ xmlns="http://www.opentravel.org/OTA/2003/05" TimeStamp="2022-02-21T07:00:00.7939026Z" Target="Test" Version="2.8" TransactionIdentifier="8317120d-8e2e-4dfd-bb4d-5cc8756d3b30" SequenceNmbr="1" ResponseType="Fares">
            <POS xmlns="http://www.opentravel.org/OTA/2003/05">
                <Source AgentSine="" PseudoCityCode="">
                    <RequestorID Type="" ID="richard@thepassengerhub.com" MessagePassword="Tph321???" />
                    <BookingChannel>
                        <CompanyName xsi:type="CompanyNamePrefType" CompanyShortName="thepassengerhub" />
                    </BookingChannel>
                </Source>
            </POS>
            <RailAvailInfo TrainNumber="Season" Class="Standard" xmlns="http://www.opentravel.org/OTA/2003/05">
                <OriginDestinationInformation>
                    <DepartureDateTime>${startDate}</DepartureDateTime>
                    <OriginLocation LocationCode="${req.body.source.StationCRSCode}" CodeContext="CRS"/>
                    <DestinationLocation LocationCode="${req.body.destination.StationCRSCode}" CodeContext="CRS"/>
                </OriginDestinationInformation>
                ${passengerType}
                <ReturnDateTime>
                    <DepartureDateTime>${returnDate}</DepartureDateTime>
                </ReturnDateTime>
            </RailAvailInfo>
            <TPA_Extensions xmlns="http://www.opentravel.org/OTA/2003/05">
                <AutoApplyDiscounts>true</AutoApplyDiscounts>
                <TreatReturnFaresAsHalfPrice>false</TreatReturnFaresAsHalfPrice>
                <ShowAdditionalJourneyFareAttributes>false</ShowAdditionalJourneyFareAttributes>
                <PreferNlcToCrs>false</PreferNlcToCrs>
                <OmitItxWithoutMatchingRouteCode>false</OmitItxWithoutMatchingRouteCode>
                <ExtraTimeToChange>true</ExtraTimeToChange>
                <Prioritise>Unknown</Prioritise>
            </TPA_Extensions>
        </OTA_RailAvailRQ>
    </soap:Body>
</soap:Envelope>`;

  let config = {
    headers: { "Content-Type": "application/xml" },
  };

  try {
    const price = await Promise.all([
      firstClass(
        xmlFirst,
        config,
        req.body?.passengerType,
        req.body?.durations,
        req.body.startDate,
        req.body.endDate
      ),
      standardClass(
        xmlStandard,
        config,
        req.body?.passengerType,
        req.body?.durations,
        req.body.startDate,
        req.body.endDate
      ),
    ]);

    const obj = Object.assign({});
    obj.price = {};
    obj.price.first = price[0].first;
    obj.price.standard = price[1].standard;

    flexiSeasonKeys.map((keys) => {
      obj[keys] = req.body[keys];
    });

    const start = moment(req.body.startDate);
    const end = moment(req.body.endDate);
    const months = end.diff(start, "months");
    start.add(months, "months");
    const days = end.diff(start, "days");

    obj.duration = { m: months, d: days };
    obj.validUpto = moment(req.body.endDate);
    obj.endDate = moment(req.body.endDate);
    obj.source = req.body.source.StationName;
    obj.sourceCRSCode = req.body.source.StationCRSCode;
    obj.destination = req.body.destination.StationName;
    obj.destinationCRSCode = req.body.destination.StationCRSCode;
    obj.card = userDetails.card;
    obj.user = {
      name: userDetails.fullName,
      address: userDetails.address,
      phone: userDetails.phoneNumber,
    };

    return res
      .status(200)
      .json(createSuccessResponse(messages.addFlexiSeason, obj));
  } catch (err) {
    return res
      .status(400)
      .json(createErrorResponse(err || "Something went wrong."));
  }
};

const firstClass = (
  xmlFirst,
  config,
  passengerType,
  durations,
  startDate,
  endDate
) => {
  return new Promise(async (resolve, reject) => {
    try {
      const data = await axios.post(
        "https://thepassengerhub.evolviuat.com/evolvi.webapi/soapapi",
        xmlFirst,
        config
      );
      let price;
      data
        ? parsers.parseString(data.data, async function (err, result) {
            if (err) console.log(err);

            if (result.Envelope.Body.OTA_RailAvailRS.Errors) {
              const error =
                result.Envelope.Body.OTA_RailAvailRS.Errors.Error._.replace(
                  /&#xD;&#xD;/g,
                  ""
                );
              return reject("No fares found");
            }

            if (
              result.Envelope.Body.OTA_RailAvailRS.Fares.Fare[0] == undefined
            ) {
              price = await getPrices(
                result.Envelope.Body.OTA_RailAvailRS.Fares.Fare
                  .SeasonTicketPrices.SeasonTicketPrice,
                durations,
                passengerType,
                startDate,
                endDate
              );
            } else if (
              result.Envelope.Body.OTA_RailAvailRS.Fares.Fare.length > 0
            ) {
              price = await getPrices(
                result.Envelope.Body.OTA_RailAvailRS.Fares.Fare[0]
                  .SeasonTicketPrices.SeasonTicketPrice,
                durations,
                passengerType,
                startDate,
                endDate
              );
            }
            resolve({ first: price });
          })
        : reject();
    } catch (err) {
      reject();
    }
  });
};

const standardClass = (
  xmlStandard,
  config,
  passengerType,
  durations,
  startDate,
  endDate
) => {
  return new Promise(async (resolve, reject) => {
    try {
      const data = await axios.post(
        "https://thepassengerhub.evolviuat.com/evolvi.webapi/soapapi",
        xmlStandard,
        config
      );

      let price;
      data
        ? parsers.parseString(data.data, async function (err, result) {
            if (err) console.log(err);

            if (result.Envelope.Body.OTA_RailAvailRS.Errors) {
              const error =
                result.Envelope.Body.OTA_RailAvailRS.Errors.Error._.replace(
                  /&#xD;&#xD;/g,
                  ""
                );
              return reject("No fares found");
            }

            if (
              result.Envelope.Body.OTA_RailAvailRS.Fares.Fare[0] == undefined
            ) {
              price = await getPrices(
                result.Envelope.Body.OTA_RailAvailRS.Fares.Fare
                  .SeasonTicketPrices.SeasonTicketPrice,
                durations,
                passengerType,
                startDate,
                endDate
              );
            } else if (
              result.Envelope.Body.OTA_RailAvailRS.Fares.Fare.length > 0
            ) {
              price = await getPrices(
                result.Envelope.Body.OTA_RailAvailRS.Fares.Fare[0]
                  .SeasonTicketPrices.SeasonTicketPrice,
                durations,
                passengerType,
                startDate,
                endDate
              );
            }

            resolve({ standard: price });
          })
        : reject();
    } catch (err) {
      reject();
    }
  });
};

const getPrices = (priceArr, durations, passengerType, startDate, endDate) => {
  return new Promise((resolve) => {
    const price = [];
    priceArr.map((e) => {
      if (e.$.MonthsValid == 1 && e.$.DaysValid == 0) {
        const dayPrice = (e.Price.$.Amount / 30).toFixed(2);

        const start = moment(startDate);
        const end = moment(endDate);
        const months = end.diff(start, "months");
        start.add(months, "months");
        const days = end.diff(start, "days");

        price.push({
          d: { m: months, d: days },
          p: (dayPrice * (months * 30 + days)).toFixed(2),
          v: moment(endDate),
        });
        durations.forEach((m) => {
          price.push({
            d: { m, d: 0 },
            p: (dayPrice * (m * 30)).toFixed(2),
            v: moment(startDate).add(parseInt(m), "M"),
          });
        });
      }
    });
    resolve(price);
  });
};

const flexiPayment = async (req, res, next) => {
  const userDetails = req.token;
  const obj = Object.assign({});
  obj.user = req.token._id;
  obj.ticketId = randomAlphaNumericCode();
  obj.price = parseFloat(req.body.data.price);
  flexiSeasonKeys.map((keys) => {
    obj[keys] = req.body.data[keys];
  });
  obj.validUpto = req.body.data.validUpto;
  obj.paymentType = req.body.paymentType;
  obj.source = req.body.data.source;
  obj.sourceCRSCode = req.body.data.sourceCRSCode;
  obj.destination = req.body.data.destination;
  obj.destinationCRSCode = req.body.data.destinationCRSCode;
  obj.card = req.body.data.card;
  if (req.body.paymentType.toLowerCase() == "pay") {
    paymentStripe(
      userDetails.card.stripeCustomerId,
      parseInt(req.body.data.price)
    )
      .then(async (success) => {
        // console.log("success", success);
        await new flexiSeason(obj).save();
        return res
          .status(200)
          .json(createSuccessResponse(messages.paymentSuccessfully));
      })
      .catch((err) => {
        console.log("err", err);
        return res.status(400).json(createErrorResponse(err.raw.message));
      });
  } else {
    const saveDetail = await new flexiSeason(obj).save();
    if (saveDetail)
      return res
        .status(200)
        .json(createSuccessResponse(messages.paymentSuccessfully));
    else return res.status(400).json(createErrorResponse("Payment failed."));
  }
};

module.exports = {
  listFlexiseason,
  editFlexiseason,
  viewFlexiseason,
  accrejFlexiseason,
  addFlexiSeason,
  flexiDetail,
  flexiPayment,
};
