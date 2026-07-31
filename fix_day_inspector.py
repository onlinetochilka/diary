import re
import os

def main():
    with open('src/components/schedule/DayInspector.jsx', 'r', encoding='utf-8') as f:
        code = f.read()

    # 1. Update the headers.
    # Replace `<p className="text-[10px] font-bold tracking-widest text-stone-400 uppercase mb-1.5 flex items-center gap-1.5">`
    # and other variations with `<p className="text-[11px] font-bold tracking-wider text-stone-700 uppercase mb-2">`
    # Also remove `<span className="w-1.5 h-1.5 rounded-full bg-xxx" />`
    
    code = re.sub(
        r'<p className="text-\[10px\] font-bold tracking-widest text-stone-400 uppercase mb-1\.5[^>]*>(.*?)</p>',
        lambda m: f'<p className="text-xs font-bold tracking-wider text-stone-700 uppercase mb-2">{re.sub(r"<span.*?/>", "", m.group(1)).strip()}</p>',
        code,
        flags=re.DOTALL
    )

    # Note: `NotesBlock` header is a button.
    # `<div className="flex items-center gap-2 text-xs font-bold tracking-widest text-stone-400 uppercase">`
    code = re.sub(
        r'className="flex items-center gap-2 text-xs font-bold tracking-widest text-stone-400 uppercase"',
        'className="flex items-center gap-2 text-xs font-bold tracking-wider text-stone-700 uppercase"',
        code
    )

    # 2. Fix the checkbox logic. `onCheckedChange` -> `onChange` and use `e.target.checked`
    code = code.replace('onCheckedChange={(checked) => {', 'onChange={(e) => {\n            const checked = e.target.checked;')
    # We can also clean up the checkbox div structure since Checkbox handles label itself, but keeping it as is with onChange fix is fine.
    # Wait, in Checkbox, it uses `onChange={onChange}`, and expects `e`.
    
    # Let's fix TopicBlock to show all programs if activePrograms.length == 0
    # Wait, activePrograms is derived from student's subjects. If length is 0, we should just show all programs?
    # No, activePrograms logic:
    """
    let activePrograms = [];
    if (formData.type === 'individual' && formData.studentId) {
      const st = students.find(s => s.id === formData.studentId);
      if (st) {
        // If there's no subjectName, or it doesn't match, we still want to show programs!
        // So we can flatMap all programs from all subjects.
        activePrograms = st.subjects?.flatMap(subj => subj.programs || []) || [];
      }
    } else if (formData.type === 'group' && formData.groupId) {
      const gr = groups.find(g => g.id === formData.groupId);
      if (gr?.programs) activePrograms = gr.programs;
    }
    """
    # I'll replace TopicBlock completely with string replacement.

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

    # For empty program option:
    code = code.replace(
      '<option value="">Не выбрана</option>\n          {activePrograms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}',
      '<option value="">{activePrograms.length === 0 ? "Нет доступных программ" : "Не выбрана"}</option>\n          {activePrograms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}'
    )

    with open('src/components/schedule/DayInspector.jsx', 'w', encoding='utf-8') as f:
        f.write(code)

if __name__ == '__main__':
    main()
