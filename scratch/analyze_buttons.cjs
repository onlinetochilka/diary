const fs = require('fs');
const path = require('path');

function findBrokenButtons(dir) {
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
                
                // regex matching button or Button tags
                let buttonPattern = /<(button|Button)\b([^>]*)>/gi;
                let linkPattern = /<(a|Link)\b([^>]*)>/gi;
                
                let match;
                while ((match = buttonPattern.exec(content)) !== null) {
                    let tag = match[1];
                    let attrs = match[2];
                    
                    let lineNumber = content.substring(0, match.index).split('\n').length;
                    
                    if (!attrs.includes('onClick=') && !attrs.includes('type="submit"') && !attrs.includes('form=')) {
                        if (!attrs.includes('{...props}') && !attrs.includes('{...rest}')) {
                            // find closing tag
                            let closingTag = `</${tag}>`;
                            let endIdx = buttonPattern.lastIndex;
                            let closingTagIdx = content.indexOf(closingTag, endIdx);
                            let text = "";
                            if (closingTagIdx !== -1) {
                                text = content.substring(endIdx, closingTagIdx).trim().replace(/<[^>]+>/g, ' ').replace(/\n/g, ' ');
                            }
                            results.push({ file: filepath, line: lineNumber, type: tag, issue: 'No onClick or type="submit"', text: text.substring(0, 50) });
                        }
                    } else if (attrs.includes('onClick={() => {}}') || attrs.includes('onClick={null}') || attrs.includes('onClick={undefined}')) {
                        results.push({ file: filepath, line: lineNumber, type: tag, issue: 'Empty onClick handler', text: '' });
                    }
                }
                
                while ((match = linkPattern.exec(content)) !== null) {
                    let tag = match[1];
                    let attrs = match[2];
                    
                    let lineNumber = content.substring(0, match.index).split('\n').length;
                    
                    if (!attrs.includes('href=') && !attrs.includes('to=') && !attrs.includes('onClick=')) {
                        if (!attrs.includes('{...props}') && !attrs.includes('{...rest}')) {
                            let closingTag = `</${tag}>`;
                            let endIdx = linkPattern.lastIndex;
                            let closingTagIdx = content.indexOf(closingTag, endIdx);
                            let text = "";
                            if (closingTagIdx !== -1) {
                                text = content.substring(endIdx, closingTagIdx).trim().replace(/<[^>]+>/g, ' ').replace(/\n/g, ' ');
                            }
                            results.push({ file: filepath, line: lineNumber, type: tag, issue: 'No href or onClick', text: text.substring(0, 50) });
                        }
                    }
                }
            }
        }
    }
    
    walk(dir);
    return results;
}

const res = findBrokenButtons(path.join(__dirname, '..', 'src'));
res.forEach(r => console.log(`${r.file}:${r.line} | ${r.type} | ${r.issue} | Text: ${r.text}`));
