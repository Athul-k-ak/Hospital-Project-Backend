const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

const {
  bookAppointment,
  getMyAppointments,
  getAppointmentsByDoctor,
  getAppointmentsByDoctorId,
  updateAppointmentStatus,
  getAppointmentById,
} = require("../controllers/appointmentController");

router.post("/book", protect, bookAppointment);

router.get("/my", protect, getMyAppointments); // Logged-in doctor only
router.get("/by-doctor-grouped", protect, getAppointmentsByDoctor); // Admin/Reception
router.get("/doctor/:doctorId", protect, getAppointmentsByDoctorId); // View by ID

router.put("/:appointmentId/status", protect, updateAppointmentStatus);
router.get("/:appointmentId", protect, getAppointmentById);

module.exports = router;
