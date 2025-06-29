// מערכת ביקורת עמיתים - Google Apps Script
// =================================================================
const SPREADSHEET_ID = '164XaMFX9EVAmNQPG6ecxVbx4XxUUOvurYdUBhjYoK0k';
const UPLOAD_FOLDER_ID = '1_JwHrGcL3Via1OnOseSC4KHhnRzbRvPj';

// פונקציה להצגת HTML הראשי
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('פלטפורמת ביקורת עמיתים')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// פונקציה לכלול קבצי CSS/JS
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// =================================================================
// פונקציות ניהול משתמשים
// =================================================================

// הרשמת משתמש חדש
function registerUser(userData) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Users');
    
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
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Users');
    const data = sheet.getDataRange().getValues();
    
    console.log('loginUser: Total rows in Users sheet:', data.length);
    console.log('loginUser: Looking for username:', username);
    
    for (let i = 1; i < data.length; i++) {
      console.log('loginUser: Row', i, 'Username:', data[i][0], 'Password:', data[i][2]);
      
      if (String(data[i][0]).trim() === String(username).trim() && 
          String(data[i][2]).trim() === String(password).trim()) {
        
        return {
          success: true,
          user: {
            username: data[i][0],
            fullName: data[i][1],
            submissionsCount: data[i][5] || 0,
            reviewsCompletedCount: data[i][6] || 0,
            isEligible: data[i][7] || false
          }
        };
      }
    }
    
    throw new Error(`שם משתמש או סיסמה שגויים. נמצאו ${data.length - 1} משתמשים בגליון.`);
  } catch (error) {
    console.error('loginUser error:', error);
    return { success: false, message: error.message };
  }
}

// קבלת נתוני משתמש
function getUserData(username) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Users');
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
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Artifacts');
    
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
  const userSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Users');
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
  const userSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Users');
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
    const artifactsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Artifacts');
    const assignmentsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Assignments');
    
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
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Artifacts');
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

// פונקציה מהירה לבדיקות ותיקונים
function quickTest() {
  const results = {
    spreadsheetAccess: false,
    usersSheetExists: false,
    artifactsSheetExists: false,
    usersCount: 0,
    artifactsCount: 0,
    publishedArtifactsCount: 0
  };
  
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    results.spreadsheetAccess = true;
    
    // בדיקת גליון Users
    try {
      const usersSheet = spreadsheet.getSheetByName('Users');
      results.usersSheetExists = true;
      const usersData = usersSheet.getDataRange().getValues();
      results.usersCount = usersData.length - 1; // מלבד הכותרות
    } catch (e) {
      console.error('Users sheet error:', e);
    }
    
    // בדיקת גליון Artifacts
    try {
      const artifactsSheet = spreadsheet.getSheetByName('Artifacts');
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
  }
  
  return results;
}

// הוספת משתמש דמה לבדיקה
function addTestUser() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Users');
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

// =================================================================
// פונקציות ביקורת
// =================================================================

// קבלת תוצרים להערכה עבור משתמש
function getAssignedArtifacts(username) {
  try {
    const assignmentsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Assignments');
    const artifactsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Artifacts');
    
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

// שליחת ביקורת
function submitReview(reviewData) {
  try {
    const reviewsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Reviews');
    const assignmentsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Assignments');
    
    // יצירת ID ייחודי לביקורת
    const reviewId = 'REV_' + Date.now();
    
    // הוספת הביקורת
    reviewsSheet.appendRow([
      reviewId,
      new Date().toISOString(),
      reviewData.artifactId,
      reviewData.reviewerUsername,
      reviewData.scoreDesign,
      reviewData.scoreTechnical,
      reviewData.scorePedagogy,
      reviewData.comments
    ]);
    
    // עדכון סטטוס ההקצאה
    const assignments = assignmentsSheet.getDataRange().getValues();
    for (let i = 1; i < assignments.length; i++) {
      if (assignments[i][0] === reviewData.assignmentId) {
        assignmentsSheet.getRange(i + 1, 4).setValue('הושלם'); // status
        assignmentsSheet.getRange(i + 1, 6).setValue(new Date().toISOString()); // dateCompleted
        break;
      }
    }
    
    // עדכון מספר הביקורות של המשתמש
    updateUserReviewCount(reviewData.reviewerUsername);
    
    return { success: true, message: 'הביקורת נשלחה בהצלחה!' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// עדכון מספר ביקורות המשתמש
function updateUserReviewCount(username) {
  const userSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Users');
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
  const userSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Users');
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
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Users');
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
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Reviews');
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
    
    const artifactsSheet = spreadsheet.getSheetByName('Artifacts');
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
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Artifacts');
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

// פונקציה פשוטה ועמידה - בודק גם TRUE כמחרוזת
function getArtifactsSimple() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Artifacts');
    if (!sheet) {
      console.error('Sheet Artifacts not found');
      return [];
    }
    
    const data = sheet.getDataRange().getValues();
    console.log('getArtifactsSimple: Total rows:', data.length);
    
    const result = [];
    for (let i = 1; i < data.length; i++) {
      const isPublished = data[i][11];
      const publishedCheck = String(isPublished).toUpperCase().trim();
      
      // בדיקה גמישה של isPublished
      if (isPublished === true || publishedCheck === 'TRUE' || isPublished === 1) {
        console.log('getArtifactsSimple: Adding row', i, 'Title:', data[i][3]);
        result.push({
          id: String(data[i][0] || 'ART_' + i),
          submissionTimestamp: data[i][1] || new Date().toISOString(),
          submitterUsername: String(data[i][2] || ''),
          title: String(data[i][3] || ''),
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
    
    console.log('getArtifactsSimple: Found', result.length, 'artifacts');
    return result.reverse(); // החדשים ראשונים
  } catch (error) {
    console.error('getArtifactsSimple error:', error);
    return [];
  }
} 