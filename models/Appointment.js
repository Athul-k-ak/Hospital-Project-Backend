const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
  patientName: String,
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
  date: String,
  time: String,
  fee: { type: Number, default: 0 },
  razorpayOrderId: String,
  razorpayPaymentId: String,
  paymentStatus: { type: String, enum: ["Pending", "Paid"], default: "Pending" },
  status: { type: String, enum: ["Booked", "Completed", "Cancelled", "Scheduled"], default: "Booked" }
});

module.exports = mongoose.model("Appointment", appointmentSchema);
