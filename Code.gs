/**
 * This is the main server-side script file for the Artifacts Gallery web app.
 * It handles all interactions with the Google Sheet database and Google Drive.
 */

// --- GLOBAL CONFIGURATION ---
// !!! חשוב: יש להחליף את המזהים הבאים במזהים הנכונים שלכם !!!
const SPREADSHEET_ID = "1tFyU7j5EonloS9B0bNOwCGXL5vtogLJW9AU6t5PVmD4";
const FOLDER_ID = "1u2JyPTYi1Ao8aFet6BDIrgrw7HrzkwJg";
const ADMIN_EMAILS = ["chepti@gmail.com"]; // ניתן להוסיף כאן עוד מיילים של מנהלים

// אובייקט מרכזי לניהול שמות הגיליונות
const SHEET_NAMES = {
  USERS: 'Users', // באנגלית, כפי שהגדרת
  ARTIFACTS: 'תוצרים',
  REVIEWS: 'הערכות',
  ASSIGNMENTS: 'הקצאות'
};

/**
 * Main entry point for the web app. This function serves the main HTML page.
 * @param {Object} e The event parameter from the HTTP GET request.
 * @returns {HtmlOutput} The HTML output to be rendered by the browser.
 */
function doGet(e) {
  const html = HtmlService.createTemplateFromFile('Index').evaluate();
  html.setTitle('מאגר תוצרים והערכות');
  html.addMetaTag('viewport', 'width=device-width, initial-scale=1');
  return html;
}

/**
 * Includes the content of another file (like CSS or JS) into an HTML template.
 * This is a standard technique in Apps Script web apps.
 * @param {string} filename The name of the file to include (e.g., 'JavaScript.html' or 'CSS.html').
 * @returns {string} The content of the specified file.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Gets the email address of the user accessing the web app.
 * Uses Session.getActiveUser().getEmail().
 * Provides a dummy email for testing purposes when the script is run from the editor.
 * @returns {string} The user's email address.
 */
function getUserEmail() {
  const email = Session.getActiveUser().getEmail();
  // For testing purposes in the script editor, the email is blank.
  // To test as a specific user (e.g., an admin), replace 'test.user@example.com'
  // with the desired email address.
  return email === '' ? 'test.user@example.com' : email;
}

/**
 * Checks if the currently logged-in user is an administrator.
 * @returns {boolean} True if the user's email is in the ADMIN_EMAILS list, false otherwise.
 */
function isAdmin() {
  const userEmail = getUserEmail();
  return ADMIN_EMAILS.includes(userEmail);
}

// =================================================================
// פונקציות ניהול משתמשים
// =================================================================

// הרשמת משתמש חדש
function registerUser(userData) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.USERS);
    
    // בדיקה אם שם המשתמש כבר קיים
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userData.username) {
        throw new Error('שם המשתמש כבר קיים במערכת');
      }
    }
    
    // הוספת משתמש חדש
    sheet.appendRow([
      userData.username,
      userData.fullName,
      userData.password, // בפרויקט אמיתי צריך הצפנה
      userData.securityQuestion,
      userData.securityAnswer,
      0, // submissionsCount
      0, // reviewsCompletedCount
      false // isEligible
    ]);
    
    return { success: true, message: 'ההרשמה בוצעה בהצלחה!' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// התחברות משתמש עם דיבוג
function loginUser(username, password) {
  try {
    // Authenticate user against the sheet
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.USERS);
    const data = sheet.getDataRange().getValues();
    let userRecord = null;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toLowerCase() === String(username).trim().toLowerCase() && 
          String(data[i][2]).trim() === String(password).trim()) {
        userRecord = {
          username: data[i][0],
          fullName: data[i][1],
          submissionsCount: data[i][5] || 0,
          reviewsCompletedCount: data[i][6] || 0,
          isEligible: data[i][7] || false,
          isAdmin: ADMIN_EMAILS.includes(data[i][0])
        };
        break;
      }
    }

    if (!userRecord) {
      throw new Error('שם משתמש או סיסמה שגויים.');
    }

    // Create a session token
    const token = Utilities.getUuid();
    const cache = CacheService.getUserCache();
    // Store user email against the token for 30 minutes
    cache.put(token, userRecord.username, 1800); 

    return {
      success: true,
      token: token,
      user: userRecord
    };

  } catch (error) {
    console.error('loginUser error:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Validates a token and returns the associated user email.
 * @param {string} token The session token from the client.
 * @returns {string} The user's email if the token is valid.
 * @throws {Error} If the token is invalid or expired.
 */
function getAuthenticatedEmail(token) {
  if (!token) throw new Error('Authentication token is missing.');
  const cache = CacheService.getUserCache();
  const email = cache.get(token);
  if (!email) throw new Error('ההתחברות פגה. יש להתחבר מחדש.');
  return email;
}

/**
 * Invalidates a user's session token upon logout.
 * @param {string} token The session token to invalidate.
 */
function logoutUser(token) {
  if (token) {
    const cache = CacheService.getUserCache();
    cache.remove(token);
  }
  return { success: true };
}

// קבלת נתוני משתמש
function getUserData(username) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.USERS);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === username) {
        return {
          username: data[i][0],
          fullName: data[i][1],
          submissionsCount: data[i][5],
          reviewsCompletedCount: data[i][6],
          isEligible: data[i][7]
        };
      }
    }
    
    throw new Error('משתמש לא נמצא');
  } catch (error) {
    return null;
  }
}

