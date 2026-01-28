import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { platformApi, profileApi } from '../lib/api';
import {
  Instagram,
  Youtube,
  Linkedin,
  Twitter,
  Facebook,
  Link2,
  Check,
  Plus,
  RefreshCw,
  Trash2,
  ExternalLink,
  AlertCircle,
  Loader2,
  User,
  ChevronDown,
} from 'lucide-react';

// Platform configs with their colors and features
const PLATFORMS = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400',
    features: ['Feed Posts', 'Reels', 'Stories', 'Carousels', 'First Comment'],
    authUrl: '/api/auth/instagram',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
      </svg>
    ),
    color: 'bg-black',
    features: ['Video Posts', 'Auto-publish'],
    authUrl: '/api/auth/tiktok',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: 'bg-[#1877F2]',
    features: ['Pages', 'Groups', 'Reels'],
    authUrl: '/api/auth/facebook',
    comingSoon: true,
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: Twitter,
    color: 'bg-black',
    features: ['Posts', 'Media', 'Threads'],
    authUrl: '/api/auth/twitter',
    comingSoon: true,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'bg-[#0A66C2]',
    features: ['Personal', 'Company Pages'],
    authUrl: '/api/auth/linkedin',
    comingSoon: true,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    color: 'bg-[#FF0000]',
    features: ['Shorts', 'Community Posts'],
    authUrl: '/api/auth/youtube',
    comingSoon: true,
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
      </svg>
    ),
    color: 'bg-[#E60023]',
    features: ['Pins', 'Destination Links'],
    authUrl: '/api/auth/pinterest',
    comingSoon: true,
  },
  {
    id: 'threads',
    name: 'Threads',
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.33-3.022.88-.73 2.108-1.15 3.456-1.182 1.1-.026 2.14.107 3.105.323-.028-.767-.18-1.39-.46-1.874-.373-.646-1.012-1.006-1.9-1.07-1.079-.078-2.017.286-2.56.993l-1.613-1.28c.855-1.118 2.237-1.76 3.882-1.76.164 0 .333.007.503.022 1.466.107 2.597.64 3.363 1.586.707.874 1.074 2.078 1.092 3.584.396.17.77.368 1.118.596 1.143.745 1.979 1.737 2.42 2.87.603 1.546.655 4.16-1.51 6.283-1.872 1.835-4.174 2.63-7.478 2.655z" />
      </svg>
    ),
    color: 'bg-black',
    features: ['Text + Media Posts'],
    authUrl: '/api/auth/threads',
    comingSoon: true,
  },
];

