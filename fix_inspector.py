import re

with open('src/components/schedule/LessonInspector.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace <Card variant="elevated" className="space-y-4">
code = code.replace('<Card variant="elevated" className="space-y-4">', '<div className="bg-white rounded-2xl border border-stone-100 p-5 space-y-4 shadow-sm">')
code = code.replace('</Card>', '</div>')

# SegmentedControl for Individual/Group
seg_pattern = r'<SegmentedControl\s*options=\{\[\s*\{\s*label:\s*"Индивидуальный"[^\}]+\},\s*\{\s*label:\s*"Групповой"[^\}]+\},\s*\]\}\s*value=\{formData\.type\}\s*onChange=\{\(val\)\s*=>\s*handleChange\("type",\s*val\)\}\s*/>'
seg_replacement = '''<div className="flex gap-2 p-1 bg-stone-100/50 rounded-xl">
                  <button type="button" onClick={() => handleChange("type", "individual")} className={cn("flex-1 py-1.5 text-xs font-bold rounded-lg transition-all", formData.type === 'individual' ? "bg-white text-stone-800 shadow-sm" : "text-stone-500")}>Индивидуальный</button>
                  <button type="button" onClick={() => handleChange("type", "group")} className={cn("flex-1 py-1.5 text-xs font-bold rounded-lg transition-all", formData.type === 'group' ? "bg-white text-stone-800 shadow-sm" : "text-stone-500")}>Групповой</button>
                </div>'''
code = re.sub(seg_pattern, seg_replacement, code)

# Select replacements
def replace_select(match):
    label = match.group(1)
    props = match.group(2)
    children = match.group(3)
    
    # We must not render the 'label=' prop inside props
    # Since we consumed label in the regex, it's not in props.
    
    return f'''<div>
                  <p className="text-xs font-bold tracking-wider text-stone-700 uppercase mb-2">{label}</p>
                  <select
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-[#006584]/50 focus:ring-2 focus:ring-[#006584]/20 text-stone-800"
                    {props.strip()}
                  >
                    {children.strip()}
                  </select>
                </div>'''

select_pattern = r'<Select\s+label="([^"]+)"([^>]+)>([\s\S]*?)</Select>'
code = re.sub(select_pattern, replace_select, code)

# Input replacements
def replace_input(match):
    label = match.group(1)
    props = match.group(2)
    
    # We must not render the 'error=' prop if it is a native input
    props = re.sub(r'\s*error=\{[^}]+\}', '', props)

    return f'''<div>
                  <p className="text-xs font-bold tracking-wider text-stone-700 uppercase mb-2">{label}</p>
                  <input
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-[#006584]/50 focus:ring-2 focus:ring-[#006584]/20 text-stone-800"
                    {props.strip()}
                  />
                </div>'''

input_pattern = r'<Input\s+label="([^"]+)"([^>]+)/>'
code = re.sub(input_pattern, replace_input, code)

with open('src/components/schedule/LessonInspector.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print('Done applying flat styles!')
