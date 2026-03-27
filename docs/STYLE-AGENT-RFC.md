# Style Agent: Teaching Open Wonder How to See Your Brand

**RFC / Feature Concept -- March 2026**
**Status:** Draft for team review
**Author:** Martin Hessmann
**Prototype ground:** ow-next (feature branch, pre-Studio)

---

## TL;DR

Today, getting consistent on-brand results from AI image generation requires manual prompt crafting, reference-image workarounds, and a lot of trial and error. When it works, the knowledge stays in one person's head. When the model updates, it breaks.

We want to build a system where the brand itself knows how it should look -- and that knowledge is testable, versionable, and gets smarter from every generation.

Think of it as: **what Cursor is for code, but for visual brand generation.**

Not a prompt library. A living, learning style system.

**The good news: almost all the primitives already exist in the app. They just are not connected yet.**

---

## The Problem

### Why today's approach does not scale

Open Wonder already generates on-brand images, product shots, and character portraits. But behind the scenes, the consistency comes from fragile pieces:

- **Prompt templates** that work until the model updates, then silently degrade
- **Reference images** used as a crutch -- locking pixels, introducing inpainting artifacts, and preventing true lookbook-style series generation
- **Style knowledge that lives in people's heads** -- "Elena knows which negative prompts fix the skin texture issue"
- **User feedback that dies in the chat** -- a thumbs-down on a generation teaches the system nothing
- **No way to test if a style still works** -- there is no "CI for brand consistency"

The result: every lookbook, every campaign batch, every new product shot category requires manual debugging. And when it works, the learnings are not captured anywhere.

### The real problem is not prompting

The real problem is:

- Style knowledge is volatile
- Model behavior is unstable across updates
- Good results emerge iteratively but the iterations are not recorded
- Consistency today is manual debugging, not brand logic
- Reference images are a workaround for missing style intelligence

---

## What Already Exists

Before describing the new feature, it is worth recognizing how much of this system is already built -- just not connected.

### Brand Knowledge (exists, not wired to generation)

| Primitive | Where | What it knows |
|---|---|---|
| `BrandGuide.content` | Prisma / extraction service | Full text extracted from uploaded PDF brand guides |
| `Brand.brandInfo` | Prisma | Structured brand profile (JSON) from guide analysis |
| `Brand.analysisReport` | Prisma | AI-generated brand analysis |
| `BrandMemory` | Prisma | Long-form memories from chat ("remember" tool) |
| `Brand.description`, `.product`, `.industries` | Prisma | Basic brand metadata |

**Gap:** None of this rich brand knowledge flows into the prompt enhancer. The generation pipeline only sees the brand name, description, product field, and style keywords during prompt validation.

### Prompt Enhancer (exists, manually edited, not governed)

| Primitive | Where | How it works |
|---|---|---|
| `VisualStyle.promptEnhancerTemplate` | Prisma field | A text field edited by admins in the visual style detail modal |
| `VisualStyle.stylePromptCues` | Prisma field | Fallback cues when template is empty |
| `enhancePrompt()` | `src/lib/services/generation/promptEnhancer.ts` | Loads template, optionally appends BrandArtifact captions, calls OpenAI |
| `validatePromptBrandRelevance()` | `src/lib/services/generation/promptValidator.ts` | Lightweight brand context check before generation |

**Gap:** The prompt enhancer is a static text blob. The AI agent cannot modify it. It does not read the brand guide, brand info, or analysis report. It does not learn from feedback. It has no version history.

### Products and Characters (recently built, OW-1491)

| Primitive | Where | What it provides |
|---|---|---|
| `BrandArtifact` (PRODUCT / CHARACTER) | Prisma | Named entities with captions and reference images |
| `BrandArtifactImage` | Prisma | Links artifacts to Asset (reference photos) |
| @-mentions in Studio chat | UI + AI tools | Users can reference products/characters in prompts |
| `PRODUCT_INTEGRATION` / `CHARACTER_INTEGRATION` | VisualStyle capabilities | Styles can declare they support product/character placement |