function Connections() {
  const connectedPlatforms = useAppStore((state) => state.connectedPlatforms);
  const connectPlatform = useAppStore((state) => state.connectPlatform);
  const disconnectPlatform = useAppStore((state) => state.disconnectPlatform);
  const profiles = useAppStore((state) => state.profiles);
  const currentProfileId = useAppStore((state) => state.currentProfileId);
  const [connecting, setConnecting] = useState(null);
  const [refreshing, setRefreshing] = useState(null);
  const [refreshSuccess, setRefreshSuccess] = useState(null);
  const [profileSocialStatus, setProfileSocialStatus] = useState({});
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [showProfileConnections, setShowProfileConnections] = useState(true);

  const currentProfile = profiles.find(p => (p._id || p.id) === currentProfileId);

  // Load social status for current profile
  useEffect(() => {
    const loadProfileStatus = async () => {
      if (!currentProfileId) return;

      try {
        setLoadingStatus(true);
        const status = await profileApi.getSocialStatus(currentProfileId);
        setProfileSocialStatus(status);
      } catch (err) {
        console.error('Failed to load profile social status:', err);
      } finally {
        setLoadingStatus(false);
      }
    };

    loadProfileStatus();
  }, [currentProfileId]);

  const handleConnect = async (platform) => {
    if (platform.comingSoon) return;

    setConnecting(platform.id);
    try {
      // In production, this would redirect to OAuth
      window.location.href = platform.authUrl;
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (platformId) => {
    disconnectPlatform(platformId);
  };

  const handleRefresh = async (platformId) => {
    setRefreshing(platformId);
    setRefreshSuccess(null);
    try {
      await platformApi.refreshToken(platformId);
      setRefreshSuccess(platformId);
      setTimeout(() => setRefreshSuccess(null), 2000);
    } catch (error) {
      console.error('Failed to refresh token:', error);
      alert(`Failed to refresh ${platformId} token. You may need to reconnect.`);
    } finally {
      setRefreshing(null);
    }
  };

  // Profile-specific connection handlers
  const handleUseParentConnection = async (platform) => {
    if (!currentProfileId) return;

    try {
      setConnecting(platform);
      if (platform === 'instagram') {
        await profileApi.useParentInstagram(currentProfileId);
      } else if (platform === 'tiktok') {
        await profileApi.useParentTiktok(currentProfileId);
      }
      // Refresh status
      const status = await profileApi.getSocialStatus(currentProfileId);
      setProfileSocialStatus(status);
    } catch (error) {
      console.error('Failed to use parent connection:', error);
      alert(`Failed to set parent connection for ${platform}`);
    } finally {
      setConnecting(null);
    }
  };

  const handleConnectOwnAccount = async (platform) => {
    if (!currentProfileId) return;

    try {
      setConnecting(platform);
      let url;
      if (platform === 'instagram') {
        url = await profileApi.connectInstagram(currentProfileId);
      } else if (platform === 'tiktok') {
        url = await profileApi.connectTiktok(currentProfileId);
      }
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Failed to start connection:', error);
      alert(`Failed to start ${platform} connection`);
    } finally {
      setConnecting(null);
    }
  };

  const connectedCount = Object.values(connectedPlatforms).filter(
    (p) => p.connected
  ).length;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-display font-semibold text-dark-100 mb-2">
          Platform Connections
        </h1>
        <p className="text-dark-400">
          Connect your social media accounts to schedule and publish content directly.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
          <p className="text-3xl font-bold text-dark-100">{connectedCount}</p>
          <p className="text-sm text-dark-400">Connected</p>
        </div>
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
          <p className="text-3xl font-bold text-dark-100">
            {PLATFORMS.length - connectedCount}
          </p>
          <p className="text-sm text-dark-400">Available</p>
        </div>
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
          <p className="text-3xl font-bold text-accent-purple">
            {PLATFORMS.filter((p) => p.comingSoon).length}
          </p>
          <p className="text-sm text-dark-400">Coming Soon</p>
        </div>
      </div>

      {/* Current Profile Connections */}
      {currentProfile && (
        <div className="mb-8">
          <button
            onClick={() => setShowProfileConnections(!showProfileConnections)}
            className="w-full flex items-center justify-between p-4 bg-dark-800 rounded-xl border border-dark-700 hover:bg-dark-750 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: currentProfile.color || '#8b5cf6' }}
              >
                {currentProfile.avatar ? (
                  <img
                    src={currentProfile.avatar}
                    alt={currentProfile.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="text-left">
                <h3 className="font-medium text-dark-100">
                  {currentProfile.name} Connections
                </h3>
                <p className="text-sm text-dark-400">
                  Manage connections for this profile
                </p>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-dark-400 transition-transform ${
                showProfileConnections ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showProfileConnections && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Instagram for Profile */}
              <div className="bg-dark-800 rounded-xl border border-dark-700 p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                    <Instagram className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-dark-100">Instagram</h3>
                      {profileSocialStatus.instagram?.connected && (
                        <span className="badge badge-green">Connected</span>
                      )}
                    </div>

                    {loadingStatus ? (
                      <Loader2 className="w-4 h-4 animate-spin text-dark-400" />
                    ) : profileSocialStatus.instagram?.connected ? (
                      <>
                        <p className="text-sm text-dark-400 mb-2">
                          {profileSocialStatus.instagram.useParent
                            ? 'Using parent account'
                            : 'Using own account'}
                          {profileSocialStatus.instagram.username &&
                            `: @${profileSocialStatus.instagram.username}`}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {profileSocialStatus.instagram.useParent ? (
                            <button
                              onClick={() => handleConnectOwnAccount('instagram')}
                              className="text-xs text-accent-purple hover:underline"
                              disabled={connecting === 'instagram'}
                            >
                              {connecting === 'instagram' ? 'Connecting...' : 'Connect own account'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUseParentConnection('instagram')}
                              className="text-xs text-dark-400 hover:text-dark-200"
                              disabled={connecting === 'instagram'}
                            >
                              {connecting === 'instagram' ? 'Switching...' : 'Use parent account'}
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-dark-500 mb-2">Not connected</p>
                        <button
                          onClick={() => handleUseParentConnection('instagram')}
                          className="btn-primary text-sm py-1.5"
                          disabled={connecting === 'instagram'}
                        >
                          {connecting === 'instagram' ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <Link2 className="w-3 h-3" />
                              Use Parent Connection
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* TikTok for Profile */}
              <div className="bg-dark-800 rounded-xl border border-dark-700 p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-dark-100">TikTok</h3>
                      {profileSocialStatus.tiktok?.connected && (
                        <span className="badge badge-green">Connected</span>
                      )}
                    </div>

                    {loadingStatus ? (
                      <Loader2 className="w-4 h-4 animate-spin text-dark-400" />
                    ) : profileSocialStatus.tiktok?.connected ? (
                      <>
                        <p className="text-sm text-dark-400 mb-2">
                          {profileSocialStatus.tiktok.useParent
                            ? 'Using parent account'
                            : 'Using own account'}
                          {profileSocialStatus.tiktok.username &&
                            `: @${profileSocialStatus.tiktok.username}`}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {profileSocialStatus.tiktok.useParent ? (
                            <button
                              onClick={() => handleConnectOwnAccount('tiktok')}
                              className="text-xs text-accent-purple hover:underline"
                              disabled={connecting === 'tiktok'}
                            >
                              {connecting === 'tiktok' ? 'Connecting...' : 'Connect own account'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUseParentConnection('tiktok')}
                              className="text-xs text-dark-400 hover:text-dark-200"
                              disabled={connecting === 'tiktok'}
                            >
                              {connecting === 'tiktok' ? 'Switching...' : 'Use parent account'}
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-dark-500 mb-2">Not connected</p>
                        <button
                          onClick={() => handleUseParentConnection('tiktok')}
                          className="btn-primary text-sm py-1.5"
                          disabled={connecting === 'tiktok'}
                        >
                          {connecting === 'tiktok' ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <Link2 className="w-3 h-3" />
                              Use Parent Connection
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Account-Level Platforms Grid */}
      <div className="mb-4">
        <h2 className="text-lg font-medium text-dark-100 mb-1">Account Connections</h2>
        <p className="text-sm text-dark-400">These connections are shared across all your profiles</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLATFORMS.map((platform) => {
          const connection = connectedPlatforms[platform.id];
          const isConnected = connection?.connected;
          const isConnecting = connecting === platform.id;
          const Icon = platform.icon;

          return (
            <div
              key={platform.id}
              className={`bg-dark-800 rounded-xl border border-dark-700 p-5 transition-all ${
                platform.comingSoon ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Platform Icon */}
                <div
                  className={`w-12 h-12 rounded-xl ${platform.color} flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-dark-100">{platform.name}</h3>
                    {isConnected && (
                      <span className="badge badge-green">Connected</span>
                    )}
                    {platform.comingSoon && (
                      <span className="badge badge-purple">Coming Soon</span>
                    )}
                  </div>

                  {/* Account Info */}
                  {isConnected && connection.account && (
                    <p className="text-sm text-dark-400 mb-2">
                      @{connection.account.username}
                    </p>
                  )}

                  {/* Features */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {platform.features.map((feature) => (
                      <span
                        key={feature}
                        className="text-xs px-2 py-0.5 bg-dark-700 text-dark-400 rounded"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {isConnected ? (
                      <>
                        <button
                          onClick={() => handleRefresh(platform.id)}
                          disabled={refreshing === platform.id}
                          className="btn-secondary text-sm py-1.5"
                        >
                          {refreshing === platform.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Refreshing...
                            </>
                          ) : refreshSuccess === platform.id ? (
                            <>
                              <Check className="w-3 h-3 text-green-400" />
                              Refreshed!
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3 h-3" />
                              Refresh
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDisconnect(platform.id)}
                          className="btn-ghost text-sm py-1.5 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-3 h-3" />
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleConnect(platform)}
                        disabled={platform.comingSoon || isConnecting}
                        className="btn-primary text-sm py-1.5"
                      >
                        {isConnecting ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" />
                            Connect
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Help Section */}
      <div className="mt-8 p-4 bg-dark-800 rounded-xl border border-dark-700">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-accent-blue flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-dark-200 mb-1">
              Need help connecting?
            </h4>
            <p className="text-sm text-dark-400">
              Make sure you have admin access to the accounts you want to connect.
              For business accounts, you may need to configure API access in each
              platform's developer portal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Connections;
