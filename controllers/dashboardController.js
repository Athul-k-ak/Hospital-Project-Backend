const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const Appointment = require("../models/Appointment");
const Billing = require("../models/Billing");
const Staff = require("../models/Staff");

/* -------------------- Dashboard Metrics -------------------- */

// 📌 Total Patients Count
const getPatientCount = async (req, res) => {
  try {
    const count = await Patient.countDocuments();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: "Error fetching patient count", error: error.message });
  }
};

// 📌 Total Doctors Count
const getDoctorCount = async (req, res) => {
  try {
    const count = await Doctor.countDocuments();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: "Error fetching doctor count", error: error.message });
  }
};

// 📌 Total Staff Count
const getStaffCount = async (req, res) => {
  try {
    const count = await Staff.countDocuments();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: "Error fetching staff count", error: error.message });
  }
};

// 📌 On-Duty Staff List
const getOnDutyStaff = async (req, res) => {
  try {
    const staff = await Staff.find({ onDuty: true }).select("name role");
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: "Error fetching on-duty staff", error: error.message });
  }
};

// 📌 Available Doctors Today
const listAvailableDoctorsToday = async (req, res) => {
  try {
    const today = new Date();
    const dayOfWeek = today.toLocaleString("en-US", { weekday: "long" }); // E.g., "Monday"

    const availableDoctors = await Doctor.find({
      availableDays: dayOfWeek,
    }).select("name specialty");

    res.json({
      count: availableDoctors.length,
      doctors: availableDoctors,
    });
  } catch (error) {
    console.error("Available Doctors Error:", error);
    res.status(500).json({ message: "Failed to fetch available doctors", error: error.message });
  }
};

/* -------------------- Appointments -------------------- */

// 📌 Today's Appointments Summary
const getTodayAppointments = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const appointments = await Appointment.find({
      date: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate("patientId", "name")
      .populate("doctorId", "name department")
      .sort({ date: -1 })
      .limit(5);

    const count = await Appointment.countDocuments({
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    const recent = appointments.map((a) => ({
      patientName: a.patientId?.name || "Unknown",
      doctorName: a.doctorId?.name || "Unknown",
      department: a.doctorId?.department || "Unknown",
      date: a.date,
    }));

    res.status(200).json({ count, recent });
  } catch (error) {
    console.error("Today's Appointments Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* -------------------- Billing -------------------- */

// 📌 Monthly Revenue Summary
const getMonthlyRevenue = async (req, res) => {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const bills = await Billing.find({
      createdAt: { $gte: start, $lte: end },
      paymentStatus: "Paid",
    });

    const amount = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    res.json({ amount });
  } catch (error) {
    res.status(500).json({ message: "Error calculating monthly revenue", error: error.message });
  }
};

/* -------------------- Export -------------------- */

module.exports = {
  getPatientCount,
  getDoctorCount,
  getStaffCount,
  getOnDutyStaff,
  listAvailableDoctorsToday,
  getTodayAppointments,
  getMonthlyRevenue,
};
