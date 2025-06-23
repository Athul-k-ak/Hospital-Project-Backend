const express = require("express");
const {
  registerDoctor,
  loginDoctor,
  logout,
  getDoctors,
  getDoctorById,
  updateDoctor,
  getDoctorFees,
  updateDoctorFee,
  enterDoctorFees,
} = require("../controllers/doctorController");

const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post("/signup", protect, upload.single("profileImage"), registerDoctor);
router.post("/login", loginDoctor);
router.post("/logout", logout);
router.get("/", protect, getDoctors);

// ⚠️ Place /fees route BEFORE /:id
router.get("/fees", protect, getDoctorFees); // ✅ fix
router.put("/fees/set/:id", protect, enterDoctorFees);
router.put("/fees/update/:id", protect, updateDoctorFee);

router.get("/:id", protect, getDoctorById);
router.put("/:id", protect, upload.single("profileImage"), updateDoctor);

module.exports = router;
