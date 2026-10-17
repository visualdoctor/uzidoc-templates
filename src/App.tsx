import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import RequireOwner from '@/components/RequireOwner';
import Login from '@/pages/Login';
import TemplatesChooser from '@/pages/TemplatesChooser';
import TemplateEditor from '@/pages/TemplateEditor';
import { TEMPLATES_ROOT } from '@/lib/templates';

// HashRouter: GitHub Pages has no SPA fallback, so a refresh on /#/templates/normal
// must not hit the server with that path.
export default function App() {
  return (
    <HashRouter>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path={TEMPLATES_ROOT} element={<RequireOwner><TemplatesChooser /></RequireOwner>} />
        <Route path={`${TEMPLATES_ROOT}/:category`} element={<RequireOwner><TemplateEditor /></RequireOwner>} />
        <Route path="*" element={<Navigate to={TEMPLATES_ROOT} replace />} />
      </Routes>
    </HashRouter>
  );
}
