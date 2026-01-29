import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { genomeApi } from '../lib/api';
import {
  Dna,
  Sparkles,
  Trophy,
  Flame,
  Target,
  ChevronRight,
  Zap,
  Lock,
  CheckCircle2,
  Star,
  TrendingUp,
  Award,
  Layers,
  Eye,
  Compass,
  Shield,
  Lightbulb,
  Heart,
  Hexagon,
  Aperture,
} from 'lucide-react';

// Map archetype designations to icons
const ARCHETYPE_ICONS = {
  'T-1': Layers,
  'V-2': Eye,
  'L-3': Compass,
  'C-4': Shield,
  'N-5': Heart,
  'H-6': TrendingUp,
  'P-7': Star,
  'D-8': Zap,
  'F-9': Lightbulb,
  'R-10': Target,
  'S-0': Hexagon,
  'NULL': Aperture,
};

// Map achievement IDs to icons
const ACHIEVEMENT_ICONS = {
  'first-score': Eye,
  'ten-scores': Target,
  'fifty-scores': Award,
  'first-publish': Zap,
  'ten-published': TrendingUp,
  'first-hook': Lightbulb,
  'hook-master': Star,
  'streak-3': Flame,
  'streak-7': Flame,
  'streak-30': Trophy,
  'style-explorer': Compass,
  'hook-explorer': Layers,
  'glyph-revealed': Dna,
};

