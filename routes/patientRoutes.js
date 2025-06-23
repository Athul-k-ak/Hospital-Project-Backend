const express = require("express");
const { registerPatient, getPatients, getPatientsOfDoctor } = require("../controllers/patientController");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

router.post("/register", protect, registerPatient);
router.get("/", protect, getPatients);
router.get("/doctor-patients", protect, getPatientsOfDoctor);

module.exports = router;