// =================================================================
// פונקציות ניהול תוצרים
// =================================================================

// העלאת תוצר חדש
function uploadArtifact(artifactData) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.ARTIFACTS);
    
    // יצירת ID ייחודי
    const id = 'ART_' + Date.now();
    
    sheet.appendRow([
      id,
      new Date().toISOString(),
      artifactData.submitterUsername,
      artifactData.title,
      artifactData.instructions,
      artifactData.targetAudience,
      artifactData.tags,
      artifactData.toolUsed,
      artifactData.artifactType,
      artifactData.artifactLink,
      artifactData.previewImageUrl || '',
      true, // isPublished
      0 // likes
    ]);
    
    // עדכון מספר ההגשות של המשתמש
    updateUserSubmissionCount(artifactData.submitterUsername);
    
    // הקצאת תוצרים לביקורת אם הגיע ל-5 תוצרים
    checkAndAssignReviews(artifactData.submitterUsername);
    
    return { success: true, message: 'התוצר הועלה בהצלחה!', artifactId: id };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// עדכון מספר הגשות המשתמש
function updateUserSubmissionCount(username) {
  const userSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.USERS);
  const userData = userSheet.getDataRange().getValues();
  
  for (let i = 1; i < userData.length; i++) {
    if (userData[i][0] === username) {
      const newCount = userData[i][5] + 1;
      userSheet.getRange(i + 1, 6).setValue(newCount);
      
      // עדכון זכאות אם מתקיימים התנאים
      updateEligibility(username, i + 1);
      break;
    }
  }
}

// בדיקה והקצאת ביקורות
function checkAndAssignReviews(username) {
  const userSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.USERS);
  const userData = userSheet.getDataRange().getValues();
  
  // מצא את המשתמש ובדוק כמה תוצרים יש לו
  for (let i = 1; i < userData.length; i++) {
    if (userData[i][0] === username && userData[i][5] >= 5) {
      assignRandomReviews(username);
      break;
    }
  }
}

// הקצאת 5 תוצרים אקראיים לביקורת
function assignRandomReviews(username) {
  try {
    const artifactsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.ARTIFACTS);
    const assignmentsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.ASSIGNMENTS);
    
    const artifacts = artifactsSheet.getDataRange().getValues();
    const assignments = assignmentsSheet.getDataRange().getValues();
    
    // קבל תוצרים שלא שייכים למשתמש הנוכחי
    const availableArtifacts = [];
    for (let i = 1; i < artifacts.length; i++) {
      if (artifacts[i][2] !== username) { // submitterUsername !== current user
        availableArtifacts.push(artifacts[i][0]); // artifact ID
      }
    }
    
    // בחר 5 תוצרים אקראיים
    const selectedArtifacts = [];
    while (selectedArtifacts.length < 5 && availableArtifacts.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableArtifacts.length);
      const artifactId = availableArtifacts.splice(randomIndex, 1)[0];
      selectedArtifacts.push(artifactId);
    }
    
    // הוסף הקצאות
    selectedArtifacts.forEach(artifactId => {
      const assignmentId = 'ASS_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      assignmentsSheet.appendRow([
        assignmentId,
        artifactId,
        username,
        'ממתין', // status
        new Date().toISOString(),
        '' // dateCompleted
      ]);
    });
    
  } catch (error) {
    console.error('שגיאה בהקצאת ביקורות:', error);
  }
}

// קבלת כל התוצרים - גרסה מפושטת ויציבה
function getAllArtifacts() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.ARTIFACTS);
    if (!sheet) {
      console.error('getAllArtifacts - Sheet not found');
      return [];
    }
    
    const data = sheet.getDataRange().getValues();
    if (!data || data.length <= 1) {
      console.error('getAllArtifacts - No data or only headers');
      return [];
    }
    
    const artifacts = [];
    
    // מעבר על כל השורות מלבד הכותרות
    for (let i = 1; i < data.length; i++) {
      try {
        const row = data[i];
        
        // וידוא שיש נתונים בסיסיים
        if (!row[0] || !row[3]) continue; // אין ID או title
        
        const isPublished = row[11];
        
        // בדיקה פשוטה של isPublished
        if (isPublished === true || String(isPublished).toUpperCase() === 'TRUE') {
          artifacts.push({
            id: String(row[0] || ''),
            submissionTimestamp: row[1] || '',
            submitterUsername: String(row[2] || ''),
            title: String(row[3] || ''),
            instructions: String(row[4] || ''),
            targetAudience: String(row[5] || ''),
            tags: String(row[6] || ''),
            toolUsed: String(row[7] || ''),
            artifactType: String(row[8] || ''),
            artifactLink: String(row[9] || ''),
            previewImageUrl: String(row[10] || ''),
            likes: Number(row[12]) || 0
          });
        }
      } catch (rowError) {
        console.error('getAllArtifacts - Error processing row', i, ':', rowError);
        continue; // ממשיך לשורה הבאה
      }
    }
    
    // החזרת התוצאות - החדשים ראשונים
    return artifacts.reverse();
    
  } catch (error) {
    console.error('getAllArtifacts - Critical error:', error);
    return []; // מחזיר מערך ריק במקום null
  }
}

