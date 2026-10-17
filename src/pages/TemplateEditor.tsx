import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ChevronDown, ChevronRight, Pencil, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { CATEGORY_LABEL, TEMPLATES_ROOT, TEMPLATES_TABLE, isCategory, type Category } from '@/lib/templates';

/**
 * Template editor of /templates/:category, edits public.uzidoc_templates.
 * Copied from the «Системные шаблоны» editor of uzimed's admin panel.
 *
 *   normal                     one row per organ               parent_key null
 *   pathology, parent_key null an organ group (name only)      texts empty
 *   pathology, parent_key set  one pathology inside that group
 */

type LangCode = 'ru' | 'uz_latn' | 'uz_cyrl';
type Texts = Record<LangCode, string>;

const LANGS: { code: LangCode; label: string }[] = [
  { code: 'ru', label: 'Рус' },
  { code: 'uz_latn', label: "O'zb" },
  { code: 'uz_cyrl', label: 'Ўзб' },
];

const COLUMNS =
  'category, key, parent_key, sort_order, name_ru, name_uz_latn, name_uz_cyrl, text_ru, text_uz_latn, text_uz_cyrl, updated_at';

interface Row {
  category: Category;
  key: string;
  parent_key: string | null;
  sort_order: number;
  name_ru: string;
  name_uz_latn: string;
  name_uz_cyrl: string;
  text_ru: string;
  text_uz_latn: string;
  text_uz_cyrl: string;
  updated_at: string;
}

interface Item {
  key: string;
  parentKey: string | null;
  /** Pathology organ: has a name and pathologies, no text. */
  isGroup: boolean;
  name: Texts;
  text: Texts;
  row: Row;
}

interface Node {
  item: Item;
  children: Item[];
}

interface Draft {
  name: Texts;
  text: Texts;
}

const sameTexts = (a: Texts, b: Texts) => LANGS.every(({ code }) => a[code] === b[code]);
const everyLang = (v: string): Texts => ({ ru: v, uz_latn: v, uz_cyrl: v });
const rowName = (r: Row): Texts => ({ ru: r.name_ru, uz_latn: r.name_uz_latn, uz_cyrl: r.name_uz_cyrl });
const rowText = (r: Row): Texts => ({ ru: r.text_ru, uz_latn: r.text_uz_latn, uz_cyrl: r.text_uz_cyrl });
/** An empty Uzbek field falls back to Russian. */
const shown = (t: Texts, lang: LangCode) => t[lang] || t.ru;
const byOrder = (a: Row, b: Row) => a.sort_order - b.sort_order || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

function buildTree(category: Category, allRows: Row[]): Node[] {
  const rows = allRows.filter((r) => r.category === category).sort(byOrder);
  const toItem = (r: Row): Item => ({
    key: r.key,
    parentKey: r.parent_key,
    isGroup: category === 'pathology' && !r.parent_key,
    name: rowName(r),
    text: rowText(r),
    row: r,
  });
  if (category === 'normal') return rows.map((r) => ({ item: toItem(r), children: [] }));
  return rows
    .filter((r) => !r.parent_key)
    .map((g) => ({ item: toItem(g), children: rows.filter((r) => r.parent_key === g.key).map(toItem) }));
}

export default function TemplateEditor() {
  const { category } = useParams<{ category: string }>();
  if (!isCategory(category)) return <Navigate to={TEMPLATES_ROOT} replace />;
  // Keyed so that a different category starts from a clean state.
  return <Editor key={category} category={category} />;
}

