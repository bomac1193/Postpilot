import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { profileApi } from '../lib/api';
import {
  User,
  Plus,
  Pencil,
  Trash2,
  Star,
  Check,
  X,
  Instagram,
  Link2,
  Unlink,
  Loader2,
  AlertCircle,
  Upload,
} from 'lucide-react';

// TikTok icon component
function TikTokIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
    </svg>
  );
}

// Preset colors for profiles
const PROFILE_COLORS = [
  { id: 'purple', value: '#8b5cf6', name: 'Purple' },
  { id: 'blue', value: '#3b82f6', name: 'Blue' },
  { id: 'green', value: '#10b981', name: 'Green' },
  { id: 'orange', value: '#f97316', name: 'Orange' },
  { id: 'pink', value: '#ec4899', name: 'Pink' },
  { id: 'indigo', value: '#6366f1', name: 'Indigo' },
  { id: 'teal', value: '#14b8a6', name: 'Teal' },
  { id: 'amber', value: '#f59e0b', name: 'Amber' },
  { id: 'red', value: '#ef4444', name: 'Red' },
  { id: 'cyan', value: '#06b6d4', name: 'Cyan' },
];

function Profiles() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editingProfile, setEditingProfile] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [socialStatus, setSocialStatus] = useState({});

  const profiles = useAppStore((state) => state.profiles);
  const currentProfileId = useAppStore((state) => state.currentProfileId);
  const setProfiles = useAppStore((state) => state.setProfiles);
  const addProfile = useAppStore((state) => state.addProfile);
  const updateProfile = useAppStore((state) => state.updateProfile);
  const deleteProfile = useAppStore((state) => state.deleteProfile);
  const setCurrentProfile = useAppStore((state) => state.setCurrentProfile);

  // Load profiles
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const profileList = await profileApi.getAll();
        setProfiles(profileList);

        // Load social status for each profile
        const statusMap = {};
        for (const profile of profileList) {
          try {
            const status = await profileApi.getSocialStatus(profile._id);
            statusMap[profile._id] = status;
          } catch (err) {
            console.error('Failed to load social status for profile:', profile._id, err);
          }
        }
        setSocialStatus(statusMap);
      } catch (err) {
        setError(err.message || 'Failed to load profiles');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [setProfiles]);

  // Create new profile
  const handleCreateProfile = async (formData) => {
    try {
      setSaving(true);
      const newProfile = await profileApi.create(formData);
      addProfile(newProfile);
      setShowCreateModal(false);

      // If this is the first profile, set it as current
      if (profiles.length === 0) {
        setCurrentProfile(newProfile._id);
      }
    } catch (err) {
      setError(err.message || 'Failed to create profile');
    } finally {
      setSaving(false);
    }
  };

  // Update profile
  const handleUpdateProfile = async (id, updates) => {
    try {
      setSaving(true);
      const updated = await profileApi.update(id, updates);
      updateProfile(id, updated);
      setEditingProfile(null);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Delete profile
  const handleDeleteProfile = async (id) => {
    try {
      setSaving(true);
      await profileApi.delete(id);
      deleteProfile(id);
      setDeleteConfirm(null);
    } catch (err) {
      setError(err.message || 'Failed to delete profile');
    } finally {
      setSaving(false);
    }
  };

  // Set as default
  const handleSetDefault = async (id) => {
    try {
      setSaving(true);
      await profileApi.setDefault(id);
      // Update local state - set all to non-default, then set this one as default
      profiles.forEach(p => {
        if ((p._id || p.id) === id) {
          updateProfile(p._id || p.id, { isDefault: true });
        } else {
          updateProfile(p._id || p.id, { isDefault: false });
        }
      });
    } catch (err) {
      setError(err.message || 'Failed to set default profile');
    } finally {
      setSaving(false);
    }
  };

  // Use parent connection
  const handleUseParentConnection = async (profileId, platform) => {
    try {
      setSaving(true);
      if (platform === 'instagram') {
        await profileApi.useParentInstagram(profileId);
      } else {
        await profileApi.useParentTiktok(profileId);
      }
      // Refresh social status
      const status = await profileApi.getSocialStatus(profileId);
      setSocialStatus(prev => ({ ...prev, [profileId]: status }));
    } catch (err) {
      setError(err.message || 'Failed to update connection');
    } finally {
      setSaving(false);
    }
  };

  // Connect own account
  const handleConnectOwn = async (profileId, platform) => {
    try {
      setSaving(true);
      let url;
      if (platform === 'instagram') {
        url = await profileApi.connectInstagram(profileId);
      } else {
        url = await profileApi.connectTiktok(profileId);
      }
      // Redirect to OAuth
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setError(err.message || 'Failed to start connection');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent-purple animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-semibold text-dark-100 mb-2">
            Profiles
          </h1>
          <p className="text-dark-400">
            Manage your social media profiles. Each profile has its own grids and collections.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          New Profile
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto p-1 hover:bg-red-900/30 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Profiles List */}
      <div className="space-y-4">
        {profiles.map((profile) => {
          const status = socialStatus[profile._id] || {};
          const isEditing = editingProfile === profile._id;

          return (
            <div
              key={profile._id || profile.id}
              className={`bg-dark-800 rounded-xl border border-dark-700 p-6 ${
                (profile._id || profile.id) === currentProfileId
                  ? 'ring-2 ring-accent-purple/50'
                  : ''
              }`}
            >
              {isEditing ? (
                <ProfileEditForm
                  profile={profile}
                  onSave={(updates) => handleUpdateProfile(profile._id, updates)}
                  onCancel={() => setEditingProfile(null)}
                  saving={saving}
                />
              ) : (
                <>
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div
                      className="w-16 h-16 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: profile.color || '#8b5cf6' }}
                    >
                      {profile.avatar ? (
                        <img
                          src={profile.avatar}
                          alt={profile.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-8 h-8 text-white" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-medium text-dark-100">
                          {profile.name}
                        </h3>
                        {profile.isDefault && (
                          <span className="badge badge-purple">Default</span>
                        )}
                        {(profile._id || profile.id) === currentProfileId && (
                          <span className="badge badge-green">Active</span>
                        )}
                      </div>
                      {profile.username && (
                        <p className="text-sm text-dark-400 mb-1">
                          @{profile.username}
                        </p>
                      )}
                      {profile.bio && (
                        <p className="text-sm text-dark-400 line-clamp-2">
                          {profile.bio}
                        </p>
                      )}

                      {/* Platform */}
                      <div className="flex items-center gap-2 mt-2">
                        {(profile.platform === 'instagram' || profile.platform === 'both') && (
                          <Instagram className="w-4 h-4 text-pink-500" />
                        )}
                        {(profile.platform === 'tiktok' || profile.platform === 'both') && (
                          <TikTokIcon className="w-4 h-4 text-dark-300" />
                        )}
                        <span className="text-xs text-dark-500 capitalize">
                          {profile.platform}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {!profile.isDefault && (
                        <button
                          onClick={() => handleSetDefault(profile._id)}
                          className="btn-icon"
                          title="Set as default"
                          disabled={saving}
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setEditingProfile(profile._id)}
                        className="btn-icon"
                        title="Edit profile"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {profiles.length > 1 && (
                        <button
                          onClick={() => setDeleteConfirm(profile._id)}
                          className="btn-icon text-red-400 hover:bg-red-900/20"
                          title="Delete profile"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Social Connections */}
                  <div className="mt-6 pt-4 border-t border-dark-700">
                    <h4 className="text-sm font-medium text-dark-300 mb-3">
                      Social Connections
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Instagram */}
                      <div className="bg-dark-700/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Instagram className="w-4 h-4 text-pink-500" />
                          <span className="text-sm font-medium text-dark-200">Instagram</span>
                          {status.instagram?.connected && (
                            <Check className="w-4 h-4 text-green-400 ml-auto" />
                          )}
                        </div>
                        {status.instagram?.connected ? (
                          <div>
                            <p className="text-xs text-dark-400">
                              {status.instagram.useParent ? 'Using parent account' : 'Own account'}
                              {status.instagram.username && `: @${status.instagram.username}`}
                            </p>
                            <div className="flex gap-2 mt-2">
                              {status.instagram.useParent ? (
                                <button
                                  onClick={() => handleConnectOwn(profile._id, 'instagram')}
                                  className="text-xs text-accent-purple hover:underline"
                                  disabled={saving}
                                >
                                  Connect own account
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUseParentConnection(profile._id, 'instagram')}
                                  className="text-xs text-dark-400 hover:text-dark-200"
                                  disabled={saving}
                                >
                                  Use parent account
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs text-dark-500 mb-2">Not connected</p>
                            <button
                              onClick={() => handleUseParentConnection(profile._id, 'instagram')}
                              className="text-xs text-accent-purple hover:underline"
                              disabled={saving}
                            >
                              Use parent connection
                            </button>
                          </div>
                        )}
                      </div>

                      {/* TikTok */}
                      <div className="bg-dark-700/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <TikTokIcon className="w-4 h-4" />
                          <span className="text-sm font-medium text-dark-200">TikTok</span>
                          {status.tiktok?.connected && (
                            <Check className="w-4 h-4 text-green-400 ml-auto" />
                          )}
                        </div>
                        {status.tiktok?.connected ? (
                          <div>
                            <p className="text-xs text-dark-400">
                              {status.tiktok.useParent ? 'Using parent account' : 'Own account'}
                              {status.tiktok.username && `: @${status.tiktok.username}`}
                            </p>
                            <div className="flex gap-2 mt-2">
                              {status.tiktok.useParent ? (
                                <button
                                  onClick={() => handleConnectOwn(profile._id, 'tiktok')}
                                  className="text-xs text-accent-purple hover:underline"
                                  disabled={saving}
                                >
                                  Connect own account
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUseParentConnection(profile._id, 'tiktok')}
                                  className="text-xs text-dark-400 hover:text-dark-200"
                                  disabled={saving}
                                >
                                  Use parent account
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs text-dark-500 mb-2">Not connected</p>
                            <button
                              onClick={() => handleUseParentConnection(profile._id, 'tiktok')}
                              className="text-xs text-accent-purple hover:underline"
                              disabled={saving}
                            >
                              Use parent connection
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Delete Confirmation */}
              {deleteConfirm === profile._id && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-dark-800 rounded-xl p-6 w-96 border border-dark-700">
                    <h3 className="text-lg font-medium text-dark-100 mb-2">
                      Delete Profile
                    </h3>
                    <p className="text-dark-400 mb-4">
                      Are you sure you want to delete "{profile.name}"? Grids and collections
                      associated with this profile will be preserved but unlinked.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="flex-1 btn-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDeleteProfile(profile._id)}
                        disabled={saving}
                        className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                      >
                        {saving ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {profiles.length === 0 && (
          <div className="text-center py-16 bg-dark-800 rounded-xl border border-dark-700">
            <User className="w-16 h-16 text-dark-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-dark-200 mb-2">
              No profiles yet
            </h3>
            <p className="text-dark-400 mb-4">
              Create your first profile to get started
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" />
              Create Profile
            </button>
          </div>
        )}
      </div>

      {/* Create Profile Modal */}
      {showCreateModal && (
        <ProfileCreateModal
          onSave={handleCreateProfile}
          onCancel={() => setShowCreateModal(false)}
          saving={saving}
        />
      )}
    </div>
  );
}

// Profile Edit Form Component
function ProfileEditForm({ profile, onSave, onCancel, saving }) {
  const [formData, setFormData] = useState({
    name: profile.name || '',
    username: profile.username || '',
    bio: profile.bio || '',
    platform: profile.platform || 'both',
    color: profile.color || '#8b5cf6',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-1">
            Profile Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:outline-none focus:border-accent-purple"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-1">
            Username (optional)
          </label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="@username"
            className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:outline-none focus:border-accent-purple"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-dark-300 mb-1">
          Bio (optional)
        </label>
        <textarea
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          rows={2}
          className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:outline-none focus:border-accent-purple resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-1">
            Platform
          </label>
          <select
            value={formData.platform}
            onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
            className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:outline-none focus:border-accent-purple"
          >
            <option value="both">Both Platforms</option>
            <option value="instagram">Instagram Only</option>
            <option value="tiktok">TikTok Only</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-1">
            Color
          </label>
          <div className="flex gap-1">
            {PROFILE_COLORS.map((color) => (
              <button
                key={color.id}
                type="button"
                onClick={() => setFormData({ ...formData, color: color.value })}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                  formData.color === color.value ? 'border-white' : 'border-transparent'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 btn-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 btn-primary"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

// Profile Create Modal Component
function ProfileCreateModal({ onSave, onCancel, saving }) {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    bio: '',
    platform: 'both',
    color: '#8b5cf6',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-xl w-full max-w-md border border-dark-700">
        <div className="p-6 border-b border-dark-700">
          <h2 className="text-xl font-semibold text-dark-100">Create New Profile</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">
              Profile Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., My Business Account"
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:outline-none focus:border-accent-purple"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">
              Username (optional)
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="@username"
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:outline-none focus:border-accent-purple"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">
              Bio (optional)
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={2}
              placeholder="Brief description of this profile"
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:outline-none focus:border-accent-purple resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">
              Platform
            </label>
            <select
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:outline-none focus:border-accent-purple"
            >
              <option value="both">Both Platforms</option>
              <option value="instagram">Instagram Only</option>
              <option value="tiktok">TikTok Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Profile Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {PROFILE_COLORS.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: color.value })}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                    formData.color === color.value ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.name.trim()}
              className="flex-1 btn-primary"
            >
              {saving ? 'Creating...' : 'Create Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Profiles;
