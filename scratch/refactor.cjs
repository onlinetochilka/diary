const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '../src');
const content = fs.readFileSync(path.join(src, 'pages/SettingsScreen.jsx'), 'utf8');

function extract(name) {
  const rx = new RegExp('^(const|function) ' + name + '\\b[\\s\\S]*?^}', 'm');
  const match = content.match(rx);
  if(!match) return null;
  let start = match.index;
  let braces = 0, inComp = false;
  let end = -1;
  for(let i=start; i<content.length; i++) {
    if(content[i]==='{') { braces++; inComp=true; }
    else if(content[i]==='}') { braces--; }
    if(inComp && braces===0) { end = i+1; break; }
  }
  return content.slice(start, end);
}

const UI_DIR = path.join(src, 'components/ui');
const SETTINGS_DIR = path.join(src, 'components/settings');
if (!fs.existsSync(SETTINGS_DIR)) fs.mkdirSync(SETTINGS_DIR);

const constants = `const INPUT_CLS =
  "w-full bg-stone-50 border border-stone-200/80 text-stone-900 text-sm rounded-xl px-3.5 py-3 " +
  "placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#006584]/20 " +
  "focus:bg-white focus:border-[#006584]/50 transition-all duration-200 hover:border-stone-300";

const LABEL_CLS =
  "block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1.5";

const BTN_BASE =
  "inline-flex items-center justify-center font-medium text-sm rounded-xl " +
  "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 " +
  "disabled:opacity-40 disabled:cursor-not-allowed";
`;

fs.writeFileSync(path.join(UI_DIR, 'FieldLabel.jsx'), `import React from 'react';\nimport { Loader2, Check } from 'lucide-react';\n\nconst LABEL_CLS = "block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1.5";\n\nexport ` + extract('FieldLabel') + '\n');

fs.writeFileSync(path.join(UI_DIR, 'SettingsCard.jsx'), `import React from 'react';\n\nexport ` + extract('SettingsCard') + '\n');

fs.writeFileSync(path.join(UI_DIR, 'SectionHeader.jsx'), `import React from 'react';\n\nexport ` + extract('SectionHeader') + '\n');

fs.writeFileSync(path.join(UI_DIR, 'SaveOnBlurInput.jsx'), `import React, { useState, useEffect } from 'react';\nimport { FieldLabel } from './FieldLabel.jsx';\n\n` + constants + `\nexport ` + extract('SaveOnBlurInput') + '\n');

fs.writeFileSync(path.join(UI_DIR, 'SaveOnBlurPhoneInput.jsx'), `import React, { useState, useEffect, useRef } from 'react';\nimport { FieldLabel } from './FieldLabel.jsx';\n\n` + constants + `\nexport ` + extract('SaveOnBlurPhoneInput') + '\n');

// Timezone Combobox needs TIMEZONE_GROUPS etc.
const tzRx = /const TIMEZONE_GROUPS = [\s\S]*?const findZoneLabel =.*?$/m;
const tzVars = content.match(tzRx)[0];
fs.writeFileSync(path.join(UI_DIR, 'TimezoneCombobox.jsx'), `import React, { useState, useEffect, useRef } from 'react';\nimport { ChevronDown, Search, Check } from 'lucide-react';\nimport { FieldLabel } from './FieldLabel.jsx';\n\n` + constants + `\n` + tzVars + `\n\nexport ` + extract('TimezoneCombobox') + '\n');

fs.writeFileSync(path.join(UI_DIR, 'ConfirmModal.jsx'), `import React from 'react';\nimport { Loader2 } from 'lucide-react';\nimport Modal from './Modal.jsx';\n\n` + constants + `\nexport ` + extract('ConfirmModal') + '\n');

const whRx = /const DEFAULT_WORKING_HOURS = [\s\S]*?const DAYS_OF_WEEK = [\s\S]*?];/m;
const whVars = content.match(whRx)[0];
fs.writeFileSync(path.join(SETTINGS_DIR, 'WorkingHoursSettings.jsx'), `import React, { useState, useEffect, useRef } from 'react';\nimport { Loader2, Check } from 'lucide-react';\nimport Switch from '../ui/Switch.jsx';\n\n` + whVars + `\n\nexport ` + extract('WorkingHoursSettings') + '\n');

const notifRx = /const DAYS_OPTIONS = [\s\S]*?const SMALL_NUM =.*?$/m;
const notifVars = content.match(notifRx)[0];
fs.writeFileSync(path.join(SETTINGS_DIR, 'NotificationsSettings.jsx'), `import React, { useState, useEffect, useRef } from 'react';\nimport { Loader2, Check, AlertCircle, BookCheck, BarChart3, Users, UserCheck } from 'lucide-react';\nimport Switch from '../ui/Switch.jsx';\nimport Select from '../ui/Select.jsx';\n\nconst LABEL_CLS = "block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1.5";\n\n` + notifVars + `\n\nexport ` + extract('NotificationsSettings') + '\n');

// TagsInput - we will use the one extracted from settings screen for now
fs.writeFileSync(path.join(SETTINGS_DIR, 'SettingsTagsInput.jsx'), `import React, { useState } from 'react';\n\n` + constants + `\nexport ` + extract('TagsInput') + '\n');

console.log('Extraction complete.');
