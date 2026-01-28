import { useState, useEffect } from 'react';
import { characterApi } from '../lib/api';
import { useAppStore } from '../stores/useAppStore';
import {
  Plus,
  Trash2,
  Edit3,
  Sparkles,
  User,
  Palette,
  Volume2,
  X,
  Copy,
  Check,
} from 'lucide-react';

const VOICE_OPTIONS = [
  { value: 'conversational', label: 'Conversational', desc: 'Friendly and approachable' },
  { value: 'authoritative', label: 'Authoritative', desc: 'Expert and confident' },
  { value: 'playful', label: 'Playful', desc: 'Fun and lighthearted' },
  { value: 'vulnerable', label: 'Vulnerable', desc: 'Open and authentic' },
  { value: 'provocateur', label: 'Provocateur', desc: 'Bold and challenging' },
  { value: 'mentor', label: 'Mentor', desc: 'Wise and guiding' },
  { value: 'poetic', label: 'Poetic', desc: 'Artistic and expressive' },
  { value: 'raw', label: 'Raw', desc: 'Unfiltered and direct' },
];

const CAPTION_STYLES = [
  { value: 'short-punchy', label: 'Short & Punchy' },
  { value: 'storyteller', label: 'Storyteller' },
  { value: 'educational', label: 'Educational' },
  { value: 'provocative', label: 'Provocative' },
  { value: 'poetic', label: 'Poetic' },
  { value: 'listicle', label: 'Listicle' },
  { value: 'conversational', label: 'Conversational' },
];

const COLOR_OPTIONS = [
  '#8b5cf6', '#ec4899', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#f43f5e',
];

