import re
import codecs

def main():
    with codecs.open('src/components/schedule/DayInspector.jsx', 'r', 'utf-8') as f:
        code = f.read()

    # Replace headers
    code = re.sub(
        r'<p className="text-\[10px\] font-bold tracking-widest text-stone-400 uppercase mb-1\.5[^>]*>(.*?)</p>',
        lambda m: f'<p className="text-xs font-bold tracking-wider text-stone-700 uppercase mb-2">{re.sub(r"<span.*?/>", "", m.group(1)).strip()}</p>',
        code,
        flags=re.DOTALL
    )

    code = re.sub(
        r'className="flex items-center gap-2 text-xs font-bold tracking-widest text-stone-400 uppercase"',
        'className="flex items-center gap-2 text-xs font-bold tracking-wider text-stone-700 uppercase"',
        code
    )

    # Fix checkbox
    code = code.replace('onCheckedChange={(checked) => {', 'onChange={(e) => {\n            const checked = e.target.checked;')

    # Fix TopicBlock
    topic_block_old = """function TopicBlock({ formData, students, groups, onPatch }) {
  let activePrograms = [];
  if (formData.type === 'individual' && formData.studentId) {
    const st = students.find(s => s.id === formData.studentId);
    if (st) {
      const subj = st.subjects?.find(s => s.name === formData.subjectName) || st.subjects?.[0];
      if (subj?.programs) activePrograms = subj.programs;
    }
  } else if (formData.type === 'group' && formData.groupId) {
    const gr = groups.find(g => g.id === formData.groupId);
    if (gr?.programs) activePrograms = gr.programs;
  }

  if (activePrograms.length === 0) return null;
  const activeTopics = formData.programId ? activePrograms.find(p => p.id === formData.programId)?.topics || [] : [];"""

    topic_block_new = """function TopicBlock({ formData, students, groups, onPatch }) {
  let activePrograms = [];
  if (formData.type === 'individual' && formData.studentId) {
    const st = students.find(s => s.id === formData.studentId);
    if (st) {
      activePrograms = (st.subjects || []).flatMap(subj => subj.programs || []);
    }
  } else if (formData.type === 'group' && formData.groupId) {
    const gr = groups.find(g => g.id === formData.groupId);
    if (gr) {
      activePrograms = gr.programs || [];
    }
  }

  const activeTopics = formData.programId ? activePrograms.find(p => p.id === formData.programId)?.topics || [] : [];"""

    code = code.replace(topic_block_old, topic_block_new)

    code = code.replace('<option value="">Не выбрана</option>\n          {activePrograms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}', '<option value="">{activePrograms.length === 0 ? "Нет доступных программ" : "Не выбрана"}</option>\n          {activePrograms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}')

    with codecs.open('src/components/schedule/DayInspector.jsx', 'w', 'utf-8') as f:
        f.write(code)

if __name__ == '__main__':
    main()
