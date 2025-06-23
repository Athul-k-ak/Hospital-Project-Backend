const router = require("express").Router();
const {
  getAppointment,
  createOrder,
  verifyPayment
} = require("../controllers/paymentController");

const protect = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// 👇 Admin + Reception can fetch and pay
router.get("/:id", protect, authorizeRoles("admin", "reception"), getAppointment);
router.post("/create-order", protect, authorizeRoles("admin", "reception"), createOrder);
router.post("/verify-payment", protect, authorizeRoles("admin", "reception"), verifyPayment);

module.exports = router;
