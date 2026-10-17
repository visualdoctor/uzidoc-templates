export const TEMPLATES_ROOT = '/templates';
export const TEMPLATES_TABLE = 'uzidoc_templates';

export type Category = 'normal' | 'pathology';

export const CATEGORY_LABEL: Record<Category, string> = { normal: 'Нормы', pathology: 'Патологии' };

export const isCategory = (v: string | undefined): v is Category => v === 'normal' || v === 'pathology';