**Opportunity:** Products and characters are the perfect **test subjects** for the Style Agent's probe rounds. They are already in the database with images and captions.

### Asset Feedback (exists, goes nowhere useful)

| Primitive | Where | What happens |
|---|---|---|
| `AssetRating` (UP / DOWN) | Prisma | Per-user rating on generated assets |
| Feedback API | `src/app/api/assets/feedback/route.ts` | Sends structured feedback to Sentry with image attachment |
| `useAssetRating` hook | `src/hooks/useAssetRating.ts` | UI integration for thumbs up/down |

**Gap:** Ratings are stored and sent to Sentry for debugging. They do not feed back into the style system. There is no aggregation, no notification for brand managers, no proposed rule changes.

### Visual Styles (the foundation to build on)

| Primitive | Where | What it defines |
|---|---|---|
| `VisualStyle` | Prisma | Name, description, dos/donts, color palette, keywords, LoRA config, generation type, capabilities |
| LoRA training pipeline | FAL AI integration | Custom model fine-tuning from reference images |
| Style-scoped generation | Generation strategies | Text-to-image and image-to-image with per-style configuration |

**Opportunity:** Visual Styles already carry most of the fields a subbrain would need. They just lack structured rules, version history, evaluation criteria, and the connection to brand knowledge.

### Summary: What is missing is the connective tissue

The brand guide knows the brand. The prompt enhancer generates prompts. Products and characters exist as entities. Users already rate outputs. Visual styles already scope generation.

**What is missing:**
1. The brand guide informing the prompt enhancer automatically
2. The prompt enhancer being structured rules instead of a free-text blob
3. Feedback flowing back into style rules
4. Version history on style configurations
5. An agent that can iterate on all of this autonomously

That is what the Style Agent builds.

---

## Where It Lives: Inside the Assistant

The Studio already has three creative modes:

| Mode | Purpose |
|---|---|
| **Imagine** | Describe a scene, get on-brand images and videos |
| **Product** | Pick a product with @-mentions, choose a style, describe the scene |
| **Assistant** | Ask about brand guidelines, tone, visual identity |

Today, the Assistant mode is essentially **read-only** -- it can answer questions about the brand, but it cannot change how generation works. It has no agency over the visual system.

The Style Agent turns the Assistant into something active. Instead of adding a fourth mode card, the style definition flow **starts from within the Assistant**. The brand manager is already in a chat context, talking to an agent that understands the brand. The natural next step is:

> *"Let's work on our portrait photography style"*
> *"Our product shots have been looking too sterile lately -- can we fix that?"*
> *"I want to define a visual direction for our summer campaign"*

The Assistant recognizes this as a style definition intent and shifts into Style Agent mode -- still within the same chat interface, same session history, same collaboration model. No new UI to learn.

This also means the Style Agent **reuses the entire chat infrastructure** that already exists in Studio: message threading, session persistence, the sidebar history, team visibility. We do not build a separate tool -- we make the existing assistant smarter.

---

## Two Separate Things: Brand Rules vs. Prompt Guides

Before describing how the system works, one architectural principle must be established. The system manages **two fundamentally different artifacts**, and they must never be conflated:

**Brand Rules** = the source of truth

- Human-readable and editable by designers and brand managers
- Versioned in the database
- Model-agnostic -- they describe intent, not model instructions
- Example: *"Lighting should be soft, directional from upper-left, with minimal fill. Avoid flat front-light."*

**Prompt Guides** = the compiled output

- Model-specific -- what actually gets sent to Nano Banana, Flux, or whatever model is active
- Generated automatically by a compiler from the Brand Rules
- Updated when the model changes, even if the rules do not change
- Example: *"soft directional lighting, upper left key light, 2:1 key-to-fill ratio, --no flat_lighting flash_photography ring_light"*

