// =================================================================
//      הגדרות הפרויקט - יש לעדכן את הערכים בהתאם לסביבה שלך
// =================================================================

// יש להחליף את הכתובת הזו במזהה של קובץ ה-Google Sheets שלך
// ניתן למצוא את המזהה בכתובת ה-URL של הקובץ, למשל:
// https://docs.google.com/spreadsheets/d/THIS_IS_THE_ID/edit
const SPREADSHEET_ID = '1a2b3c4d5e6f7g8h9i0j-k_l_m_n_o_p_q_r_s_t_u_v_w_x_y'; 

// יש להחליף את הכתובת הזו במזהה של תיקיית ה-Google Drive אליה יועלו הקבצים
// ניתן למצוא את המזהה בכתובת ה-URL של התיקייה, למשל:
// https://drive.google.com/drive/folders/THIS_IS_THE_ID
const UPLOAD_FOLDER_ID = '1a2b3c4d5e6f7g8h9i0j-k_l_m_n_o_p_q_r_s';

// רשימת כתובות אימייל של מנהלי המערכת
const ADMIN_EMAILS = ['admin1@example.com', 'chepti@gmail.com'];


// =================================================================
//                         טיפול בבקשות WEB
// =================================================================

/**
 * פונקציה ראשית המופעלת בעת גישה לכתובת ה-URL של האפליקציה.
 * מגישה את דף ה-HTML הראשי למשתמש.
 * @param {object} e - אובייקט האירוע של הבקשה.
 * @returns {HtmlOutput} - אובייקט HTML שיוצג בדפדפן.
 */
function doGet(e) {
  const htmlOutput = HtmlService.createTemplateFromFile('index').evaluate();
  htmlOutput.setTitle('גלריית התוצרים השיתופית');
  htmlOutput.addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
  return htmlOutput;
}

/**
 * פונקציה המאפשרת לכלול קבצי HTML אחרים (כמו CSS או JS) בתוך קובץ ה-HTML הראשי.
 * @param {string} filename - שם הקובץ שיש לכלול.
 * @returns {string} - התוכן של הקובץ.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}


// =================================================================
//                      פונקציות ממשק (API)
//           הפונקציות האלו נקראות מהצד לקוח (JavaScript)
// =================================================================

/**
 * מחזיר את נתוני המשתמש המחובר, או null אם המשתמש אינו מחובר.
 * בודק אם המשתמש הוא מנהל מערכת.
 * @returns {object|null} אובייקט עם פרטי המשתמש או null.
 */
function getUserData() {
  try {
    const email = Session.getActiveUser().getEmail();
    if (!email) {
      return null;
    }
    const isAdmin = ADMIN_EMAILS.includes(email);
    // TODO: להוסיף לוגיקה לקריאת נתונים נוספים מה-Sheet
    return {
      email: email,
      isAdmin: isAdmin,
      name: 'משתמש לדוגמה', // TODO: לשלוף שם אמיתי
      submissionsCount: 2,  // TODO: לספור הגשות
      reviewsCount: 1       // TODO: לספור ביקורות
    };
  } catch (e) {
    // אם המשתמש לא מחובר, Session.getActiveUser() יזרוק שגיאה
    return null;
  }
}

/**
 * מחזיר את רשימת כל התוצרים הגלויים לגלריה.
 * @param {object} filters - אובייקט עם פילטרים (כרגע לא בשימוש).
 * @returns {Array} מערך של אובייקטי תוצרים.
 */
function getGalleryArtifacts(filters) {
    // TODO: לוגיקה אמיתית לקריאת נתונים מה-Google Sheet
    // כרגע מחזיר נתונים סטטיים לדוגמה
    return [
        {id: 1, owner: 'a@a.com', title: 'מצגת מערכת השמש', previewUrl: 'https://via.placeholder.com/400x300.png/ADD8E6/000000?Text=PDF', type: 'pdf', tags: ['מדעים', 'כיתה ד-ו'], tool: 'PowerPoint'},
        {id: 2, owner: 'b@b.com', title: 'כרטיסיות אותיות', previewUrl: 'https://via.placeholder.com/400x300.png/90EE90/000000?Text=Canva', type: 'canva', tags: ['שפה', 'כיתה א'], tool: 'Canva'},
        {id: 3, owner: 'c@c.com', title: 'לוח זמנים צבעוני', previewUrl: 'https://via.placeholder.com/400x300.png/FFB6C1/000000?Text=Image', type: 'image', tags: ['ארגון', 'כללי'], tool: 'Photoshop'},
        {id: 4, owner: 'd@d.com', title: 'ג׳פרדי: ספרות לתיכון', previewUrl: 'https://via.placeholder.com/400x300.png/D8BFD8/000000?Text=HTML', type: 'html', tags: ['ספרות', 'בגרות'], tool: 'Genially'},
    ];
}

/**
 * מטפל בהגשת תוצר חדש.
 * מעלה את הקובץ (אם קיים) ל-Google Drive ורושם את הנתונים ב-Google Sheet.
 * @param {object} formData - אובייקט המכיל את נתוני הטופס.
 * @param {string} fileData - אם הועלה קובץ, זהו ייצוג base64 של הקובץ.
 * @returns {object} אובייקט המציין הצלחה או כישלון.
 */
