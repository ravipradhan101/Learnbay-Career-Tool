// Fixed eligibility question banks (no AI): 50 questions per program area, 10 drawn at random per attempt.
// SERVER ONLY: correct answers must never be sent to the browser.

export type Topic = 'Aptitude' | 'Full form' | 'Concept' | 'Tools'

/** [topic, question, [correct, wrong, wrong, wrong]]. The FIRST option is always the correct one; options are shuffled per learner. */
export type BankItem = [Topic, string, [string, string, string, string]]
