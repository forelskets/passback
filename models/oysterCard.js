const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const oysterCardSchema = new Schema(
  {
    zones: {
      type: String,
      required: true,
    },
    oneDayAnyTime: {
      type: Number,
      required: true,
    },
    oneDayAnyTimeFinal: {
      type: Number,
      default: 0,
    },
    oneDayOffPeak: {
      type: Number,
      required: true,
    },
    oneDayOffPeakFinal: {
      type: Number,
      default: 0,
    },
    sevenday: {
      type: Number,
      required: true,
    },
    sevendayFinal: {
      type: Number,
      default: 0,
    },
    monthly: {
      type: Number,
      required: true,
    },
    monthlyFinal: {
      type: Number,
      default: 0,
    },
    annual: {
      type: Number,
      require: true,
    },
    annualFinal: {
      type: Number,
      default: 0,
    },
    percent: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

const perCalc = (value, perc) => {
  let valuePer = value / 100;
  let percV = valuePer * perc;
  finalV = percV + value;
  console.log(finalV, "final");
  return finalV;
};

oysterCardSchema.pre("save", async function (next) {
  if (this.isModified("zones")) return next();
  console.log(this, "thisssss");
  this.oneDayAnyTimeFinal = perCalc(this.oneDayAnyTime, this.percent);
  this.oneDayOffPeakFinal = perCalc(this.oneDayOffPeak, this.percent);
  this.sevendayFinal = perCalc(this.sevenday, this.percent);
  this.monthlyFinal = perCalc(this.monthly, this.percent);
  this.annualFinal = perCalc(this.annual, this.percent);
  next();
});

const OysterCard = new model("oystercard", oysterCardSchema);

module.exports = OysterCard;
