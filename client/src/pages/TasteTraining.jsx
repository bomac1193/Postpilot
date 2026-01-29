import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { genomeApi } from '../lib/api';
import { Dna, Heart, Target, Zap } from 'lucide-react';

const shuffleArray = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const LIKERT_POOL = [
  { id: 'risk-bold', prompt: 'I prefer bold, contrarian takes over consensus summaries.', archetypeHint: 'R-10' },
  { id: 'story-mood', prompt: 'I’m drawn to narrative and mood over straight how-to instructions.', archetypeHint: 'D-8' },
  { id: 'evidence', prompt: 'Data, references, and receipts make me trust the content.', archetypeHint: 'T-1' },
  { id: 'craft', prompt: 'I care about aesthetic craft and polish more than speed.', archetypeHint: 'S-0' },
  { id: 'playful', prompt: 'I enjoy playful, surprising twists more than straightforward delivery.', archetypeHint: 'N-5' },
  { id: 'mentor', prompt: 'I like calm, mentor energy more than hype or edge.', archetypeHint: 'L-3' },
  { id: 'lineage', prompt: 'I value references to lineage, influence, and history.', archetypeHint: 'P-7' },
  { id: 'speed', prompt: 'I prize speed to publish over perfect polish.', archetypeHint: 'F-9' },
];

const BASE_TASTE_POOL = [
  {
    id: 'edge-vs-mentor',
    label: 'Hook style',
    a: 'Bold, contrarian hooks that polarize',
    b: 'Calm, mentor energy with gentle setups',
  },
  {
    id: 'mythic-vs-analytic',
    label: 'Narrative mode',
    a: 'Mythic storytelling, symbolism, mood',
    b: 'Analytic, data-backed, pragmatic proofs',
  },
  {
    id: 'speed-vs-depth',
    label: 'Format bias',
    a: 'Fast, punchy shorts and carousels',
    b: 'Deep-dive longform and thoughtful pacing',
  },
  {
    id: 'design-vs-report',
    label: 'Visual feel',
    a: 'High-design, cinematic visuals',
    b: 'Plain, report-style clarity',
  },
  {
    id: 'voice-vs-data',
    label: 'Tone preference',
    a: 'Personal voice, vivid anecdotes',
    b: 'Data-led, concise insights',
  },
  {
    id: 'genre-vs-cross',
    label: 'Content angle',
    a: 'Genre purist: stay in one niche',
    b: 'Cross-pollinate: mix odd combos',
  },
];

const archetypeTasteMap = {
  'R-10': { id: 'archetype-contrarian', label: 'Contrarian vs Consensus', a: 'Break assumptions and punch holes', b: 'Balance takes and build consensus' },
  'D-8': { id: 'archetype-channel', label: 'Channel vs Direct', a: 'Vibes, symbolism, mood-led', b: 'Direct, literal, step-by-step' },
  'T-1': { id: 'archetype-architect', label: 'Systems vs Intuition', a: 'Frameworks, logic, scaffolds', b: 'Gut feel, creative intuition' },
  'P-7': { id: 'archetype-archive', label: 'Lineage vs Trend', a: 'Rooted in lineage and references', b: 'Chasing fresh trends constantly' },
  'S-0': { id: 'archetype-standard', label: 'Polish vs Speed', a: 'High polish and standard-setting', b: 'Ship fast, iterate in public' },
  'L-3': { id: 'archetype-cultivator', label: 'Mentor vs Maverick', a: 'Patient mentor energy', b: 'Maverick experimentation' },
  'N-5': { id: 'archetype-integrator', label: 'Integration vs Purity', a: 'Blend opposites and hybrids', b: 'Keep a pure, singular vibe' },
  'V-2': { id: 'archetype-omen', label: 'Early vs Mainstream', a: 'Spot early gems and edges', b: 'Stick to mainstream proof' },
  'H-6': { id: 'archetype-advocate', label: 'Advocate vs Observer', a: 'Campaigning advocacy', b: 'Neutral observation' },
  'F-9': { id: 'archetype-manifestor', label: 'Action vs Theory', a: 'Ship and execute', b: 'Theory and planning first' },
};

