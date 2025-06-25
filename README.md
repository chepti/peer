# Peer Review Platform

This project is a collaborative submission and peer review platform for course participants, built with Google Apps Script and Google Sheets.

## Setup Instructions

1.  **Create a Google Sheet:**
    *   Create a new Google Sheet.
    *   Rename the first sheet to `Users`. Add the headers: `username`, `fullName`, `password`, `securityQuestion`, `securityAnswer`, `submissionsCount`, `reviewsCompletedCount`, `isEligible`.
    *   Create a second sheet named `Artifacts`. Add the headers: `id`, `submissionTimestamp`, `submitterUsername`, `title`, `instructions`, `targetAudience`, `tags`, `toolUsed`, `artifactType`, `artifactLink`, `previewImageUrl`, `isPublished`, `likes`.
    *   Create a third sheet named `Reviews`. Add the headers: `id`, `timestamp`, `artifactId`, `reviewerUsername`, `scoreDesign`, `scoreTechnical`, `scorePedagogy`, `comments`.
    *   Create a fourth sheet named `Assignments`. Add the headers: `id`, `artifactId`, `assignedUsername`, `status`, `dateAssigned`, `dateCompleted`.

2.  **Create a Google Apps Script Project:**
    *   Go to [script.google.com](https://script.google.com) and create a new project.
    *   Copy the code from `Code.gs`, `Index.html`, `Stylesheet.html`, and `JavaScript.html` into corresponding files in the Apps Script editor. You will need to create the HTML files.
    *   Copy the content of `appsscript.json` into the `appsscript.json` manifest file in the editor.

3.  **Configure the Script:**
    *   Open `Code.gs`.
    *   Replace `"YOUR_SPREADSHEET_ID"` with the actual ID of your Google Sheet. You can find this in the URL of your sheet.

4.  **Deploy the Application:**
    *   In the Apps Script editor, click on `Deploy` > `New deployment`.
    *   Select `Web app` as the deployment type.
    *   In the configuration, give it a description.
    *   Set `Execute as` to `Me`.
    *   Set `Who has access` to `Anyone`.
    *   Click `Deploy`.
    *   Authorize the script's permissions when prompted.
    *   Copy the provided Web app URL. This is the URL to your application.

## Git Setup
*   My GIT is located here: T:\תוכנות\Git
*   my account in GITHUB is chepti@gmail.com
*   The project name in GIT is `peer`

Please push to git at the end of the operation. 