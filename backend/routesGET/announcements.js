const express = require("express");
const AnnoucementRoute = express.Router();
const PDFDocument = require("pdfkit");

const { logMessage } = require("../utils/logger");
const { fetchUser } = require("../utils/fetchUser");
const { checkToken } = require("../middleware/checkToken");
const { interfaceFetch } = require("../utils/interface");
const {
  checkTokenAndUserType,
} = require("../middleware/checkTokenandUsertype");

const Announcement = require("../models/announcements");
const User = require("../models/users");

// GET route for fetching announcements
AnnoucementRoute.get("/", checkToken, async (req, res) => {
  try {
    let username = await fetchUser(req, res);
    let userData = await User.findOne({ username: username }).select(
      "user_type department"
    );
    let user_type = userData.user_type;
    let department = userData.department; // Correctly get the department

    // Fetch all announcements and sort by date (newest first)
    const announcements = await Announcement.find({}).sort({ date: -1 });

    // Return announcements with registration status
    res.render("announcement", {
      announcements: announcements,
      username: username,
      user_type: user_type,
      department: department, // Pass the department to the template
    });
  } catch (error) {
    logMessage("error", `Error fetching announcements: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error fetching announcements",
      error: error.message,
    });
  }
});

// POST route for event registration
AnnoucementRoute.post("/register", checkTokenAndUserType, async (req, res) => {
  try {
    const eventId = req.body.eventId;
    const username = await fetchUser(req, res);
    const interface = await interfaceFetch(req, res);
    let userIP = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    if (
      (await User.findOne({ username: username }).select("user_type")) ===
      "Mentor"
    ) {
      return res.status(403).json({
        success: false,
        message: "Mentors cannot register for events",
      });
    }

    if (Array.isArray(userIP)) {
      userIP = userIP[0];
    } else if (userIP.includes(",")) {
      userIP = userIP.split(",")[0].trim();
    }

    // Find the announcement
    const announcement = await Announcement.findOne({ id: eventId });

    if (!announcement) {
      logMessage(
        "error",
        `Event registration failed: Event ${eventId} not found for user ${username} from ${userIP}`
      );
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check if user is already registered
    if (announcement.registeredusers.includes(username)) {
      logMessage(
        "info",
        `User ${username} attempted to register again for event ${eventId} from ${userIP}`
      );
      return res.status(400).json({
        success: false,
        message: "You are already registered for this event",
      });
    }

    // Add user to registered users array
    announcement.registeredusers.push(username);
    await announcement.save();

    logMessage(
      `[=] ${interface} ${userIP} : User ${username} successfully registered for event ${eventId}.`
    );

    res.status(200).json({
      success: true,
      message: "Successfully registered for the event",
    });
  } catch (error) {
    logMessage("error", `Event registration error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error registering for event",
      error: error.message,
    });
  }
});

AnnoucementRoute.get("/:id/download", checkToken, async (req, res) => {
  try {
    const username = await fetchUser(req, res);
    const userData = await User.findOne({ username });
    if (!userData || userData.user_type !== "Mentor") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const announcementId = req.params.id;
    const announcement = await Announcement.findOne({ id: announcementId });
    if (!announcement) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    if (userData.department !== announcement.department) {
      return res.status(403).json({
        success: false,
        message: "Mentor not authorized for this department",
      });
    }

    const registeredUsers = await User.find({
      username: { $in: announcement.registeredusers },
    }).select("username firstname lastname");

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const filename = `event_${announcement.title}.pdf`;
    console.log("Filename:", filename);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    // Heading
    doc
      .fontSize(20)
      .text(`${announcement.title} - ${announcement.department}`, {
        align: "center",
      });
    doc.moveDown();
    doc
      .fontSize(14)
      .text(`Date: ${new Date(announcement.date).toDateString()}`, {
        align: "center",
      });
    doc.text(`Time: ${announcement.time}`, { align: "center" });
    doc.moveDown(2);

    // Table Column Coordinates
    const startX = 50;
    const columnWidths = [150, 200, 150]; // Moodle ID, Name, Signature
    const [col1, col2, col3] = [
      startX,
      startX + columnWidths[0],
      startX + columnWidths[0] + columnWidths[1],
    ];
    // Add a little space before table header
    let tableTopY = doc.y + 5;

    // Table Header
    doc.fontSize(12).font("Helvetica-Bold");
    doc.text("Moodle ID", col1 + 5, tableTopY);
    doc.text("Name", col2 + 5, tableTopY);
    doc.text("Signature", col3 + 5, tableTopY);
    tableTopY += 20; // Move to the bottom of the header

    // Draw Header Box with Vertical Lines
    doc
      .moveTo(startX, tableTopY - 20)
      .lineTo(
        startX + columnWidths[0] + columnWidths[1] + columnWidths[2],
        tableTopY - 20
      )
      .stroke(); // Top line

    doc
      .moveTo(startX, tableTopY)
      .lineTo(
        startX + columnWidths[0] + columnWidths[1] + columnWidths[2],
        tableTopY
      )
      .stroke(); // Bottom of header

    doc
      .moveTo(col1, tableTopY - 20)
      .lineTo(col1, tableTopY)
      .stroke(); // Vertical left border
    doc
      .moveTo(col2, tableTopY - 20)
      .lineTo(col2, tableTopY)
      .stroke(); // Vertical between columns
    doc
      .moveTo(col3, tableTopY - 20)
      .lineTo(col3, tableTopY)
      .stroke(); // Vertical between columns
    doc
      .moveTo(col3 + columnWidths[2], tableTopY - 20)
      .lineTo(col3 + columnWidths[2], tableTopY)
      .stroke(); // Rightmost border

    // Table Content
    doc.font("Helvetica");
    registeredUsers.forEach((user, index) => {
      const rowY = tableTopY + index * 25;

      // Row text
      doc.text(user.username, col1 + 5, rowY + 5);
      const fullName = `${user.firstname || "-"} ${user.lastname || "-"}`;
      doc.text(fullName, col2 + 5, rowY + 5);
      doc.text("", col3 + 5, rowY + 5);

      // Row bottom line
      doc
        .moveTo(startX, rowY + 25)
        .lineTo(
          startX + columnWidths[0] + columnWidths[1] + columnWidths[2],
          rowY + 25
        )
        .stroke();

      // Vertical lines for each column in the row
      doc
        .moveTo(col1, rowY)
        .lineTo(col1, rowY + 25)
        .stroke(); // Left
      doc
        .moveTo(col2, rowY)
        .lineTo(col2, rowY + 25)
        .stroke(); // Between Moodle ID and Name
      doc
        .moveTo(col3, rowY)
        .lineTo(col3, rowY + 25)
        .stroke(); // Between Name and Signature
      doc
        .moveTo(col3 + columnWidths[2], rowY)
        .lineTo(col3 + columnWidths[2], rowY + 25)
        .stroke(); // Right
    });

    // End PDF
    doc.end();
  } catch (err) {
    logMessage(`[*] Error generating PDF: ${err.message}`);
    res.status(500).json({
      success: false,
      message: "PDF generation error",
      error: err.message,
    });
  }
});

module.exports = AnnoucementRoute;
