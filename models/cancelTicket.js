const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const cancelTicket = new Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "user" },
    ticketId: { type: String, required: true },
    price: { type: Number, required: true },
    paymentType: { type: String, default: null },
    isApproved: { type: Boolean, default: false },
    isRejected: { type: Boolean, default: false },
    isPending: { type: Boolean, default: true },
  },
  { timestamps: true }
);
module.exports = mongoose.model("cancelTicket", cancelTicket);
