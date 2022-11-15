const mongoose = require("mongoose");

const Schema = mongoose.Schema;
// type overground => ['Round Trip', 'One Day Ticket']
// type underground => ['Long Ticket', 'One Day Ticket']

const booking = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "user",
    },
    ticketId: {
      type: String,
      // required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["overground", "underground"],
    },
    price: {
      type: Number,
      // required: true
    },
    source: {
      type: String,
      default: null,
    },
    sourceCRSCode: {
      type: String,
      default: null,
    },
    destination: {
      type: String,
      default: null,
    },
    destinationCRSCode: {
      type: String,
      default: null,
    },
    bookingDate: {
      type: Date,
      required: true,
    },
    bookingType: {
      type: String,
      required: true,
      enum: ["Round Trip", "One Day Ticket", "Long Ticket"],
    },
    fareType: {
      type: String,
      default: null,
    },
    arrivalTime: {
      type: Date,
      default: null,
    },
    departureTime: {
      type: Date,
      default: null,
    },
    isCancel: {
      type: Boolean,
      default: false,
    },
    leaveAftertime: {
      type: String,
    },
    trainName: {
      type: String,
    },
    paymentType: {
      type: String,
      enum: ["paid", "finance"],
    },
    ticketCancelreason: {
      type: String,
    },
    refundRejectreason: {
      type: String,
    },
    isRefund: {
      type: String,
      enum: ["Accepted", "Rejected", "Pending"],
      default: "Pending",
    },
    trainNumber: {
      type: String,
      // required: true
    },
    childrenCount: {
      type: Number,
      // required: true
    },
    adultCount: {
      type: Number,
      // required: true
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["Delivered", "Under Processing", "Under Deliver"],
      default: "Under Processing",
    },
    seatNumber: [
      {
        type: Number,
        default: null,
      },
    ],
    returnDetails: {
      trainName: {
        type: String,
      },
      // trainNumber: { type: String },
      source: {
        type: String,
        default: null,
      },
      sourceCRSCode: {
        type: String,
        default: null,
      },
      destination: {
        type: String,
        default: null,
      },
      destinationCRSCode: {
        type: String,
        default: null,
      },
      adultCount: {
        type: Number,
      },
      childrenCount: {
        type: Number,
      },
      leaveAftertime: {
        type: String,
        default: null,
      },
      returnDate: {
        type: Date,
      },
      seatNumber: [
        {
          type: Number,
          default: null,
        },
      ],
      trainNumber: {
        type: String,
      },
    },
    courierDetails: {
      courierCompanyname: { type: String, default: null },
      trackingId: { type: String, default: null },
      trackingUrl: { type: String, default: null },
    },
    passengerType: {
      type: String,
    },
    duration: {
      type: String,
    },
    transactionId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);
module.exports = mongoose.model("booking", booking);
