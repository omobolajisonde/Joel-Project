const { Course, Student, Attendance } = require("../models/attendanceModel");
const catchAsync = require("../utils/catchAsync");

exports.takeAttendanceWithWebsocket = catchAsync(async (socket, data) => {
  console.log("Started attendance marking process with Websocket for", data);

  const { courseCode, matricNo } = data;

  // Find the course by its course code
  const course = await Course.findOne({ courseCode });

  // Find the student by their matriculation number
  const student = await Student.findOne({ matricNo });

  if (!student) {
    return socket.emit("attendance_feedback", "Student not found");
  }

  // Check if the student is enrolled in the course
  if (!student.courses.includes(course._id)) {
    return socket.emit(
      "attendance_feedback",
      "Student is not enrolled in the course"
    );
  }

  // Check if attendance for the current date already exists
  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const endOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1
  );

  // Check if there is an attendance for the day
  const existingAttendance = await Attendance.findOne({
    course: course._id,
    date: { $gte: startOfDay, $lt: endOfDay },
  });

  if (existingAttendance) {
    // Check if the student has already been marked present
    if (existingAttendance.studentsPresent.includes(student._id)) {
      return socket.emit(
        "attendance_feedback",
        "Attendance has already been marked for this student today"
      );
    }
    return;
  }

  // Emit a 'take_attendance' event to ESP32 device
  socket.emit("take_attendance", { courseCode, matricNo });

  // Wait for attendance feedback from ESP32 device
  socket.on("attendance_feedback", async (feedback) => {
    console.log("Attendance feedback received:", feedback);
    // If feedback indicates an error, send response to the frontend
    if (feedback.error) {
      return socket.emit(
        "attendance_feedback",
        `Error occurred during attendance marking: ${feedback.error}`
      );
    } else {
      // If feedback indicates success, send response to the frontend
      // Create a new attendance record for the current date
      const newAttendance = new Attendance({
        course: course._id,
        date: today,
        studentsPresent: [student._id],
      });
      await newAttendance.save();

      // Update the attendance property in the Course schema
      course.attendance.push(newAttendance._id);
      await course.save();

      return socket.emit(
        "attendance_feedback",
        `Attendance marked successfully`
      );
    }
  });
});
