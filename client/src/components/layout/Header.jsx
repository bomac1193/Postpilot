import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import {
  Bell,
  Search,
  Moon,
  Sun,
  User,
  Upload,
  Plus,
} from 'lucide-react';

// Remap zoom: slider value to actual scale (quadratic for zoom > 1)
const getActualZoom = (val) => val <= 1 ? val : val * val;

const pageTitles = {
  '/grid': 'Grid Planner',
  '/youtube': 'YouTube Planner',
  '/editor': 'Quick Editor',
  '/editor/pro': 'Pro Editor',
  '/calendar': 'Content Calendar',
  '/library': 'Media Library',
  '/connections': 'Platform Connections',
  '/settings': 'Settings',
};

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const user = useAppStore((state) => state.user);

  const title = pageTitles[location.pathname] || 'PostPilot';

  return (
    <header className="h-16 bg-dark-800/80 backdrop-blur-sm border-b border-dark-700 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-display font-semibold text-dark-100">{title}</h1>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="text"
            placeholder="Search..."
            className="w-64 pl-10 pr-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm text-dark-100 placeholder-dark-400 focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-colors"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-xs bg-dark-600 text-dark-400 rounded">
            /
          </kbd>
        </div>

        {/* Upload Button */}
        <button className="btn-primary">
          <Upload className="w-4 h-4" />
          <span>Upload</span>
        </button>

        {/* New Post */}
        <button className="btn-secondary">
          <Plus className="w-4 h-4" />
          <span>New Post</span>
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-dark-600" />

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="btn-icon"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>

        {/* Notifications */}
        <button className="btn-icon relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-accent-purple rounded-full" />
        </button>

        {/* User Menu */}
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-dark-700 transition-colors"
          title="Profile Settings"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-purple to-accent-blue overflow-hidden relative">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || 'Profile'}
                className="absolute pointer-events-none"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  left: '50%',
                  top: '50%',
                  transformOrigin: 'center center',
                  transform: `translate(-50%, -50%) translate(${(user.avatarPosition?.x || 0) * 0.12}px, ${(user.avatarPosition?.y || 0) * 0.12}px) scale(${getActualZoom(user.avatarZoom || 1)})`,
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        </button>
      </div>
    </header>
  );
}

export default Header;