function CharacterCard({ character, onEdit, onDelete, onGenerate }) {
  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 p-4 hover:border-dark-600 transition-colors">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: character.color || '#8b5cf6' }}
        >
          {character.avatar ? (
            <img src={character.avatar} alt={character.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            character.name?.charAt(0)?.toUpperCase() || 'C'
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{character.name}</h3>
          <p className="text-sm text-dark-400 capitalize">{character.voice} voice</p>
          {character.personaTags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {character.personaTags.slice(0, 3).map((tag, i) => (
                <span key={i} className="px-2 py-0.5 bg-dark-700 rounded text-xs text-dark-300">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bio */}
      {character.bio && (
        <p className="mt-3 text-sm text-dark-300 line-clamp-2">{character.bio}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-dark-700">
        <button
          onClick={() => onGenerate(character)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent-purple/20 text-accent-purple rounded-lg hover:bg-accent-purple/30 transition-colors text-sm"
        >
          <Sparkles className="w-4 h-4" />
          Generate
        </button>
        <button
          onClick={() => onEdit(character)}
          className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(character._id)}
          className="p-2 text-dark-400 hover:text-red-400 hover:bg-dark-700 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function CharacterModal({ character, onClose, onSave }) {
  const [form, setForm] = useState({
    name: character?.name || '',
    bio: character?.bio || '',
    color: character?.color || '#8b5cf6',
    voice: character?.voice || 'conversational',
    captionStyle: character?.captionStyle || 'conversational',
    personaTags: character?.personaTags?.join(', ') || '',
    toneAllowed: character?.toneAllowed?.join(', ') || '',
    toneForbidden: character?.toneForbidden?.join(', ') || '',
    systemPrompt: character?.systemPrompt || '',
    platforms: character?.platforms || ['instagram'],
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...form,
        personaTags: form.personaTags.split(',').map(t => t.trim()).filter(Boolean),
        toneAllowed: form.toneAllowed.split(',').map(t => t.trim()).filter(Boolean),
        toneForbidden: form.toneForbidden.split(',').map(t => t.trim()).filter(Boolean),
      };
      await onSave(data);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-white">
            {character ? 'Edit Character' : 'Create Character'}
          </h2>
          <button onClick={onClose} className="p-2 text-dark-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto max-h-[calc(90vh-130px)] space-y-4">
          {/* Name & Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-dark-300 mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
                placeholder="Character name"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">Color</label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm({ ...form, color })}
                    className={`w-8 h-8 rounded-full transition-transform ${form.color === color ? 'scale-110 ring-2 ring-white' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm text-dark-300 mb-1">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white h-20 resize-none"
              placeholder="Character backstory and personality..."
            />
          </div>

          {/* Voice & Style */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-dark-300 mb-1">Voice</label>
              <select
                value={form.voice}
                onChange={(e) => setForm({ ...form, voice: e.target.value })}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
              >
                {VOICE_OPTIONS.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">Caption Style</label>
              <select
                value={form.captionStyle}
                onChange={(e) => setForm({ ...form, captionStyle: e.target.value })}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
              >
                {CAPTION_STYLES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Persona Tags */}
          <div>
            <label className="block text-sm text-dark-300 mb-1">Persona Tags</label>
            <input
              type="text"
              value={form.personaTags}
              onChange={(e) => setForm({ ...form, personaTags: e.target.value })}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
              placeholder="bold, mysterious, witty (comma-separated)"
            />
          </div>

          {/* Tone Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-dark-300 mb-1">Allowed Tones</label>
              <input
                type="text"
                value={form.toneAllowed}
                onChange={(e) => setForm({ ...form, toneAllowed: e.target.value })}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
                placeholder="sarcastic, confident, playful"
              />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">Forbidden Tones</label>
              <input
                type="text"
                value={form.toneForbidden}
                onChange={(e) => setForm({ ...form, toneForbidden: e.target.value })}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
                placeholder="aggressive, vulgar"
              />
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-sm text-dark-300 mb-1">Custom System Prompt</label>
            <textarea
              value={form.systemPrompt}
              onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white h-24 resize-none font-mono text-sm"
              placeholder="Additional instructions for AI content generation..."
            />
          </div>
        </form>

        <div className="flex justify-end gap-3 p-4 border-t border-dark-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-dark-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name}
            className="px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/80 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : character ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

function GenerateModal({ character, onClose }) {
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [generating, setGenerating] = useState(false);
  const [variants, setVariants] = useState([]);
  const [copied, setCopied] = useState(null);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    try {
      const result = await characterApi.generate(character._id, { topic, platform, count: 5 });
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

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: character.color }}
            >
              {character.name?.charAt(0)}
            </div>
            <div>
              <h2 className="font-semibold text-white">Generate as {character.name}</h2>
              <p className="text-sm text-dark-400">{character.voice} voice</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-dark-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Input */}
          <div className="flex gap-3">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter topic or content idea..."
              className="flex-1 px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
            >
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="linkedin">LinkedIn</option>
              <option value="youtube">YouTube</option>
            </select>
            <button
              onClick={handleGenerate}
              disabled={generating || !topic.trim()}
              className="px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/80 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {generating ? 'Generating...' : 'Generate'}
            </button>
          </div>

          {/* Results */}
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {variants.map((v, i) => (
              <div key={i} className="bg-dark-700 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-white flex-1">{v.variant}</p>
                  <button
                    onClick={() => copyToClipboard(v.variant, i)}
                    className="p-2 text-dark-400 hover:text-white rounded-lg flex-shrink-0"
                  >
                    {copied === i ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-dark-400">
                  <span className="px-2 py-0.5 bg-dark-600 rounded">{v.hookType}</span>
                  <span className="px-2 py-0.5 bg-dark-600 rounded">{v.tone}</span>
                  <span>Performance: {v.performanceScore}%</span>
                  <span>Taste: {v.tasteScore}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Characters() {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [generatingFor, setGeneratingFor] = useState(null);

  useEffect(() => {
    loadCharacters();
  }, []);

  const loadCharacters = async () => {
    try {
      const data = await characterApi.getAll();
      setCharacters(data);
    } catch (error) {
      console.error('Failed to load characters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data) => {
    const character = await characterApi.create(data);
    setCharacters([character, ...characters]);
  };

  const handleUpdate = async (data) => {
    const updated = await characterApi.update(editingCharacter._id, data);
    setCharacters(characters.map(c => c._id === updated._id ? updated : c));
    setEditingCharacter(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this character?')) return;
    await characterApi.delete(id);
    setCharacters(characters.filter(c => c._id !== id));
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Characters</h1>
          <p className="text-dark-400 mt-1">AI personas for generating content in unique voices</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/80 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Character
        </button>
      </div>

      {/* Grid */}
      {characters.length === 0 ? (
        <div className="text-center py-16 bg-dark-800 rounded-xl border border-dark-700">
          <User className="w-12 h-12 text-dark-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-2">No characters yet</h3>
          <p className="text-dark-400 mb-4">Create AI characters with unique personalities to generate content</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/80 transition-colors"
          >
            Create Your First Character
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((character) => (
            <CharacterCard
              key={character._id}
              character={character}
              onEdit={setEditingCharacter}
              onDelete={handleDelete}
              onGenerate={setGeneratingFor}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CharacterModal
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}
      {editingCharacter && (
        <CharacterModal
          character={editingCharacter}
          onClose={() => setEditingCharacter(null)}
          onSave={handleUpdate}
        />
      )}
      {generatingFor && (
        <GenerateModal
          character={generatingFor}
          onClose={() => setGeneratingFor(null)}
        />
      )}
    </div>
  );
}

export default Characters;
