import { ChatPanel } from '@/components/dashboard/ChatPanel'
import { queryOne } from '@/lib/db'
import { getChatHistory, getReadyDashboard } from '@/lib/data'
import { CHAT_DAILY_LIMIT, CHAT_TOTAL_LIMIT } from '@/lib/limits'
import { roleLabel, experienceLabel } from '@/lib/questions'
import { firstName } from '@/lib/validation'

export const metadata = { title: 'Ask Career AI' }

export default async function ChatPage() {
  const { user, answers, report } = await getReadyDashboard()
  const [history, usage] = await Promise.all([
    getChatHistory(user.id),
    queryOne<{ today: number; total: number }>(
      `SELECT count(*) FILTER (WHERE created_at > now() - interval '24 hours')::int AS today, count(*)::int AS total
         FROM chat_messages WHERE user_id = $1 AND role = 'user'`,
      [user.id],
    ),
  ])
  const role = roleLabel(answers)
  const exp = experienceLabel(answers)
  const background = [exp !== 'Not specified' ? exp : '', role !== 'Not specified' ? `of ${role}` : ''].filter(Boolean).join(' ')
  const suggestions = [
    `Can I become ${/^[aeiou]/i.test(report.data.recommendedPath.title) ? 'an' : 'a'} ${report.data.recommendedPath.title}${background ? ` with ${background} experience` : ''}?`,
    'What should I learn first from my roadmap?',
    'What projects should I build first?',
  ]
  return (
    <ChatPanel
      name={firstName(user.name)}
      initialConversationId={history.conversationId}
      initialMessages={history.messages}
      suggestions={suggestions}
      remainingToday={Math.max(0, CHAT_DAILY_LIMIT - (usage?.today ?? 0))}
      remainingTotal={Math.max(0, CHAT_TOTAL_LIMIT - (usage?.total ?? 0))}
    />
  )
}
