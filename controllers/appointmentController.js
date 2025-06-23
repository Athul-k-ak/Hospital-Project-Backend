const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");

/* -------------------- Utility Functions -------------------- */

const parseTime = (timeStr) => {
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (modifier === "PM" && hours < 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const formatTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${formattedHours}:${mins.toString().padStart(2, "0")} ${period}`;
};

const getDayName = (dateString) => {
  const date = new Date(dateString + "T00:00:00Z");
  return date.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
};

/* -------------------- Controllers -------------------- */

// 📌 Book an Appointment
const bookAppointment = async (req, res) => {
  try {
    const { patientId, patient, doctorId, date, time } = req.body;

    if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ message: "Invalid doctor ID" });
    }
    if (!date) return res.status(400).json({ message: "Appointment date is required" });

    const appointmentDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDate < today) {
      return res.status(400).json({ message: "Cannot book an appointment for a past date" });
    }

    // 📌 Validate/Create Patient
    let finalPatientId, finalPatientName;
    if (patientId) {
      const existing = await Patient.findById(patientId);
      if (!existing) return res.status(400).json({ message: "Patient not found" });
      finalPatientId = existing._id;
      finalPatientName = existing.name;
    } else if (patient) {
      const { name, age, gender, phone } = patient;
      if (!name || !age || !gender || !phone) {
        return res.status(400).json({ message: "Incomplete patient details" });
      }
      const created = await Patient.create({ name, age, gender, phone });
      finalPatientId = created._id;
      finalPatientName = created.name;
    } else {
      return res.status(400).json({ message: "Patient details are required" });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(400).json({ message: "Doctor not found" });

    // 📌 Check Availability
    const dayName = getDayName(date);
    if (!doctor.availableDays.includes(dayName)) {
      return res.status(400).json({
        message: `Doctor not available on ${dayName}. Available: ${doctor.availableDays.join(", ")}`,
      });
    }
    if (!Array.isArray(doctor.availableTime) || doctor.availableTime.length === 0) {
      return res.status(400).json({ message: "Doctor's available time is not set" });
    }

    const existingAppointments = await Appointment.find({ doctorId, date });
    const takenTimes = existingAppointments.map((appt) => appt.time);

    const isTimeValid = (timeStr) => {
      const mins = parseTime(timeStr);
      return doctor.availableTime.some((slot) => {
        const [start, end] = slot.split(" - ").map(parseTime);
        return mins >= start && mins + 10 <= end;
      });
    };

    let finalTime = time;

    if (time) {
      if (!isTimeValid(time)) {
        return res.status(400).json({ message: "Time not within doctor's available slots" });
      }
      if (takenTimes.includes(time)) {
        return res.status(400).json({ message: "Selected time is already booked" });
      }
    } else {
      // 📌 Auto-assign a 10-min free slot
      for (const slot of doctor.availableTime) {
        const [startStr, endStr] = slot.split(" - ");
        let start = parseTime(startStr);
        const end = parseTime(endStr);
        while (start + 10 <= end) {
          const candidate = formatTime(start);
          if (!takenTimes.includes(candidate)) {
            finalTime = candidate;
            break;
          }
          start += 10;
        }
        if (finalTime) break;
      }

      if (!finalTime) {
        return res.status(400).json({ message: "All slots are full for selected date" });
      }
    }

    const appointment = await Appointment.create({
      patientId: finalPatientId,
      patientName: finalPatientName,
      doctorId,
      date,
      time: finalTime,
      fee: doctor.fee,
    });

    res.status(201).json({
      message: "Appointment booked successfully",
      appointment: {
        _id: appointment._id,
        patientId: appointment.patientId,
        patientName: appointment.patientName,
        doctorId: appointment.doctorId,
        date: appointment.date,
        time: appointment.time,
      },
      doctorName: doctor.name,
    });
  } catch (error) {
    console.error("Book Appointment Error:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 📌 Doctor Dashboard: My Appointments
const getMyAppointments = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ message: "Access denied" });
    }

    const appointments = await Appointment.find({ doctorId: req.user._id })
      .populate("patientId", "name age gender phone")
      .sort({ date: 1, time: 1 });

    const formatted = appointments.map((appt) => ({
      _id: appt._id,
      date: appt.date,
      time: appt.time,
      status: appt.status || "Booked",
      patient: appt.patientId,
    }));

    res.json({ appointments: formatted });
  } catch (error) {
    console.error("Get My Appointments Error:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 📌 Admin/Reception: Grouped Appointments by Doctor
const getAppointmentsByDoctor = async (req, res) => {
  try {
    const result = await Appointment.aggregate([
      {
        $lookup: {
          from: "doctors",
          localField: "doctorId",
          foreignField: "_id",
          as: "doctor",
        },
      },
      { $unwind: "$doctor" },
      {
        $lookup: {
          from: "patients",
          localField: "patientId",
          foreignField: "_id",
          as: "patient",
        },
      },
      { $unwind: "$patient" },
      {
        $group: {
          _id: "$doctor._id",
          doctorName: { $first: "$doctor.name" },
          appointments: {
            $push: {
              _id: "$_id",
              date: "$date",
              time: "$time",
              status: { $ifNull: ["$status", "Booked"] },
              patientName: "$patient.name",
            },
          },
        },
      },
      {
        $project: {
          doctorId: "$_id",
          doctorName: 1,
          appointments: 1,
          _id: 0,
        },
      },
    ]);

    res.json(result);
  } catch (error) {
    console.error("getAppointmentsByDoctor Error:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 📌 Admin/Reception: Appointments by Doctor ID
const getAppointmentsByDoctorId = async (req, res) => {
  try {
    const { doctorId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ message: "Invalid doctor ID" });
    }

    const appointments = await Appointment.find({ doctorId })
      .populate("doctorId", "name specialization")
      .populate("patientId", "name age gender phone")
      .sort({ date: 1, time: 1 });

    const formatted = appointments.map((appt) => ({
      _id: appt._id,
      date: appt.date,
      time: appt.time,
      status: appt.status || "Booked",
      doctor: appt.doctorId,
      patient: appt.patientId,
    }));

    res.json({ doctorId, appointments: formatted });
  } catch (error) {
    console.error("getAppointmentsByDoctorId Error:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 📌 Update Appointment Status
const updateAppointmentStatus = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status } = req.body;

    const validStatuses = ["Booked", "Completed", "Cancelled", "Scheduled", "Pending"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updated = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Appointment not found" });

    res.json({ message: "Appointment status updated", appointment: updated });
  } catch (error) {
    console.error("Update Status Error:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// 📌 Get Appointment By ID
const getAppointmentById = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId)
      .populate("doctorId", "name specialization phone")
      .populate("patientId", "name age gender phone place");

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.json({
      _id: appointment._id,
      doctor: appointment.doctorId,
      patient: appointment.patientId,
      date: appointment.date,
      time: appointment.time,
      status: appointment.status || "Booked",
    });
  } catch (error) {
    console.error("Get Appointment By ID Error:", error.message);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/* -------------------- Export -------------------- */
module.exports = {
  bookAppointment,
  getMyAppointments,
  getAppointmentsByDoctor,
  getAppointmentsByDoctorId,
  updateAppointmentStatus,
  getAppointmentById,
};
