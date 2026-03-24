# Architecture

Architectural decisions, structural boundaries, and refactor guidance for workers.

**What belongs here:** Container/component boundaries, component ownership rules, state-flow decisions, and mission-specific architectural guardrails.  
**What does NOT belong here:** Environment setup or service commands.

---

- Enforce a strict Container / Component split in touched React code:
  - Containers own data flow, orchestration, hooks, and lifecycle boundaries.
  - Presentational components stay pure, prop-driven, and focused on rendering.
- `useChatWorkspace` and the chat hooks remain the primary orchestration boundary; avoid pushing orchestration back into large JSX-heavy components.
- `ChatCanvas`, `ChatWindow`, composer/header/message surfaces, and related shell pieces should be decomposed into smaller named leaf components when that reduces mixed concerns.
- Raw SVG markup belongs in dedicated icon/mark components such as `*Icon` and `*MarkIcon`.
- Shadcn adoption in this mission is button-first. Preserve the notebook/paper styling by layering mission-specific classes on shared primitives instead of reintroducing ad hoc raw `<button>` implementations.
- Prefer deleting duplicated layout/control code over preserving incidental wrappers.
- Do not add new direct `useEffect` usage in touched frontend code unless the code truly needs mount-scoped external synchronization.
