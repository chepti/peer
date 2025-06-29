// =================================================================
//      GLOBAL CONFIGURATION
// =================================================================
const SPREADSHEET_ID = '164XaMFX9EVAmNQPG6ecxVbx4XxUUOvurYdUBhjYoK0k';
const UPLOAD_FOLDER_ID = '1_JwHrGcL3Via1OnOseSC4KHhnRzbRvPj';
const ADMIN_USERNAMES = ['admin', 'chepti']; // Use usernames for admin rights

// Sheet Names
const SHEETS = {
  USERS: 'Users',
  ARTIFACTS: 'Artifacts',
  REVIEWS: 'Reviews',
  ASSIGNMENTS: 'Assignments'
};

// Column Names - MUST MATCH THE HEADERS IN THE GOOGLE SHEET EXACTLY
const COLS = {
  ARTIFACTS: {
    SUBMITTER_USERNAME: 'submitterUsername',
    AUTHOR_FULL_NAME: 'authorFullName' // This is a virtual column, added dynamically
  }
};


// =================================================================
//      WEB APP ENTRY POINTS
// =================================================================
function doGet(e) {
  return HtmlService.createTemplateFromFile('Index').evaluate()
      .setTitle("פלטפורמת ביקורת עמיתים")
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}


// =================================================================
//      AUTHENTICATION & SESSION MANAGEMENT
// =================================================================
function checkUserSession() {
  const username = PropertiesService.getUserProperties().getProperty('username');
  if (!username) {
    return null;
  }
  const allUsers = getAllUsers();
  const userData = allUsers.find(u => u.username === username);

  if (userData) {
    return {
      username: userData.username,
      fullName: userData.fullName,
      isAdmin: ADMIN_USERNAMES.includes(userData.username.toLowerCase())
    };
  }
  return null;
}

function registerUser(userDetails) {
  const { usersSheet } = getSheets();
  const allUsers = getAllUsers();

  if (!userDetails.username || !userDetails.password || !userDetails.fullName) {
    throw new Error('יש למלא את כל השדות.');
  }
  
  const existingUser = allUsers.find(u => u.username.toLowerCase() === userDetails.username.toLowerCase());
  if (existingUser) {
    throw new Error('שם המשתמש תפוס.');
  }

  const newUserRow = [
    userDetails.username,
    userDetails.fullName,
    userDetails.password,
    userDetails.question,
    userDetails.answer
  ];
  
  usersSheet.appendRow(newUserRow);
  SpreadsheetApp.flush();

  return { success: true, message: 'ההרשמה בוצעה בהצלחה!' };
}

function loginUser(username, password) {
  const allUsers = getAllUsers();
  const user = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!user) {
    throw new Error('שם משתמש או סיסמה שגויים.');
  }

  if (user.password !== password) {
    throw new Error('שם משתמש או סיסמה שגויים.');
  }
  
  PropertiesService.getUserProperties().setProperty('username', user.username);

  return {
    username: user.username,
    fullName: user.fullName,
    isAdmin: ADMIN_USERNAMES.includes(user.username.toLowerCase())
  };
}

function logoutUser() {
  PropertiesService.getUserProperties().deleteProperty('username');
  return { success: true };
}


// =================================================================
//      PRIMARY API FUNCTIONS (Called from client)
// =================================================================
function getInitialAppData() {
  const user = checkUserSession();
  if (!user) {
    return { user: null, gallery: [], mySubmissions: [], myReviews: [] };
  }

  const allUsers = getAllUsers();
  const allArtifacts = getAllArtifacts();
  
  const userMap = new Map(allUsers.map(u => [u.username, u.fullName]));

  const gallery = allArtifacts
    .filter(art => art.isPublished == true || String(art.isPublished).toLowerCase() === 'true')
    .map(art => ({
      ...art,
      [COLS.ARTIFACTS.AUTHOR_FULL_NAME]: userMap.get(art[COLS.ARTIFACTS.SUBMITTER_USERNAME]) || 'אלמוני'
    }));

  const mySubmissions = allArtifacts
    .filter(art => art[COLS.ARTIFACTS.SUBMITTER_USERNAME] === user.username)
     .map(art => ({
      ...art,
      [COLS.ARTIFACTS.AUTHOR_FULL_NAME]: user.fullName
    }));
    
  const myReviews = getReviewAssignmentsForUser(user.username);

  return {
    user: user,
    gallery: gallery,
    mySubmissions: mySubmissions,
    myReviews: myReviews
  };
}