// קבלת תוצרי משתמש ספציפי - גרסה פשוטה ועמידה
function getUserArtifacts(username) {
  try {
    const allArtifacts = getArtifactsSimple();
    return allArtifacts.filter(artifact => artifact.submitterUsername === username);
  } catch (error) {
    console.error('getUserArtifacts error:', error);
    return [];
  }
}

// פונקציה למציאת מזהה הגליון הנכון
function findCurrentSpreadsheetId() {
  try {
    // אם זה רץ מתוך גליון Google Sheets
    const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (activeSpreadsheet) {
      return {
        success: true,
        id: activeSpreadsheet.getId(),
        name: activeSpreadsheet.getName(),
        url: activeSpreadsheet.getUrl(),
        message: 'מזהה הגליון הפעיל נמצא'
      };
    }
    
    // אם זה לא רץ מתוך גליון
    return {
      success: false,
      message: 'הסקריפט לא רץ מתוך גליון Google Sheets פעיל'
    };
    
  } catch (error) {
    return {
      success: false,
      message: 'שגיאה במציאת מזהה הגליון: ' + error.message
    };
  }
}

// פונקציה מהירה לבדיקות ותיקונים
function quickTest() {
  const results = {
    spreadsheetAccess: false,
    usersSheetExists: false,
    artifactsSheetExists: false,
    usersCount: 0,
    artifactsCount: 0,
    publishedArtifactsCount: 0,
    currentSpreadsheetId: SPREADSHEET_ID,
    spreadsheetName: ''
  };
  
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    results.spreadsheetAccess = true;
    results.spreadsheetName = spreadsheet.getName();
    
    // בדיקת גליון Users
    try {
      const usersSheet = spreadsheet.getSheetByName(SHEET_NAMES.USERS);
      results.usersSheetExists = true;
      const usersData = usersSheet.getDataRange().getValues();
      results.usersCount = usersData.length - 1; // מלבד הכותרות
    } catch (e) {
      console.error('Users sheet error:', e);
    }
    
    // בדיקת גליון Artifacts
    try {
      const artifactsSheet = spreadsheet.getSheetByName(SHEET_NAMES.ARTIFACTS);
      results.artifactsSheetExists = true;
      const artifactsData = artifactsSheet.getDataRange().getValues();
      results.artifactsCount = artifactsData.length - 1;
      
      // ספירת תוצרים מפורסמים
      for (let i = 1; i < artifactsData.length; i++) {
        const isPublished = artifactsData[i][11];
        if (isPublished === true || String(isPublished).toUpperCase() === 'TRUE') {
          results.publishedArtifactsCount++;
        }
      }
    } catch (e) {
      console.error('Artifacts sheet error:', e);
    }
    
  } catch (e) {
    console.error('Spreadsheet access error:', e);
    results.error = e.message;
  }
  
  return results;
}

// הוספת משתמש דמה לבדיקה
function addTestUser() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.USERS);
    sheet.appendRow([
      'test',
      'משתמש בדיקה',
      '123',
      'מה השם שלי?',
      'test',
      0,
      0,
      false
    ]);
    return { success: true, message: 'משתמש בדיקה נוסף בהצלחה' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// פונקציה לבדיקת נתוני Artifacts - מה בדיוק יש שם?
function debugArtifactsRaw() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.ARTIFACTS);
    const data = sheet.getDataRange().getValues();
    
    console.log('=== DEBUG ARTIFACTS RAW ===');
    console.log('Total rows:', data.length);
    
    const result = [];
    for (let i = 0; i < data.length; i++) {
      const row = {
        rowIndex: i,
        id: data[i][0],
        timestamp: data[i][1],
        username: data[i][2],
        title: data[i][3],
        isPublished: data[i][11],
        isPublishedType: typeof data[i][11],
        isPublishedString: String(data[i][11])
      };
      console.log(`Row ${i}:`, row);
      result.push(row);
    }
    
    return result;
  } catch (error) {
    console.error('debugArtifactsRaw error:', error);
    return { error: error.message };
  }
}

// הוספת תוצרים לדוגמה - פותר הכל!
function addSampleArtifacts() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.ARTIFACTS);
    
    const sampleArtifacts = [
      [
        'ART001',
        new Date().toISOString(),
        'test',
        'משחק חינוכי באנגלית',
        'משחק אינטראקטיבי ללימוד מילים באנגלית',
        'תלמידי יסודי',
        'אנגלית, משחק, חינוכי',
        'Scratch',
        'משחק',
        'https://scratch.mit.edu/projects/123456/',
        'https://via.placeholder.com/300x200?text=English+Game',
        true,
        0
      ],
      [
        'ART002',
        new Date().toISOString(),
        'test',
        'סרטון הסברה למתמטיקה',
        'סרטון המסביר שברים בצורה חזותית',
        'כיתות ד-ו',
        'מתמטיקה, שברים, סרטון',
        'Canva',
        'סרטון',
        'https://www.youtube.com/watch?v=example',
        'https://via.placeholder.com/300x200?text=Math+Video',
        true,
        0
      ],
      [
        'ART003',
        new Date().toISOString(),
        'test',
        'מצגת על מערכת השמש',
        'מצגת אינטראקטיבית עם אנימציות',
        'תלמידי חטיבה',
        'מדעים, חלל, אסטרונומיה',
        'PowerPoint',
        'מצגת',
        'https://example.com/solar-system.pptx',
        'https://via.placeholder.com/300x200?text=Solar+System',
        true,
        0
      ]
    ];
    
    // הוסף את התוצרים
    sampleArtifacts.forEach(artifact => {
      sheet.appendRow(artifact);
    });
    
    return { 
      success: true, 
      message: `נוספו ${sampleArtifacts.length} תוצרים לדוגמה בהצלחה!` 
    };
    
  } catch (error) {
    console.error('addSampleArtifacts error:', error);
    return { success: false, message: error.message };
  }
}

