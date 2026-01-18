import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppStore } from './stores/useAppStore';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import GridPlanner from './pages/GridPlanner';
import YouTubePlanner from './pages/YouTubePlanner';
import QuickEditor from './pages/QuickEditor';
import ProEditor from './pages/ProEditor';
import Calendar from './pages/Calendar';
import MediaLibrary from './pages/MediaLibrary';
import Connections from './pages/Connections';
import Settings from './pages/Settings';

function App() {
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    // Apply theme class to document
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + Z = Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useAppStore.getState().undo?.();
      }
      // Cmd/Ctrl + Shift + Z = Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        useAppStore.getState().redo?.();
      }
      // Cmd/Ctrl + S = Save (prevent default, trigger save)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        // Will be handled by active editor
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-dark-900">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/grid" replace />} />
          <Route path="grid" element={<GridPlanner />} />
          <Route path="youtube" element={<YouTubePlanner />} />
          <Route path="editor" element={<QuickEditor />} />
          <Route path="editor/pro" element={<ProEditor />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="library" element={<MediaLibrary />} />
          <Route path="connections" element={<Connections />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
