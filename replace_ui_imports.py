import os
import re

UI_MAPPING = {
    "Button": ("default", "Button.jsx"),
    "Input": ("default", "Input.jsx"),
    "Switch": ("default", "Switch.jsx"),
    "Card": ("default", "Card.jsx"),
    "TextArea": ("default", "TextArea.jsx"),
    "Badge": ("default", "Badge.jsx"),
    "Alert": ("default", "Alert.jsx"),
    "SideDrawer": ("default", "SideDrawer.jsx"),
    "Modal": ("default", "Modal.jsx"),
    "SegmentedControl": ("default", "SegmentedControl.jsx"),
    "Select": ("default", "Select.jsx"),
    "Checkbox": ("default", "Checkbox.jsx"),
    "TagsInput": ("default", "TagsInput.jsx"),
    "ListInput": ("default", "ListInput.jsx"),
    "Tooltip": ("default", "Tooltip.jsx"),
    "EmptyState": ("default", "EmptyState.jsx"),
    "ToastProvider": ("named", "Toast.jsx"),
    "useToast": ("named", "Toast.jsx"),
    "DashboardLessonSkeleton": ("named", "Skeletons.jsx"),
    "ActionItemSkeleton": ("named", "Skeletons.jsx"),
    "FinanceMetricSkeleton": ("named", "Skeletons.jsx"),
    "FinanceChartSkeleton": ("named", "Skeletons.jsx"),
    "ProgramCardSkeleton": ("named", "Skeletons.jsx"),
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find imports like: import { Button, Modal } from "../ui/index.js";
    # or import { Select as UISelect } from '../ui/index.js';
    pattern = r'import\s+\{([^}]+)\}\s+from\s+[\'"](.*?)ui(?:/index\.js)?[\'"];?'
    
    def replacer(match):
        imports_block = match.group(1)
        base_path = match.group(2) + "ui/" # e.g. "../" + "ui/" -> "../ui/"
        
        # In case they imported just "ui" or "components/ui" or "ui/index.js"
        # base_path matching: ".*?" will capture up to "ui".
        # Let's just grab the actual string used in the from clause to compute relative paths.
        full_from = match.group(0)
        # Extract the path from the original import
        path_match = re.search(r'from\s+[\'"](.*?)[\'"]', full_from)
        orig_path = path_match.group(1)
        
        # Remove /index.js if present
        if orig_path.endswith('/index.js'):
            dir_path = orig_path[:-9]
        elif orig_path.endswith('ui'):
            dir_path = orig_path
        else:
            dir_path = orig_path # fallback
            
        components = [c.strip() for c in imports_block.split(',')]
        new_imports = []
        for c in components:
            if not c: continue
            
            # handle aliases: Select as UISelect
            parts = c.split(' as ')
            orig_name = parts[0].strip()
            alias = parts[1].strip() if len(parts) > 1 else None
            
            if orig_name in UI_MAPPING:
                export_type, filename = UI_MAPPING[orig_name]
                import_path = f"{dir_path}/{filename}"
                
                if export_type == "default":
                    if alias:
                        new_imports.append(f"import {alias} from '{import_path}';")
                    else:
                        new_imports.append(f"import {orig_name} from '{import_path}';")
                else:
                    if alias:
                        new_imports.append(f"import {{ {orig_name} as {alias} }} from '{import_path}';")
                    else:
                        new_imports.append(f"import {{ {orig_name} }} from '{import_path}';")
            else:
                # Fallback if component is missing from mapping
                new_imports.append(f"// WARNING: Could not resolve {c} from ui index")
        
        return '\n'.join(new_imports)

    new_content = re.sub(pattern, replacer, content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

import glob
for root, dirs, files in os.walk('d:/daily/src'):
    for file in files:
        if file.endswith(('.js', '.jsx')):
            process_file(os.path.join(root, file))