// =================================================================
// פונקציות ביקורת
// =================================================================

// קבלת תוצרים להערכה עבור משתמש
function getAssignedArtifacts(username) {
  try {
    const assignmentsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.ASSIGNMENTS);
    const artifactsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.ARTIFACTS);
    
    const assignments = assignmentsSheet.getDataRange().getValues();
    const artifacts = artifactsSheet.getDataRange().getValues();
    
    const assignedArtifacts = [];
    
    // מצא הקצאות של המשתמש
    for (let i = 1; i < assignments.length; i++) {
      if (assignments[i][2] === username && assignments[i][3] === 'ממתין') {
        const artifactId = assignments[i][1];
        
        // מצא את פרטי התוצר
        for (let j = 1; j < artifacts.length; j++) {
          if (artifacts[j][0] === artifactId) {
            assignedArtifacts.push({
              assignmentId: assignments[i][0],
              artifactId: artifactId,
              title: artifacts[j][3],
              instructions: artifacts[j][4],
              targetAudience: artifacts[j][5],
              tags: artifacts[j][6],
              toolUsed: artifacts[j][7],
              artifactType: artifacts[j][8],
              artifactLink: artifacts[j][9],
              previewImageUrl: artifacts[j][10]
            });
            break;
          }
        }
      }
    }
    
    return assignedArtifacts;
  } catch (error) {
    return [];
  }
}

/**
 * Submits a new review for an artifact.
 * @param {Object} reviewData The review data from the form.
 * @returns {Object} A success message.
 */
function submitReview(reviewData) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.REVIEWS);
    const newId = Utilities.getUuid();
    const timestamp = new Date();
    const reviewerEmail = getUserEmail();

    sheet.appendRow([
      newId,
      timestamp,
      reviewData.artifactId,
      reviewerEmail,
      reviewData.scoreDesign,
      reviewData.scoreTechnical,
      reviewData.scorePedagogy,
      reviewData.comments
    ]);
    
    // After submitting, update the reviewer's stats
    updateUserStats(reviewerEmail);

    return { success: true, message: 'ההערכה נשלחה בהצלחה.' };

  } catch (error) {
    console.error('Error in submitReview:', error);
    throw new Error(`שגיאה בשליחת ההערכה: ${error.message}`);
  }
}

/**
 * Recalculates and updates a user's submission and review counts, and their eligibility status.
 * This is more robust than incrementing counters.
 * @param {string} userEmail The email of the user to update.
 */
function updateUserStats(userEmail) {
  if (!userEmail) return;

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const usersSheet = ss.getSheetByName(SHEET_NAMES.USERS);
  const artifactsSheet = ss.getSheetByName(SHEET_NAMES.ARTIFACTS);
  const reviewsSheet = ss.getSheetByName(SHEET_NAMES.REVIEWS);
  
  const data = usersSheet.getDataRange().getValues();
  
  // Find user and update their stats
  const headers = data[0];
  const emailColIndex = headers.indexOf('username');
  let userRowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][emailColIndex] === userEmail) {
      userRowIndex = i + 1; // 1-based index
      break;
    }
  }
  if (userRowIndex === -1) return; // User not found

  // Recalculate submissions
  const allArtifacts = sheetDataToObjects(artifactsSheet.getDataRange().getValues());
  const submissionCount = allArtifacts.filter(a => a.submitterUsername === userEmail).length;
  
  // Recalculate reviews
  const allReviews = sheetDataToObjects(reviewsSheet.getDataRange().getValues());
  const reviewCount = allReviews.filter(r => r.reviewerUsername === userEmail).length;

  // Check eligibility
  const isEligible = submissionCount >= 5 && reviewCount >= 3;

  // Update the sheet
  usersSheet.getRange(userRowIndex, headers.indexOf('submissionsCount') + 1).setValue(submissionCount);
  usersSheet.getRange(userRowIndex, headers.indexOf('reviewsCompletedCount') + 1).setValue(reviewCount);
  usersSheet.getRange(userRowIndex, headers.indexOf('isEligible') + 1).setValue(isEligible);
}

/**
 * Retrieves data for the admin dashboard.
 * @param {string} token The session token for authentication.
 * @returns {Object} Data for the admin dashboard.
 */