In the current app, `VisualStyle.promptEnhancerTemplate` conflates both: it is a manually written prompt that also acts as the only record of brand intent. The Style Agent splits this into two: the rules (which humans maintain) and the compiled prompt guide (which the system generates).

Why this separation matters:

1. **Model updates**: When Nano Banana 2.1 becomes 3.0, you recompile the Prompt Guides from the same Brand Rules. The brand manager never touches anything.
2. **Multi-model support**: Same rules can compile to different prompts for different models.
3. **Auditability**: Brand managers can read and approve rules without understanding prompt syntax.
4. **Debugging**: When a generation goes wrong, you can diagnose separately: "Did the rules fail, or did the compilation fail?"

---

## How It Works

The Style Agent is not a linear pipeline. It is an iterative loop where the system generates images as fast as possible to validate understanding, rather than asking exhaustive questions upfront.

### Step 1: Ingest -- Minimum Viable Context

**Principle: only collect what changes a pixel.** If a piece of information would not affect the generated image, do not ask for it.

The user provides brand material:
- Mood board images or brand guide PDF (visual identity pages, not mission statements)
- A few example images of what "good" looks like
- Optionally: product photos, campaign examples, a link to their website
- A short direction statement: *"mysterious but premium, not sterile, avoid young-looking models"*

Much of this may **already be in the system** -- BrandGuide content, BrandArtifacts with product/character images, Brand.brandInfo. The agent should read what is already there before asking for more.

The agent can optionally look at the brand's website -- but only to extract visual signals (color palette, photography style, layout feeling), not to read "About Us" text.

**What the agent does NOT ask:**
- Target audience demographics (unless it directly affects casting)
- Market positioning or competitive analysis
- Brand history or mission statement
- Detailed channel strategy

The goal is to start generating test images as fast as possible. The fastest way to find out if the system understood the brand is not to ask more questions -- it is to show images.

From the uploaded and existing material, the agent extracts structured style signals:
- Subject archetypes and casting cues
- Camera grammar (framing, angle, lens feel)
- Lighting logic
- Color world
- Material and texture expectations
- Composition tendencies
- Emotional tone
- Forbidden patterns
- Product truths (invariant product attributes)

### Step 2: Draft and Probe -- Show, Don't Ask

Rather than building a perfect specification before generating anything, the system works **draft-first**:

1. The agent takes what it has and builds a **rough draft brain** -- maybe 60-70% confident
2. It immediately generates **4-6 probe images** to test whether the draft is in the right direction
3. The user reacts: *"The lighting is right but the color temperature is way off"* or *"You understood the product style but the people look wrong"*
4. The agent refines the draft and runs another probe round
5. Repeat until convergence

This is exactly how Cursor works with code: it does not ask 20 questions before writing. It writes something, shows you, and iterates.

The agent only asks a question when it faces a **genuine fork** -- two valid directions that it cannot resolve from the material alone: *"Both of these feel on-brand, but they go in different places. Which is more you?"*

**Probe subjects come from the brand's own data.** The BrandArtifacts (products and characters) already in the system are the natural test subjects. If a brand has uploaded 5 products and 3 characters, the probe round uses those -- not generic stock subjects.

During this phase, the system builds the **Brand Brain** -- a structured, versioned ruleset. The Brand Brain contains a core identity (shared DNA across all generation types) plus specialized **subbrains** for each output mode:

