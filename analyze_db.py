import os
import re

with open('d:/daily/src/services/database.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Define headers
headers = [
    "// ── Helpers ──",
    "// ── In-Memory Cache ──",
    "// ── Balance Helpers ──",
    "// ── Users ──",
    "// ── Students ──",
    "// ── Groups ──",
    "// ── Programs & Themes ──",
    "// ── Lessons ──",
    "// ── Payments ──",
    "// ── Configuration ──",
    "// ── Community News ──"
]

# We will match lines starting with "// ──"
sections = []
current_section_name = "Header"
current_section_lines = []

for line in content.split('\n'):
    match = re.match(r'^// ── (.*?) ──', line)
    if match:
        sections.append((current_section_name, '\n'.join(current_section_lines)))
        current_section_name = match.group(1).strip()
        current_section_lines = [line]
    else:
        current_section_lines.append(line)
        
sections.append((current_section_name, '\n'.join(current_section_lines)))

for name, body in sections:
    print(f"Section: {name} - length: {len(body)}")