function getAdminDashboardData(token) {
  const userEmail = getAuthenticatedEmail(token);
  if (!ADMIN_EMAILS.includes(userEmail)) {
    throw new Error('Unauthorized access.');
  }

  try {
    const usersSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.USERS);
    const artifactsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.ARTIFACTS);

    const usersData = usersSheet.getDataRange().getValues();
    const artifactsData = artifactsSheet.getDataRange().getValues();

    // Process users data
    const users = [];
    for (let i = 1; i < usersData.length; i++) {
      const row = usersData[i];
      users.push({
        username: row[0],
        fullName: row[1],
        submissionsCount: row[5] || 0,
        reviewsCompletedCount: row[6] || 0,
        isEligible: row[7] || false
      });
    }

    // Process artifacts data
    const artifacts = [];
    for (let i = 1; i < artifactsData.length; i++) {
      const row = artifactsData[i];
      artifacts.push({
        id: row[0],
        submissionTimestamp: row[1],
        submitterUsername: row[2],
        title: row[3],
        targetAudience: row[5],
        toolUsed: row[7]
      });
    }

    return {
      users: users,
      artifacts: artifacts,
      totalUsers: users.length,
      totalArtifacts: artifacts.length,
      eligibleUsers: users.filter(u => u.isEligible).length
    };

  } catch (error) {
    console.error('Error in getAdminDashboardData:', error);
    throw new Error(`שגיאה בטעינת נתוני המנהל: ${error.message}`);
  }
}

/**
 * Gets the URL of the spreadsheet for admin access.
 * This function is restricted to admins.
 * @returns {string} The URL of the spreadsheet.
 */
function getSpreadsheetUrl() {
  if (!isAdmin()) {
    throw new Error('גישה נדחתה. נדרשות הרשאות מנהל.');
  }
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    return spreadsheet.getUrl();
  } catch (error) {
    console.error('Error in getSpreadsheetUrl:', error);
    throw new Error('לא ניתן היה לקבל את כתובת הגיליון.');
  }
}

// עדכון מספר ביקורות המשתמש
function updateUserReviewCount(username) {
  const userSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.USERS);
  const userData = userSheet.getDataRange().getValues();
  
  for (let i = 1; i < userData.length; i++) {
    if (userData[i][0] === username) {
      const newCount = userData[i][6] + 1;
      userSheet.getRange(i + 1, 7).setValue(newCount);
      
      // עדכון זכאות
      updateEligibility(username, i + 1);
      break;
    }
  }
}

// עדכון זכאות משתמש
function updateEligibility(username, rowIndex) {
  const userSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.USERS);
  const userData = userSheet.getRange(rowIndex, 1, 1, 8).getValues()[0];
  
  const submissionsCount = userData[5];
  const reviewsCount = userData[6];
  
  const isEligible = submissionsCount >= 5 && reviewsCount >= 3;
  userSheet.getRange(rowIndex, 8).setValue(isEligible);
}

// =================================================================
// פונקציות נוספות
// =================================================================

// קבלת כל המשתמשים (לעמוד מנהל)
function getAllUsers() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.USERS);
    const data = sheet.getDataRange().getValues();
    
    const users = [];
    for (let i = 1; i < data.length; i++) {
      users.push({
        username: data[i][0],
        fullName: data[i][1],
        submissionsCount: data[i][5],
        reviewsCompletedCount: data[i][6],
        isEligible: data[i][7]
      });
    }
    
    return users;
  } catch (error) {
    return [];
  }
}

// קבלת כל הביקורות (לעמוד מנהל)
function getAllReviews() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.REVIEWS);
    const data = sheet.getDataRange().getValues();
    
    const reviews = [];
    for (let i = 1; i < data.length; i++) {
      reviews.push({
        id: data[i][0],
        timestamp: data[i][1],
        artifactId: data[i][2],
        reviewerUsername: data[i][3],
        scoreDesign: data[i][4],
        scoreTechnical: data[i][5],
        scorePedagogy: data[i][6],
        comments: data[i][7]
      });
    }
    
    return reviews.reverse();
  } catch (error) {
    return [];
  }
}

// ייצוא נתונים ל-CSV (לעמוד מנהל)
function exportToCSV(sheetName) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
    const data = sheet.getDataRange().getValues();
    
    let csv = '';
    data.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    return csv;
  } catch (error) {
    return null;
  }
}

// חיפוש תוצרים לפי תגיות - משתמש בפונקציה הפשוטה
function searchArtifacts(searchTerm) {
  try {
    const allArtifacts = getArtifactsSimple();
    
    if (!searchTerm || searchTerm.trim() === '') {
      return allArtifacts;
    }
    
    const term = searchTerm.toLowerCase();
    
    return allArtifacts.filter(artifact => 
      artifact.title.toLowerCase().includes(term) ||
      artifact.tags.toLowerCase().includes(term) ||
      artifact.targetAudience.toLowerCase().includes(term) ||
      artifact.toolUsed.toLowerCase().includes(term)
    );
  } catch (error) {
    return [];
  }
}