```
Brand Brain (v1.0-draft)
├── Core Identity (shared DNA)
│   ├── Positive rules
│   ├── Negative rules
│   ├── Hard constraints (non-negotiable)
│   └── Soft preferences (taste, not law)
│
├── Subbrain: Portrait Photography
│   ├── Lighting: upper-left soft key, minimal fill
│   ├── Skin: natural, not airbrushed
│   ├── Framing: full body required
│   ├── Forbidden: CGI look, plastic skin, flat front-light beauty
│   └── Model notes: Nano Banana tends to over-smooth at high steps
│
├── Subbrain: Product Placement
│   ├── Background: contextual, not white void
│   ├── Product: label-true, no invented features
│   ├── Props: minimal, brand-relevant only
│   └── Forbidden: floating products, impossible reflections
│
├── Subbrain: People Lifestyle
│   ├── Casting: age 30-50, natural look
│   ├── Environment: warm, lived-in spaces
│   └── Forbidden: stock-photo staging, over-diverse casting cliches
│
├── Subbrain: Illustration
│   ├── Abstraction level: editorial, not literal
│   ├── Line work: visible, hand-drawn feel
│   └── Forbidden: 3D render look, gradient mesh
│
└── (Future: Interior, Architecture, Abstract 3D...)
```

**Subbrains evolve from what we already call "Image Styles" and "Product Styles."** Photography, Illustration, Studio Shot, Outside Shot, Lifestyle -- these become subbrains in the new model. Same concept, but now they carry structured rules, evaluation criteria, and version history instead of just a name and a prompt template.

Each subbrain inherits the core brand DNA but applies mode-specific rules. Same brand, different compiled output.

### Step 3: Compile

A compiler layer converts the Brand Rules into actual generation strategies for the target model.

This matters because different models and different task types want different things. A portrait prompt is not a product placement prompt is not an illustration prompt.

The compiler produces per subbrain:
- Prompt enhancer templates (replacing the manually-edited `promptEnhancerTemplate` text field)
- Product placement configuration (if applicable)
- Negative constraint blocks
- Model-specific instruction packs

The prompt is a **build artifact**, not the source of truth. When the model updates, the compiler re-runs. The Brand Rules stay the same.

### Step 4: Activate

When the user is satisfied with the probe results, the brain moves from draft to active. From this point on, all generations for this brand -- across Imagine, Product, and any other mode -- are silently governed by the compiled Prompt Guides.

Regular team members never see the brain. They just get better, more consistent results.

### Step 5: Learn

Once the brain is in production use, the learning loop continues through user feedback and the Brand Health Center (see below).

---

## Hard Rules vs. Soft Rules

This distinction is critical for reliability and must be baked into the system from day one.

**Hard rules** are non-negotiable. Violating them means the output is rejected:
- Never show hands in close-up (model weakness)
- Never generate visible typography on products
- Product must remain label-true (no invented features)
- No children in any generation
- Brand colors must be within defined tolerance

**Soft rules** express taste. Violating them means the output is less ideal but not wrong:
- Mood should feel mysterious
- Prefer asymmetric composition
- Slightly warmer blacks
- Backgrounds should feel lived-in, not staged
- Skin should show natural texture

The evaluation layer treats these differently: hard rule violations trigger automatic rejection and re-generation. Soft rule violations are flagged but shown to the user with a note.

---

## Lifecycle: From Draft to Production

A Brand Brain is not a static document. It has a lifecycle with clear states:

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Draft   │────▶│  Ready   │────▶│  Active  │────▶│ Archived │
│          │     │          │     │          │     │          │
│ Being    │     │ Probes   │     │ Live for │     │ Previous │
│ iterated │     │ passed,  │     │ all users│     │ version, │
│ on by    │     │ awaiting │     │          │     │ viewable │
│ the team │     │ approval │     │          │     │ and      │
│          │     │          │     │          │     │ diffable │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
      ▲                                 │
      └─────────────────────────────────┘
               new version started
