const axios = require("axios");
const {
  createSuccessResponse,
  createErrorResponse,
  paginationData,
  randomAlphaNumericCodeUpto10,
} = require("../../helpers/utils");
const { XMLParser, XMLBuilder, XMLValidator } = require("fast-xml-parser");
const msgConstants = require("../../helpers/appConstants");
const xml2js = require("xml2js");
const parsers = new xml2js.Parser({ explicitArray: false });
const message = require("../../helpers/appConstants");

const parser = new XMLParser();

const StationSearch = async function (req, res) {
  const xml = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
    <soap:Header>
        <wsa:Action>http://evolvi.co.uk/webservices/ListStations</wsa:Action>
        <wsa:MessageID>urn:uuid:dc72983d-8871-431a-97d5-8f386f984592</wsa:MessageID>
        <wsa:ReplyTo>
            <wsa:Address>http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous</wsa:Address>
        </wsa:ReplyTo>
        <wsa:To> https://bookit.evolviuat.com/evolvi.webapi/soaprefdata</wsa:To>
        <wsse:Security>
            <wsse:UsernameToken wsu:Id="SecurityToken-a60b73fb-8dba-457b-9ca0-954e32ebe1f4">
                <wsse:Username>SoapGen</wsse:Username>
                <wsse:Password>J(Dk!f96</wsse:Password>
            </wsse:UsernameToken>
        </wsse:Security>
    </soap:Header>
    <soap:Body>
        <ListStations xmlns="http://evolvi.co.uk/webservices/"/>
    </soap:Body>
</soap:Envelope>`;

  var config = {
    headers: { "Content-Type": "text/xml" },
  };

  let data = await axios.post(
    "https://bookit.evolviuat.com/evolvi.webapi/soaprefdata",
    xml,
    config
  );
  if (data) {
    let response = parser.parse(data.data);
    res.status(200).json(
      createSuccessResponse(
        msgConstants.stationsFetchedSuccessfully,
        response.Envelope.Body.ListStationsResponse.EvReferenceDataRS.Stations.Station.sort(
          (a, b) => (a.StationName > b.StationName ? 1 : -1)
        )
      )
    );
  } else
    res
      .status(400)
      .json(createErrorResponse(msgConstants.stationListNotFetched));
};

const bookingSearch = async (req, res) => {
  let userDetail = req.token;
  let transactionIdentifier = randomAlphaNumericCodeUpto10();
  userDetail.transactionIdentifier = transactionIdentifier;
  await userDetail.save();

  if (req.body.source.StationCRSCode == req.body.destination.StationCRSCode)
    return res
      .status(400)
      .json(createErrorResponse("Source & destination must be different."));

  var Out = `<DepartureDateTime>${req.body.singleDate}</DepartureDateTime>`;
  var Return = `<DepartureDateTime>${req.body.returnDate}</DepartureDateTime>`;

  if (req.body.type && req.body.type == "earlier") {
    if (req.body.journeyCardName == "return") {
      Return = `<ArrivalDateTime>${req.body.returnDate}</ArrivalDateTime>`;
    } else {
      Out = `<ArrivalDateTime>${req.body.singleDate}</ArrivalDateTime>`;
    }
  }
  let journeyType = "";
  if (req.body.ticketType == "oneWay") {
    journeyType = "SingleJourney";
  } else {
    journeyType = "DualSingleJourney";
  }

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
        <OTA_RailAvailRQ xmlns="http://www.opentravel.org/OTA/2003/05" TimeStamp="2022-02-06T07:00:00.7939026Z" Target="Test" Version="2.8" TransactionIdentifier="${transactionIdentifier}" SequenceNmbr="1" ResponseType="Fares">
            <POS xmlns="http://www.opentravel.org/OTA/2003/05">
                <Source>
                    <RequestorID Type="22" ID="richard@thepassengerhub.com" MessagePassword="Tph321???" />
                    <BookingChannel>
                        <CompanyName xsi:type="CompanyNamePrefType" CompanyShortName="thepassengerhub" />
                    </BookingChannel>
                </Source>
            </POS>
            <RailAvailInfo TrainNumber="${journeyType}" Class="All" xmlns="http://www.opentravel.org/OTA/2003/05">
                <OriginDestinationInformation>
                    ${Out}
                    <OriginLocation LocationCode="${req.body.source.StationCRSCode}" CodeContext="CRS" />
                    <DestinationLocation LocationCode="${req.body.destination.StationCRSCode}" CodeContext="CRS" />
                </OriginDestinationInformation>
                <PassengerType Code="Adult" Quantity="${req.body.adultCount}"/>
                <PassengerType Code="Children" Quantity="${req.body.childrenCount}"/>
                <ReturnDateTime xsi:type="OriginDestinationInformationType">
                    ${Return}
                </ReturnDateTime>
            </RailAvailInfo>
        </OTA_RailAvailRQ>
    </soap:Body>
</soap:Envelope>`;

  // if (req.body.type && req.body.type == "earlier")
  // {
  //     xml = xml.replace(/DepartureDateTime/g,'ArrivalDateTime')
  // }

  // console.log('xml ::: ',xml );

  let config = {
    headers: { "Content-Type": "application/xml" },
  };
  let dataUse;
  if (req.body.ticketType == "oneWay") {
    dataUse = {
      origin: req.body.source.StationCRSCode,
      destination: req.body.destination.StationCRSCode,
      journeyDate: req.body.singleDate,
      leave: req.body.singleLeave,
      adult: req.body.adultCount,
      children: req.body.childrenCount,
      isAvailable: [],
    };
  } else {
    dataUse = {
      origin: req.body.source.StationCRSCode,
      destination: req.body.destination.StationCRSCode,
      journeyDate: req.body.singleDate,
      leave: req.body.singleLeave,
      adult: req.body.adultCount,
      children: req.body.childrenCount,
      isAvailable: [],
      ReturnOrigin: req.body.destination.StationCRSCode,
      returnDestination: req.body.source.StationCRSCode,
      returnJourneyDate: req.body.returnSingleDate,
      returnIsAvailable: [],
    };
  }
  axios
    .post(
      "https://thepassengerhub.evolviuat.com/evolvi.webapi/soapapi",
      xml,
      config
    )
    .then((data) => {
      if (data) {
        parsers.parseString(data.data, async function (err, result) {
          if (err) console.log(err);

          if (
            result.Envelope.Body.OTA_RailAvailRS.Errors &&
            result.Envelope.Body.OTA_RailAvailRS.Errors.Error._
          )
            return res
              .status(400)
              .json(
                createErrorResponse(
                  result.Envelope.Body.OTA_RailAvailRS.Errors.Error._
                )
              );

          if (journeyType == "SingleJourney") {
            var journey =
              result.Envelope.Body.OTA_RailAvailRS.OriginDestinationOptions
                .OriginDestinationOption.Journeys.Journey;
            console.log("journey length ::::: ", journey.length);
            // console.log('journey ::: ',journey.JourneySegments)
            if (journey.length <= 0 || journey.length == undefined)
              return res
                .status(400)
                .json(createErrorResponse("No any train found."));
            for (e of journey) {
              console.log(
                "checkkkkkk",
                e.JourneySegments.JourneySegment.TrainSegment.$
                  .DepartureDateTime
              );
            }
            console.log("::::::::::::::::::::::::");

            for (e of journey) {
              const obj = {};
              const keys = e.JourneySegments.JourneySegment.TrainSegment.$;
              obj["DepartureDateTime"] = keys.DepartureDateTime;
              obj["ArrivalDateTime"] = keys.ArrivalDateTime;
              obj["TrainNumber"] = keys.TrainNumber;
              obj["StandardFare"] = e.CheapestFare.Price.$.Amount;
              obj["firstClassFare"] = null;
              obj["FareId"] = e.CheapestFare.$.FareId;
              dataUse.isAvailable.push(obj);
            }
            dataUse.isAvailable = dataUse.isAvailable.splice(0, 4);
            return res
              .status(200)
              .json(createSuccessResponse(message.bookingSearch, dataUse));
          } else {
            var journey =
              result.Envelope.Body.OTA_RailAvailRS.OriginDestinationOptions
                .OriginDestinationOption[0].Journeys.Journey;

            if (journey.length <= 0 || journey.length == undefined)
              return res
                .status(400)
                .json(createErrorResponse("No any train found."));
            for (e of journey) {
              console.log(
                "checkkkkkk",
                e.JourneySegments.JourneySegment.TrainSegment.$
                  .DepartureDateTime
              );
            }
            console.log("::::::::::::::::::::::::");

            for (e of journey) {
              const obj = {};
              const keys = e.JourneySegments.JourneySegment.TrainSegment.$;
              obj["DepartureDateTime"] = keys.DepartureDateTime;
              obj["ArrivalDateTime"] = keys.ArrivalDateTime;
              obj["TrainNumber"] = keys.TrainNumber;
              obj["StandardFare"] = e.CheapestFare.Price.$.Amount;
              obj["firstClassFare"] = null;
              obj["FareId"] = e.CheapestFare.$.FareId;
              dataUse.isAvailable.push(obj);
            }
            dataUse.isAvailable = dataUse.isAvailable.splice(0, 4);

            journey =
              result.Envelope.Body.OTA_RailAvailRS.OriginDestinationOptions
                .OriginDestinationOption[1].Journeys.Journey;
            console.log("journey length ::::: ", journey.length);
            if (journey.length <= 0 || journey.length == undefined)
              return res
                .status(400)
                .json(
                  createErrorResponse("No any train found for return.", dataUse)
                );
            for (e of journey) {
              console.log(
                "checkkkkkk",
                e.JourneySegments.JourneySegment.TrainSegment.$
                  .DepartureDateTime
              );
            }
            console.log("::::::::::::::::::::::::");

            for (e of journey) {
              const obj = {};
              const keys = e.JourneySegments.JourneySegment.TrainSegment.$;
              obj["DepartureDateTime"] = keys.DepartureDateTime;
              obj["ArrivalDateTime"] = keys.ArrivalDateTime;
              obj["TrainNumber"] = keys.TrainNumber;
              obj["StandardFare"] = e.CheapestFare.Price.$.Amount;
              obj["firstClassFare"] = null;
              obj["FareId"] = e.CheapestFare.$.FareId;
              dataUse.returnIsAvailable.push(obj);
            }
            dataUse.returnIsAvailable = dataUse.returnIsAvailable.splice(0, 4);

            return res
              .status(200)
              .json(createSuccessResponse(message.bookingSearch, dataUse));
          }
        });
      } else return res.status(400).json(createErrorResponse("no data found"));
    })
    .catch((err) => {
      return res
        .status(400)
        .json(
          createErrorResponse("Service not available, Try after some time.")
        );
    });
};

const bookingDetail = async (req, res) => {
  const userDetail = req.token;
  const array = [];
  if (req.body.journeyType == "roundTrip") {
    array.push(
      {
        JourneyIdentifier: req.body.selectedSingleJourney.TrainNumber,
        FareId: req.body.selectedSingleJourney.FareId,
      },
      {
        JourneyIdentifier: req.body.selectedReturnJourney.TrainNumber,
        FareId: req.body.selectedReturnJourney.FareId,
      }
    );
  } else {
    array.push({
      JourneyIdentifier: req.body.selectedSingleJourney.TrainNumber,
      FareId: req.body.selectedSingleJourney.FareId,
    });
  }
  const obj = Object.assign({});

  for (let i = 0; i < array.length; i++) {
    let xml = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
    <soap:Header>
        <wsa:Action>http://www.opentravel.org/OTA/2003/05/JourneyDetails</wsa:Action>
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
        <JourneyDetailsRQ xmlns="http://www.opentravel.org/OTA/2003/05" TimeStamp="2022-02-06T07:00:00.7939026Z" Target="Test" Version="2.0" TransactionIdentifier="${userDetail.transactionIdentifier}" SequenceNmbr="1" >
            <POS xmlns="http://www.opentravel.org/OTA/2003/05">
                <Source>
                    <RequestorID Type="22" ID="richard@thepassengerhub.com" MessagePassword="Tph321???" />
                    <BookingChannel>
                        <CompanyName xsi:type="CompanyNamePrefType" CompanyShortName="thepassengerhub" />
                    </BookingChannel>
                </Source>
            </POS>
            <Journeys>
                <Journey JourneyIdentifier="${array[i].JourneyIdentifier}">
            <JourneyFareCollection>
                <JourneyFare FareId="${array[i].FareId}"></JourneyFare>
                </JourneyFareCollection>
                </Journey>
            </Journeys>
        </JourneyDetailsRQ>
    </soap:Body>
</soap:Envelope>`;

    // console.log('xml::: ',xml);

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
        if (err) console.log(err);
        if (
          result.Envelope.Body.JourneyDetailsRS.Errors &&
          result.Envelope.Body.JourneyDetailsRS.Errors.Error_
        ) {
          const error =
            result.Envelope.Body.JourneyDetailsRS.Errors.Error_.replace(
              /&#xD;&#xD;/g,
              ""
            );
          return res.status(400).json(createErrorResponse(error));
        }

        if (
          result.Envelope.Body.JourneyDetailsRS.Journey.TrainSegments
            .TrainSegment &&
          result.Envelope.Body.JourneyDetailsRS.Journey.TrainSegments
            .TrainSegment.length > 0
        ) {
          var trainNo =
            result.Envelope.Body.JourneyDetailsRS.Journey.TrainSegments
              .TrainSegment[0].$.TrainNumber;
          var legId =
            result.Envelope.Body.JourneyDetailsRS.Journey.TrainSegments
              .TrainSegment[0].$.LegId;
        } else {
          var trainNo =
            result.Envelope.Body.JourneyDetailsRS.Journey.TrainSegments
              .TrainSegment.$.TrainNumber;
          var legId =
            result.Envelope.Body.JourneyDetailsRS.Journey.TrainSegments
              .TrainSegment.$.LegId;
        }

        if (i == 0) {
          obj["TrainNumber"] = trainNo;
          obj["legId"] = legId;
          obj["JourneyType"] = req.body.journeyType;
          obj["BookingDate"] = req.body.selectedSingleJourney.DepartureDateTime;
          obj["FromStation"] = req.body.origin;
          obj["destination"] = req.body.destination;
          obj["AdultCount"] = req.body.adultCount;
          obj["ChildrenCount"] = req.body.childrenCount;
          obj["DepartureDate"] =
            req.body.selectedSingleJourney.DepartureDateTime;
          obj["ArrivalDateTime"] =
            req.body.selectedSingleJourney.ArrivalDateTime;
          obj["StandardFare"] = req.body.selectedSingleJourney.StandardFare;
          obj["BookingType"] = req.body.bookingType;
        } else if (i == 1) {
          obj["returnTrainNumber"] = trainNo; //req.body.selectedReturnJourney.TrainNumber  //result.Envelope.Body.JourneyDetailsRS.Journey.TrainSegments.TrainSegment.$.TrainNumber
          obj["returnLegId"] = legId;
          obj["returnJourneyType"] = req.body.journeyType;
          obj["returnBookingDate"] =
            req.body.selectedReturnJourney.DepartureDateTime;
          obj["returnFromStation"] = req.body.destination;
          obj["returnDestination"] = req.body.origin;
          obj["returnAdultCount"] = req.body.adultCount;
          obj["returnChildrenCount"] = req.body.childrenCount;
          obj["returnDepartureDate"] =
            req.body.selectedReturnJourney.DepartureDateTime;
          obj["returnArrivalDateTime"] =
            req.body.selectedReturnJourney.ArrivalDateTime;
          obj["returnStandardFare"] =
            req.body.selectedReturnJourney.StandardFare;
        }
        // console.log(obj)
      });
    }
  }
  if (req.body.journeyType == "roundTrip") {
    obj["totalFare"] =
      parseFloat(obj.StandardFare) + parseFloat(obj.returnStandardFare);
    obj["selectedSingleJourney"] = req.body.selectedSingleJourney;
    obj["selectedReturnJourney"] = req.body.selectedReturnJourney;
  } else {
    obj["totalFare"] = parseFloat(obj.StandardFare);
    obj["selectedSingleJourney"] = req.body.selectedSingleJourney;
  }

  return res
    .status(200)
    .json(createSuccessResponse(message.bookingDetails, obj));
};

const seatReservation = async (req, res) => {
  let journey = null;
  if (req.body.selectedReturnJourney) {
    journey = `<Journey JourneyIdentifier="${req.body.selectedSingleJourney.TrainNumber}" FareReference="${req.body.selectedSingleJourney.FareId}">
                    <TrainSegments>
                        <TrainSegment LegId="${req.body.legId}"></TrainSegment>
                    </TrainSegments>
                    <Seat>
                 </Seat>
                    </Journey>
                <Journey JourneyIdentifier="${req.body.selectedReturnJourney.TrainNumber}" FareReference="${req.body.selectedReturnJourney.FareId}">
                    <TrainSegments>
                        <TrainSegment LegId="${req.body.returnLegId}"></TrainSegment>
                    </TrainSegments>
                    <Seat>
                 </Seat>
                </Journey>`;
  } else {
    `<Journey JourneyIdentifier="${req.body.selectedReturnJourney.TrainNumber}" FareReference="${req.body.selectedSingleJourney.FareId}">
            <TrainSegments>
                <TrainSegment LegId="${req.body.legId}"></TrainSegment>
            </TrainSegments>
            <Seat>
            </Seat
                </Journey>`;
  }

  const xml = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
    <soap:Header>
        <wsa:Action>http://www.opentravel.org/OTA/2003/05/SeatReservation</wsa:Action>
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
        <SeatReservationRQ xmlns="http://www.opentravel.org/OTA/2003/05" Version="2.8" SequenceNmbr="1" TransactionIdentifier="${req.token.transactionIdentifier}"  >
            <POS xmlns="http://www.opentravel.org/OTA/2003/05">
                <Source>
                    <RequestorID Type="22" ID="richard@thepassengerhub.com" MessagePassword="Tpg321???" />
                    <BookingChannel>
                        <CompanyName xsi:type="CompanyNamePrefType" CompanyShortName="thepassengerhub" />
                    </BookingChannel>
                </Source>
            </POS>
            <Journeys>
                ${journey}
            </Journeys>
        </SeatReservationRQ>
    </soap:Body>
</soap:Envelope>`;

  let config = {
    headers: { "Content-Type": "application/xml" },
  };

  return axios.post(
    "https://thepassengerhub.evolviuat.com/evolvi.webapi/soapapi",
    xml,
    config
  );
};
module.exports = {
  StationSearch,
  bookingSearch,
  bookingDetail,
  seatReservation,
};
