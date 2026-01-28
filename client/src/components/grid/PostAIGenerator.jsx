import { useState, useEffect } from 'react';
import { characterApi, intelligenceApi, genomeApi } from '../../lib/api';
import {
  X,
  Sparkles,
  Copy,
  Check,
  ChevronDown,
  UserCircle2,
  Dna,
  RefreshCw,
  Instagram,
  Youtube,
  Star,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';

// TikTok icon
function TikTokIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
    </svg>
  );
}

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'tiktok', label: 'TikTok', icon: TikTokIcon },
  { id: 'youtube', label: 'YouTube', icon: Youtube },
];

// Simple star rating component
function StarRating({ rating, onRate }) {
  const [hover, setHover] = useState(0);
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
            className={`w-4 h-4 transition-colors ${
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

function PostAIGenerator({ post, onClose, onApplyCaption }) {
  const [characters, setCharacters] = useState([]);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [platform, setPlatform] = useState('instagram');
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [variants, setVariants] = useState([]);
  const [copied, setCopied] = useState(null);
  const [usePersonalGenome, setUsePersonalGenome] = useState(true);
  const [showCharacterDropdown, setShowCharacterDropdown] = useState(false);
  const [tasteProfile, setTasteProfile] = useState(null);
  const [ratings, setRatings] = useState({});
  const [savedRatings, setSavedRatings] = useState({});

  useEffect(() => {
    loadCharacters();
    loadTasteProfile();
    // Pre-fill topic from post caption if available
    if (post?.caption) {
      setTopic(post.caption.substring(0, 100));
    }
  }, [post]);

  const loadCharacters = async () => {
    try {
      const data = await characterApi.getAll();
      setCharacters(data);
    } catch (error) {
      console.error('Failed to load characters:', error);
    }
  };

  const loadTasteProfile = async () => {
    try {
      const result = await intelligenceApi.getProfile();
      if (result.hasProfile) {
        setTasteProfile(result.tasteProfile);
      }
    } catch (error) {
      console.error('Failed to load taste profile:', error);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    setVariants([]);

    try {
      let result;

      if (selectedCharacter) {
        // Generate using character's voice
        result = await characterApi.generate(selectedCharacter._id, {
          topic,
          platform,
          count: 5,
        });
      } else {
        // Generate using personal taste profile
        result = await intelligenceApi.generate(topic, {
          platform,
          count: 5,
        });
      }

      setVariants(result.variants || []);
    } catch (error) {
      console.error('Generate error:', error);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleApply = (variant) => {
    if (onApplyCaption) {
      onApplyCaption(variant.variant);
    }
    onClose();
  };

  const handleRate = async (variant, rating, index) => {
    setRatings(prev => ({ ...prev, [index]: rating }));
    try {
      await intelligenceApi.rate(
        {
          variant: variant.variant,
          hookType: variant.hookType,
          tone: variant.tone,
          performanceScore: variant.performanceScore,
          tasteScore: variant.tasteScore,
        },
        rating,
        {},
        {
          topic,
          platform,
          characterId: selectedCharacter?._id,
          source: 'local',
        },
        false
      );
      setSavedRatings(prev => ({ ...prev, [index]: true }));
    } catch (error) {
      console.error('Failed to save rating:', error);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4"
      onClick={(e) => {
        e.stopPropagation();
        // Only close if clicking the backdrop itself
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-dark-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-accent-purple" />
            <h2 className="text-lg font-semibold text-white">Generate Caption</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-dark-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Post Preview (if image exists) */}
          {post?.image && (
            <div className="flex items-center gap-4 p-3 bg-dark-700 rounded-lg">
              <img
                src={post.image}
                alt="Post"
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">
                  {post.caption || 'No caption yet'}
                </p>
                <p className="text-xs text-dark-400 mt-1">
                  Generate AI caption for this post
                </p>
              </div>
            </div>
          )}

          {/* Voice Selection */}
          <div className="grid grid-cols-2 gap-4">
            {/* Character or Personal */}
            <div>
              <label className="block text-sm text-dark-300 mb-2">Voice</label>
              <div className="relative">
                <button
                  onClick={() => setShowCharacterDropdown(!showCharacterDropdown)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-white hover:border-dark-500 transition-colors"
                >
                  {selectedCharacter ? (
                    <>
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: selectedCharacter.color }}
                      >
                        {selectedCharacter.name.charAt(0)}
                      </div>
                      <span className="flex-1 text-left truncate">{selectedCharacter.name}</span>
                    </>
                  ) : (
                    <>
                      <Dna className="w-5 h-5 text-accent-purple" />
                      <span className="flex-1 text-left">My Taste Profile</span>
                    </>
                  )}
                  <ChevronDown className="w-4 h-4 text-dark-400" />
                </button>

                {showCharacterDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-dark-700 border border-dark-600 rounded-lg shadow-xl z-10 max-h-60 overflow-y-auto">
                    {/* Personal genome option */}
                    <button
                      onClick={() => {
                        setSelectedCharacter(null);
                        setUsePersonalGenome(true);
                        setShowCharacterDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-dark-600 transition-colors ${
                        !selectedCharacter ? 'bg-dark-600' : ''
                      }`}
                    >
                      <Dna className="w-5 h-5 text-accent-purple" />
                      <span className="text-white">My Taste Profile</span>
                    </button>

                    {characters.length > 0 && (
                      <div className="border-t border-dark-600 my-1" />
                    )}

                    {/* Character options */}
                    {characters.map((char) => (
                      <button
                        key={char._id}
                        onClick={() => {
                          setSelectedCharacter(char);
                          setUsePersonalGenome(false);
                          setShowCharacterDropdown(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-dark-600 transition-colors ${
                          selectedCharacter?._id === char._id ? 'bg-dark-600' : ''
                        }`}
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ backgroundColor: char.color }}
                        >
                          {char.name.charAt(0)}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-white text-sm">{char.name}</p>
                          <p className="text-xs text-dark-400">{char.voice} voice</p>
                        </div>
                      </button>
                    ))}

                    {characters.length === 0 && (
                      <p className="px-3 py-2 text-sm text-dark-400">
                        No characters yet. Create one in Characters page.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Platform */}
            <div>
              <label className="block text-sm text-dark-300 mb-2">Platform</label>
              <div className="flex gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPlatform(p.id)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border transition-colors ${
                      platform === p.id
                        ? 'bg-accent-purple/20 border-accent-purple text-accent-purple'
                        : 'bg-dark-700 border-dark-600 text-dark-300 hover:border-dark-500'
                    }`}
                  >
                    <p.icon className="w-4 h-4" />
                    <span className="text-sm hidden sm:inline">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Topic Input */}
          <div>
            <label className="block text-sm text-dark-300 mb-2">Topic / Prompt</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What is this post about?"
                className="flex-1 px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:border-accent-purple focus:ring-1 focus:ring-accent-purple outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
              <button
                onClick={handleGenerate}
                disabled={generating || !topic.trim()}
                className="px-4 py-2.5 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/80 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {generating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Generate
              </button>
            </div>
          </div>

          {/* Voice Info */}
          {selectedCharacter && (
            <div className="p-3 bg-dark-700/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ backgroundColor: selectedCharacter.color }}
                >
                  {selectedCharacter.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{selectedCharacter.name}</p>
                  <p className="text-xs text-dark-400">{selectedCharacter.voice} · {selectedCharacter.captionStyle}</p>
                </div>
              </div>
              {selectedCharacter.personaTags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedCharacter.personaTags.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 bg-dark-600 rounded text-xs text-dark-300">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Generated Variants */}
          {variants.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-white">Generated Captions</h3>
              {variants.map((variant, i) => (
                <div
                  key={i}
                  className="bg-dark-700 rounded-lg p-4 hover:bg-dark-600/50 transition-colors"
                >
                  <p className="text-white leading-relaxed mb-3">{variant.variant}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-accent-purple/20 text-accent-purple rounded text-xs">
                        {variant.hookType}
                      </span>
                      <span className="px-2 py-0.5 bg-dark-600 text-dark-300 rounded text-xs">
                        {variant.tone}
                      </span>
                      <span className="text-xs text-dark-400">
                        Score: {variant.performanceScore}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(variant.variant, i)}
                        className="p-1.5 text-dark-400 hover:text-white rounded transition-colors"
                        title="Copy to clipboard"
                      >
                        {copied === i ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleApply(variant)}
                        className="px-3 py-1 bg-accent-purple text-white text-sm rounded hover:bg-accent-purple/80 transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                  {/* Rating Section */}
                  <div className="mt-3 pt-3 border-t border-dark-600 flex items-center gap-3">
                    <span className="text-xs text-dark-400">Rate this:</span>
                    <StarRating
                      rating={ratings[i] || 0}
                      onRate={(rating) => handleRate(variant, rating, i)}
                    />
                    {savedRatings[i] && (
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Saved
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PostAIGenerator;