```

**Draft** -- The brain is being actively iterated on. Probe rounds are running. Team members can view the draft, add feedback on probe results, and suggest rules. The brain is not used for generation outside the Style Agent.

**Ready** -- The brand manager considers it done. Probes have passed. If the brand uses approval workflows, another admin reviews. Otherwise, the manager self-approves.

**Active** -- This is the live brain. All generations for this brand are governed by it. There can be **multiple active brains** for a brand -- for example, a main brand identity brain and a separate summer campaign brain that inherits the core DNA but overrides color temperature and mood.

**Archived** -- A previous version. Fully viewable, diffable against the current active version, and restorable if the new version causes problems.

A brand manager can leave mid-session, come back the next day, and find their draft exactly where they left it -- with all probe results, feedback, and iteration history intact.

### Collaboration During Drafts

Draft brains are **collaborative**. While the brand manager drives the process:
- Team members can view the current draft and all probe results
- They can leave feedback on individual probe images ("this one nails it" or "the lighting is off here")
- They can suggest rules ("I think we should forbid visible seams on product shots")
- The brand manager decides what gets incorporated

---

## Versioning: Database Version History

Versioning is **not git.** Everything lives in Supabase. The model is simple:

Each Brand Brain record has:
- `version` -- integer, auto-incremented (1, 2, 3...)
- `status` -- enum: DRAFT, READY, ACTIVE, ARCHIVED
- `parentVersionId` -- pointer to the previous version (null for v1)
- `createdAt`, `updatedAt`, `activatedAt`
- `createdBy` -- which user created this version
- `changeDescription` -- what changed and why

This gives us:
- A clear history chain (v3 → v2 → v1)
- The ability to diff any two versions
- Rollback by re-activating a previous version
- Audit trail of who changed what and when

No branches. No merge conflicts. No commit hashes. Just a numbered version history with status transitions.

### Small tweaks (patch versions)

1. System surfaces a proposed rule change (from aggregated feedback or brand manager initiative)
2. Brand manager approves with one click
3. New version is created: v1 → v2
4. Regression probes run in the background against canonical test prompts
5. If probes pass: v2 becomes active silently
6. If probes fail: brand manager is notified, v1 stays active, the change needs investigation

### Significant changes (new versions)

1. Brand manager opens the Style Agent, sees the current active brain as baseline
2. Describes what should change: *"We're shifting to a warmer palette for the summer campaign"*
3. System creates a new draft version
4. Full iterative probe cycle runs (same as initial definition)
5. Brand manager reviews, team collaborates
6. When ready, new version is activated, previous version is archived

### Regression Testing

Every version update -- whether a one-click patch or a major revision -- triggers a regression check:

- The system maintains a set of **canonical test prompts** based on the brand's main themes, product categories (using existing BrandArtifacts), and subbrain coverage
- When the brain updates, it re-runs those prompts with the new compiled Prompt Guides
- It compares new results against the evaluation criteria from the Brand Rules
- If a previously-passing category now fails, the update is flagged before going live

---

## Brand Health Center

Regular users generate images and rate them (thumbs up/down) during normal usage of Imagine, Product, and other modes. They do not need to know anything about Brand Rules or the Style Agent.

Today, those ratings are stored in `AssetRating` and sent to Sentry. They go nowhere useful.

The Brand Health Center changes this. It is a notification and triage surface for brand managers.

### What the brand manager sees

The system does not show a firehose of every rating. It pre-processes feedback into actionable signals:

- **Clustered notifications**: *"4 people flagged skin texture issues in portrait mode this week"* is one notification, not four
- **Attached images**: The actual generations that were flagged, not just text descriptions
- **Rule context**: Which subbrain and which rules governed the flagged generation
- **System diagnosis**: *"The model appears to be over-smoothing skin at this prompt length. This may be a model caveat, not a rule issue."*

### What the brand manager does

For each notification, three choices:

1. **Dismiss** -- *"That's fine. The user didn't like the composition, but it's on-brand. Not a rule issue."*
2. **Investigate** -- Opens the Style Agent with the flagged generation pre-loaded. The agent runs targeted probes to determine if this is a pattern or a one-off. If it is a pattern, it proposes a rule update with a preview of the impact.
3. **Quick fix** -- For obvious issues, approve a suggested rule tweak directly from the notification. The system creates a new version and runs regression probes in the background.

### Brand health over time

The Health Center also serves as a dashboard:
- How many rule violations per week? Trending up or down?
- Which subbrains are most problematic?
- How has generation quality changed after the last brain update?
- Are there recurring issues that the model playbook should address?

Not every bad rating is a brand rule problem. Sometimes the user just does not like the image. The brand manager's job is **triage** -- separating taste from brand violations. Only confirmed violations flow into the rule update cycle.

---

## What Changes for Existing Users

For users who are not brand managers, **nothing visually changes** in Imagine, Product, or Assistant modes.

What changes is invisible: the prompt compiler silently governs generation using the active Brand Brain. Results become more consistent, more on-brand, and more reliable -- without the user needing to know why.

The Style Agent capability within the Assistant is primarily a **brand manager and admin tool**. Regular team members interact with the results. They can also participate in the draft collaboration process when invited.

---

## Technical Considerations

### Architecture

The system uses multiple specialized agents rather than one monolithic agent:

- **Planner** -- Ingests brand material (reads existing BrandGuide, BrandArtifacts, brandInfo), extracts style signals, proposes subbrains
- **Compiler** -- Translates Brand Rules into model-specific Prompt Guides (replacing manual `promptEnhancerTemplate`)
- **Evaluator** -- Assesses probe outputs against the Brand Rules using vision analysis
- **Rule Writer** -- Translates user feedback into proposed rule edits

### Model Requirements

- **Reasoning model** (planning, synthesis, rule writing): GPT-4.1 / o3 / Codex
- **Vision model** (evaluation, critique): GPT-4.1 with vision or dedicated vision model
- **Image model** (probe generation): Nano Banana 2.1, Flux, or the brand's trained LoRA model
- **Model knowledge layer**: A maintained "model playbook" that encodes what each image model likes, overdoes, ignores, and hallucinates

### Brand Rules Schema

Each subbrain contains a typed structure (stored as JSON in Supabase, not free text):

```
subject          -- who or what is in the frame
environment      -- where, what kind of space
camera           -- framing, angle, lens feel, depth of field
light            -- direction, quality, fill ratio, color
color            -- palette, temperature, saturation rules
texture          -- material fidelity expectations
styling          -- wardrobe, props, set dressing
composition      -- rule of thirds, symmetry, negative space
brand_taboos     -- absolute no-go patterns (hard rules)
soft_preferences -- taste-level guidance (soft rules)
model_caveats    -- known model-specific failure modes and mitigations
product_truths   -- invariant product attributes
eval_criteria    -- what "good", "acceptable", and "reject" mean
```

### Integration with Existing Systems

| Existing Primitive | How it connects |
|---|---|
| `VisualStyle` | Evolves into subbrain container. Existing fields (`dos`/`donts`, `colorPalette`, `keywords`, `capabilities`) map directly to Brand Rules fields |
| `VisualStyle.promptEnhancerTemplate` | Becomes a compiled Prompt Guide output. No longer manually edited |
| `BrandGuide.content` + `Brand.brandInfo` | Read by the Planner agent during Ingest. Finally connected to generation |
| `BrandArtifact` (PRODUCT / CHARACTER) | Used as probe test subjects. Products and characters already in the system are the natural inputs for regression testing |
| `AssetRating` | Aggregated and surfaced in the Brand Health Center instead of just going to Sentry |
| `BrandMemory` | Potential input for the Rule Writer -- memories from chat interactions can suggest rule additions |
| LoRA models | Referenced in the model knowledge layer as available tools. The brain governs when and how LoRAs are applied |
| `enhancePrompt()` | Refactored to read compiled Prompt Guides instead of raw template text |
| `validatePromptBrandRelevance()` | Enhanced to check against Brand Rules (hard rules = reject, soft rules = warn) |

### Multiple Concurrent Brains

A brand can have **multiple active brains** simultaneously:

- **Main brand brain** -- The default identity, always active
- **Campaign brains** -- Temporary overrides for seasonal or campaign-specific work (e.g., "Summer 2026" brain that inherits core DNA but shifts color temperature and mood)
- **Experimental brains** -- Draft brains being tested that do not affect production generation

Campaign brains inherit from the main brain and override specific rules. This means a summer campaign brain does not need to redefine lighting rules -- it inherits them and only changes what is different.

### Cost Model

Each Brand Brain definition round involves test generations. A rough estimate:
- Initial setup: 8-16 probe images (4 directions x 2-4 variants)
- Each feedback iteration: 4-8 probe images
- Regression test on version update: 8-12 images

At current generation costs, an initial style definition costs roughly the same as one manual debugging session -- but the result is reusable and gets better over time.

---

## What Is NOT in V1

- **Full automation** -- The agent does not run 100 iterations unsupervised. It runs 2-3 rounds, asks 1-2 questions, and converges.
- **Video generation governance** -- V1 covers still image generation only.
- **Cross-brand style transfer** -- Each brain is brand-specific.
- **Public API** -- The brain is internal to the platform.
- **Real-time generation interception** -- The brain compiles into Prompt Guides ahead of time, not at generation time.
- **"One agent does everything"** -- The system uses specialized agents with clear roles.

---

## Prototype Plan

Initial prototyping happens in **ow-next** on a dedicated feature branch. The prototype will use mock data and simulated agent responses to validate the UX flow before any backend integration.

**Phase 1: UX Prototype (ow-next)**
- Style Agent flow within the Assistant chat interface
- Intake flow: upload + short direction input (no long questionnaire)
- Draft brain view with iterative probe gallery (inline in chat)
- Probe image feedback UI (structured vocabulary, not just thumbs)
- Decision moments (choose between directions with real images)
- Brain lifecycle states visible in the UI
- Collaboration: team members can view and comment on drafts

**Phase 2: Connect Existing Primitives**
- Wire BrandGuide content + Brand.brandInfo into the Planner agent
- Define Brand Rules JSON schema (extending VisualStyle fields)
- Build compiler: Brand Rules → Prompt Guides (replacing manual `promptEnhancerTemplate`)
- Use BrandArtifacts (products/characters) as probe test subjects
- Add version history to style configurations (version number + status + parent pointer in Supabase)
- Refactor `enhancePrompt()` to read compiled guides

**Phase 3: Feedback Loop and Health Center**
- Aggregate AssetRatings into clustered notifications for brand managers
- Build Brand Health Center UI (triage: dismiss / investigate / quick fix)
- Feedback-to-rule translator (proposed rule edits from aggregated ratings)
- Regression test runner (canonical test prompts against updated brain)

**Phase 4: Production Integration**
- Integration with existing Studio Assistant (reusing chat infrastructure, session history, sidebar)
- Migration of existing VisualStyles to v0 subbrains with auto-compiled Prompt Guides
- Brand Health Center integrated with existing notification patterns
- Campaign brain inheritance model
- Admin approval workflows for version promotion

---

## Open Questions for the Team

1. **Granularity**: What is the right level of detail for a style rule? Too fine and it becomes unmanageable. Too coarse and it does not actually constrain the model.

2. **Probe budget**: How many test generations per iteration are acceptable? There is a direct cost-vs-quality tradeoff. 8 probes? 16? Should the user choose?

3. **Evaluation model**: Should the vision evaluator use the same model family as the generator, or a different one? Using the same model risks blind spots. Using a different one adds cost and complexity.

4. **LoRA interaction**: How does the Brand Brain interact with LoRA-trained styles? The brain governs when and how LoRAs are applied -- but what happens when a LoRA and a brand rule conflict?

5. **Subbrain scope for V1**: Which subbrains should we support at launch? Proposal: Portrait Photography + Product Placement + Illustration covers the three most common use cases.

6. **Model playbook maintenance**: Who maintains the "what Nano Banana likes and dislikes" knowledge? Options: hardcoded by us, learned automatically from probes, or manually curated per model update.

7. **Campaign brain inheritance depth**: Can a campaign brain override hard rules from the main brain, or only soft preferences?

8. **Health Center notification threshold**: How many similar ratings before a notification fires? 3? 5? Configurable per brand?

9. **Migration path**: When we migrate existing VisualStyles to subbrains, do we attempt to reverse-engineer Brand Rules from existing `promptEnhancerTemplate` text, or start fresh with a v0 brain that has no rules and only carries the legacy template as its compiled output?

---

## How This Fits: Agentic Assistant, Brand Context Layer, OW 2.0

The Style Agent is not a standalone idea. It is one capability within a larger strategy that the team has already been thinking about.

### Part of the Agentic Assistant initiative

The Style Agent turns the Studio Assistant from read-only into something that can actually change how the system works. It is the first concrete example of an **agentic capability** -- the assistant does not just answer questions, it defines visual rules, runs tests, evaluates results, and proposes changes. Once this pattern works for visual styles, it can extend to other domains: voice and tone rules, channel-specific formatting, content strategy.

### Builds on the Brand Context Layer (OW-1487 / OW-1488)

The Brand Onboarding Greenfield concept and Brand Context Layer docs describe a progressive enrichment model for brand knowledge:

- Layer 0-1: Seed and auto-discovery (brand name, website crawl, social signals)
- Layer 2: Human refinement (identity, voice, visual identity, governance)
- Layer 3: Deep configuration (visual styles, LoRA, templates, channel integration)
- Layer 4: Operational memory (feedback patterns, learned preferences)

The Style Agent is **what makes Layer 3 and Layer 4 actually work for visual generation.** The greenfield docs know that visual style configuration is needed -- they list "LoRA, reference images" as items in Layer 3. The Style Agent is the answer to *how* that configuration is created, tested, versioned, and improved over time through the agentic loop.

The Brand Rules schema in the Style Agent can also be designed to fit within the broader Brand Context Layer architecture, so visual rules are one part of a unified brand knowledge graph rather than an isolated system.

### Compatible with OW 2.0 (API-first, bot-driven)

OW 2.0 envisions that the entire Open Wonder platform can be operated via API -- by Claw Bot or any other programmatic client -- without requiring a UI.

The Style Agent is designed to work in both modes:

- **Human mode**: Brand manager uses the Studio Assistant chat to define styles, review probes, approve versions
- **API mode**: A bot calls the same services programmatically -- reads Brand Rules, triggers the compiler, runs probes, evaluates results, promotes versions

The Brand Brain with its structured JSON schema, the version history in Supabase, the regression test runner -- all of these are services that expose clean APIs. The Assistant chat is just one interface on top of them. The same services power Claw Bot.

This means the Style Agent is not a UI feature. It is a **service layer** that happens to have a chat interface for humans.

---

## Why This Matters Strategically

Every AI image tool today competes on model quality. Models are commoditizing fast. What does not commoditize:

- **Style memory** -- knowing what "on-brand" means for this specific client
- **Evaluation logic** -- being able to tell good from bad without a human in the loop
- **Rule versioning** -- tracking how a brand's visual language evolves
- **Feedback governance** -- turning scattered user reactions into systematic improvement
- **Regression testing** -- proving that an update did not break what worked

This is where the moat is. Not in generating one beautiful image, but in making the thousandth image as reliable as the first.

The goal is not to build a better prompt enhancer. The goal is to make Open Wonder the system that **understands brands visually** -- and gets better at it every day.

---

*This document is a living draft. Feedback, pushback, and "what about..." questions are exactly what we need before Monday. Mark it up.*
