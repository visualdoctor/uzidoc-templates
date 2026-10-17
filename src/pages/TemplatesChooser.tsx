import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { CATEGORY_LABEL, TEMPLATES_ROOT } from '@/lib/templates';

/** /templates → Нормы | Патологии. The editor itself is in TemplateEditor. */

function BigButton({ to, tone, children }: { to: string; tone: 'blue' | 'amber'; children: React.ReactNode }) {
  const colors = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    amber: 'bg-amber-500 hover:bg-amber-600',
  }[tone];
  return (
    <Link to={to} className={`sm:w-64 px-8 py-5 rounded-2xl text-lg font-bold text-white text-center shadow-sm transition-colors ${colors}`}>
      {children}
    </Link>
  );
}

export default function TemplatesChooser() {
  return (
    <Layout>
      <div className="h-full min-h-[420px] flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col sm:flex-row gap-4">
            <BigButton to={`${TEMPLATES_ROOT}/normal`} tone="blue">{CATEGORY_LABEL.normal}</BigButton>
            <BigButton to={`${TEMPLATES_ROOT}/pathology`} tone="amber">{CATEGORY_LABEL.pathology}</BigButton>
          </div>
        </div>
      </div>
    </Layout>
  );
}
