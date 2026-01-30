# Slayt · Taste-Driven Content OS

One control room for grids, rollouts, and campaigns—powered by a unified Taste Brain (Subtaste) and Folio collections. We optimise for resonance, not just posting volume.

## Diagnosis (market gap)
- Siloed taste signals waste ~40% of social budget—IG learnings never hit TikTok, manual A/B takes quarters, and AI is ungoverned at scale.

## Guiding policy
- **Unified Taste Memory:** every like/save/skip/performance signal mutates one 1193 genome that conditions all generation, scoring, and rollouts.
- **Platform-native UX:** grid-first architecture; tuned previews and non-destructive crops for IG/TikTok/X; Folio collections as primary taste input.
- **Rollout automation:** archetype-aware templates auto-filled with taste-aligned AI; A/B and performance feedback close the loop in weeks, not quarters.
- **Governed avant stack:** multi-model chain (spiky → polish) with lexicon guardrails and on-brand classifiers.

## ERRC (Shippable Q2 2026)
| Eliminate | Reduce | Raise | Create |
| --- | --- | --- | --- |
| Siloed signals (IG→TikTok blind) | A/B cycles: 90→14 days | 2× viral prediction (vs manual baseline) | 1193 Taste Schema (JSON signals+archetypes) |
| Ungoverned AI (no guardrails) | Per-post prompting → shared taste context | 95% on-brand (brand glossary match) | Designer Vault (Folio→templates) |
| 30→3 signals (taste + skip + ROAS) | | One-click IG/TikTok playbooks | Conviction Loop (taste→confidence→ROAS) |
| | | | Taste API (partner moat) |

## Week 1–4 production plan
- **Week 1:** IG/TikTok auth + Folio capture → 1193 Schema v0 storage.
- **Week 2:** 1193 Schema v1 + lexicon guardrails + 95% on-brand classifier.
- **Week 3:** Auto-playbook gen (IG/TikTok templates) + A/B harness.
- **Week 4:** 3-signal dashboard + 3 DTC betas (ROAS split test).

## Defined metrics (test harness)
- **2× viral prediction:** top-1 hook selection vs manual over 14 days.
- **95% on-brand:** brand glossary match + two internal reviewers approval.
- **2× ROAS:** matched campaign split test (pre/post Slayt).
- **90→14 day cycles:** signal capture → playbook deploy timestamp.

## Horizons (defensibility)
- **1–2 yrs:** Taste Brain across all surfaces; taste-driven rollout automation; performance loop live with governance.
- **5–10 yrs:** Dynamic playbooks that rewrite/schedule themselves from results; template marketplace with rev-share; team provenance.
- **10–20 yrs:** Adaptive brand pilot that self-optimises campaigns; collective (privacy-safe) taste graph birthing new subgenres/rollouts.

## Getting Started
```bash
git clone https://github.com/your-org/slayt.git
cd slayt && npm install
cd client && npm install
# copy env and configure
cp .env.example .env
npm run dev           # backend
cd client && npm run dev  # frontend
```

Key env (server):
- `MONGODB_URI`, `JWT_SECRET`
- `CLOUDINARY_*` for media
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, (optional `GROK_API_KEY`/`XAI_API_KEY`)
- `FOLIO_API_URL` for collections/taste conditioning
