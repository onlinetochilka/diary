const fs = require('fs');
const file = 'd:/daily/src/pages/LandingPage.jsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = [
  ['в одном окне.', 'в одном месте.'],
  ['Там можно задать вопрос, предложить идею и обсудить с коллегами.', 'Задать вопрос, предложить идею и обсудить новости образования с коллегами.']
];

for (const [search, replace] of replacements) {
  content = content.replace(search, replace);
}

fs.writeFileSync(file, content, 'utf8');
console.log('FAQ replacements complete');
