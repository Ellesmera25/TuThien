# Contributing Guidelines (English text corrections)

## Purpose
This document sets the project preference for handling corrections to English text across the repository. It ensures contributions that only change user-facing text are consistent, reviewable, and do not alter architecture or logic.

## Guidelines
- Scope: Changes may touch only user-facing text: UI strings (resource files), documentation (README, docs/), comments intended for end users, and any literal strings shown to users.
- Prohibited changes: Do not modify system architecture, project structure, method signatures, algorithms, business logic, or configuration that affects runtime behavior.
- Identifiers: Do not rename variables, classes, methods, constants, or resource keys. Keep localization keys and code references unchanged.
- Tests: Run existing unit/integration tests before submitting. Text-only changes should not affect test outcomes; if they do, explain why in the PR.
- Commits/PRs: Create focused commits and a single PR that groups related textual fixes. Each commit should include a brief description and the files changed.

