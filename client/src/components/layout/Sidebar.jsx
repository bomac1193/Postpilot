import { NavLink } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import {
  LayoutGrid,
  Image,
  Wand2,
  CalendarDays,
  FolderOpen,
  Link2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Youtube,
} from 'lucide-react';

// Custom magic wand logo icon for creator-magician brand
function MagicWandLogo({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Wand */}
      <path
        d="M3 21L15 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Wand tip glow */}
      <circle cx="16" cy="8" r="1.5" fill="currentColor" opacity="0.9" />
      {/* Magic sparkles */}
      <path
        d="M19 4L19.5 5.5L21 6L19.5 6.5L19 8L18.5 6.5L17 6L18.5 5.5L19 4Z"
        fill="currentColor"
      />
      <path
        d="M21 10L21.3 11L22.3 11.3L21.3 11.6L21 12.6L20.7 11.6L19.7 11.3L20.7 11L21 10Z"
        fill="currentColor"
        opacity="0.7"
      />
      <path
        d="M14 3L14.3 4L15.3 4.3L14.3 4.6L14 5.6L13.7 4.6L12.7 4.3L13.7 4L14 3Z"
        fill="currentColor"
        opacity="0.5"
      />
    </svg>
  );
}

const navItems = [
  { path: '/grid', icon: LayoutGrid, label: 'Grid Planner' },
  { path: '/youtube', icon: Youtube, label: 'YouTube Planner' },
  { path: '/editor', icon: Image, label: 'Quick Editor' },
  { path: '/editor/pro', icon: Wand2, label: 'Pro Editor' },
  { path: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { path: '/library', icon: FolderOpen, label: 'Media Library' },
  { path: '/connections', icon: Link2, label: 'Connections' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

function Sidebar() {
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-dark-800 border-r border-dark-700 flex flex-col transition-all duration-300 z-40 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo - Creator Magician Brand */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-dark-700">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center">
              <MagicWandLogo className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-semibold text-lg text-white tracking-tight">
              PostPilot
            </span>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center mx-auto group cursor-pointer">
            <MagicWandLogo className="w-5 h-5 text-white transition-transform group-hover:rotate-12" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-accent-purple/20 text-accent-purple'
                      : 'text-dark-300 hover:bg-dark-700 hover:text-dark-100'
                  } ${sidebarCollapsed ? 'justify-center' : ''}`
                }
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-dark-700">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-dark-400 hover:bg-dark-700 hover:text-dark-200 transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