const pickKeywordPairs = (g) => {
  if (!g?.keywords) return [];
  const tones = Object.entries(g.keywords?.content?.tone || {})
    .sort((a, b) => b[1] - a[1])
    .map(([tone]) => tone);
  const hooks = Object.entries(g.keywords?.content?.hooks || {})
    .sort((a, b) => b[1] - a[1])
    .map(([hook]) => hook);
  const picks = [];
  if (tones.length >= 2) {
    picks.push({
      id: 'tone-pair',
      label: 'Tone preference',
      a: `Leaning toward ${tones[0]} tone`,
      b: `Leaning toward ${tones[1]} tone`,
    });
  }
  if (hooks.length >= 2) {
    picks.push({
      id: 'hook-pair',
      label: 'Hook style',
      a: `${hooks[0]} hooks`,
      b: `${hooks[1]} hooks`,
    });
  }
  return picks;
};

const buildTastePairs = (g) => {
  const base = [...BASE_TASTE_POOL];
  const archetypeId = g?.archetype?.primary?.designation;
  if (archetypeId && archetypeTasteMap[archetypeId]) {
    base.push(archetypeTasteMap[archetypeId]);
  }
  const keywordPairs = pickKeywordPairs(g);
  const combined = [...base, ...keywordPairs];
  return shuffleArray(combined).slice(0, 3);
};

