const Razorpay = require("razorpay");
const Appointment = require("../models/Appointment");
const Billing = require("../models/Billing");
const crypto = require("crypto");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// =============================================================
// 📋 Get Appointment Details for Payment
// =============================================================
exports.getAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findById(id)
      .populate("doctorId", "name specialty fee")
      .populate("patientId", "name phone");

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.json({
      appointment: {
        _id: appointment._id,
        date: appointment.date,
        time: appointment.time,
        fee: appointment.fee,
        paymentStatus: appointment.paymentStatus,
        doctor: {
          name: appointment.doctorId.name,
          specialty: appointment.doctorId.specialty,
          fee: appointment.doctorId.fee,
        },
        patient: {
          name: appointment.patientId.name,
          phone: appointment.patientId.phone,
        },
      },
    });
  } catch (err) {
    console.error("❌ Error fetching appointment:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// =============================================================
// 🧾 Create Razorpay Order for Appointment
// =============================================================
exports.createOrder = async (req, res) => {
  try {
    const { appointmentId } = req.body;

    const appointment = await Appointment.findById(appointmentId)
      .populate("doctorId", "fee name")
      .populate("patientId", "phone");

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const amount = appointment.doctorId.fee * 100;

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `rcpt_${appointmentId}`,
    });

    appointment.razorpayOrderId = order.id;
    appointment.fee = appointment.doctorId.fee;
    await appointment.save();

    res.json({
      orderId: order.id,
      currency: order.currency,
      amount: order.amount,
      key: process.env.RAZORPAY_KEY_ID,
      appointment: {
        patientName: appointment.patientId.name,
        patientContact: appointment.patientId.phone,
        doctorName: appointment.doctorId.name,
      },
    });
  } catch (err) {
    console.error("❌ Error creating order:", err.message);
    res.status(500).json({ message: "Failed to create Razorpay order" });
  }
};

// =============================================================
// 🔐 Verify Razorpay Payment & Create Billing Record
// =============================================================
exports.verifyPayment = async (req, res) => {
  const {
    appointmentId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  try {
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    const appointment = await Appointment.findById(appointmentId)
      .populate("doctorId", "fee")
      .populate("patientId", "name");

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // ✅ Mark appointment as paid
    appointment.paymentStatus = "Paid";
    await appointment.save();

    // ✅ Create billing record
    const billing = new Billing({
      appointmentId: appointment._id,
      patientId: appointment.patientId._id,
      amount: appointment.fee || appointment.doctorId.fee,
      billingDate: new Date(),
      paymentStatus: "paid",
      details: `Consultation fee for appointment on ${appointment.date} at ${appointment.time}`,
    });

    await billing.save();

    res.status(200).json({
      message: "Payment verified successfully",
      billingId: billing._id,
    });
  } catch (error) {
    console.error("❌ Payment verification failed:", error);
    res.status(500).json({ message: "Payment verification failed" });
  }
};