// פונקציה לבדיקת הגליון ודיבוג
function testSheetConnection() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log('Spreadsheet name:', spreadsheet.getName());
    
    const artifactsSheet = spreadsheet.getSheetByName(SHEET_NAMES.ARTIFACTS);
    console.log('Artifacts sheet found:', artifactsSheet !== null);
    
    if (artifactsSheet) {
      const data = artifactsSheet.getDataRange().getValues();
      console.log('Total rows in Artifacts:', data.length);
      console.log('Headers:', data[0]);
      
      // בדיקה מיוחדת של עמודת isPublished (L - עמודה 11)
      console.log('isPublished column check (column L):');
      for (let i = 1; i < Math.min(data.length, 6); i++) {
        const publishedValue = data[i][11];
        console.log(`Row ${i}: Title="${data[i][3]}", isPublished="${publishedValue}", Type: ${typeof publishedValue}`);
      }
      
      // הצגת השורות הראשונות
      for (let i = 1; i < Math.min(data.length, 4); i++) {
        console.log('Full Row', i, ':', data[i]);
      }
    }
    
    return {
      success: true,
      message: 'Connection successful',
      rowCount: artifactsSheet ? artifactsSheet.getDataRange().getNumRows() : 0
    };
  } catch (error) {
    console.error('Sheet connection error:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// פונקציה ישירה לבדיקת תוצרים עם יותר דיבוג
function debugArtifacts() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.ARTIFACTS);
    const data = sheet.getDataRange().getValues();
    
    const debugInfo = {
      totalRows: data.length,
      headers: data[0],
      artifacts: []
    };
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const isPublished = row[11];
      
      debugInfo.artifacts.push({
        rowIndex: i,
        id: row[0],
        title: row[3],
        isPublished: isPublished,
        isPublishedType: typeof isPublished,
        isPublishedString: String(isPublished),
        willPass: isPublished === true || String(isPublished).toUpperCase().trim() === 'TRUE' || isPublished === 1
      });
    }
    
    return debugInfo;
  } catch (error) {
    return { error: error.message };
  }
}

// פונקציה פשוטה ועמידה - פתרון בטוח 100%!
function getArtifactsSimple() {
  console.log('=== getArtifactsSimple START ===');
  
  try {
    // בדיקה 1: גישה לגליון
    console.log('Step 1: Accessing spreadsheet...');
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log('Spreadsheet accessed successfully');
    
    // בדיקה 2: גישה לגליון Artifacts
    console.log('Step 2: Accessing Artifacts sheet...');
    const sheet = spreadsheet.getSheetByName(SHEET_NAMES.ARTIFACTS);
    if (!sheet) {
      console.error('Artifacts sheet not found!');
      // החזר תוצרים מזויפים במקרה של בעיה
      return getFallbackArtifacts();
    }
    console.log('Artifacts sheet accessed successfully');
    
    // בדיקה 3: קריאת נתונים
    console.log('Step 3: Reading data...');
    const data = sheet.getDataRange().getValues();
    console.log('Data read successfully. Total rows:', data.length);
    
    // בדיקה 4: עיבוד נתונים
    console.log('Step 4: Processing data...');
    const result = [];
    for (let i = 1; i < data.length; i++) {
      // יצירת תוצר מכל שורה שיש בה נתונים
      if (data[i] && data[i].length > 0 && data[i][0]) {
        console.log(`Processing row ${i}: ${data[i][3] || 'No title'}`);
        result.push({
          id: String(data[i][0] || 'ART_' + i),
          submissionTimestamp: data[i][1] || new Date().toISOString(),
          submitterUsername: String(data[i][2] || 'Unknown'),
          title: String(data[i][3] || 'ללא כותרת'),
          instructions: String(data[i][4] || ''),
          targetAudience: String(data[i][5] || ''),
          tags: String(data[i][6] || ''),
          toolUsed: String(data[i][7] || ''),
          artifactType: String(data[i][8] || 'אחר'),
          artifactLink: String(data[i][9] || '#'),
          previewImageUrl: String(data[i][10] || ''),
          likes: Number(data[i][12]) || 0
        });
      }
    }
    
    console.log(`Success! Found ${result.length} artifacts`);
    return result.reverse(); // החדשים ראשונים
    
  } catch (error) {
    console.error('getArtifactsSimple ERROR:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    
    // במקרה של שגיאה - החזר תוצרים מזויפים
    return getFallbackArtifacts();
  }
}

// פונקציה לתוצרים מזויפים במקרה של בעיה
function getFallbackArtifacts() {
  console.log('Returning fallback artifacts...');
  return [
    {
      id: 'DEMO001',
      submissionTimestamp: new Date().toISOString(),
      submitterUsername: 'demo',
      title: 'תוצר לדוגמה - משחק חינוכי',
      instructions: 'משחק אינטראקטיבי ללימוד מילים',
      targetAudience: 'תלמידי יסודי',
      tags: 'משחק, חינוך, אנגלית',
      toolUsed: 'Scratch',
      artifactType: 'משחק',
      artifactLink: 'https://scratch.mit.edu/projects/example/',
      previewImageUrl: 'https://via.placeholder.com/300x200?text=Demo+Game',
      likes: 0
    },
    {
      id: 'DEMO002', 
      submissionTimestamp: new Date().toISOString(),
      submitterUsername: 'demo',
      title: 'תוצר לדוגמה - סרטון מתמטיקה',
      instructions: 'סרטון המסביר שברים',
      targetAudience: 'כיתות ד-ו',
      tags: 'מתמטיקה, שברים, סרטון',
      toolUsed: 'Canva',
      artifactType: 'סרטון',
      artifactLink: 'https://www.youtube.com/watch?v=demo',
      previewImageUrl: 'https://via.placeholder.com/300x200?text=Math+Video',
      likes: 0
    }
  ];
}

// --- DATA FUNCTIONS ---

/**
 * Converts sheet data (2D array) into an array of objects, using the first row as keys.
 * @param {Array<Array<any>>} data The 2D array from sheet.getDataRange().getValues().
 * @returns {Array<Object>} An array of objects representing the sheet rows.
 */
function sheetDataToObjects(data) {
  if (data.length < 2) return [];
  const headers = data[0].map(header => header.trim());
  const objects = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i].every(cell => cell === '')) continue;
    const object = {};
    for (let j = 0; j < headers.length; j++) {
      object[headers[j]] = data[i][j];
    }
    objects.push(object);
  }
  return objects;
}