function submitArtifact(formData, fileData) {
    const user = getUserData();
    if (!user) {
        throw new Error('משתמש לא מחובר. יש להתחבר כדי להגיש תוצר.');
    }

    // TODO: לוגיקת העלאת קובץ ל-Drive אם fileData קיים
    // TODO: לוגיקת שמירת הנתונים בגיליון ה-Artifacts
    
    console.log('התקבל תוצר חדש:', formData.title, 'מאת', user.email);

    // לאחר ההגשה, נבדוק אם צריך להקצות לו ביקורות חדשות
    assignReviewsIfNeeded(user.email);

    return { success: true, message: 'התוצר הוגש בהצלחה!' };
}

/**
 * מחזיר את המטלות לביקורת שהוקצו למשתמש הנוכחי.
 * @returns {Array} מערך של אובייקטי תוצרים לביקורת.
 */
function getReviewAssignments() {
    const user = getUserData();
    if (!user) return [];

    // TODO: לוגיקה אמיתית לקריאת הקצאות מה-Sheet
    return [
         {id: 5, title: 'משימה שהוקצתה לי 1', type: 'pdf'},
         {id: 6, title: 'משימה שהוקצתה לי 2', type: 'image'},
    ];
}


/**
 * שומר ביקורת חדשה שהוגשה על ידי משתמש.
 * @param {object} reviewData - נתוני הביקורת (ID של התוצר, ציונים והערות).
 * @returns {object} אובייקט המציין הצלחה או כישלון.
 */
function submitReview(reviewData) {
    const user = getUserData();
    if (!user) throw new Error('משתמש לא מחובר.');

    // TODO: לוגיקת שמירת הביקורת בגיליון ה-Reviews
    // TODO: עדכון סטטוס המטלה בגיליון ה-Assignments

    console.log('התקבלה ביקורת:', reviewData, 'מאת', user.email);
    return { success: true, message: 'הביקורת נשמרה בהצלחה!' };
}


// =================================================================
//                      לוגיקת ליבה ומנהלה
// =================================================================

/**
 * בודק אם למשתמש יש מספיק הגשות ופחות מ-3 מטלות ביקורת פתוחות,
 * ואם כן, מקצה לו מטלות חדשות.
 * @param {string} userEmail - כתובת המייל של המשתמש.
 */
function assignReviewsIfNeeded(userEmail) {
    // TODO:
    // 1. לספור כמה תוצרים המשתמש הגיש.
    // 2. לספור כמה מטלות ביקורת פתוחות יש לו.
    // 3. אם הגיש לפחות 1 (או לפי חוקיות אחרת) ויש לו פחות מ-3 מטלות, להפעיל assignNewReviews.
    console.log(`בדיקת צורך בהקצאת ביקורות עבור ${userEmail}`);
}

/**
 * מקצה עד 3 ביקורות חדשות ורנדומליות למשתמש.
 * דואג שהמשתמש לא יקבל את התוצרים של עצמו או תוצרים שכבר ביקר.
 * @param {string} userEmail - כתובת המייל של המשתמש.
 */
function assignNewReviews(userEmail) {
    // TODO:
    // 1. לקחת את כל רשימת התוצרים מה-Sheet.
    // 2. לסנן החוצה את התוצרים של המשתמש עצמו.
    // 3. לסנן החוצה תוצרים שהמשתמש כבר קיבל כמטלה.
    // 4. לבחור 3 بشكل אקראי מהרשימה שנותרה.
    // 5. לרשום את ההקצאות החדשות בגיליון ה-Assignments.
    console.log(`הקצאת ביקורות חדשות עבור ${userEmail}`);
}

// =================================================================
//                        פונקציות למנהל
// =================================================================

/**
 * מחזיר את כל הנתונים מכל הגיליונות עבור תצוגת המנהל.
 * פונקציה זו צריכה להיות מאובטחת ולוודא שהקורא הוא מנהל.
 * @returns {object} אובייקט המכיל מערכים של משתמשים, תוצרים וביקורות.
 */
function getAdminDashboardData() {
    const user = getUserData();
    if (!user || !user.isAdmin) {
        throw new Error('אין הרשאות גישה.');
    }

    // TODO: לוגיקה אמיתית לקריאת כל הנתונים מהגיליונות
    return {
        users: [{email: 'a@a.com', submissions: 5, reviews: 3}],
        artifacts: getGalleryArtifacts(), // שימוש חוזר בפונקציה של הגלריה לדוגמה
        reviews: [{reviewer: 'a@a.com', artifactId: 2, score: 4.5, comment: 'עבודה יפה'}]
    };
}

/**
 * מייצא את כל נתוני המערכת לקובץ CSV.
 * מאובטח למנהלים בלבד.
 * @returns {string} מחרוזת המכילה את כל המידע בפורמט CSV.
 */
function exportDataAsCsv() {
    const user = getUserData();
    if (!user || !user.isAdmin) {
        throw new Error('אין הרשאות גישה.');
    }

    // TODO:
    // 1. לקרוא את כל הנתונים מהגיליונות.
    // 2. להמיר כל גיליון למחרוזת CSV.
    // 3. לשרשר את כל המחרוזות יחד עם כותרות מתאימות.
    
    return 'header1,header2\nvalue1,value2';
} 