function ArchetypeCard({ archetype, isActive, confidence }) {
  const IconComponent = ARCHETYPE_ICONS[archetype.designation] || Hexagon;

  return (
    <div
      className={`relative rounded-lg p-4 border transition-all ${
        isActive
          ? 'bg-dark-900 border-accent-purple/60 shadow-[0_0_0_1px_rgba(139,92,246,0.3)]'
          : 'bg-dark-900 border-dark-700'
      }`}
    >
      {isActive && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-accent-purple text-white text-xs rounded-sm font-semibold tracking-wide">
          {Math.round(confidence * 100)}%
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm border border-dark-600 bg-dark-800 flex items-center justify-center">
            <IconComponent className="w-5 h-5 text-dark-200" />
          </div>
          <div>
            <p className="text-[11px] text-dark-400 font-mono uppercase tracking-[0.28em]">
              {archetype.designation}
            </p>
            <h3 className="font-bold text-white tracking-tight uppercase">{archetype.glyph || archetype.title}</h3>
            <p className="text-xs text-dark-400">{archetype.title}</p>
          </div>
        </div>
        {archetype.sigil && (
          <span className="text-[11px] text-dark-300 font-mono uppercase tracking-[0.18em]">
            {archetype.sigil}
          </span>
        )}
      </div>
      <p className="text-sm text-dark-300 mb-3 line-clamp-2">{archetype.essence}</p>
      <span className="inline-flex px-2 py-0.5 border border-dark-600 rounded-sm text-[11px] text-dark-200 uppercase tracking-[0.12em]">
        {archetype.creativeMode}
      </span>
    </div>
  );
}

function AchievementBadge({ achievement, unlocked }) {
  const IconComponent = ACHIEVEMENT_ICONS[achievement.id] || Award;

  return (
    <div
      className={`relative p-3 rounded-lg border transition-all ${
        unlocked
          ? 'bg-dark-700 border-accent-purple/30'
          : 'bg-dark-800 border-dark-700 opacity-50'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${unlocked ? 'bg-accent-purple/20' : 'bg-dark-700'}`}>
          <IconComponent className={`w-4 h-4 ${unlocked ? 'text-accent-purple' : 'text-dark-500'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white text-sm truncate">{achievement.name}</h4>
          <p className="text-xs text-dark-400 truncate">{achievement.description}</p>
        </div>
        {unlocked ? (
          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
        ) : (
          <Lock className="w-4 h-4 text-dark-500 flex-shrink-0" />
        )}
      </div>
    </div>
  );
}

function QuizQuestion({ question, onAnswer, selectedAnswer }) {
  return (
    <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
      <p className="text-xl text-white mb-6">{question.prompt}</p>
      <div className="grid grid-cols-2 gap-4">
        {question.options.map((option) => (
          <button
            key={option.value}
            onClick={() => onAnswer(question.id, option.value, question.weights[option.value])}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedAnswer === option.value
                ? 'bg-accent-purple/20 border-accent-purple'
                : 'bg-dark-700 border-dark-600 hover:border-dark-500'
            }`}
          >
            <p className="font-medium text-white">{option.label}</p>
            <p className="text-sm text-dark-400 mt-1">{option.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function TasteGenome() {
  const currentProfileId = useAppStore((state) => state.currentProfileId);
  const activeFolioId = useAppStore((state) => state.activeFolioId);
  const activeProjectId = useAppStore((state) => state.activeProjectId);
  const setActiveFolio = useAppStore((state) => state.setActiveFolio);
  const setActiveProject = useAppStore((state) => state.setActiveProject);
  const [genome, setGenome] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [quizResponses, setQuizResponses] = useState({});
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [allArchetypes, setAllArchetypes] = useState({});
  const [gamification, setGamification] = useState(null);
  const [allAchievements, setAllAchievements] = useState([]);
  const [preferences, setPreferences] = useState({
    authors: '',
    topics: '',
    books: '',
    influences: '',
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefMessage, setPrefMessage] = useState(null);

  useEffect(() => {
    loadGenome();
    loadArchetypes();
  }, [currentProfileId]);

  const loadGenome = async () => {
    try {
      const result = await genomeApi.get(currentProfileId || null);
      if (result.hasGenome) {
        setGenome(result.genome);
        setTastePairs(buildTastePairs(result.genome));
      }
      const gamResult = await genomeApi.getGamification(currentProfileId || null);
      setGamification(gamResult);
      setAllAchievements(gamResult.allAchievements || []);
    } catch (error) {
      console.error('Failed to load genome:', error);
    } finally {
      setLoading(false);
    }
  };

  // Lightweight refresh without global loading overlay
  const refreshGenomeQuietly = async () => {
    try {
      const result = await genomeApi.get(currentProfileId || null);
      if (result.hasGenome) {
        setGenome(result.genome);
        setTastePairs(buildTastePairs(result.genome));
      }
      const gamResult = await genomeApi.getGamification(currentProfileId || null);
      setGamification(gamResult);
      setAllAchievements(gamResult.allAchievements || []);
    } catch (error) {
      console.error('Failed to refresh genome:', error);
    }
  };

  const loadArchetypes = async () => {
    try {
      const result = await genomeApi.getArchetypes();
      setAllArchetypes(result.archetypes || {});
    } catch (error) {
      console.error('Failed to load archetypes:', error);
    }
  };

  const startQuiz = async () => {
    try {
      const result = await genomeApi.getQuizQuestions();
      setQuizQuestions(result.questions || []);
      setShowQuiz(true);
      setCurrentQuestion(0);
      setQuizResponses({});
    } catch (error) {
      console.error('Failed to load quiz:', error);
    }
  };

  const handleQuizAnswer = (questionId, value, weights) => {
    setQuizResponses({
      ...quizResponses,
      [questionId]: { answer: value, weights }
    });
  };

  const submitQuiz = async () => {
    setSubmittingQuiz(true);
    try {
      const responses = Object.entries(quizResponses).map(([questionId, data]) => ({
        questionId,
        answer: data.answer,
        weights: data.weights
      }));
      const result = await genomeApi.submitQuiz(responses, currentProfileId || null);
      setGenome(result.summary?.genome || genome);
      setShowQuiz(false);
      loadGenome();
    } catch (error) {
      console.error('Failed to submit quiz:', error);
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const parseList = (text) =>
    text
      .split(/[\n,]/)
      .map((v) => v.trim())
      .filter(Boolean);

  const handleSavePreferences = async () => {
    const authors = parseList(preferences.authors);
    const topics = parseList(preferences.topics);
    const books = parseList(preferences.books);
    const influences = parseList(preferences.influences);

    if (!authors.length && !topics.length && !books.length && !influences.length) {
      setPrefMessage('Add at least one item before saving.');
      return;
    }

    setSavingPrefs(true);
    setPrefMessage(null);
    try {
      await genomeApi.signal(
        'preference',
        'subtaste-input',
        {
          authors,
          topics,
          books,
          influences,
          folioId: activeFolioId || undefined,
          projectId: activeProjectId || undefined,
        },
        currentProfileId || null
      );
      setPrefMessage('Locked into your taste genome. Keep adding signals anytime.');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setPrefMessage('Could not save preferences. Please try again.');
    } finally {
      setSavingPrefs(false);
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full" />
      </div>
    );
  }

  // Quiz View
  if (showQuiz && quizQuestions.length > 0) {
    const question = quizQuestions[currentQuestion];
    const isLastQuestion = currentQuestion === quizQuestions.length - 1;
    const allAnswered = Object.keys(quizResponses).length === quizQuestions.length;

    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-white">Discover Your Archetype</h1>
            <span className="text-sm text-dark-400 font-mono">
              {currentQuestion + 1}/{quizQuestions.length}
            </span>
          </div>
          <div className="h-1 bg-dark-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-purple transition-all"
              style={{ width: `${((currentQuestion + 1) / quizQuestions.length) * 100}%` }}
            />
          </div>
        </div>

        <QuizQuestion
          question={question}
          onAnswer={handleQuizAnswer}
          selectedAnswer={quizResponses[question.id]?.answer}
        />

        <div className="flex justify-between mt-6">
          <button
            onClick={prevQuestion}
            disabled={currentQuestion === 0}
            className="px-4 py-2 text-dark-400 hover:text-white disabled:opacity-50 transition-colors"
          >
            Back
          </button>
          {isLastQuestion ? (
            <button
              onClick={submitQuiz}
              disabled={!allAnswered || submittingQuiz}
              className="px-6 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/80 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submittingQuiz ? 'Analyzing...' : 'Reveal Archetype'}
              <Sparkles className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={nextQuestion}
              disabled={!quizResponses[question.id]}
              className="px-6 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/80 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Main Genome View
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Dna className="w-7 h-7 text-accent-purple" />
            Subtaste · Taste Genome
          </h1>
          <p className="text-dark-400 mt-1">Your creative DNA profile, wired into Folio and the content studio.</p>
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
        <button
          onClick={startQuiz}
          className="px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/80 transition-colors flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          {genome ? 'Retake Quiz' : 'Discover Archetype'}
        </button>
      </div>

      {/* Subtaste inputs only (training moved to /training) */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        <div className="bg-dark-900 rounded-lg border border-dark-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-[0.12em]">
              <Heart className="w-4 h-4 text-accent-purple" />
              Subtaste Inputs
            </h3>
            <span className="text-[11px] text-dark-500 font-mono uppercase tracking-[0.16em]">Profile-aware</span>
          </div>
          <p className="text-sm text-dark-300 mb-4">
            Supply high-signal influences. Stored against your profile and Folio IDs.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-dark-400 mb-1">Active Folio</label>
              <input
                type="text"
                value={activeFolioId || ''}
                onChange={(e) => setActiveFolio(e.target.value || null)}
                className="input w-full"
                placeholder="folio workspace id or slug"
              />
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">Active Project</label>
              <input
                type="text"
                value={activeProjectId || ''}
                onChange={(e) => setActiveProject(e.target.value || null)}
                className="input w-full"
                placeholder="project id (optional)"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-dark-400 mb-1">Authors / thinkers</label>
              <textarea
                value={preferences.authors}
                onChange={(e) => setPreferences({ ...preferences, authors: e.target.value })}
                className="input w-full min-h-[70px] resize-none"
                placeholder="Ursula Le Guin, Paul Graham, James Clear..."
              />
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">Topics & niches</label>
              <textarea
                value={preferences.topics}
                onChange={(e) => setPreferences({ ...preferences, topics: e.target.value })}
                className="input w-full min-h-[70px] resize-none"
                placeholder="AI agents, film color grading, creator economy..."
              />
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">Books / media</label>
              <textarea
                value={preferences.books}
                onChange={(e) => setPreferences({ ...preferences, books: e.target.value })}
                className="input w-full min-h-[70px] resize-none"
                placeholder="Story by McKee, The War of Art, Dark Forest..."
              />
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">Voices to emulate</label>
              <textarea
                value={preferences.influences}
                onChange={(e) => setPreferences({ ...preferences, influences: e.target.value })}
                className="input w-full min-h-[70px] resize-none"
                placeholder="MrBeast pacing, Ali Abdaal clarity, ContraPoints depth..."
              />
            </div>
          </div>
          {prefMessage && <p className="text-xs text-dark-300 mt-2">{prefMessage}</p>}
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleSavePreferences}
              disabled={savingPrefs}
              className="px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/80 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {savingPrefs ? 'Saving...' : 'Save to Taste Genome'}
            </button>
          </div>
        </div>
      </div>

      {!genome ? (
        // No genome yet
        <div className="text-center py-16 bg-dark-800 rounded-xl border border-dark-700">
          <Dna className="w-16 h-16 text-dark-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Discover Your Creative Archetype</h2>
          <p className="text-dark-400 max-w-md mx-auto mb-6">
            Take a quick 3-question quiz to unlock your unique taste genome and get personalized content recommendations.
          </p>
          <button
            onClick={startQuiz}
            className="px-6 py-3 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/80 transition-colors inline-flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Start Quiz
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Primary Archetype */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Archetype Card */}
            {genome.archetype?.primary && (
              <div className="bg-dark-900 rounded-lg p-6 border border-dark-700">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-18 min-w-[72px] h-18 min-h-[72px] rounded-sm border border-dark-700 bg-dark-800 flex items-center justify-center">
                    {(() => {
                      const IconComponent = ARCHETYPE_ICONS[genome.archetype.primary.designation] || Hexagon;
                      return <IconComponent className="w-8 h-8 text-dark-200" />;
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-dark-400 font-mono tracking-[0.3em] uppercase mb-1">
                      {genome.archetype.primary.designation}
                    </p>
                    <h2 className="text-4xl font-black text-white uppercase font-mono tracking-[0.16em] leading-tight">
                      {genome.archetype.primary.glyph}
                    </h2>
                    <p className="text-sm text-dark-300 font-semibold mt-1 uppercase tracking-[0.08em]">
                      {genome.archetype.primary.title}
                      {genome.archetype.primary.sigil ? ` · ${genome.archetype.primary.sigil}` : ''}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-3xl font-bold text-white">
                      {Math.round((genome.archetype.primary.confidence || 0) * 100)}%
                    </p>
                    <p className="text-xs text-dark-400 tracking-wide">confidence</p>
                  </div>
                </div>
                <p className="text-dark-200 mb-4 leading-relaxed">{genome.archetype.primary.essence}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 border border-dark-600 text-dark-100 rounded-sm text-xs uppercase tracking-[0.12em]">
                    {genome.archetype.primary.creativeMode}
                  </span>
                  {genome.archetype.primary.shadow && (
                    <span className="px-3 py-1 border border-dark-700 text-dark-300 rounded-sm text-xs uppercase tracking-[0.08em]">
                      Shadow · {genome.archetype.primary.shadow}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Secondary Archetype */}
            {genome.archetype?.secondary && (
              <div className="bg-dark-900 rounded-lg p-4 border border-dark-700">
                <p className="text-xs text-dark-400 mb-2 uppercase tracking-[0.14em]">Secondary Influence</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-sm border border-dark-700 bg-dark-800 flex items-center justify-center">
                    {(() => {
                      const IconComponent = ARCHETYPE_ICONS[genome.archetype.secondary.designation] || Hexagon;
                      return <IconComponent className="w-5 h-5 text-dark-200" />;
                    })()}
                  </div>
                  <div>
                    <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-dark-300">
                      {genome.archetype.secondary.designation}
                    </p>
                    <h3 className="font-semibold text-white uppercase tracking-[0.08em]">{genome.archetype.secondary.glyph}</h3>
                    <p className="text-xs text-dark-400">
                      {Math.round((genome.archetype.secondary.confidence || 0) * 100)}% influence
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* All Archetypes */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">All Archetypes</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(allArchetypes).map(([designation, archetype]) => (
                  <ArchetypeCard
                    key={designation}
                    archetype={{ ...archetype, designation }}
                    isActive={genome.archetype?.primary?.designation === designation}
                    confidence={genome.archetype?.distribution?.[designation] || 0}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar - Gamification */}
          <div className="space-y-6">
            {/* XP & Tier */}
            {gamification && (
              <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-accent-purple/20 flex items-center justify-center">
                    <Award className="w-6 h-6 text-accent-purple" />
                  </div>
                  <div>
                    <p className="text-sm text-dark-400">Current Tier</p>
                    <h3 className="font-semibold text-white">{gamification.tier?.name || 'Nascent'}</h3>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-dark-400">XP</span>
                    <span className="text-white font-mono">{gamification.xp || 0}</span>
                  </div>
                  <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-purple transition-all"
                      style={{ width: `${Math.min(100, (gamification.xp || 0) / 20)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-orange-400">
                    <Flame className="w-4 h-4" />
                    <span>{gamification.streak || 0} day streak</span>
                  </div>
                </div>
              </div>
            )}

            {/* Achievements */}
            <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-accent-purple" />
                Achievements
              </h3>
              <div className="space-y-2">
                {allAchievements.slice(0, 6).map((achievement) => (
                  <AchievementBadge
                    key={achievement.id}
                    achievement={achievement}
                    unlocked={gamification?.achievements?.some(a => a.id === achievement.id)}
                  />
                ))}
              </div>
            </div>

            {/* Top Keywords */}
            {genome?.keywords && (
              <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-400" />
                  Top Keywords
                </h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(genome.keywords.visual || {})
                    .flatMap(([cat, keywords]) =>
                      Object.entries(keywords)
                        .filter(([, score]) => score > 0.5)
                        .map(([kw, score]) => ({ keyword: kw, score }))
                    )
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 10)
                    .map(({ keyword, score }) => (
                      <span
                        key={keyword}
                        className="px-2 py-1 bg-dark-700 rounded text-sm text-dark-200"
                        title={`Score: ${score.toFixed(2)}`}
                      >
                        {keyword}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TasteGenome;
