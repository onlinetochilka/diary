import zipfile
import xml.etree.ElementTree as ET
import sys

def extract_text(path):
    try:
        with zipfile.ZipFile(path) as docx:
            tree = ET.fromstring(docx.read('word/document.xml'))
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            text = []
            for p in tree.findall('.//w:p', ns):
                t = [n.text for n in p.findall('.//w:t', ns) if n.text]
                if t: text.append(''.join(t))
            return '\n'.join(text)
    except Exception as e:
        return str(e)

print('--- Согласие ---')
print(extract_text(r'd:\daily\Согласие на обработку персональных данных.docx'))
print('--- Политика ---')
print(extract_text(r'd:\daily\Политика конфиденциальности.docx'))
print('--- Лицензионное ---')
print(extract_text(r'd:\daily\Лицензионное соглашение.docx'))
