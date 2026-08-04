import os
import re

def find_broken_buttons(src_dir):
    results = []
    
    # regex matches any <button ... > or <Button ... > that spans multiple lines
    # using non-greedy match.
    button_pattern = re.compile(r'<(button|Button)\b([^>]*)>', re.IGNORECASE | re.DOTALL)
    
    # Same for a and Link
    link_pattern = re.compile(r'<(a|Link)\b([^>]*)>', re.IGNORECASE | re.DOTALL)
    
    # We will also look for generic empty handlers like onClick={() => {}} or similar
    empty_handler_pattern = re.compile(r'onClick=\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}')

    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.jsx') or file.endswith('.js'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    # split into lines for reporting
                    lines = content.split('\n')
                    
                    # Find buttons without onClick or type="submit"
                    for match in button_pattern.finditer(content):
                        tag_name = match.group(1)
                        attrs = match.group(2)
                        
                        # Calculate line number
                        line_number = content.count('\n', 0, match.start()) + 1
                        
                        if 'onClick=' not in attrs and 'type="submit"' not in attrs and 'form=' not in attrs:
                            # It might be spread props like {...props}, but let's report it
                            if '{...props}' not in attrs and '{...rest}' not in attrs:
                                # try to extract text inside button
                                end_idx = match.end()
                                # find closing tag
                                closing_tag_idx = content.find(f'</{tag_name}>', end_idx)
                                text = ""
                                if closing_tag_idx != -1:
                                    text = content[end_idx:closing_tag_idx].strip()
                                    # strip nested tags
                                    text = re.sub(r'<[^>]+>', ' ', text).strip()
                                
                                results.append({
                                    'file': filepath,
                                    'line': line_number,
                                    'type': tag_name,
                                    'issue': 'No onClick or type="submit"',
                                    'text': text[:50].replace('\n', ' ')
                                })
                    
                    # Find links without href
                    for match in link_pattern.finditer(content):
                        tag_name = match.group(1)
                        attrs = match.group(2)
                        line_number = content.count('\n', 0, match.start()) + 1
                        
                        if 'href=' not in attrs and 'to=' not in attrs and 'onClick=' not in attrs:
                            if '{...props}' not in attrs and '{...rest}' not in attrs:
                                end_idx = match.end()
                                closing_tag_idx = content.find(f'</{tag_name}>', end_idx)
                                text = ""
                                if closing_tag_idx != -1:
                                    text = content[end_idx:closing_tag_idx].strip()
                                    text = re.sub(r'<[^>]+>', ' ', text).strip()
                                
                                results.append({
                                    'file': filepath,
                                    'line': line_number,
                                    'type': tag_name,
                                    'issue': 'No href or onClick',
                                    'text': text[:50].replace('\n', ' ')
                                })

    return results

if __name__ == '__main__':
    res = find_broken_buttons(r'd:\daily\src')
    for r in res:
        print(f"{r['file']}:{r['line']} | {r['type']} | {r['issue']} | Text: {r['text']}")
