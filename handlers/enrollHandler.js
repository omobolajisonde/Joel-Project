const { Lecturer, Course, Student } = require("../models/attendanceModel");
const catchAsync = require("../utils/catchAsync");

// Endpoint for enrolling a student into a course with Websocket.
exports.enrollStudentWithWebsocket = catchAsync(async (socket, data) => {
  console.log("Starting enrollment process with websocket for", data);
  // Find the lecturer by email to get the selected courses
  const lecturer = await Lecturer.findOne({
    email: data.lecturerEmail,
  });

  const { courseCode, courseName, name, matricNo } = data;

  // Find the course by its course code
  let course = await Course.findOne({ courseCode });

  if (!course) {
    // If the course doesn't exist, create it
    course = new Course({
      courseCode: courseCode,
      courseName: courseName,
      lecturer: lecturer._id,
      students: [],
      attendance: [],
    });
    await course.save();
  }

  // Find or create a student by matricNo
  let student = await Student.findOne({ matricNo });

  if (!student) {
    student = new Student({
      name,
      matricNo,
      courses: [course._id],
    });
    await student.save();
  } else {
    // If the student already exists, check if the current course is already enrolled
    if (!student.courses.includes(course._id)) {
      student.courses.push(course._id); // Add the current course to the array of courses
      await student.save();
    }
  }

  // Add the student to the course's list of enrolled students
  course.students.push(student._id);
  await course.save();

  // Emit an 'enroll' event to ESP32 device
  socket.emit("enroll", { name, matricNo, courseCode });

  // Wait for enrollment feedback from ESP32 device
  socket.on("enroll_feedback", async (feedback) => {
    console.log("Enrollment feedback received:", feedback);

    // If feedback indicates an error, rollback the enrollment process
    if (feedback.error) {
      // Rollback actions: Delete the created student and remove from course
      await Student.findByIdAndDelete(student._id);
      course.students.pull(student._id);
      await course.save();

      // Send response to the frontend with error message
      return socket.emit("enroll_feedback", "Enrollment failed");
    } else {
      // Send response to the frontend with success message
      return socket.emit("enroll_feedback", "Enrollment Success");
    }
  });
});
