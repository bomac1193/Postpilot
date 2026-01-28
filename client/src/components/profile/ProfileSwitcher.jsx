import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { profileApi } from '../../lib/api';
import {
  ChevronDown,
  Plus,
  Check,
  User,
  Settings,
  Instagram,
  Loader2,
} from 'lucide-react';

// TikTok icon component
function TikTokIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
    </svg>
  );
}

function ProfileSwitcher({ collapsed = false }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const profiles = useAppStore((state) => state.profiles);
  const currentProfileId = useAppStore((state) => state.currentProfileId);
  const setProfiles = useAppStore((state) => state.setProfiles);
  const setCurrentProfile = useAppStore((state) => state.setCurrentProfile);
  const ensureCurrentProfile = useAppStore((state) => state.ensureCurrentProfile);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  const currentProfile = profiles.find(p => (p._id || p.id) === currentProfileId);

  // Load profiles on mount
  useEffect(() => {
    const loadProfiles = async () => {
      if (!isAuthenticated) return;

      try {
        setLoading(true);
        const profileList = await profileApi.getAll();
        setProfiles(profileList);

        // If no profiles, get/create the current one (which creates default)
        if (profileList.length === 0) {
          const defaultProfile = await profileApi.getCurrent();
          setProfiles([defaultProfile]);
          setCurrentProfile(defaultProfile._id);
        } else {
          // Ensure we have a current profile selected
          ensureCurrentProfile();
        }
      } catch (error) {
        console.error('Failed to load profiles:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfiles();
  }, [isAuthenticated, setProfiles, setCurrentProfile, ensureCurrentProfile]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitchProfile = async (profile) => {
    setCurrentProfile(profile._id || profile.id);
    setIsOpen(false);

    // Optionally notify backend of profile activation
    try {
      await profileApi.activate(profile._id || profile.id);
    } catch (error) {
      console.error('Failed to activate profile:', error);
    }
  };

  const handleCreateProfile = () => {
    setIsOpen(false);
    navigate('/profiles');
  };

  const handleManageProfiles = () => {
    setIsOpen(false);
    navigate('/profiles');
  };

  // Don't show if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className={`px-2 py-3 ${collapsed ? 'flex justify-center' : ''}`}>
        <Loader2 className="w-5 h-5 text-dark-400 animate-spin" />
      </div>
    );
  }

  // Collapsed state - just show avatar
  if (collapsed) {
    return (
      <div className="px-2 py-3 border-b border-dark-700">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center mx-auto overflow-hidden hover:ring-2 hover:ring-accent-purple/50 transition-all"
          title={currentProfile?.name || 'Switch Profile'}
        >
          {currentProfile?.avatar ? (
            <img
              src={currentProfile.avatar}
              alt={currentProfile.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-5 h-5 text-dark-400" />
          )}
        </button>

        {/* Dropdown for collapsed state */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute left-16 top-16 w-64 bg-dark-800 rounded-xl border border-dark-700 shadow-xl z-50"
          >
            <ProfileDropdownContent
              profiles={profiles}
              currentProfile={currentProfile}
              onSwitchProfile={handleSwitchProfile}
              onCreateProfile={handleCreateProfile}
              onManageProfiles={handleManageProfiles}
            />
          </div>
        )}
      </div>
    );
  }

  // Expanded state
  return (
    <div className="px-3 py-3 border-b border-dark-700" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-dark-700 transition-colors"
      >
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden"
          style={{
            backgroundColor: currentProfile?.color || '#8b5cf6'
          }}
        >
          {currentProfile?.avatar ? (
            <img
              src={currentProfile.avatar}
              alt={currentProfile.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-5 h-5 text-white" />
          )}
        </div>

        {/* Name and platform */}
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium text-dark-100 truncate">
            {currentProfile?.name || 'Select Profile'}
          </p>
          <p className="text-xs text-dark-400 flex items-center gap-1">
            {currentProfile?.platform === 'instagram' && (
              <Instagram className="w-3 h-3" />
            )}
            {currentProfile?.platform === 'tiktok' && (
              <TikTokIcon className="w-3 h-3" />
            )}
            {currentProfile?.platform === 'both' && (
              <>
                <Instagram className="w-3 h-3" />
                <TikTokIcon className="w-3 h-3" />
              </>
            )}
            {currentProfile?.username ? `@${currentProfile.username}` : currentProfile?.platform || 'No profile'}
          </p>
        </div>

        {/* Chevron */}
        <ChevronDown
          className={`w-4 h-4 text-dark-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-3 right-3 mt-2 bg-dark-800 rounded-xl border border-dark-700 shadow-xl z-50 overflow-hidden">
          <ProfileDropdownContent
            profiles={profiles}
            currentProfile={currentProfile}
            onSwitchProfile={handleSwitchProfile}
            onCreateProfile={handleCreateProfile}
            onManageProfiles={handleManageProfiles}
          />
        </div>
      )}
    </div>
  );
}

// Dropdown content component
function ProfileDropdownContent({
  profiles,
  currentProfile,
  onSwitchProfile,
  onCreateProfile,
  onManageProfiles,
}) {
  return (
    <>
      {/* Profile list */}
      <div className="max-h-64 overflow-y-auto py-2">
        {profiles.map((profile) => {
          const isActive = (profile._id || profile.id) === (currentProfile?._id || currentProfile?.id);

          return (
            <button
              key={profile._id || profile.id}
              onClick={() => onSwitchProfile(profile)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-dark-700 transition-colors ${
                isActive ? 'bg-dark-700/50' : ''
              }`}
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: profile.color || '#8b5cf6' }}
              >
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>

              {/* Name */}
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm text-dark-100 truncate">{profile.name}</p>
                {profile.username && (
                  <p className="text-xs text-dark-400">@{profile.username}</p>
                )}
              </div>

              {/* Check if active */}
              {isActive && (
                <Check className="w-4 h-4 text-accent-purple flex-shrink-0" />
              )}

              {/* Default badge */}
              {profile.isDefault && !isActive && (
                <span className="text-[10px] px-1.5 py-0.5 bg-dark-600 text-dark-300 rounded">
                  Default
                </span>
              )}
            </button>
          );
        })}

        {profiles.length === 0 && (
          <p className="px-4 py-3 text-sm text-dark-400 text-center">
            No profiles yet
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-dark-700 py-2">
        <button
          onClick={onCreateProfile}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-accent-purple hover:bg-dark-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add New Profile
        </button>
        <button
          onClick={onManageProfiles}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-dark-300 hover:bg-dark-700 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Manage Profiles
        </button>
      </div>
    </>
  );
}

export default ProfileSwitcher;