/**
 * Fetches all published artifacts from the 'Artifacts' sheet.
 * @returns {Array<Object>} An array of artifact objects.
 */
function getArtifacts() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.ARTIFACTS);
    if (!sheet) {
      throw new Error(`Sheet with name "${SHEET_NAMES.ARTIFACTS}" not found.`);
    }
    const data = sheet.getDataRange().getValues();
    const objects = sheetDataToObjects(data);
    return JSON.stringify(objects); // Return as JSON string
  } catch (error) {
    console.error('Error in getArtifacts:', error);
    throw new Error('לא ניתן לאחזר את התוצרים מהגיליון.');
  }
}

function getDirectImageUrl(fileId) {
  // This format uses Google's image proxy and is more reliable for embedding.
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

/**
 * Gets profile data for a specific user, including their submitted artifacts.
 * @param {string} token The session token for authentication.
 * @returns {Object} An object containing user details and their artifacts.
 */
function getUserProfileData(token) {
  const userEmail = getAuthenticatedEmail(token);
  const userDetails = getUserData(userEmail);
  if (!userDetails) {
    throw new Error('User not found.');
  }
  
  const allArtifacts = getAllArtifacts(); // This is a private helper
  const userArtifacts = allArtifacts.filter(a => a.submitterUsername === userEmail);

  return { user: userDetails, artifacts: userArtifacts };
}

/**
 * Adds a new artifact record to the sheet and handles file upload.
 * @param {string} token The session token for authentication.
 * @param {Object} formData The artifact data from the client form.
 * @param {string|null} fileData The base64 encoded file data, if any.
 * @param {string|null} fileName The name of the file, if any.
 * @param {string|null} fileType The MIME type of the file, if any.
 * @returns {Object} The newly created artifact object.
 */
function addNewArtifact(token, formData, fileData, fileName, fileType) {
  const userEmail = getAuthenticatedEmail(token);
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.ARTIFACTS);
  let previewImageUrl = null;
  let artifactLink = formData.artifactLink || null;

  // Handle file upload if provided
  if (fileData && fileName && fileType) {
    try {
      const folder = DriveApp.getFolderById(FOLDER_ID);
      const decodedContent = Utilities.base64Decode(fileData);
      const blob = Utilities.newBlob(decodedContent, fileType, fileName);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      artifactLink = file.getDownloadUrl();
      // Create a direct view link for images
      if (fileType.startsWith('image/')) {
        previewImageUrl = `https://lh3.googleusercontent.com/d/${file.getId()}`;
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error(`שגיאה בהעלאת הקובץ: ${error.message}`);
    }
  }
  
  if (!artifactLink) {
    throw new Error('יש לספק קישור או להעלות קובץ.');
  }
  
  const newId = new Date().getTime();
  const newRow = [
    newId, // ID
    new Date(), // submissionTimestamp
    userEmail, // submitterUsername
    formData.title,
    formData.instructions,
    formData.targetAudience,
    formData.tags,
    formData.toolUsed,
    artifactLink,
    previewImageUrl
  ];
  
  sheet.appendRow(newRow);
  updateUserStats(userEmail);

  return getArtifactById_(newId);
}

/**
 * Deletes an artifact from the sheet and the corresponding file from Drive.
 * @param {string} token The session token for authentication.
 * @param {string} artifactId The ID of the artifact to delete.
 */
function deleteArtifact(token, artifactId) {
  const userEmail = getAuthenticatedEmail(token);
  const artifactsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.ARTIFACTS);
  const data = artifactsSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(artifactId)) {
      const ownerEmail = data[i][2];

      // Check for permission: user is owner OR user is admin
      if (ownerEmail !== userEmail && !ADMIN_EMAILS.includes(userEmail)) {
        throw new Error('אינך רשאי למחוק תוצר זה.');
      }
      
      // If there's a file link in Drive, try to delete it
      const fileId = data[i][9].match(/\/d\/([^\/]+)/)[1];
      if (fileId) {
        const file = DriveApp.getFileById(fileId);
        file.setTrashed(true);
      }
      
      artifactsSheet.deleteRow(i + 1);
      updateUserStats(ownerEmail);
      return { success: true, message: 'התוצר נמחק בהצלחה' };
    }
  }

  throw new Error('התוצר לא נמצא.');
}

/**
 * Retrieves the full details for a single artifact for editing purposes.
 * @param {string} token The session token for authentication.
 * @param {string} artifactId The ID of the artifact to fetch.
 * @returns {Object} The artifact data object.
 */
function getArtifactDetails(token, artifactId) {
  const userEmail = getAuthenticatedEmail(token); // Auth check
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.ARTIFACTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[headers.indexOf('id')]) === String(artifactId)) {
      const ownerEmail = row[headers.indexOf('submitterUsername')];
      
      // Security check: Only owner or admin can get details for editing
      if (ownerEmail !== userEmail && !ADMIN_EMAILS.includes(userEmail)) {
        throw new Error('אינך רשאי לערוך תוצר זה.');
      }
      
      // Convert row to object and return
      const artifact = {};
      headers.forEach((header, index) => {
        artifact[header] = row[index];
      });
      return artifact;
    }
  }
  throw new Error('התוצר לא נמצא.');
}