function submitArtifact(formData, previewImageData) {
  const user = checkUserSession();
  if (!user) {
    throw new Error('אינך מחובר. יש לרענן את הדף ולהתחבר.');
  }

  const { artifactsSheet } = getSheets();
  
  let previewUrl = '';
  if (previewImageData && previewImageData.base64) {
    try {
      const folder = DriveApp.getFolderById(UPLOAD_FOLDER_ID);
      const blob = Utilities.newBlob(Utilities.base64Decode(previewImageData.base64), previewImageData.type, previewImageData.name);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      previewUrl = file.getUrl();
    } catch (e) {
      Logger.log('Error uploading file to Drive: ' + e.message);
      throw new Error('שגיאה בהעלאת התמונה.');
    }
  } else {
    throw new Error('נדרשת תמונה מייצגת.');
  }

  const headers = artifactsSheet.getRange(1, 1, 1, artifactsSheet.getLastColumn()).getValues()[0];
  const lastId = artifactsSheet.getLastRow() > 1 ? artifactsSheet.getRange(artifactsSheet.getLastRow(), 1).getValue() : 0;
  const newId = (typeof lastId === 'number' ? lastId : 0) + 1;

  const newRowObject = {
    'id': newId,
    'submissionTimestamp': new Date(),
    'submitterUsername': user.username,
    'title': formData.title,
    'instructions': formData.instructions,
    'targetAudience': formData.targetAudience,
    'tags': formData.tags,
    'toolUsed': formData.toolUsed,
    'artifactType': formData.artifactType,
    'artifactLink': formData.artifactLink || '',
    'previewImageUrl': previewUrl,
    'isPublished': true,
    'likes': 0
  };
  
  const newRow = headers.map(header => newRowObject[header.trim()] !== undefined ? newRowObject[header.trim()] : '');

  artifactsSheet.appendRow(newRow);
  SpreadsheetApp.flush();

  return { success: true, message: 'התוצר הוגש בהצלחה!' };
}

// =================================================================
//      DATA RETRIEVAL & UTILITY FUNCTIONS
// =================================================================
function getReviewAssignmentsForUser(username) {
  // Placeholder for future implementation
  return [];
}

function getAllUsers() {
  const { usersSheet } = getSheets();
  if (!usersSheet) {
    Logger.log('Error: Sheet with name "' + SHEETS.USERS + '" not found.');
    return []; // Return empty array to prevent crash
  }
  if (usersSheet.getLastRow() < 2) return [];
  const range = usersSheet.getRange(2, 1, usersSheet.getLastRow() - 1, usersSheet.getLastColumn());
  return sheetRangeToObjects(range, usersSheet.getRange(1, 1, 1, usersSheet.getLastColumn()).getValues()[0]);
}

function getAllArtifacts() {
    const { artifactsSheet } = getSheets();
    if (!artifactsSheet) {
      Logger.log('Error: Sheet with name "' + SHEETS.ARTIFACTS + '" not found.');
      return []; // Return empty array to prevent crash
    }
    if (artifactsSheet.getLastRow() < 2) return [];
    const range = artifactsSheet.getRange(2, 1, artifactsSheet.getLastRow() - 1, artifactsSheet.getLastColumn());
    return sheetRangeToObjects(range, artifactsSheet.getRange(1, 1, 1, artifactsSheet.getLastColumn()).getValues()[0]);
}

function getSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return {
    ss: ss,
    usersSheet: ss.getSheetByName(SHEETS.USERS),
    artifactsSheet: ss.getSheetByName(SHEETS.ARTIFACTS),
    reviewsSheet: ss.getSheetByName(SHEETS.REVIEWS),
    assignmentsSheet: ss.getSheetByName(SHEETS.ASSIGNMENTS)
  };
}

function sheetRangeToObjects(range, headers) {
  const values = range.getValues();
  const trimmedHeaders = headers.map(h => String(h).trim());
  
  return values.map((row) => {
    const obj = {};
    trimmedHeaders.forEach((header, i) => {
      if (header) {
        let value = row[i];
        // Convert Date objects to ISO string format for safe transport to client-side
        if (value instanceof Date) {
          value = value.toISOString();
        }
        obj[header] = value;
      }
    });
    return obj;
  });
}
