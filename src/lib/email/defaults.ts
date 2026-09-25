import type { ConditionId, TriggerId } from './catalog'

// The starter lifecycle flows. They are copied into the database once; from then on they are edited,
// paused or deleted in Admin → Emails. Changing this file does not change flows that already exist.
//
// Voice: a helpful senior colleague, not a sales rep. One idea and one button per email, value before ask,
// short subject lines without hype words, and every nudge stops as soon as the learner has done the thing.

type DefaultStep = {
  delayMinutes: number
  conditions: ConditionId[]
  subject: string
  preheader: string
  heading: string
  body: string
  ctaLabel: string
  ctaPath: string
}
type DefaultFlow = { key: string; name: string; description: string; trigger: TriggerId; reentryDays: number; exitOn: ConditionId[]; steps: DefaultStep[] }

const DAY = 1440

export const DEFAULT_FLOWS: DefaultFlow[] = [
  {
    key: 'welcome',
    name: 'Welcome & activation',
    description: 'Sent after a learner confirms their email for the first time. Gets them to finish their tools, take the eligibility test and talk to a mentor.',
    trigger: 'signup',
    reentryDays: 0,
    exitOn: [],
    steps: [
      {
        delayMinutes: 0,
        conditions: ['onboarded'],
        subject: '{{first_name}}, your Career Studio is ready',
        preheader: 'Three tools, one plan. Most people start with the 3-minute Skill Gap check.',
        heading: 'Welcome to your Career Studio, {{first_name}}',
        body: `You have just done the step most people keep postponing: getting clear on where you stand.

Here is what is waiting for you:
- **Skill Gap Analysis**: the exact skills between you and a {{target_role}} role
- **Salary Benchmark**: what the market pays for the roles you are aiming at
- **Career Roadmap**: a month-by-month plan paced to the time you actually have

Start with {{next_tool_name}}. It takes about 3 minutes, and it makes the other two sharper.`,
        ctaLabel: 'Start my {{next_tool_name}}',
        ctaPath: '{{next_tool_path}}',
      },
      {
        delayMinutes: DAY,
        conditions: ['onboarded', 'not_all_tools'],
        subject: 'The mistake most people make moving into {{program_area}}',
        preheader: "It's rarely the tools. It's the order you learn them in.",
        heading: "It's rarely the tools. It's the order.",
        body: `When professionals move into {{program_area}}, the common mistake isn't picking the wrong course. It's learning in the wrong order: tools first, fundamentals later, projects never.

Your {{next_tool_name}} fixes that. It starts from your background as a {{current_role}} and tells you what to learn first, and what you can safely skip.

You have finished {{tools_done}} of 3 tools so far. The next one takes a couple of minutes.`,
        ctaLabel: 'Continue with {{next_tool_name}}',
        ctaPath: '{{next_tool_path}}',
      },
      {
        delayMinutes: 2 * DAY,
        conditions: ['onboarded', 'no_eligibility'],
        subject: 'A 4-minute check before you choose a program',
        preheader: '10 short, easy questions. Your score straight away.',
        heading: 'Are you ready for a {{program_area}} program?',
        body: `Before you spend money or months on a program, it's worth knowing whether you're ready for it, and which track fits.

The Learnbay eligibility test is short and friendly:
- 10 short questions: simple aptitude, common full forms and {{program_area}} basics
- About 4 minutes, one question at a time
- Your score, and what it means, straight away

After you finish, a counsellor reviews your result and calls you to talk it through. No pressure and no hard sell.`,
        ctaLabel: 'Take the eligibility test',
        ctaPath: '/dashboard/eligibility',
      },
      {
        delayMinutes: 2 * DAY,
        conditions: ['onboarded', 'no_session'],
        subject: '{{first_name}}, want a second opinion on your plan?',
        preheader: 'A free 1:1 with a mentor who knows the {{program_area}} market.',
        heading: "Talk it through with someone who's done it",
        body: `AI tools are great for a first draft. A conversation is better for the decisions that matter: which role, which program, and how to fit learning around your job.

Book a free 1:1 with a Learnbay mentor and bring your reports. You'll leave with:
- A clear view of the role that suits your background
- An honest estimate of the time it will take
- Answers about program fit, domain options and projects`,
        ctaLabel: 'Pick a time',
        ctaPath: '/dashboard/sessions',
      },
      {
        delayMinutes: 5 * DAY,
        conditions: ['onboarded', 'inactive_3d', 'not_all_tools'],
        subject: 'Your plan is saved, whenever you are ready',
        preheader: 'Pick up exactly where you left off. It takes two minutes.',
        heading: 'Picking up where you left off',
        body: `Life gets busy. Your Career Studio saved everything, so you can continue in a couple of minutes.

One small step this week is enough: finish your {{next_tool_name}}. It's the piece that turns ideas into a plan you can act on.`,
        ctaLabel: 'Continue my plan',
        ctaPath: '{{next_tool_path}}',
      },
    ],
  },
  {
    key: 'welcome-back',
    name: 'Welcome back (login)',
    description: 'Sent when a returning learner signs in (at most once a week). Confirms the sign-in and points to the next best step.',
    trigger: 'login',
    reentryDays: 7,
    exitOn: [],
    steps: [
      {
        delayMinutes: 0,
        conditions: ['onboarded'],
        subject: 'Welcome back, {{first_name}}',
        preheader: 'Here is where you are, and the one thing worth doing next.',
        heading: 'Good to see you again, {{first_name}}',
        body: `You just signed in to your Learnbay Career Studio. Here is where you are:
- Reports finished: {{tools_done}} of 3
- Eligibility test: {{eligibility_status}}

Your best next step: **{{next_step_label}}**.

If this sign-in wasn't you, you can ignore this email. Nobody can sign in without the code sent to your inbox.`,
        ctaLabel: '{{next_step_label}}',
        ctaPath: '{{next_step_path}}',
      },
    ],
  },
  {
    key: 'tool-follow-up',
    name: 'After a tool report',
    description: 'The day after a learner finishes a report: nudges the next tool, or the eligibility test once all three are done.',
    trigger: 'tool_completed',
    reentryDays: 1,
    exitOn: [],
    steps: [
      {
        delayMinutes: DAY,
        conditions: ['not_all_tools'],
        subject: 'Your next piece: {{next_tool_name}}',
        preheader: 'Each tool looks at your move from a different angle.',
        heading: 'Your reports work better together',
        body: `Nice work finishing a report yesterday. Each tool answers a different question:
- Skill Gap: **what** to learn
- Salary Benchmark: **why** it's worth it
- Career Roadmap: **how** and **when**

Next up for you: {{next_tool_name}}. It reuses what you've already shared, so it's quicker than the first.`,
        ctaLabel: 'Open {{next_tool_name}}',
        ctaPath: '{{next_tool_path}}',
      },
      {
        delayMinutes: 0,
        conditions: ['all_tools', 'no_eligibility'],
        subject: 'All three reports done. One last check',
        preheader: 'See whether you are ready for a {{program_area}} program in about 4 minutes.',
        heading: 'You have the full picture, {{first_name}}',
        body: `Skill gaps, salary potential and a roadmap: you now know more about your next move than most people ever work out.

The last piece is readiness. The eligibility test takes about 4 minutes, and a counsellor then helps you pick the right track, based on your actual score.`,
        ctaLabel: 'Take the eligibility test',
        ctaPath: '/dashboard/eligibility',
      },
    ],
  },
  {
    key: 'session-booked',
    name: 'After booking a 1:1',
    description: 'Helps the learner get the most from their mentor session, then follows up.',
    trigger: 'session_booked',
    reentryDays: 14,
    exitOn: [],
    steps: [
      {
        delayMinutes: 120,
        conditions: [],
        subject: 'How to get the most from your 1:1',
        preheader: 'Three things to keep handy. It takes five minutes.',
        heading: 'Make your session count',
        body: `Your 1:1 request is in. Mentors can help most when you come with a little context. Before the call:
- Open your reports once, and note what surprised you
- Write down your real constraints: weekly time, budget, notice period
- Pick your top two questions (for example, "which role first?" or "how long, honestly?")

That's it. The rest is a conversation.`,
        ctaLabel: 'Review my reports',
        ctaPath: '/dashboard',
      },
      {
        delayMinutes: 3 * DAY,
        conditions: ['no_eligibility'],
        subject: 'After your session: one quick step',
        preheader: 'Confirm your readiness in about 4 minutes.',
        heading: 'Turn the conversation into a decision',
        body: `If your session pointed you towards a program, the eligibility test is the quickest way to confirm the right track.

It's 10 short, easy questions on aptitude and {{program_area}} basics, with your score straight away.`,
        ctaLabel: 'Take the eligibility test',
        ctaPath: '/dashboard/eligibility',
      },
    ],
  },
  {
    key: 'eligibility-done',
    name: 'After the eligibility test',
    description: 'Keeps momentum while the counsellor call is arranged.',
    trigger: 'eligibility_completed',
    reentryDays: 0,
    exitOn: [],
    steps: [
      {
        delayMinutes: DAY,
        conditions: ['no_session'],
        subject: 'Choose a time for your counsellor call',
        preheader: 'Pick a slot that suits you, so the call happens on your schedule.',
        heading: 'Your call, at a time that suits you',
        body: `Thanks for completing the eligibility test, {{first_name}}. A counsellor will reach out to talk through your result.

If you'd rather choose the time yourself, book a slot and we'll call you then.`,
        ctaLabel: 'Pick a time',
        ctaPath: '/dashboard/sessions',
      },
      {
        delayMinutes: 2 * DAY,
        conditions: ['not_all_tools'],
        subject: 'Before your counsellor call: complete your plan',
        preheader: 'Your {{next_tool_name}} makes the conversation more useful.',
        heading: 'Walk into the call with a plan',
        body: `Counsellor calls are most useful when your reports are complete. You still have {{next_tool_name}} to do. It takes a couple of minutes and uses what you've already told us.`,
        ctaLabel: 'Finish {{next_tool_name}}',
        ctaPath: '{{next_tool_path}}',
      },
    ],
  },
]