function Editor({ category }: { category: Category }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lang, setLang] = useState<LangCode>('ru');
  // Non-null while «Редактировать» is on.
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState('');
  const [addParent, setAddParent] = useState('');
  const [adding, setAdding] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    const { data, error } = await supabase.from(TEMPLATES_TABLE).select(COLUMNS).eq('category', category);
    if (error) setLoadError(error.message);
    else setRows((data as Row[] | null) ?? []);
    setLoading(false);
  }, [category]);

  useEffect(() => { load(); }, [load]);

  const nodes = useMemo(() => buildTree(category, rows), [category, rows]);
  const items = useMemo(
    () => new Map(nodes.flatMap((n) => [n.item, ...n.children]).map((i) => [i.key, i])),
    [nodes],
  );
  const selected = selectedKey ? items.get(selectedKey) ?? null : null;
  const selectedChildren = selected ? nodes.find((n) => n.item.key === selected.key)?.children.length ?? 0 : 0;

  // Open the first template on load and after the selected one is deleted.
  useEffect(() => {
    if (loading || loadError || selected) return;
    const first = nodes[0];
    if (!first) return;
    setSelectedKey((first.children[0] ?? first.item).key);
    setExpanded(first.item.key);
  }, [loading, loadError, selected, nodes]);

  const dirty = !!selected && !!draft && (!sameTexts(draft.name, selected.name) || !sameTexts(draft.text, selected.text));
  const confirmDiscard = () => !dirty || confirm('Есть несохранённые изменения. Продолжить без сохранения?');

  // Closing the tab with unsaved text asks first.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const select = (key: string) => {
    if (key === selectedKey || !confirmDiscard()) return;
    setSelectedKey(key);
    setDraft(null);
  };

  // Accordion: one organ open at a time. A click on an organ also selects it
  // (to rename or delete it); a click on the open, selected organ closes it.
  const clickGroup = (key: string) => {
    if (expanded === key && selectedKey === key) { setExpanded(null); return; }
    if (key !== selectedKey && !confirmDiscard()) return;
    setExpanded(key);
    setSelectedKey(key);
    if (key !== selectedKey) setDraft(null);
  };

  const canEditText = !!selected && !selected.isGroup;
  const view: Draft | null = draft ?? (selected ? { name: selected.name, text: selected.text } : null);

  const toggleEdit = () => {
    if (!selected) return;
    if (draft) {
      if (!confirmDiscard()) return;
      setDraft(null);
      return;
    }
    setDraft({ name: { ...selected.name }, text: { ...selected.text } });
  };

  const setDraftField = (field: keyof Draft, value: string) =>
    setDraft((prev) => (prev ? { ...prev, [field]: { ...prev[field], [lang]: value } } : prev));

  const save = async () => {
    if (!selected || !draft || !dirty) return;
    if (!draft.name.ru.trim()) { toast.error('Название на русском обязательно'); return; }
    setSaving(true);
    const { data, error } = await supabase
      .from(TEMPLATES_TABLE)
      .update({
        name_ru: draft.name.ru.trim(),
        name_uz_latn: draft.name.uz_latn.trim(),
        name_uz_cyrl: draft.name.uz_cyrl.trim(),
        text_ru: draft.text.ru,
        text_uz_latn: draft.text.uz_latn,
        text_uz_cyrl: draft.text.uz_cyrl,
      })
      .eq('category', category)
      .eq('key', selected.key)
      // Refuse to overwrite a version this page has not seen (another tab).
      .eq('updated_at', selected.row.updated_at)
      .select(COLUMNS);
    setSaving(false);
    if (error) { toast.error('Ошибка: ' + error.message); return; }
    const saved = (data as Row[] | null)?.[0];
    if (!saved) { toast.error('Шаблон уже изменён в другом окне. Обновите страницу.'); return; }
    setRows((prev) => prev.map((r) => (r.key === saved.key ? saved : r)));
    setDraft(null);
    toast.success('Сохранено');
  };

  // Where a new pathology can go: an existing organ.
  const parentOptions = category === 'pathology' ? nodes.map((n) => n.item) : [];

  const openAdd = () => {
    if (!confirmDiscard()) return;
    setDraft(null);
    setAddName('');
    // Default to the organ of the current selection.
    const organ = selected && (selected.isGroup ? selected.key : selected.parentKey);
    setAddParent(organ && parentOptions.some((o) => o.key === organ) ? organ : '');
    setShowAdd(true);
  };

  const add = async () => {
    const name = addName.trim();
    if (!name) { toast.error('Введите название'); return; }
    const parent = category === 'pathology' && addParent ? addParent : null;
    setAdding(true);
    const key = `sys_${Date.now()}`;
    const siblings = rows.filter((r) => r.parent_key === parent);
    const { data, error } = await supabase
      .from(TEMPLATES_TABLE)
      .insert({
        category,
        key,
        parent_key: parent,
        sort_order: siblings.reduce((max, r) => Math.max(max, r.sort_order), 0) + 10,
        name_ru: name,
      })
      .select(COLUMNS)
      .single();
    setAdding(false);
    if (error) { toast.error('Ошибка: ' + error.message); return; }
    setRows((prev) => [...prev, data as Row]);
    setShowAdd(false);
    setSelectedKey(key);
    setExpanded(parent ?? key);
    // Straight into editing, so the text can be typed in.
    setDraft({ name: { ru: name, uz_latn: '', uz_cyrl: '' }, text: everyLang('') });
    toast.success('Шаблон добавлен');
  };

  const remove = async () => {
    if (!selected) return;
    setDeleting(true);
    const { error, count } = await supabase
      .from(TEMPLATES_TABLE)
      .delete({ count: 'exact' })
      .eq('category', category)
      .eq('key', selected.key);
    setDeleting(false);
    if (error) {
      toast.error(error.code === '23503' ? 'Сначала удалите все патологии этого органа' : 'Ошибка: ' + error.message);
      return;
    }
    if (!count) { toast.error('Шаблон не удалён'); return; }
    setRows((prev) => prev.filter((r) => r.key !== selected.key));
    setShowDelete(false);
    setDraft(null);
    setSelectedKey(null);
    toast.success('Шаблон удалён');
  };

  const listName = (i: Item) => shown(i.name, lang);

  const renderRow = (i: Item, nested: boolean) => {
    const active = i.key === selectedKey;
    return (
      <button
        key={i.key}
        onClick={() => select(i.key)}
        className={`w-full flex items-center gap-2 text-left text-sm border-t border-slate-100 transition-colors ${
          nested ? 'pl-8 pr-4 py-2' : 'px-4 py-2.5 font-medium'
        } ${active ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
      >
        <span className="flex-1 truncate">{listName(i)}</span>
      </button>
    );
  };

  const renderGroup = ({ item, children }: Node) => {
    const open = expanded === item.key;
    const active = item.key === selectedKey;
    return (
      <div key={item.key}>
        <button
          onClick={() => clickGroup(item.key)}
          aria-expanded={open}
          className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold border-t border-slate-100 transition-colors ${
            active ? 'bg-blue-600 text-white' : open ? 'bg-slate-50 text-slate-800' : 'text-slate-800 hover:bg-slate-50'
          }`}
        >
          <span className="flex-1 truncate">{listName(item)}</span>
          {open ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />}
        </button>
        {open && children.map((c) => renderRow(c, true))}
      </div>
    );
  };

  const deleteBlocked = selectedChildren > 0;

  return (
    <Layout>
      <Link to={TEMPLATES_ROOT} className="inline-flex items-center gap-1.5 mb-4 text-sm text-slate-400 hover:text-blue-600 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Шаблоны · {CATEGORY_LABEL[category]}
      </Link>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : loadError ? (
        <div className="bg-white border border-red-200 rounded-2xl p-8 text-center">
          <p className="text-sm text-red-600 mb-3">Не удалось загрузить шаблоны: {loadError}</p>
          <button onClick={load} className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200">
            <RotateCcw className="w-3.5 h-3.5" />
            Повторить
          </button>
        </div>
      ) : (
        <div className="flex bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" style={{ height: 'calc(100dvh - 190px)', minHeight: 480 }}>
          {/* Accordion */}
          <div className="w-80 flex-shrink-0 border-r border-slate-200 flex flex-col">
            <div className="p-3">
              <button
                onClick={openAdd}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Добавить шаблон
              </button>
            </div>
            <div className="flex-1 overflow-y-auto border-b border-slate-100">
              {nodes.map((n) => (category === 'pathology' ? renderGroup(n) : renderRow(n.item, false)))}
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 min-w-0 flex flex-col p-5">
            {nodes.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
                Шаблонов пока нет. Нажмите «Добавить шаблон».
              </div>
            )}
            {selected && view && (
              <>
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                    {LANGS.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => setLang(l.code)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                          lang === l.code ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                  <div className="ml-auto flex gap-2 flex-wrap">
                    <button
                      onClick={toggleEdit}
                      aria-pressed={!!draft}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 ${
                        draft ? 'bg-blue-800 text-white hover:bg-blue-900' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Редактировать
                    </button>
                    <button
                      onClick={save}
                      disabled={!dirty || saving}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {saving ? 'Сохранение...' : 'Сохранить'}
                    </button>
                    <button
                      onClick={() => setShowDelete(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 disabled:opacity-40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Удалить
                    </button>
                  </div>
                </div>

                <input
                  value={view.name[lang]}
                  onChange={(e) => setDraftField('name', e.target.value)}
                  readOnly={!draft}
                  placeholder={lang === 'ru' ? 'Название' : view.name.ru}
                  className={`w-full px-3.5 py-2 mb-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none ${
                    draft ? 'bg-white focus:border-blue-500' : 'bg-slate-50 cursor-default'
                  }`}
                />

                {!selected.isGroup && (
                  <textarea
                    key={`${selected.key}:${lang}`}
                    value={view.text[lang]}
                    onChange={(e) => setDraftField('text', e.target.value)}
                    readOnly={!draft || !canEditText}
                    placeholder={lang === 'ru' ? '' : view.text.ru}
                    className={`flex-1 min-h-[240px] w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 font-mono leading-relaxed resize-none focus:outline-none ${
                      draft && canEditText ? 'bg-white focus:border-blue-500' : 'bg-slate-50 cursor-default'
                    }`}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Add */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-slate-800 mb-4">Новый шаблон</h3>
            {category === 'pathology' && (
              <select
                value={addParent}
                onChange={(e) => setAddParent(e.target.value)}
                className="w-full px-3.5 py-2.5 mb-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="">— Новый орган —</option>
                {parentOptions.map((o) => <option key={o.key} value={o.key}>{shown(o.name, 'ru')}</option>)}
              </select>
            )}
            <input
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
              autoFocus
              placeholder="Название на русском"
              className="w-full px-3.5 py-2.5 mb-5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={add}
                disabled={adding}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {adding ? 'Создание...' : 'Создать'}
              </button>
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete */}
      {showDelete && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowDelete(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-slate-800 mb-2">Удалить «{shown(selected.name, lang)}»?</h3>
            <p className="text-sm text-slate-500 mb-5">
              {deleteBlocked
                ? `В этом органе есть патологии (${selectedChildren}). Сначала удалите их.`
                : 'Шаблон будет удалён безвозвратно.'}
            </p>
            <div className="flex gap-2">
              {!deleteBlocked && (
                <button
                  onClick={remove}
                  disabled={deleting}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? 'Удаление...' : 'Удалить'}
                </button>
              )}
              <button onClick={() => setShowDelete(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
