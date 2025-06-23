const Patient = require("../models/Patient");
const Appointment = require("../models/Appointment");

// ===========================================================
// 🧍 Register Patient (Admin / Reception Only)
// ===========================================================
const registerPatient = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: No user found in request" });
    }

    if (req.user.role !== "admin" && req.user.role !== "reception") {
      return res.status(403).json({ message: "Access denied. Only Admin and Reception can register patients." });
    }

    const { name, age, gender, phone, place } = req.body;

    if (!name || !age || !gender || !phone || !place) {
      return res.status(400).json({ message: "All fields are required: name, age, gender, phone" });
    }

    const existingPatient = await Patient.findOne({ phone });
    const message = existingPatient
      ? "Phone number is already used, but patient is registered successfully."
      : "Patient registered successfully.";

    const patient = await Patient.create({ name, age, gender, phone, place });

    res.status(201).json({ message, patient });
  } catch (error) {
    console.error("Error in registerPatient:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ===========================================================
// 📋 Get All Patients (Admin / Reception / Doctor)
// ===========================================================
const getPatients = async (req, res) => {
  try {
    if (
      !req.user ||
      (req.user.role !== "admin" && req.user.role !== "reception" && req.user.role !== "doctor")
    ) {
      return res.status(403).json({
        message: "Access denied. Only Admin and Reception can access patients.",
      });
    }

    const patients = await Patient.find({});
    res.status(200).json({ message: "Patients fetched successfully", patients });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ===========================================================
// 📞 Get Patients by Phone Number (Admin / Reception)
// ===========================================================
const getPatientsByPhone = async (req, res) => {
  try {
    if (!req.user || (req.user.role !== "admin" && req.user.role !== "reception")) {
      return res.status(403).json({
        message: "Access denied. Only Admin and Reception can search patients.",
      });
    }

    const { phone } = req.params;

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    const patients = await Patient.find({ phone });

    if (patients.length === 0) {
      return res.status(404).json({ message: "No patients found with this phone number" });
    }

    res.status(200).json({ message: "Patients fetched successfully", patients });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ===========================================================
// 🩺 Get Patients Assigned to Logged-in Doctor
// ===========================================================
const getPatientsOfDoctor = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Access denied" });
    }

    const appointments = await Appointment.find({ doctorId: req.user._id }).distinct("patientId");
    const patients = await Patient.find({ _id: { $in: appointments } });

    res.json(patients);
  } catch (error) {
    console.error("Error fetching doctor patients:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ===========================================================
// ✅ Export All Controllers
// ===========================================================
module.exports = {
  registerPatient,
  getPatients,
  getPatientsByPhone,
  getPatientsOfDoctor,
};
