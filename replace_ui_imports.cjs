const fs = require('fs');
const path = require('path');

const UI_MAPPING = {
    "Button": ["default", "Button.jsx"],
    "Input": ["default", "Input.jsx"],
    "Switch": ["default", "Switch.jsx"],
    "Card": ["default", "Card.jsx"],
    "TextArea": ["default", "TextArea.jsx"],
    "Badge": ["default", "Badge.jsx"],
    "Alert": ["default", "Alert.jsx"],
    "SideDrawer": ["default", "SideDrawer.jsx"],
    "Modal": ["default", "Modal.jsx"],
    "SegmentedControl": ["default", "SegmentedControl.jsx"],
    "Select": ["default", "Select.jsx"],
    "Checkbox": ["default", "Checkbox.jsx"],
    "TagsInput": ["default", "TagsInput.jsx"],
    "ListInput": ["default", "ListInput.jsx"],
    "Tooltip": ["default", "Tooltip.jsx"],
    "EmptyState": ["default", "EmptyState.jsx"],
    "ToastProvider": ["named", "Toast.jsx"],
    "useToast": ["named", "Toast.jsx"],
    "DashboardLessonSkeleton": ["named", "Skeletons.jsx"],
    "ActionItemSkeleton": ["named", "Skeletons.jsx"],
    "FinanceMetricSkeleton": ["named", "Skeletons.jsx"],
    "FinanceChartSkeleton": ["named", "Skeletons.jsx"],
    "ProgramCardSkeleton": ["named", "Skeletons.jsx"],
};

function processFile(filepath) {
    const content = fs.readFileSync(filepath, 'utf8');
    
    const pattern = /import\s+\{([^}]+)\}\s+from\s+['"](.*?)ui(?:\/index\.js)?['"];?/g;
    
    let updated = false;
    const newContent = content.replace(pattern, (match, importsBlock, prefix) => {
        updated = true;
        
        let origPath = match.match(/from\s+['"](.*?)['"]/)[1];
        let dirPath = origPath;
        if (origPath.endsWith('/index.js')) {
            dirPath = origPath.slice(0, -9);
        }
        
        const components = importsBlock.split(',').map(s => s.trim()).filter(Boolean);
        const newImports = [];
        
        for (const c of components) {
            const parts = c.split(' as ');
            const origName = parts[0].trim();
            const alias = parts.length > 1 ? parts[1].trim() : null;
            
            if (UI_MAPPING[origName]) {
                const [exportType, filename] = UI_MAPPING[origName];
                const importPath = `${dirPath}/${filename}`;
                
                if (exportType === 'default') {
                    if (alias) {
                        newImports.push(`import ${alias} from '${importPath}';`);
                    } else {
                        newImports.push(`import ${origName} from '${importPath}';`);
                    }
                } else {
                    if (alias) {
                        newImports.push(`import { ${origName} as ${alias} } from '${importPath}';`);
                    } else {
                        newImports.push(`import { ${origName} } from '${importPath}';`);
                    }
                }
            } else {
                newImports.push(`// WARNING: Could not resolve ${c} from ui index`);
            }
        }
        
        return newImports.join('\n');
    });
    
    if (updated && newContent !== content) {
        fs.writeFileSync(filepath, newContent, 'utf8');
        console.log('Updated ' + filepath);
    }
}

function walkSync(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filepath = path.join(dir, file);
        const stat = fs.statSync(filepath);
        if (stat.isDirectory()) {
            walkSync(filepath);
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            processFile(filepath);
        }
    }
}

walkSync('d:/daily/src');
