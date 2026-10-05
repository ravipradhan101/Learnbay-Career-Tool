// Which Learnbay program a learner means when they name one ("the AI Engineer program", "FDE course", "IIT Patna
// applied AI"). Client-safe. The counsellor model also judges this; a clear name here always wins, so a named program
// is never swapped for the one recommended from the profile.

/** Most specific first: "GenAI for Cloud & DevOps" must not be read as "Cloud & DevOps", nor "Advanced Data Science" as "Data Science". */
const NAMES: [RegExp, string][] = [
  [/\bforward[- ]?deployed\b|\bfde\b/, 'forward-deployed-ai-engineer'],
  [/\bsde\b|software development engineer/, 'sde-genai-agentic-ai'],
  [/\bai engineer(ing)?\s+(master|program|programme|course|certification|pg)/, 'ai-engineering-master'],
  [/applied ai|ai practitioner|iit patna/, 'applied-ai-practitioner'],
  [/(genai|gen ai|generative ai|agentic)[^.?!]{0,40}\b(managers?|leaders?|leadership)\b|\b(managers?|leaders?) (and|&) (leaders?|managers?)\b/, 'genai-agentic-ai-managers-leaders'],
  [/(genai|gen ai|generative ai|agentic)[^.?!]{0,40}\bsoftware developers?\b/, 'genai-software-developers'],
  [/(genai|gen ai|generative ai|agentic)[^.?!]{0,40}\b(cloud|devops)\b/, 'genai-agentic-ai-cloud-devops'],
  [/advanced data science/, 'data-science-genai-master'],
  [/\bms (in )?(cs|computer science)\b|masters? (degree )?in (cs|computer science)/, 'ms-cs-data-science-ai'],
  [/\bdaba\b|business analytics|data (and|&) business analytics|data analytics (course|program)/, 'data-business-analytics-genai'],
  [/(cloud|devops)[^.?!]{0,40}\bnetwork(ing)? (professionals?|engineers?|admins?)\b|\bnetwork professionals?\b/, 'cloud-devops-network'],
  [/(cloud|devops)[^.?!]{0,40}\b(qa|testers?|test engineers?|testing)\b/, 'cloud-devops-qa-testers'],
  [/(cloud|devops)[^.?!]{0,40}\b(system admin(istrators?|s)?|sysadmins?)\b/, 'cloud-devops-sysadmin'],
  [/(cloud|devops)[^.?!]{0,40}\b(it support|itops|it operations)\b/, 'cloud-devops-it-support-ops'],
  [/(cloud|devops)[^.?!]{0,40}\b(dba|database admin(istrators?|s)?)\b/, 'cloud-devops-dba'],
  [/advanced cloud/, 'advanced-cloud-devops'],
  [/(ai[- ]powered )?cloud (and|&) devops (engineering )?(master|masters)/, 'ai-cloud-devops-master'],
  [/(genai|gen ai|generative ai) (and|&) agentic ai master/, 'genai-agentic-ai-master'],
  [/data science (and|&) (gen ?ai|ai) (program|programme|course|certification)/, 'data-science-genai-program'],
  [/(genai|gen ai|generative ai) (and|&) agentic ai (program|programme|course|certification)/, 'genai-agentic-ai-program'],
]

/** Names that only ever mean the program; anything else needs a word like "program" or "course" nearby. */
const ALWAYS = new Set(['forward-deployed-ai-engineer', 'applied-ai-practitioner', 'ms-cs-data-science-ai', 'data-business-analytics-genai', 'advanced-cloud-devops', 'cloud-devops-network', 'genai-software-developers', 'genai-agentic-ai-managers-leaders'])
const ABOUT_A_PROGRAM = /\b(program|programme|course|certification|master|masters|syllabus|curriculum|brochure|modules?|fees?|enrol|enroll|join|details|link)\b/

/** The program the learner names in this message, if any (e.g. "tell me about the AI Engineer program"). */
export function namedProgram(text: string): string | undefined {
  const t = text.toLowerCase().replace(/[’']/g, '').replace(/\s+/g, ' ')
  for (const [re, id] of NAMES) {
    if (re.test(t) && (ALWAYS.has(id) || ABOUT_A_PROGRAM.test(t))) return id
  }
  return undefined
}

const GENERIC = new Set(['program', 'programme', 'master', 'masters', 'course', 'certification', 'and', 'for', 'with', 'the', 'in', 'of', 'ai', 'specialisation'])

/**
 * Whether the message actually points at this program (shares a distinctive word with its name): "which program is
 * best for me?" does not name one, "is the analytics course good?" does.
 */
export function mentionsProgram(text: string, programName: string): boolean {
  const t = text.toLowerCase()
  return programName.toLowerCase().replace(/[()&,-]/g, ' ').split(/\s+/)
    .filter((w) => w.length >= 3 && !GENERIC.has(w))
    .some((w) => t.includes(w.slice(0, Math.min(w.length, 5))))
}

/** "Which program is best for me?", "what should I choose?": the learner wants a recommendation. */
export function wantsAdvice(text: string): boolean {
  const t = text.toLowerCase()
  return /\b(which|what|best|right|suitable|suits?|recommend\w*|fits?|should i)\b[^?.!]{0,40}\b(program|programme|course|path|option|one|track)s?\b/.test(t)
    || /\b(best|right) (program|course|option|path) for me\b|\b(fits?|suits?) me\b|\bwhat should i (do|take|join|choose|learn)\b/.test(t)
}
