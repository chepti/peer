// This is the server-side script for the Peer Review Platform.

const SPREADSHEET_ID = '164XaMFX9EVAmNQPG6ecxVbx4XxUUOvurYdUBhjYoK0k';

const sheetUsers = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Users");
const sheetArtifacts = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Artifacts");
const sheetReviews = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Reviews");
const sheetAssignments = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Assignments");
const UPLOAD_FOLDER_ID = '1_JwHrGcL3Via1OnOseSC4KHhnRzbRvPj';
const ADMIN_USERNAMES = ['admin', 'chepti']; // Use usernames for admin rights

function doGet(e) {
  return HtmlService.createTemplateFromFile('Index').evaluate()
      .setTitle("פלטפורמת ביקורת עמיתים")
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// User Management
function registerUser(userData) {
  try {
    if (!sheetUsers) {
      throw new Error("'Users' sheet not found.");
    }
    const { username, fullName, password, securityQuestion, securityAnswer } = userData;
    
    const usernames = sheetUsers.getRange("A2:A").getValues().flat().filter(String);
    if (usernames.includes(username)) {
      return JSON.stringify({ error: "שם המשתמש כבר קיים." });
    }

    // `username` | `fullName` | `password` | `securityQuestion` | `securityAnswer` | `submissionsCount` | `reviewsCompletedCount` | `isEligible`
    const newUserRow = [username, fullName, password, securityQuestion, securityAnswer, 0, 0, false];
    sheetUsers.appendRow(newUserRow);
    
    return JSON.stringify({
      username: username,
      fullName: fullName,
      isAdmin: ADMIN_USERNAMES.includes(username)
    });
  } catch (e) {
    Logger.log('Registration Error: ' + e.message);
    return JSON.stringify({ error: e.message });
  }
}

function loginUser(username, password) {
  try {
    if (!sheetUsers) {
      throw new Error("'Users' sheet not found.");
    }
    const data = sheetUsers.getDataRange().getValues();
    // Start from 1 to skip header row
    for (let i = 1; i < data.length; i++) {
      // username is in col 0 (A), password in col 2 (C)
      if (data[i][0] === username && data[i][2] === password) {
        // Return user object but without password
        return JSON.stringify({
          username: data[i][0],
          fullName: data[i][1],
          isAdmin: ADMIN_USERNAMES.includes(data[i][0])
        });
      }
    }
    return null; // User not found or password incorrect
  } catch (e) {
    Logger.log('Login Error: ' + e.message);
    return JSON.stringify({ error: e.message });
  }
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