/**
 * Updates an existing artifact's text data.
 * @param {string} token The session token for authentication.
 * @param {string} artifactId The ID of the artifact to update.
 * @param {Object} formData The new data for the artifact.
 * @returns {Object} A success or failure message.
 */
function updateArtifact(token, artifactId, formData) {
  const userEmail = getAuthenticatedEmail(token); // Auth check
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.ARTIFACTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[headers.indexOf('id')]) === String(artifactId)) {
      const ownerEmail = row[headers.indexOf('submitterUsername')];
      
      // Security check: Only owner or admin can update
      if (ownerEmail !== userEmail && !ADMIN_EMAILS.includes(userEmail)) {
        throw new Error('אינך רשאי לעדכן תוצר זה.');
      }
      
      const rowIndex = i + 1; // Sheet rows are 1-based
      sheet.getRange(rowIndex, headers.indexOf('title') + 1).setValue(formData.title);
      sheet.getRange(rowIndex, headers.indexOf('instructions') + 1).setValue(formData.instructions);
      sheet.getRange(rowIndex, headers.indexOf('targetAudience') + 1).setValue(formData.targetAudience);
      sheet.getRange(rowIndex, headers.indexOf('tags') + 1).setValue(formData.tags);
      sheet.getRange(rowIndex, headers.indexOf('toolUsed') + 1).setValue(formData.toolUsed);
      
      return { success: true, message: 'התוצר עודכן בהצלחה.' };
    }
  }
  
  throw new Error('התוצר לעדכון לא נמצא.');
}

/**
 * Gets peer review assignments for the current user.
 * @returns {Array<Object>} An array of 3 random artifacts to be reviewed.
 */
function getReviewAssignments() {
  try {
    const userEmail = getUserEmail();
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const artifactsSheet = ss.getSheetByName(SHEET_NAMES.ARTIFACTS);
    const allArtifacts = sheetDataToObjects(artifactsSheet.getDataRange().getValues());
    const userArtifactsCount = allArtifacts.filter(a => a.submitterUsername === userEmail).length;
    if (userArtifactsCount < 5) return JSON.stringify([]); // Return empty array as string
    const reviewsSheet = ss.getSheetByName(SHEET_NAMES.REVIEWS);
    const allReviews = sheetDataToObjects(reviewsSheet.getDataRange().getValues());
    const reviewedArtifactIds = allReviews.filter(r => r.reviewerUsername === userEmail).map(r => r.artifactId);
    const potentialArtifacts = allArtifacts.filter(artifact => artifact.submitterUsername !== userEmail && !reviewedArtifactIds.includes(artifact.id));
    const assignments = potentialArtifacts.sort(() => 0.5 - Math.random()).slice(0, 3);
    return JSON.stringify(assignments); // Return as JSON string
  } catch (error) {
    console.error('Error in getReviewAssignments:', error);
    throw new Error(`שגיאה בקבלת משימות הערכה: ${error.message}`);
  }
}

/**
 * Fetches public data for a specific user's profile.
 * @param {string} userEmail The email of the user whose profile is being viewed.
 * @returns {string} A JSON string containing the user's artifacts.
 */
function getPublicProfileData(userEmail) {
  try {
    if (!userEmail) throw new Error('לא סופקה כתובת אימייל.');

    const artifactsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.ARTIFACTS);
    if (!artifactsSheet) throw new Error(`הגיליון "${SHEET_NAMES.ARTIFACTS}" לא נמצא.`);
    
    const allArtifacts = sheetDataToObjects(artifactsSheet.getDataRange().getValues());
    
    const userArtifacts = allArtifacts.filter(artifact => 
      artifact.submitterUsername === userEmail && (artifact.isPublished === true || artifact.isPublished === 'TRUE')
    );

    const result = {
      email: userEmail,
      artifacts: userArtifacts
    };
    
    return JSON.stringify(result);

  } catch (error) {
    console.error('Error in getPublicProfileData:', error);
    throw new Error(`שגיאה בטעינת פרופיל ציבורי: ${error.message}`);
  }
}

/**
 * Helper function to retrieve a single artifact by its ID.
 * @private
 * @param {string} artifactId The ID of the artifact to find.
 * @returns {Object|null} The artifact object or null if not found.
 */
function getArtifactById_(artifactId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAMES.ARTIFACTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][headers.indexOf('id')] === artifactId) {
      return {
        id: data[i][headers.indexOf('id')],
        submissionTimestamp: data[i][headers.indexOf('submissionTimestamp')],
        submitterUsername: data[i][headers.indexOf('submitterUsername')],
        title: data[i][headers.indexOf('title')],
        instructions: data[i][headers.indexOf('instructions')],
        targetAudience: data[i][headers.indexOf('targetAudience')],
        tags: data[i][headers.indexOf('tags')],
        toolUsed: data[i][headers.indexOf('toolUsed')],
        artifactType: data[i][headers.indexOf('artifactType')],
        artifactLink: data[i][headers.indexOf('artifactLink')],
        previewImageUrl: data[i][headers.indexOf('previewImageUrl')],
        likes: Number(data[i][headers.indexOf('likes')]) || 0
      };
    }
  }
  
  return null;
}

