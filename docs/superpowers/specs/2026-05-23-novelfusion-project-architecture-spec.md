# NovelFusion Project-Centric Product Architecture Spec

## Summary

NovelFusion should be designed as a project-centric fiction reconstruction system, not as a loose collection of analysis tools. A user creates or opens a project, uploads one or two source novels, and the system uses the user's configured model to clean, analyze, compare, and synthesize them. The frontend stays restrained and decision-oriented. The backend can be sophisticated, but that complexity should remain mostly invisible.

## Product Positioning

- Highest-level container: `Project`
- Primary user outcome: turn one or two source novels into actionable creative judgment and, eventually, a new generated version
- Product character: lightweight creative system with strong internal intelligence
- Anti-goal: exposing users to a dense analysis console or manual data-cleaning workflow

## Core Product Principles

1. The system should do most of the work automatically.
2. The interface should show only necessary information.
3. Dirty input data should be handled silently by the system whenever possible.
4. The product should present creative decisions before analytical raw materials.
5. The user should feel guided by an editorial intelligence, not buried in tooling.

## Project Model

Each project may contain:

- one or two source novels
- normalized source text and internal segmentation
- per-book analysis assets
- dual-book comparison assets when two books are present
- fusion blueprint
- generated outlines, chapter iterations, and full-version outputs
- project-level recommendations and next-step actions

## Information Architecture

Top-level navigation should be organized by stable objects, not by workflow steps.

Recommended primary navigation:

- `Projects`
- `Workbench`
- `Briefs`
- `Results`
- `Archive`
- `Settings`

### Module Boundaries

`Projects`
- entry point for all projects
- create project
- filter by status
- open project homepage

`Workbench`
- heavy interaction area for the current project
- source upload
- chapter-level analysis progress
- dual-book comparison operations
- blueprint assembly and confirmation

`Briefs`
- creative intent layer
- what to preserve, change, merge, or emphasize

`Results`
- generated outputs
- outline versions
- chapter iterations
- full generated versions
- result comparison history

`Archive`
- project lifecycle management

`Settings`
- model configuration
- account-level configuration

## Default Project Homepage

The default project landing page should be a conclusion-first overview, not an operational workflow page and not an asset browser.

### First-Screen Goals

The first screen should answer:

- What has the system understood about this project?
- What matters most creatively?
- What is the current project state?
- What should the user do next?

### First-Screen Blocks

Only four primary blocks should appear above the fold:

1. `Editorial Recommendation Panel`
2. `Project Status Bar`
3. `Next Action Area`
4. `Key Result Summary`

### Editorial Recommendation Panel

This is the primary block on the page. It should feel like a chief editor briefing the user.

It should summarize:

- strongest elements worth preserving
- weakest elements most worth changing
- best fusion opportunities across two novels when applicable
- highest-risk conflict or incompatibility
- recommended next creative move

This panel should be organized by creative decision, not by analysis dimension.

### Project Status Bar

This should show only high-level directional state, for example:

- number of uploaded novels
- analysis completion
- blueprint status
- whether generation outputs exist

It should not expose internal pipeline detail unless absolutely required.

### Next Action Area

This area should present only one or two recommended actions, such as:

- continue analyzing the second book
- confirm the fusion blueprint
- generate the first outline or version

The UI should avoid showing every possible action at once.

### Key Result Summary

This is a compressed summary of what the system has concluded so far, such as:

- the story is character-driven and ensemble-heavy
- the world rules are stable but realism is weak
- the two novels have compatible tonal foundations

## What Should Not Occupy the First Screen

These elements should be pushed down or moved into deeper module views:

- full chapter tree
- full character table
- concept and setting inventories
- cleaning logs
- entity conflict details
- internal confidence data
- intermediate structured payloads
- long model-generated explanations

## Backend Intelligence Model

The backend should use a multi-stage agentic pipeline rather than a single-pass LLM summary.

Recommended internal flow:

`text import -> cleaning and partitioning -> chapter recognition -> entity extraction -> dimension analysis -> conflict resolution -> single-book conclusions -> dual-book comparison -> fusion blueprint -> generation`

## Internal Processing Principles

The system should produce structured intermediate assets before producing high-level judgment.

Examples of internal assets:

- chapter index
- character roster
- relationship map
- concept inventory
- world rules
- event chain
- tonal and stylistic markers
- realism and authority signals

These assets are mostly internal. They support reliability, comparison, and generation, but should not dominate the frontend.

## Dirty Data Handling

Dirty or irrelevant text should be handled automatically and quietly wherever possible.

The system should attempt to identify and down-rank or remove:

- encoding noise
- duplicated spacing and separator artifacts
- author notes
- end matter
- platform boilerplate
- copyright notices
- chat-group promotions
- suspicious non-body text

The user should not be required to manually classify these in normal operation.

## Error and Reliability Strategy

The system should default to internal correction and restrained external messaging.

### Internal Reliability Expectations

- non-body text should be excluded from core structural analysis
- chapter segmentation should be auto-corrected when possible
- character aliases should be merged automatically when confidence is sufficient
- concept mapping should happen before dual-book fusion judgment
- generation should operate on normalized project assets, not directly on raw original text

### User-Facing Error States

Only a small set of user-visible states should be surfaced:

- upload failed or text unreadable
- analysis in progress
- insufficient material to enter fusion
- blueprint incomplete, generation unavailable
- model configuration unavailable

Detailed internal conflict reports should remain hidden unless a future advanced mode explicitly needs them.

## UX Philosophy

The frontend should feel simple because complexity is absorbed by the system, not because the system is shallow.

Desired user impression:

- the product is smart
- the product is calm
- the product is trustworthy
- the product knows what to show and what to hide

Undesired user impression:

- the product is a noisy analysis dashboard
- the product requires manual cleanup labor
- the product exposes too many low-level system states

## Out of Scope For The First Iteration

- full manual review workflows for dirty text
- advanced analyst-facing debug panels
- user-managed confidence tuning
- exposing all intermediate assets on the homepage
- surfacing internal extraction conflicts as normal workflow objects

## Open Design Implications For Implementation Planning

The following implementation questions remain for a later planning pass:

- exact project homepage layout and component breakdown
- how `Workbench`, `Briefs`, and `Results` relate to current session routes
- whether a project supports single-book generation without fusion
- how far existing analysis dimensions can be reused versus re-framed
- whether a future advanced mode should expose deeper assets without compromising the default lightweight experience
