const fs = require('fs');

const code = fs.readFileSync('d:/daily/src/services/database.js', 'utf8');

// We will split the code using Regex.
// billingService includes: lessonPaymentNote, findLessonPayment, applyLessonIncomeChange, recalculateStudentBalance
// lessonFacade includes: addLesson, updateLesson, patchLesson, deleteLesson

function extractFunction(content, funcName, isAsync = false, isExport = false) {
    const exportPrefix = isExport ? 'export ' : '';
    const asyncPrefix = isAsync ? 'async ' : '';
    const regex = new RegExp(`^${exportPrefix}${asyncPrefix}function ${funcName}\\s*\\([\\s\\S]*?\\n^}`, 'm');
    const match = content.match(regex);
    if (!match) {
        console.error("Could not find " + funcName);
        return null;
    }
    return match[0];
}

const f_lessonPaymentNote = extractFunction(code, 'lessonPaymentNote');
const f_findLessonPayment = extractFunction(code, 'findLessonPayment', true);
const f_applyLessonIncomeChange = extractFunction(code, 'applyLessonIncomeChange', true);
const f_recalcBalance = extractFunction(code, 'recalculateStudentBalance', true, true);

const f_addLesson = extractFunction(code, 'addLesson', true, true);
const f_updateLesson = extractFunction(code, 'updateLesson', true, true);
const f_patchLesson = extractFunction(code, 'patchLesson', true, true);
const f_deleteLesson = extractFunction(code, 'deleteLesson', true, true);

if (!f_lessonPaymentNote || !f_addLesson) {
    console.error("Extraction failed");
    process.exit(1);
}

const billingContent = `import pb from "./pocketbase.js";
import { safeGetOne, invalidateCache } from "../api/databaseApi.js";

// -- Billing Logic --
${f_lessonPaymentNote.replace('function', 'export function')}

${f_findLessonPayment.replace('async function', 'export async function')}

${f_applyLessonIncomeChange.replace('async function', 'export async function')}

${f_recalcBalance}
`;

const lessonFacadeContent = `import pb from "./pocketbase.js";
import { invalidateCache } from "../api/databaseApi.js";
import { applyLessonIncomeChange } from "./billingService.js";

// -- Lesson Facade --
${f_addLesson}

${f_updateLesson}

${f_patchLesson}

${f_deleteLesson}
`;

// Now remove these from databaseApi.js and export safeGetOne/invalidateCache
let apiContent = code;
apiContent = apiContent.replace(f_lessonPaymentNote, '');
apiContent = apiContent.replace(f_findLessonPayment, '');
apiContent = apiContent.replace(f_applyLessonIncomeChange, '');
apiContent = apiContent.replace(f_recalcBalance, '');

apiContent = apiContent.replace(f_addLesson, '');
apiContent = apiContent.replace(f_updateLesson, '');
apiContent = apiContent.replace(f_patchLesson, '');
apiContent = apiContent.replace(f_deleteLesson, '');

// Make safeGetOne and invalidateCache exported
apiContent = apiContent.replace('async function safeGetOne', 'export async function safeGetOne');
apiContent = apiContent.replace('function invalidateCache', 'export function invalidateCache');

// Fix imports in databaseApi.js (it's now in src/api/)
apiContent = apiContent.replace('import pb from "./pocketbase.js";', 'import pb from "../services/pocketbase.js";');
apiContent = apiContent.replace('import { getNextDistinctColor } from "../utils/colors.js";', 'import { getNextDistinctColor } from "../utils/colors.js";');

const facadeContent = `// Facade for backward compatibility
export * from "../api/databaseApi.js";
export * from "./billingService.js";
export * from "./lessonFacadeService.js";
`;

fs.mkdirSync('d:/daily/src/api', { recursive: true });
fs.writeFileSync('d:/daily/src/api/databaseApi.js', apiContent);
fs.writeFileSync('d:/daily/src/services/billingService.js', billingContent);
fs.writeFileSync('d:/daily/src/services/lessonFacadeService.js', lessonFacadeContent);
fs.writeFileSync('d:/daily/src/services/database.js', facadeContent);

console.log("Splitting complete!");
