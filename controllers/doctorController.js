const Doctor = require("../models/Doctor");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cloudinary = require("../config/cloudinary");

/* ===========================================================
   🔐 Register Doctor (Admin Only)
=========================================================== */
const registerDoctor = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Access Denied" });
    }

    const {
      name, email, password, phone,
      specialty, qualification, fee,
    } = req.body;

    const availableDays = req.body.availableDays ? JSON.parse(req.body.availableDays) : [];
    const availableTime = req.body.availableTime ? JSON.parse(req.body.availableTime) : [];

    if (!name || !email || !password || !phone || !specialty || !qualification || !availableDays.length || !availableTime.length) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await Doctor.findOne({ email });
    if (existing) return res.status(400).json({ message: "Doctor already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    let profileImage = null;
    if (req.file) {
      const uploaded = await cloudinary.uploader.upload(req.file.path, {
        folder: "hospital_dashboard/doctors",
      });
      profileImage = uploaded.secure_url;
    }

    const doctor = await Doctor.create({
      name,
      email,
      password: hashedPassword,
      phone,
      specialty,
      qualification,
      availableDays,
      availableTime,
      profileImage,
      fee: fee || 500,
    });

    res.status(201).json({
      _id: doctor.id,
      name: doctor.name,
      email: doctor.email,
      role: doctor.role,
      profileImage: doctor.profileImage,
    });
  } catch (error) {
    console.error("Register Doctor Error:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ===========================================================
   🔓 Login Doctor
=========================================================== */
const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    const doctor = await Doctor.findOne({ email });
    if (!doctor || !doctor.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: doctor.id, role: "doctor" }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.cookie("jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    }).json({
      _id: doctor.id,
      name: doctor.name,
      email: doctor.email,
      role: "doctor",
    });
  } catch (error) {
    console.error("Login Doctor Error:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ===========================================================
   🔓 Logout Doctor
=========================================================== */
const logout = (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  res.json({ message: "Logged out successfully" });
};

/* ===========================================================
   📋 Get All Doctors (Admin/Reception)
=========================================================== */
const getDoctors = async (req, res) => {
  try {
    if (!req.user || (req.user.role !== "admin" && req.user.role !== "reception")) {
      return res.status(403).json({ message: "Access Denied" });
    }

    const doctors = await Doctor.find();
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/* ===========================================================
   📄 Get Doctor by ID
=========================================================== */
const getDoctorById = async (req, res) => {
  try {
    if (!req.user || (req.user.role !== "admin" && req.user.role !== "reception")) {
      return res.status(403).json({ message: "Access Denied" });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    res.json(doctor);
  } catch (error) {
    console.error("Get Doctor Error:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ===========================================================
   ✏️ Update Doctor (Admin Only)
=========================================================== */
const updateDoctor = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Access Denied" });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const {
      name, email, phone, specialty,
      qualification, availableDays,
      availableTime, fee,
    } = req.body;

    if (name) doctor.name = name;
    if (email) doctor.email = email;
    if (phone) doctor.phone = phone;
    if (specialty) doctor.specialty = specialty;
    if (qualification) doctor.qualification = qualification;
    if (availableDays) doctor.availableDays = JSON.parse(availableDays);
    if (availableTime) doctor.availableTime = JSON.parse(availableTime);
    if (fee && !isNaN(fee)) doctor.fee = fee;

    if (req.file) {
      const uploaded = await cloudinary.uploader.upload(req.file.path, {
        folder: "hospital_dashboard/doctors",
      });
      doctor.profileImage = uploaded.secure_url;
    }

    await doctor.save();
    res.json({ message: "Doctor updated successfully", doctor });
  } catch (error) {
    console.error("Update Doctor Error:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ===========================================================
   💰 Get All Doctor Fees
=========================================================== */
const getDoctorFees = async (req, res) => {
  try {
    const doctors = await Doctor.find({}, "name specialty fee");
    res.json({ doctors });
  } catch (error) {
    console.error("Get Doctor Fees Error:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ===========================================================
   💰 Update Doctor Fee by ID
=========================================================== */
const updateDoctorFee = async (req, res) => {
  try {
    const { id } = req.params;
    const { fee } = req.body;

    if (!fee || isNaN(fee) || fee <= 0) {
      return res.status(400).json({ message: "Invalid fee value" });
    }

    const doctor = await Doctor.findByIdAndUpdate(id, { fee }, { new: true });
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    res.json({ message: "Doctor fee updated", doctor });
  } catch (error) {
    console.error("Update Fee Error:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ===========================================================
   💰 Set Fee (Alternate)
=========================================================== */
const enterDoctorFees = async (req, res) => {
  try {
    const doctorId = req.params.id;
    const { fee } = req.body;

    if (!fee || fee < 0) {
      return res.status(400).json({ message: "Invalid or missing fee" });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    doctor.fee = fee;
    await doctor.save();

    res.json({
      message: "Doctor fee set successfully",
      doctor: {
        id: doctor._id,
        name: doctor.name,
        fee: doctor.fee,
      },
    });
  } catch (error) {
    console.error("Enter Fee Error:", error.message);
    res.status(500).json({ message: "Failed to set doctor fee" });
  }
};

/* ===========================================================
   ✅ Export All Functions
=========================================================== */
module.exports = {
  registerDoctor,
  loginDoctor,
  logout,
  getDoctors,
  getDoctorById,
  updateDoctor,
  getDoctorFees,
  updateDoctorFee,
  enterDoctorFees,
};
