// Testimonials and proof points shown across the app.
//
// TESTIMONIALS: the entries below are ILLUSTRATIVE placeholders taken from the design. They are labelled
// "Illustrative alumni stories" on screen. Replace them with real, consented learner stories and set
// `illustrative: false` on each real one; once every entry is real the label changes to "Alumni stories".
// Optional `photo` is a path under /public (e.g. '/alumni/ananya.webp'); initials are shown otherwise.

export type Testimonial = {
  name: string
  role: string
  company: string
  quote: string
  from: string
  to: string
  photo?: string
  illustrative: boolean
}

export const TESTIMONIALS: Testimonial[] = [
  { name: 'Ananya Rao', role: 'AI Engineer', company: 'Northstar Labs', quote: 'I finally knew which skills to focus on.', from: 'Software Developer', to: 'AI Engineer', illustrative: true },
  { name: 'Rohit Mehta', role: 'Data Analyst', company: 'FinEdge', quote: 'A clear roadmap made my next move feel achievable.', from: 'Operations', to: 'Data Analytics', illustrative: true },
  { name: 'Priya Nair', role: 'AI Product Manager', company: 'Aster Digital', quote: 'The guidance connected AI learning to my actual role.', from: 'Product Manager', to: 'AI Product', illustrative: true },
  { name: 'Karthik S', role: 'DevOps Engineer', company: 'CloudArc', quote: 'Seeing my gaps side by side made the plan obvious.', from: 'System Admin', to: 'Cloud & DevOps', illustrative: true },
  { name: 'Sneha Kulkarni', role: 'AI QA Engineer', company: 'PayStream', quote: 'I learned how to test AI systems, not just use them.', from: 'QA Engineer', to: 'AI QA', illustrative: true },
]

export const TESTIMONIALS_ARE_ILLUSTRATIVE = TESTIMONIALS.some((t) => t.illustrative)

// Proof points: only facts published by Learnbay on www.learnbay.co (checked 24 Sep 2026).
export const PROOF_POINTS: { icon: 'award' | 'users' | 'code' | 'briefcase'; title: string; text: string }[] = [
  { icon: 'award', title: 'IBM, Microsoft & IIT certified', text: 'Data Science, GenAI & Agentic AI programs with industry and IIT certification' },
  { icon: 'users', title: 'Live, mentor-led learning', text: 'Live online classes led by industry mentors' },
  { icon: 'code', title: 'Real projects', text: 'Hands-on, real-world and startup projects in every program' },
  { icon: 'briefcase', title: 'Specialised tracks', text: 'Programs for AI, FDE, Cloud & DevOps, Data Science and Analytics' },
]
