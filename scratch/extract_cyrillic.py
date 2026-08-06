import os
import re
from collections import Counter

src_dir = 'src'
cyrillic_word_pattern = re.compile(r'[А-Яа-яЁё]+')
words = Counter()

for root, _, files in os.walk(src_dir):
    for file in files:
        if file.endswith(('.js', '.jsx', '.ts', '.tsx', '.json', '.html')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                try:
                    content = f.read()
                    for match in cyrillic_word_pattern.finditer(content):
                        words[match.group().lower()] += 1
                except Exception:
                    pass

with open('scratch/cyrillic_words.txt', 'w', encoding='utf-8') as f:
    for word, count in words.most_common():
        f.write(f'{word}: {count}\n')
