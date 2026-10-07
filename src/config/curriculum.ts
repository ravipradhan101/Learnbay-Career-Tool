// Program syllabi now come from the 2026 catalogue (config/catalogue.ts, config/program-details.ts). This file keeps the
// published, program-independent points about how Learnbay teaches.

export type Curriculum = { liveHours: string; projects: string; modules: string[]; electives?: string[]; capstones: string[] }

/** Kept for older imports; the catalogue is the source of every program's syllabus. */
export const CURRICULUM: Record<string, Curriculum> = {}

/** How Learnbay teaches, true of every program in the 2026 catalogue. Program-specific facts (certificates,
 * specialisations, duration) come from that program's catalogue entry, never from here. */
export const CURRICULUM_EDGE = [
  'Live, mentor-led, interactive classes (not mostly recorded sessions)',
  'Every program teaches Claude, Claude Code, GitHub Copilot, connectors and MCP as a real module, tailored to its audience',
  'Specialisations, role tracks or domain electives matched to the learner’s background (each program lists its own)',
  'Projects in every module plus capstones drawn from real industry scenarios',
  'AI CoLab: real startup problems instead of only case studies (in the programs that include it)',
  'A dedicated project mentor, plus 1:1 doubt clearing',
]
