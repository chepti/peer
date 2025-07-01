function setup() {
  // This function should be run once to set up the spreadsheet and Drive folder.
  
  const SHEET_NAMES = {
    ARTIFACTS: 'תוצרים',
    REVIEWS: 'הערכות',
    USERS: 'משתמשים',
    ASSIGNMENTS: 'הקצאות'
  };

  // 1. Create Spreadsheet and get its ID
  const spreadsheet = SpreadsheetApp.create('מאגר תוצרים והערכות');
  const spreadsheetId = spreadsheet.getId();
  Logger.log(`Spreadsheet created. ID: ${spreadsheetId}`);
  Logger.log(`Please update SPREADSHEET_ID in Code.gs with this ID.`);
  
  // 2. Create Drive Folder and get its ID
  const folder = DriveApp.createFolder('קבצים שהועלו');
  const folderId = folder.getId();
  Logger.log(`Drive Folder created. ID: ${folderId}`);
  Logger.log(`Please update DRIVE_FOLDER_ID in Code.gs with this ID.`);
  
  // 3. Set up sheets within the spreadsheet
  const ss = SpreadsheetApp.openById(spreadsheetId);
  
  // Sheet: תוצרים (Artifacts)
  const artifactsSheet = ss.insertSheet(SHEET_NAMES.ARTIFACTS);
  artifactsSheet.appendRow(['id', 'submissionTimestamp', 'submitterUsername', 'title', 'instructions', 'targetAudience', 'tags', 'toolUsed', 'artifactLink', 'previewImageUrl']);
  
  // Sheet: הערכות (Reviews)
  const reviewsSheet = ss.insertSheet(SHEET_NAMES.REVIEWS);
  reviewsSheet.appendRow(['id', 'timestamp', 'artifactId', 'reviewerUsername', 'scoreDesign', 'scoreTechnical', 'scorePedagogy', 'comments']);
  
  // Sheet: משתמשים (Users)
  const usersSheet = ss.insertSheet(SHEET_NAMES.USERS);
  usersSheet.appendRow(['email', 'submissionsCount', 'reviewsCompletedCount']);
  
  // Sheet: הקצאות (Assignments)
  const assignmentsSheet = ss.insertSheet(SHEET_NAMES.ASSIGNMENTS);
  assignmentsSheet.appendRow(['assignmentId', 'artifactId', 'assignedUsername', 'status', 'dateAssigned', 'dateCompleted']);

  // Remove the default 'Sheet1'
  const defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet) {
    ss.deleteSheet(defaultSheet);
  }
  
  Logger.log('Setup complete. Sheets have been created and configured.');
} 