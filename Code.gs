// This is the server-side script for the Peer Review Platform.

const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID"; // Replace with your Google Sheet ID
const sheetUsers = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Users");
const sheetArtifacts = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Artifacts");
const sheetReviews = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Reviews");
const sheetAssignments = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Assignments");

function doGet(e) {
  return HtmlService.createTemplateFromFile('Index').evaluate()
      .setTitle("פלטפורמת ביקורת עמיתים")
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// User Management
function registerUser(username, fullName, password, securityQuestion, securityAnswer) {
  // Implementation for user registration
  // Check if user already exists, if not, add them to the 'Users' sheet.
  // Returns a success or error message.
}

function loginUser(username, password) {
  // Implementation for user login
  // Check credentials against 'Users' sheet.
  // Returns user data on success or an error message.
}

function getUserProfile(username) {
  // Implementation to get user profile data and their submitted artifacts.
}

// Artifact Management
function submitArtifact(artifactData) {
  // Implementation to add a new artifact to the 'Artifacts' sheet.
  // After submission, trigger review assignments.
}

function getGalleryArtifacts(tag = null) {
  // Implementation to get all published artifacts, optionally filtered by a tag.
}

function getArtifactDetails(artifactId) {
    // Implementation to get details for a single artifact, including its reviews.
}

// Review Management
function assignReviews(submitterUsername, artifactId) {
  // Silently assign 5 random users (not the submitter) to review the artifact.
  // Add assignments to the 'Assignments' sheet.
}

function getAssignedReviews(username) {
  // Get all artifacts assigned to a user for review.
}

function submitReview(reviewData) {
  // Add a review to the 'Reviews' sheet and update the assignment status.
  // Check if the user is now eligible for something.
}

// Admin Functions
function getAllData() {
    // Function to be called by an admin to get all data from all sheets.
    // This requires checking if the caller is an admin.
}

function exportToCsv() {
    // Generates a CSV file from all sheets.
}

// Utility Functions
function checkEligibility(username) {
    // Check if a user has submitted 5 artifacts and completed 3 reviews.
    // Updates the 'isEligible' status in the 'Users' sheet.
} 