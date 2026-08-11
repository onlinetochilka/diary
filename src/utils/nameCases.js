/**
 * Simple heuristics for Russian name and role declension to Dative case (кому? чему?).
 */

const DATIVE_ROLES = {
  'мама': 'маме',
  'папа': 'папе',
  'мать': 'матери',
  'отец': 'отцу',
  'бабушка': 'бабушке',
  'дедушка': 'дедушке',
  'опекун': 'опекуну',
  'брат': 'брату',
  'сестра': 'сестре',
  'дядя': 'дяде',
  'тетя': 'тете',
  'тётя': 'тёте',
  'родитель': 'родителю'
};

// Inflects a single word (first name or last name) to Dative case
function inflectWordToDative(word, gender = 'unknown') {
  if (!word) return '';
  const lower = word.toLowerCase();
  
  // Known indeclinable or specific endings
  if (/[оиэуюы]$/.test(lower)) return word; // Алсу, Нелли, Мустафо
  
  const keepCase = (suffix, sliceLength = -1) => {
    return word.slice(0, sliceLength) + suffix;
  };
  const keepCaseAppend = (suffix) => word + suffix;

  // Last name heuristics (ov, in) -> masculine -ovu, -inu, feminine -ovoy, -inoy
  if (lower.endsWith('ова') || lower.endsWith('ева') || lower.endsWith('ина')) {
    return keepCase('ой', -1); // Иванова -> Ивановой
  }
  if (lower.endsWith('ов') || lower.endsWith('ев') || lower.endsWith('ин')) {
    return keepCaseAppend('у'); // Иванов -> Иванову
  }
  if (lower.endsWith('ая') || lower.endsWith('яя')) {
    return keepCase('ой', -2); // Белая -> Белой
  }
  if (lower.endsWith('ий') || lower.endsWith('ый')) {
    return keepCase('ому', -2); // Белый -> Белому
  }

  // First names
  if (lower.endsWith('ия')) return keepCase('ии', -2); // Мария -> Марии
  if (lower.endsWith('а')) return keepCase('е'); // Анна -> Анне, Никита -> Никите
  if (lower.endsWith('я')) return keepCase('е'); // Илья -> Илье, Аня -> Ане
  if (lower.endsWith('й')) return keepCase('ю'); // Андрей -> Андрею
  
  if (lower.endsWith('ь')) {
    // If gender is female, 'ь' -> 'и' (Любовь -> Любови). If male 'ь' -> 'ю' (Игорь -> Игорю).
    if (gender === 'female') return keepCase('и');
    return keepCase('ю');
  }

  // Consonants (excluding й, ь which are handled)
  if (/[бвгджзклмнпрстфхцчшщ]$/.test(lower)) {
    return keepCaseAppend('у'); // Иван -> Ивану, Максим -> Максиму
  }

  return word;
}

/**
 * Inflects a role and/or a full name to Dative case.
 */
export function getDativeContactName(role, name, gender = 'unknown') {
  let resultRole = '';
  let resultName = '';

  if (role) {
    const roleLower = role.toLowerCase().trim();
    if (DATIVE_ROLES[roleLower]) {
      const dRole = DATIVE_ROLES[roleLower];
      resultRole = role[0] === role[0].toUpperCase() 
        ? dRole.charAt(0).toUpperCase() + dRole.slice(1) 
        : dRole;
    } else {
      // Attempt to inflect unknown role as a regular word
      const words = role.trim().split(/\s+/);
      resultRole = words.map(w => inflectWordToDative(w, gender)).join(' ');
    }
  }

  if (name) {
    const words = name.trim().split(/\s+/);
    resultName = words.map(w => inflectWordToDative(w, gender)).join(' ');
  }

  if (resultRole && resultName) {
    return `${resultRole} ${resultName}`;
  }
  return resultRole || resultName || 'Родителю';
}

/**
 * Get display title for student
 */
export function getStudentDativeName(name, gender = 'unknown') {
  if (!name) return 'Ученику';
  const words = name.trim().split(/\s+/);
  const inflected = words.map(w => inflectWordToDative(w, gender)).join(' ');
  return inflected;
}
