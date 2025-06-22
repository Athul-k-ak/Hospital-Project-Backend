require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const connectDB = require("./config/db");

// Import routes
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const receptionRoutes = require("./routes/receptionRoutes");
const patientRoutes = require("./routes/patientRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const bloodBankRoutes = require("./routes/bloodBankRoutes");
const patientReportRoutes = require("./routes/patientReportRoutes");
const billingRoutes = require("./routes/billingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const staffRoutes = require("./routes/staffRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();

// Connect to database
connectDB();

// Middlewares
app.use(cors({
  origin: "https://hospital-project-frontend-p94m.onrender.com", // frontend URL
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/reception", receptionRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/appointment", appointmentRoutes);
app.use("/api/bloodbank", bloodBankRoutes);
app.use("/api/patientreport", patientReportRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ---------- Serve Frontend (React Build) ----------
const __dirnamePath = path.resolve(); // to support __dirname in ES modules
app.use(express.static(path.join(__dirnamePath, "client", "build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirnamePath, "client", "build", "index.html"));
});

// ---------- Error Handler ----------
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

// ---------- Start Server ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