function TasteTraining() {
  const currentProfileId = useAppStore((state) => state.currentProfileId);
  const activeFolioId = useAppStore((state) => state.activeFolioId);
  const activeProjectId = useAppStore((state) => state.activeProjectId);

  const [genome, setGenome] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trainMessage, setTrainMessage] = useState(null);
  const [tasteTrainBusy, setTasteTrainBusy] = useState(false);
  const [likertBusy, setLikertBusy] = useState(false);
  const [likertScores, setLikertScores] = useState({});
  const [likertQueue, setLikertQueue] = useState(() => shuffleArray(LIKERT_POOL));
  const [likertCursor, setLikertCursor] = useState(0);
  const [likertActive, setLikertActive] = useState(() => likertQueue.slice(0, 3));
  const [tastePairs, setTastePairs] = useState(() => buildTastePairs(null));

  useEffect(() => {
    loadGenome();
  }, [currentProfileId]);

  const loadGenome = async () => {
    setLoading(true);
    try {
      const result = await genomeApi.get(currentProfileId || null);
      if (result.hasGenome) {
        setGenome(result.genome);
        setTastePairs(buildTastePairs(result.genome));
      }
    } catch (error) {
      console.error('Failed to load genome:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTasteChoice = async (pair, choice) => {
    setTasteTrainBusy(true);
    setTrainMessage('Updating your genome…');
    const chosen = pair[choice];
    const other = pair[choice === 'a' ? 'b' : 'a'];

    try {
      await genomeApi.signal(
        'choice',
        pair.id,
        { choice, selected: chosen, rejected: other, folioId: activeFolioId || undefined, projectId: activeProjectId || undefined },
        currentProfileId || null
      );
      setTrainMessage(`Logged: "${chosen}" → genome updated.`);
      await loadGenome();
    } catch (error) {
      console.error('Failed to log taste choice:', error);
      setTrainMessage('Could not record this choice. Try again.');
    } finally {
      setTasteTrainBusy(false);
    }
  };

  const handleLikert = async (item, score) => {
    setLikertBusy(true);
    setTrainMessage('Locking in your signal…');
    const nextScores = { ...likertScores, [item.id]: score };
    setLikertScores(nextScores);

    try {
      await genomeApi.signal(
        'likert',
        item.id,
        {
          score,
          prompt: item.prompt,
          archetypeHint: item.archetypeHint,
          folioId: activeFolioId || undefined,
          projectId: activeProjectId || undefined,
        },
        currentProfileId || null
      );
      setTrainMessage(`Logged: "${item.prompt}" (${score}/5) → genome updated.`);
      await loadGenome();

      const allAnswered = likertActive.every((q) => nextScores[q.id]);
      if (allAnswered) {
        let nextQueue = likertQueue;
        let nextCursor = likertCursor + 3;
        if (nextCursor >= nextQueue.length) {
          nextQueue = shuffleArray(LIKERT_POOL);
          nextCursor = 0;
        }
        const nextActive = nextQueue.slice(nextCursor, nextCursor + 3);
        setLikertQueue(nextQueue);
        setLikertActive(nextActive);
        setLikertCursor(nextCursor);
        setLikertScores({});
      }
    } catch (error) {
      console.error('Failed to log likert signal:', error);
      setTrainMessage('Could not record this signal. Try again.');
    } finally {
      setLikertBusy(false);
    }
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Dna className="w-7 h-7 text-accent-purple" />
            Subtaste · Training
          </h1>
          <p className="text-dark-400 mt-1">High-signal inputs to harden your glyph.</p>
          {genome?.archetype?.primary && (
            <div className="mt-2 flex items-center gap-3">
              <span className="px-3 py-1 bg-dark-900 border border-dark-700 rounded-sm text-xs text-dark-100 font-mono tracking-[0.3em] uppercase">
                {genome.archetype.primary.designation}
              </span>
              <span className="text-lg text-white font-black uppercase tracking-[0.08em]">
                {genome.archetype.primary.glyph}
              </span>
              {genome.archetype.primary.sigil && (
                <span className="text-xs text-dark-300 font-mono uppercase tracking-[0.14em]">
                  {genome.archetype.primary.sigil}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-dark-900 rounded-lg border border-dark-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white uppercase tracking-[0.12em] flex items-center gap-2">
              <Target className="w-4 h-4 text-accent-purple" />
              Rapid A/B
            </h3>
            <span className="text-[11px] text-dark-500 font-mono uppercase tracking-[0.14em]">Signal</span>
          </div>
          <p className="text-sm text-dark-300 mb-3">
            Select the option that fits your taste. Feeds the genome immediately.
          </p>
          <div className="space-y-2">
            {tastePairs.map((pair) => (
              <div key={pair.id} className="rounded-lg border border-dark-700 bg-dark-950 p-3">
                <p className="text-[11px] text-dark-400 uppercase tracking-[0.12em] mb-2">{pair.label}</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleTasteChoice(pair, 'a')}
                    disabled={tasteTrainBusy}
                    className="p-3 rounded-md border border-dark-700 text-left text-sm text-dark-100 hover:border-accent-purple transition-colors disabled:opacity-50"
                  >
                    {pair.a}
                  </button>
                  <button
                    onClick={() => handleTasteChoice(pair, 'b')}
                    disabled={tasteTrainBusy}
                    className="p-3 rounded-md border border-dark-700 text-left text-sm text-dark-100 hover:border-accent-purple transition-colors disabled:opacity-50"
                  >
                    {pair.b}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {trainMessage && <p className="text-xs text-dark-300 mt-3">{trainMessage}</p>}
        </div>

        <div className="bg-dark-900 rounded-lg border border-dark-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white uppercase tracking-[0.12em] flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent-purple" />
              Likert Signals
            </h3>
            <span className="text-[11px] text-dark-500 font-mono uppercase tracking-[0.14em]">Signal</span>
          </div>
          <p className="text-sm text-dark-300 mb-3">
            Slide to record intensity. Strong signals sharpen archetype confidence.
          </p>
          <div className="space-y-3">
            {likertActive.map((item) => (
              <div key={item.id} className="rounded-lg border border-dark-700 bg-dark-950 p-3">
                <p className="text-sm text-dark-200 mb-2">{item.prompt}</p>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-dark-500 w-24 text-right uppercase tracking-[0.1em]">Disagree</span>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={likertScores[item.id] || 3}
                    onChange={(e) => handleLikert(item, Number(e.target.value))}
                    disabled={likertBusy}
                    className="flex-1 accent-accent-purple bg-dark-800"
                  />
                  <span className="text-[11px] text-dark-500 w-20 uppercase tracking-[0.1em]">Agree</span>
                  <span className="text-xs text-dark-300 w-10 text-right">
                    {likertScores[item.id] || 3}/5
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TasteTraining;
