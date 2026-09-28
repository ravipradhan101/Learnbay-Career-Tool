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
  /** e.g. "Bengaluru". Shown beside the role on the hero showcase. */
  city?: string
  /** e.g. "150%". Renders a salary-hike badge; omit and no badge is shown. */
  hike?: string
  /** True when the learner was placed through a Learnbay hiring partner. */
  placedViaPartner?: boolean
  illustrative: boolean
}

// ⚠ UNVERIFIED FIGURES. These three numbers were read off a design mock, not
// from anything published by Learnbay, and the `hike` values below came from
// the same place. Confirm every one against a source you control before this
// is shown to anyone — or set HERO_STATS to [] and drop the `hike` fields,
// and the showcase renders without them.
export const HERO_STATS: { value: string; label: string }[] = [
  { value: '35,000+', label: 'Upskilled' },
  { value: '89%', label: 'Placement rate' },
  { value: '250+', label: 'Hiring partners' },
]

// ⚠ DO NOT DEPLOY IN THIS STATE.
// The `photo` paths below are real photographs of real people, supplied as Learnbay
// alumni. The `name`, `role`, `company` and `quote` beside them are still the
// illustrative placeholders from the design — so right now each photo is paired
// with a person who did not say that quote and does not hold that job.
// They are wired up only so the card layout can be reviewed locally.
// Before this goes anywhere public, either
//   (a) replace every name/role/company/quote with that person's real, consented
//       details, match each photo to the right person, and set illustrative: false; or
//   (b) delete the `photo` values and ship the initials avatars.
export const TESTIMONIALS: Testimonial[] = [
  { name: 'Ananya Rao', role: 'AI Engineer', company: 'Northstar Labs', quote: 'I finally knew which skills to focus on.', from: 'Software Developer', to: 'AI Engineer', photo: '/alumni/alumni-01.jpg', city: 'Bengaluru', hike: '150%', placedViaPartner: true, illustrative: true },
  { name: 'Rohit Mehta', role: 'Data Analyst', company: 'FinEdge', quote: 'A clear roadmap made my next move feel achievable.', from: 'Operations', to: 'Data Analytics', photo: '/alumni/alumni-06.jpg', city: 'Pune', hike: '90%', illustrative: true },
  { name: 'Priya Nair', role: 'AI Product Manager', company: 'Aster Digital', quote: 'The guidance connected AI learning to my actual role.', from: 'Product Manager', to: 'AI Product', photo: '/alumni/alumni-02.jpg', city: 'Hyderabad', hike: '120%', placedViaPartner: true, illustrative: true },
  { name: 'Karthik S', role: 'DevOps Engineer', company: 'CloudArc', quote: 'Seeing my gaps side by side made the plan obvious.', from: 'System Admin', to: 'Cloud & DevOps', photo: '/alumni/alumni-13.jpg', city: 'Bengaluru', hike: '70%', illustrative: true },
  { name: 'Sneha Kulkarni', role: 'AI QA Engineer', company: 'PayStream', quote: 'I learned how to test AI systems, not just use them.', from: 'QA Engineer', to: 'AI QA', photo: '/alumni/alumni-03.jpg', city: 'Chennai', hike: '110%', placedViaPartner: true, illustrative: true },
]

export const TESTIMONIALS_ARE_ILLUSTRATIVE = TESTIMONIALS.some((t) => t.illustrative)

// Proof points: only facts published by Learnbay on www.learnbay.co (checked 24 Sep 2026).
export const PROOF_POINTS: { icon: 'award' | 'users' | 'code' | 'briefcase'; title: string; text: string }[] = [
  { icon: 'award', title: 'IBM, Microsoft & IIT certified', text: 'Data Science, GenAI & Agentic AI programs with industry and IIT certification' },
  { icon: 'users', title: 'Live, mentor-led learning', text: 'Live online classes led by industry mentors' },
  { icon: 'code', title: 'Real projects', text: 'Hands-on, real-world and startup projects in every program' },
  { icon: 'briefcase', title: 'Specialised tracks', text: 'Programs for AI, FDE, Cloud & DevOps, Data Science and Analytics' },
]
