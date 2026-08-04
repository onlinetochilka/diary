const fs = require('fs');
const path = require('path');

function findMissingOnClick(dir) {
    let results = [];
    
    function walk(dir) {
        let list = fs.readdirSync(dir);
        for (let file of list) {
            let filepath = path.join(dir, file);
            let stat = fs.statSync(filepath);
            
            if (stat && stat.isDirectory()) {
                walk(filepath);
            } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
                let content = fs.readFileSync(filepath, 'utf8');
                
                // Find <div ... > or <span ...> or <p ...> or <li ...>
                let tagPattern = /<(div|span|p|li|a)\b([^>]*)>/gi;
                
                let match;
                while ((match = tagPattern.exec(content)) !== null) {
                    let tag = match[1];
                    let attrs = match[2];
                    
                    if (attrs.includes('cursor-pointer') || attrs.includes('role="button"')) {
                        if (!attrs.includes('onClick=') && !attrs.includes('href=')) {
                            if (!attrs.includes('{...props}') && !attrs.includes('{...rest}')) {
                                let lineNumber = content.substring(0, match.index).split('\n').length;
                                
                                let closingTag = `</${tag}>`;
                                let endIdx = tagPattern.lastIndex;
                                let closingTagIdx = content.indexOf(closingTag, endIdx);
                                let text = "";
                                if (closingTagIdx !== -1) {
                                    text = content.substring(endIdx, closingTagIdx).trim().replace(/<[^>]+>/g, ' ').replace(/\n/g, ' ');
                                }
                                results.push({ file: filepath, line: lineNumber, type: tag, text: text.substring(0, 50) });
                            }
                        }
                    }
                }
                
                // Find empty handlers like onClick={() => {}} or onClick={() => console.log}
                let emptyHandlerPattern = /onClick=\{\s*\(\s*\)\s*=>\s*(\{\s*\}|console\.log[^}]*)\s*\}/gi;
                while ((match = emptyHandlerPattern.exec(content)) !== null) {
                    let lineNumber = content.substring(0, match.index).split('\n').length;
                    results.push({ file: filepath, line: lineNumber, type: 'any', text: 'Empty onClick handler found' });
                }
            }
        }
    }
    
    walk(dir);
    return results;
}

const res = findMissingOnClick(path.join(__dirname, '..', 'src'));
res.forEach(r => console.log(`${r.file}:${r.line} | ${r.type} | Text: ${r.text}`));
