import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { intelligenceApi, genomeApi } from '../lib/api';
import folioApi, { folioAuth, isFolioConnected, getFolioUser } from '../lib/folioApi';
import {
  Sparkles,
  Zap,
  TrendingUp,
  Copy,
  Check,
  BarChart3,
  Target,
  Lightbulb,
  RefreshCw,
  Link2,
  LogOut,
  ExternalLink,
  Dna,
  Star,
  ThumbsUp,
  ThumbsDown,
  Youtube,
} from 'lucide-react';

function ScoreRing({ score, size = 60, strokeWidth = 4 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#eab308';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#27272a"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor(score)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white">{score}</span>
      </div>
    </div>
  );
}

function StarRating({ rating, onRate, size = 'md' }) {
  const [hover, setHover] = useState(0);
  const sizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onRate(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            className={`${sizes[size]} transition-colors ${
              star <= (hover || rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-dark-500'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function VariantCard({ variant, index, onCopy, copied, onRate, platform }) {
  const [rating, setRating] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState({ liked: [], disliked: [] });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const feedbackOptions = [
    { id: 'hook', label: 'Hook' },
    { id: 'tone', label: 'Tone' },
    { id: 'length', label: 'Length' },
    { id: 'style', label: 'Style' },
  ];

  const handleRate = async (stars) => {
    setRating(stars);
    setShowFeedback(true);
  };

  const toggleFeedback = (type, id) => {
    setFeedback(prev => {
      const current = prev[type];
      const updated = current.includes(id)
        ? current.filter(x => x !== id)
        : [...current, id];
      return { ...prev, [type]: updated };
    });
  };

  const submitRating = async () => {
    if (!rating) return;
    setSaving(true);
    try {
      await onRate(variant, rating, feedback, platform);
      setSaved(true);
      setShowFeedback(false);
    } catch (error) {
      console.error('Failed to save rating:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-dark-700 rounded-xl p-4 hover:bg-dark-600/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <p className="text-white flex-1 leading-relaxed">{variant.variant || variant.title}</p>
        <button
          onClick={() => onCopy(variant.variant || variant.title, index)}
          className="p-2 text-dark-400 hover:text-white rounded-lg flex-shrink-0 transition-colors"
        >
          {copied === index ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* YouTube specific fields */}
      {variant.description && (
        <p className="mt-2 text-sm text-dark-300">{variant.description}</p>
      )}
      {variant.tags && (
        <div className="mt-2 flex flex-wrap gap-1">
          {variant.tags.slice(0, 6).map((tag, i) => (
            <span key={i} className="px-2 py-0.5 bg-dark-600 text-dark-400 rounded text-xs">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 mt-3">
        <span className="px-2 py-1 bg-accent-purple/20 text-accent-purple rounded text-xs font-medium">
          {variant.hookType}
        </span>
        <span className="px-2 py-1 bg-dark-600 text-dark-300 rounded text-xs">
          {variant.tone}
        </span>
        <div className="flex items-center gap-4 ml-auto text-xs text-dark-400">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {variant.performanceScore}%
          </span>
          <span className="flex items-center gap-1">
            <Target className="w-3 h-3" />
            {variant.tasteScore}%
          </span>
        </div>
      </div>

      {variant.reasoning && (
        <p className="mt-2 text-xs text-dark-400 italic">{variant.reasoning}</p>
      )}

      {/* Rating Section */}
      <div className="mt-3 pt-3 border-t border-dark-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-dark-400">Rate this:</span>
            <StarRating rating={rating} onRate={handleRate} size="sm" />
            {saved && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
          </div>
        </div>

        {/* Feedback Panel */}
        {showFeedback && !saved && (
          <div className="mt-3 p-3 bg-dark-800 rounded-lg">
            <p className="text-xs text-dark-300 mb-2">What did you think? (optional)</p>
            <div className="flex gap-4 mb-3">
              <div className="flex-1">
                <p className="text-xs text-dark-400 mb-1 flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3 text-green-400" /> Liked
                </p>
                <div className="flex flex-wrap gap-1">
                  {feedbackOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => toggleFeedback('liked', opt.id)}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        feedback.liked.includes(opt.id)
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-dark-700 text-dark-400 hover:text-dark-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-xs text-dark-400 mb-1 flex items-center gap-1">
                  <ThumbsDown className="w-3 h-3 text-red-400" /> Disliked
                </p>
                <div className="flex flex-wrap gap-1">
                  {feedbackOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => toggleFeedback('disliked', opt.id)}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        feedback.disliked.includes(opt.id)
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-dark-700 text-dark-400 hover:text-dark-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={submitRating}
              disabled={saving}
              className="w-full py-2 bg-accent-purple text-white text-sm rounded-lg hover:bg-accent-purple/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
              Save Rating
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ContentStudio() {
  const [activeTab, setActiveTab] = useState('folio');
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [generating, setGenerating] = useState(false);
  const [variants, setVariants] = useState([]);
  const [copied, setCopied] = useState(null);

  // Score tab state
  const [scoreCaption, setScoreCaption] = useState('');
  const [scoring, setScoring] = useState(false);
  const [scoreResult, setScoreResult] = useState(null);

  // Trending
  const [trending, setTrending] = useState(null);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [trendingNiche, setTrendingNiche] = useState('creator');

  // Taste Profile
  const [tasteProfile, setTasteProfile] = useState(null);

  // Folio integration
  const [folioConnected, setFolioConnected] = useState(false);
  const [folioUser, setFolioUser] = useState(null);
  const [folioEmail, setFolioEmail] = useState('');
  const [folioPassword, setFolioPassword] = useState('');
  const [folioLoggingIn, setFolioLoggingIn] = useState(false);
  const [folioError, setFolioError] = useState('');
  const [folioTasteProfile, setFolioTasteProfile] = useState(null);
  const [useFolioForGeneration, setUseFolioForGeneration] = useState(true);
  const [folioProfileStats, setFolioProfileStats] = useState(null);
  const [folioCollectionsList, setFolioCollectionsList] = useState([]);

  // YouTube generation
  const [youtubeVideoType, setYoutubeVideoType] = useState('standard');
  const [youtubeVariants, setYoutubeVariants] = useState([]);
  const [generatingYoutube, setGeneratingYoutube] = useState(false);
  const currentProfileId = useAppStore((state) => state.currentProfileId);
  const activeFolioId = useAppStore((state) => state.activeFolioId);
  const activeProjectId = useAppStore((state) => state.activeProjectId);

  useEffect(() => {
    loadTasteProfile();
    checkFolioConnection();
  }, []);

  useEffect(() => {
    if (folioConnected) {
      loadFolioProfile();
      loadFolioCollections();
    }
  }, [folioConnected]);

  const loadTasteProfile = async () => {
    try {
      const result = await intelligenceApi.getProfile(currentProfileId || null);
      if (result.hasProfile) {
        setTasteProfile(result.tasteProfile);
      }
    } catch (error) {
      console.error('Failed to load taste profile:', error);
    }
  };

  const checkFolioConnection = async () => {
    if (isFolioConnected()) {
      setFolioConnected(true);
      setFolioUser(getFolioUser());
      // Try to load Folio taste profile
      try {
        const session = await folioAuth.getSession();
        if (session) {
          await loadFolioProfile();
          await loadFolioCollections();
        }
      } catch (error) {
        console.error('Failed to load Folio profile:', error);
      }
    }
  };

  const handleFolioLogin = async (e) => {
    e.preventDefault();
    setFolioLoggingIn(true);
    setFolioError('');
    try {
      const result = await folioAuth.login(folioEmail, folioPassword);
      setFolioConnected(true);
      setFolioUser(result.user);
      setFolioEmail('');
      setFolioPassword('');
      // Load Folio taste profile
      await loadFolioProfile();
      await loadFolioCollections();
    } catch (error) {
      setFolioError(error.message || 'Failed to connect to Folio');
    } finally {
      setFolioLoggingIn(false);
    }
  };

  const handleFolioLogout = () => {
    folioAuth.logout();
    setFolioConnected(false);
    setFolioUser(null);
    setFolioTasteProfile(null);
    setUseFolioForGeneration(false);
    setFolioProfileStats(null);
    setFolioCollectionsList([]);
  };

  const loadFolioProfile = async () => {
    try {
      const profile = await folioApi.tasteProfile.get();
      setFolioTasteProfile(profile);
      const { confidence, dominantTones, preferredHooks } = profile || {};
      setFolioProfileStats({
        confidence: Math.round((confidence || 0) * 100),
        tones: (dominantTones || []).slice(0, 3),
        hooks: (preferredHooks || []).slice(0, 3),
      });
    } catch (error) {
      console.error('Failed to load Folio profile:', error);
    }
  };

  const loadFolioCollections = async () => {
    try {
      const data = await folioApi.collections.list(20, 0);
      const collections = data.collections || data || [];
      setFolioCollectionsList(collections);
    } catch (error) {
      console.error('Failed to load Folio collections:', error);
    }
  };

  // Handle rating a generated variant
  const handleRate = async (variant, rating, feedback, currentPlatform) => {
    try {
      await intelligenceApi.rate(
        {
          variant: variant.variant || variant.title,
          hookType: variant.hookType,
          tone: variant.tone,
          performanceScore: variant.performanceScore,
          tasteScore: variant.tasteScore,
        },
        rating,
        feedback,
        {
          topic,
          platform: currentPlatform || platform,
          source: useFolioForGeneration ? 'folio' : 'local',
          folioId: activeFolioId || undefined,
          projectId: activeProjectId || undefined,
        },
        false, // wasApplied
        currentProfileId || null
      );
    } catch (error) {
      console.error('Failed to save rating:', error);
      throw error;
    }
  };

  // Generate YouTube content
  const handleGenerateYouTube = async () => {
    if (!topic.trim()) return;
    setGeneratingYoutube(true);
    try {
      let result;
      if (useFolioForGeneration && folioConnected) {
        // Use Folio for YouTube
        result = await folioApi.generate.variants(
          topic,
          'YOUTUBE_SHORT',
          5,
          [],
          'generate',
          'English'
        );
      } else {
        // Use local YouTube generation
        result = await intelligenceApi.generateYouTube(topic, {
          videoType: youtubeVideoType,
          count: 5,
          profileId: currentProfileId || undefined,
          folioId: activeFolioId || undefined,
          projectId: activeProjectId || undefined,
        });
      }
      setYoutubeVariants(result.variants || []);
    } catch (error) {
      console.error('YouTube generate error:', error);
    } finally {
      setGeneratingYoutube(false);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    try {
      let result;
      if (useFolioForGeneration && folioConnected) {
        // Use Folio's AI generation
        const platformMap = {
          instagram: 'INSTAGRAM_REEL',
          tiktok: 'TIKTOK',
          youtube: 'YOUTUBE_SHORT',
          linkedin: 'LINKEDIN',
        };
        result = await folioApi.generate.variants(
          topic,
          platformMap[platform] || 'INSTAGRAM_REEL',
          5,
          [],
          'generate',
          'English'
        );
      } else {
        // Use local Slayt AI generation
        result = await intelligenceApi.generate(topic, {
          platform,
          count: 5,
          profileId: currentProfileId || undefined,
          folioId: activeFolioId || undefined,
          projectId: activeProjectId || undefined,
        });
      }
      setVariants(result.variants || []);
    } catch (error) {
      console.error('Generate error:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleScore = async () => {
    if (!scoreCaption.trim()) return;
    setScoring(true);
    try {
      const result = await intelligenceApi.score({ caption: scoreCaption });
      setScoreResult(result);
    } catch (error) {
      console.error('Score error:', error);
    } finally {
      setScoring(false);
    }
  };

  const loadTrending = async () => {
    setLoadingTrending(true);
    try {
      const result = await intelligenceApi.getTrending(trendingNiche, platform);
      setTrending(result);
    } catch (error) {
      console.error('Trending error:', error);
    } finally {
      setLoadingTrending(false);
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Sparkles className="w-7 h-7 text-accent-purple" />
          Subtaste · Content Studio (Folio)
        </h1>
        <p className="text-dark-400 mt-1">
          Folio-native console for generation, scoring, and profile signals.
        </p>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-dark-700 bg-dark-900 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-dark-500">Folio session</p>
            <p className="text-sm text-white font-semibold mt-1">
              {folioConnected ? `Connected as ${folioUser?.email || 'user'}` : 'Not connected'}
            </p>
          </div>
          <div className="rounded-lg border border-dark-700 bg-dark-900 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-dark-500">Confidence</p>
            <p className="text-sm text-white font-semibold mt-1">
              {folioProfileStats?.confidence ? `${folioProfileStats.confidence}%` : '—'}
            </p>
          </div>
          <div className="rounded-lg border border-dark-700 bg-dark-900 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-dark-500">Collections</p>
            <p className="text-sm text-white font-semibold mt-1">
              {folioCollectionsList?.length ?? 0} saved sets
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-dark-900 rounded-lg p-1 w-fit border border-dark-700">
        {[
          { id: 'generate', label: 'Generate', icon: Sparkles },
          { id: 'youtube', label: 'YouTube', icon: Youtube },
          { id: 'score', label: 'Score', icon: BarChart3 },
          { id: 'trending', label: 'Trending', icon: TrendingUp },
          { id: 'folio', label: 'Folio', icon: Link2 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-accent-purple text-white'
                : 'text-dark-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Generate Tab */}
      {activeTab === 'generate' && (
        <div className="space-y-6">
          {/* Folio Mode Indicator */}
          {useFolioForGeneration && folioConnected && (
            <div className="flex items-center gap-2 px-4 py-2 bg-accent-purple/10 border border-accent-purple/30 rounded-lg">
              <Link2 className="w-4 h-4 text-accent-purple" />
              <span className="text-sm text-accent-purple">Using Folio's AI for generation</span>
              <button
                onClick={() => setUseFolioForGeneration(false)}
                className="ml-auto text-xs text-dark-400 hover:text-white"
              >
                Switch to local
              </button>
            </div>
          )}

          {/* Input */}
          <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
            <label className="block text-sm text-dark-300 mb-2">What do you want to create content about?</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter a topic, idea, or prompt..."
                className="flex-1 px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white text-lg"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white"
              >
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="linkedin">LinkedIn</option>
                <option value="youtube">YouTube</option>
              </select>
              <button
                onClick={handleGenerate}
                disabled={generating || !topic.trim()}
                className="px-6 py-3 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/80 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
              >
                {generating ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Zap className="w-5 h-5" />
                )}
                Generate
              </button>
            </div>
          </div>

          {/* Results */}
          {variants.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-white">Generated Hooks & Captions</h3>
              {variants.map((v, i) => (
                <VariantCard
                  key={i}
                  variant={v}
                  index={i}
                  onCopy={copyToClipboard}
                  copied={copied}
                  onRate={handleRate}
                  platform={platform}
                />
              ))}
            </div>
          )}

          {/* Taste Profile Summary */}
          {tasteProfile && (
            <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-accent-purple" />
                Your Taste Profile
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-dark-400 text-xs mb-1">Preferred Hooks</p>
                  <div className="flex flex-wrap gap-1">
                    {(tasteProfile.performancePatterns?.hooks || []).slice(0, 3).map((h, i) => (
                      <span key={i} className="px-2 py-0.5 bg-dark-700 rounded text-dark-200">{h}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-dark-400 text-xs mb-1">Voice</p>
                  <span className="text-white capitalize">{tasteProfile.aestheticPatterns?.voice || 'conversational'}</span>
                </div>
                <div>
                  <p className="text-dark-400 text-xs mb-1">Dominant Tones</p>
                  <div className="flex flex-wrap gap-1">
                    {(tasteProfile.aestheticPatterns?.dominantTones || []).slice(0, 3).map((t, i) => (
                      <span key={i} className="px-2 py-0.5 bg-dark-700 rounded text-dark-200">{t}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-dark-400 text-xs mb-1">Confidence</p>
                  <span className="text-white">{Math.round((tasteProfile.confidence || 0) * 100)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* YouTube Tab */}
      {activeTab === 'youtube' && (
        <div className="space-y-6">
          {/* Folio Mode Indicator */}
          {useFolioForGeneration && folioConnected && (
            <div className="flex items-center gap-2 px-4 py-2 bg-accent-purple/10 border border-accent-purple/30 rounded-lg">
              <Link2 className="w-4 h-4 text-accent-purple" />
              <span className="text-sm text-accent-purple">Using Folio's AI for YouTube generation</span>
              <button
                onClick={() => setUseFolioForGeneration(false)}
                className="ml-auto text-xs text-dark-400 hover:text-white"
              >
                Switch to local
              </button>
            </div>
          )}

          {/* Input */}
          <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
            <label className="block text-sm text-dark-300 mb-2">What's your YouTube video about?</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter your video topic or idea..."
                className="flex-1 px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white text-lg"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateYouTube()}
              />
              <select
                value={youtubeVideoType}
                onChange={(e) => setYoutubeVideoType(e.target.value)}
                className="px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white"
              >
                <option value="short">YouTube Short</option>
                <option value="standard">Standard (8-15 min)</option>
                <option value="long">Long-form (20+ min)</option>
                <option value="tutorial">Tutorial</option>
                <option value="vlog">Vlog</option>
              </select>
              <button
                onClick={handleGenerateYouTube}
                disabled={generatingYoutube || !topic.trim()}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
              >
                {generatingYoutube ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Youtube className="w-5 h-5" />
                )}
                Generate
              </button>
            </div>
          </div>

          {/* Results */}
          {youtubeVariants.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <Youtube className="w-5 h-5 text-red-500" />
                Generated YouTube Content
              </h3>
              {youtubeVariants.map((v, i) => (
                <div key={i} className="bg-dark-700 rounded-xl p-4 hover:bg-dark-600/50 transition-colors">
                  {/* Title */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="text-white font-medium text-lg">{v.title}</h4>
                    <button
                      onClick={() => copyToClipboard(v.title, `yt-title-${i}`)}
                      className="p-2 text-dark-400 hover:text-white rounded-lg flex-shrink-0 transition-colors"
                    >
                      {copied === `yt-title-${i}` ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Description */}
                  <p className="text-dark-300 text-sm mb-3">{v.description}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {v.tags?.map((tag, ti) => (
                      <span key={ti} className="px-2 py-0.5 bg-dark-600 text-dark-400 rounded text-xs">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Thumbnail Idea */}
                  {v.thumbnailIdea && (
                    <div className="p-2 bg-dark-800 rounded-lg mb-3">
                      <p className="text-xs text-dark-400">
                        <span className="text-dark-300 font-medium">Thumbnail idea:</span> {v.thumbnailIdea}
                      </p>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium">
                      {v.hookType}
                    </span>
                    <span className="px-2 py-1 bg-dark-600 text-dark-300 rounded text-xs">
                      {v.tone}
                    </span>
                    <div className="flex items-center gap-4 ml-auto text-xs text-dark-400">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {v.performanceScore}%
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {v.tasteScore}%
                      </span>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="mt-3 pt-3 border-t border-dark-600 flex items-center gap-3">
                    <span className="text-xs text-dark-400">Rate this:</span>
                    <StarRating
                      rating={0}
                      onRate={async (rating) => {
                        await handleRate(v, rating, {}, 'youtube');
                      }}
                      size="sm"
                    />
                  </div>

                  {v.reasoning && (
                    <p className="mt-2 text-xs text-dark-400 italic">{v.reasoning}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Score Tab */}
      {activeTab === 'score' && (
        <div className="space-y-6">
          <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
            <label className="block text-sm text-dark-300 mb-2">Paste your caption to score</label>
            <textarea
              value={scoreCaption}
              onChange={(e) => setScoreCaption(e.target.value)}
              placeholder="Enter your caption or hook to see how well it matches your taste profile..."
              className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white h-32 resize-none"
            />
            <button
              onClick={handleScore}
              disabled={scoring || !scoreCaption.trim()}
              className="mt-3 px-6 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/80 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {scoring ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <BarChart3 className="w-4 h-4" />
              )}
              Analyze Score
            </button>
          </div>

          {scoreResult && (
            <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <ScoreRing score={scoreResult.overallScore} size={100} strokeWidth={6} />
                  <p className="text-sm text-dark-400 mt-2">Overall</p>
                </div>
                <div className="text-center">
                  <ScoreRing score={scoreResult.performanceScore} size={80} />
                  <p className="text-sm text-dark-400 mt-2">Performance</p>
                </div>
                <div className="text-center">
                  <ScoreRing score={scoreResult.tasteScore} size={80} />
                  <p className="text-sm text-dark-400 mt-2">Taste Match</p>
                </div>
              </div>

              {scoreResult.feedback?.length > 0 && (
                <div className="mt-6 pt-4 border-t border-dark-700">
                  <h4 className="text-sm font-medium text-white mb-3">Feedback</h4>
                  <ul className="space-y-2">
                    {scoreResult.feedback.map((fb, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-dark-300">
                        <Lightbulb className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                        {fb}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Trending Tab */}
      {activeTab === 'trending' && (
        <div className="space-y-6">
          <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
            <div className="flex items-center gap-3">
              <select
                value={trendingNiche}
                onChange={(e) => setTrendingNiche(e.target.value)}
                className="px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
              >
                <option value="creator">Creator</option>
                <option value="tech">Tech</option>
                <option value="fitness">Fitness</option>
                <option value="music">Music</option>
                <option value="business">Business</option>
                <option value="general">General</option>
              </select>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
              >
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
              </select>
              <button
                onClick={loadTrending}
                disabled={loadingTrending}
                className="px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/80 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loadingTrending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <TrendingUp className="w-4 h-4" />
                )}
                Get Trending
              </button>
            </div>
          </div>

          {trending && (
            <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
              <h3 className="text-lg font-medium text-white mb-4">
                Trending in {trending.niche}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {trending.trending?.map((topic, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setTopic(topic);
                      setActiveTab('generate');
                    }}
                    className="p-3 bg-dark-700 hover:bg-dark-600 rounded-lg text-left transition-colors group"
                  >
                    <p className="text-white group-hover:text-accent-purple transition-colors">{topic}</p>
                    <p className="text-xs text-dark-400 mt-1">Click to generate</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Folio Tab */}
      {activeTab === 'folio' && (
        <div className="space-y-6">
          {/* Connection Status */}
          <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                folioConnected ? 'bg-green-500/20' : 'bg-dark-700'
              }`}>
                <Link2 className={`w-5 h-5 ${folioConnected ? 'text-green-400' : 'text-dark-400'}`} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">Folio Connection</h3>
                <p className="text-sm text-dark-400">
                  {folioConnected
                    ? `Connected as ${folioUser?.name || folioUser?.email}`
                    : 'Connect to Folio for enhanced AI generation'}
                </p>
              </div>
              {folioConnected && (
                <button
                  onClick={handleFolioLogout}
                  className="ml-auto flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-dark-300 hover:text-white rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect
                </button>
              )}
            </div>

            {!folioConnected ? (
              <form onSubmit={handleFolioLogin} className="space-y-4">
                <p className="text-sm text-dark-300">
                  Connect your Folio account to use your collections, taste profile, and enhanced AI generation.
                </p>
                {folioError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {folioError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-dark-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={folioEmail}
                      onChange={(e) => setFolioEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-1">Password</label>
                    <input
                      type="password"
                      value={folioPassword}
                      onChange={(e) => setFolioPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-white"
                      required
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={folioLoggingIn}
                    className="px-6 py-2.5 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/80 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {folioLoggingIn ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Link2 className="w-4 h-4" />
                    )}
                    Connect to Folio
                  </button>
                  <a
                    href="https://folio.subtaste.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-dark-400 hover:text-accent-purple flex items-center gap-1"
                  >
                    Don't have an account? <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {/* Folio Taste Profile */}
                {folioTasteProfile && (
                  <div className="p-4 bg-dark-700 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Dna className="w-4 h-4 text-accent-purple" />
                      <h4 className="text-sm font-medium text-white">Folio Taste Profile</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      {folioTasteProfile.dominantTones && (
                        <div>
                          <p className="text-xs text-dark-400 mb-1">Dominant Tones</p>
                          <div className="flex flex-wrap gap-1">
                            {folioTasteProfile.dominantTones.slice(0, 3).map((tone, i) => (
                              <span key={i} className="px-2 py-0.5 bg-dark-600 rounded text-dark-200 text-xs">
                                {tone}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {folioTasteProfile.preferredHooks && (
                        <div>
                          <p className="text-xs text-dark-400 mb-1">Preferred Hooks</p>
                          <div className="flex flex-wrap gap-1">
                            {folioTasteProfile.preferredHooks.slice(0, 3).map((hook, i) => (
                              <span key={i} className="px-2 py-0.5 bg-dark-600 rounded text-dark-200 text-xs">
                                {hook}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {folioTasteProfile.confidence && (
                        <div>
                          <p className="text-xs text-dark-400 mb-1">Profile Confidence</p>
                          <span className="text-white">{Math.round(folioTasteProfile.confidence * 100)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Use Folio Toggle */}
                <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-white">Use Folio for Generation</p>
                    <p className="text-xs text-dark-400">When enabled, Generate tab will use Folio's AI</p>
                  </div>
                  <button
                    onClick={() => setUseFolioForGeneration(!useFolioForGeneration)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      useFolioForGeneration ? 'bg-accent-purple' : 'bg-dark-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        useFolioForGeneration ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* What is Folio */}
          <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
            <h3 className="text-lg font-medium text-white mb-3">What is Folio?</h3>
            <p className="text-sm text-dark-300 mb-4">
              Folio is a creative intelligence platform that learns your unique content style from the videos and posts you save.
              It builds a personalized taste profile that helps generate content that matches your aesthetic.
            </p>
            <ul className="space-y-2 text-sm text-dark-300">
              <li className="flex items-start gap-2">
                <Dna className="w-4 h-4 text-accent-purple flex-shrink-0 mt-0.5" />
                <span>Personal taste profile built from your saved content</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-accent-purple flex-shrink-0 mt-0.5" />
                <span>AI-powered content generation matching your style</span>
              </li>
              <li className="flex items-start gap-2">
                <Target className="w-4 h-4 text-accent-purple flex-shrink-0 mt-0.5" />
                <span>Content DNA analysis for hooks, tones, and formats</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContentStudio;
