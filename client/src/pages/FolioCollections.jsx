import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import folioApi, { folioAuth, isFolioConnected, getFolioUser } from '../lib/folioApi';
import { RefreshCw, Link2, ExternalLink, Youtube, Film, Instagram, Folder } from 'lucide-react';

const PLATFORM_BADGES = {
  YOUTUBE_LONG: { label: 'YouTube', icon: <Youtube className="w-4 h-4" />, color: 'text-red-400' },
  YOUTUBE_SHORT: { label: 'YT Short', icon: <Youtube className="w-4 h-4" />, color: 'text-red-300' },
  TIKTOK: { label: 'TikTok', icon: <Film className="w-4 h-4" />, color: 'text-cyan-400' },
  INSTAGRAM_REEL: { label: 'IG Reel', icon: <Instagram className="w-4 h-4" />, color: 'text-pink-400' },
  INSTAGRAM: { label: 'Instagram', icon: <Instagram className="w-4 h-4" />, color: 'text-pink-300' },
};

function getBadge(platform) {
  return PLATFORM_BADGES[platform] || { label: platform || 'Collection', icon: <Folder className="w-4 h-4" />, color: 'text-dark-300' };
}

export default function FolioCollections() {
  const [folioConnected, setFolioConnected] = useState(isFolioConnected());
  const [folioUser, setFolioUser] = useState(getFolioUser());
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentProfileId = useAppStore((state) => state.currentProfileId);

  const loadCollections = async () => {
    if (!folioConnected) return;
    setLoading(true);
    setError('');
    try {
      const data = await folioApi.collections.list(100, 0);
      const list = data.collections || data || [];
      setCollections(list);
    } catch (err) {
      setError(err.message || 'Failed to load Folio collections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      if (!folioConnected) return;
      try {
        const session = await folioAuth.getSession();
        if (session?.user) {
          setFolioConnected(true);
          setFolioUser(session.user);
          await loadCollections();
        } else {
          setFolioConnected(false);
          setFolioUser(null);
        }
      } catch (err) {
        setError(err.message || 'Failed to load Folio session');
        setFolioConnected(false);
      }
    };
    init();
  }, [folioConnected, currentProfileId]);

  if (!folioConnected) {
    return (
      <div className="p-6 bg-dark-800 border border-dark-700 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
          <Link2 className="w-5 h-5 text-dark-400" />
          <h3 className="text-white font-semibold">Folio Collections</h3>
        </div>
        <p className="text-dark-400 text-sm mb-3">Connect to Folio from Content Studio to view your saved videos.</p>
        <div className="text-xs text-dark-500">Status: Not connected</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-white font-semibold">Folio Collections</div>
          <div className="text-xs text-dark-400">
            {folioUser?.email || 'Connected'} · {collections.length} items
          </div>
        </div>
        <button
          onClick={loadCollections}
          className="px-3 py-1.5 rounded-lg bg-dark-700 text-white text-sm flex items-center gap-2 hover:bg-dark-600"
          disabled={loading}
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
        <a
          href="https://folio.subtaste.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-dark-400 hover:text-accent-purple flex items-center gap-1"
        >
          Open Folio <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {collections.map((c) => {
          const badge = getBadge(c.platform);
          return (
            <div key={c.id || c._id} className="p-3 bg-dark-800 border border-dark-700 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className={`flex items-center gap-1 text-xs ${badge.color}`}>
                  {badge.icon}
                  {badge.label}
                </span>
                {c.tags && c.tags.length > 0 && (
                  <span className="text-[11px] text-dark-400 truncate">· {c.tags.slice(0, 2).join(', ')}</span>
                )}
              </div>
              <div className="text-white text-sm font-medium line-clamp-2">{c.title || c.name || 'Untitled'}</div>
              {c.url && (
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-purple hover:underline">
                  Open source
                </a>
              )}
              {c.items && c.items.length > 0 && (
                <div className="text-[11px] text-dark-400 mt-1">{c.items.length} saved items</div>
              )}
            </div>
          );
        })}
      </div>

      {loading && collections.length === 0 && (
        <div className="text-dark-400 text-sm">Loading collections…</div>
      )}
    </div>
  );
}
