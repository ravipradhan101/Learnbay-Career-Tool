import { getCurrentUser } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import { analyzeResume, describeLearner } from '@/lib/tools'
import { clientIp, cleanText, isSameOrigin, jsonError, jsonOk, rateLimits, readBodyCapped } from '@/lib/security'
import type { Answers } from '@/lib/questions'
import type { SkillGapResult } from '@/lib/tool-types'

export const maxDuration = 180

const MAX_BYTES = 5 * 1024 * 1024

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, 'Invalid request origin.')
  const user = await getCurrentUser()
  if (!user) return jsonError(401, 'Please sign in again.')
  if (!(await rateLimits([[`resume:user:${user.id}`, 5, 3600], [`resume:ip:${clientIp(request)}`, 10, 3600], ['resume:global', 600, 600]]))) {
    return jsonError(429, 'Too many uploads. Please try again later.')
  }

  const existing = await queryOne(`SELECT id FROM resume_analyses WHERE user_id = $1`, [user.id])
  if (existing) return jsonError(409, 'Your resume has already been reviewed. Book a counselling call for a fresh review.')

  const ctx = await queryOne<{ answers: Answers; data: SkillGapResult | null }>(
    `SELECT a.answers, t.data FROM assessments a JOIN tool_results t ON t.user_id = a.user_id
      WHERE a.user_id = $1 AND t.tool = 'skill-gap' AND t.status = 'ready'`,
    [user.id],
  )
  if (!ctx?.data) return jsonError(400, 'Run your Skill Gap Analysis first, then add your resume.')

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('multipart/form-data')) return jsonError(400, 'Please upload a PDF file.')
  // Read at most 5 MB (+ form overhead); anything larger is rejected without being buffered.
  const raw = await readBodyCapped(request, MAX_BYTES + 64_000)
  if (!raw) return jsonError(413, 'Please upload a PDF under 5 MB.')
  let form: FormData
  try {
    form = await new Response(new Uint8Array(raw), { headers: { 'content-type': contentType } }).formData()
  } catch {
    return jsonError(400, 'Please upload a PDF file.')
  }
  const file = form.get('resume')
  if (!(file instanceof File)) return jsonError(400, 'Please upload a PDF file.')
  if (file.size === 0) return jsonError(400, 'That file is empty. Please upload your resume PDF.')
  if (file.size > MAX_BYTES) return jsonError(413, 'Please upload a PDF under 5 MB.')
  const bytes = Buffer.from(await file.arrayBuffer())
  // Check the real file signature, not just the name or declared type.
  if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') return jsonError(415, 'Only PDF resumes are supported.')

  const context = `${describeLearner(ctx.answers)}
Target role: ${ctx.data.targetRole}
Key skills for the target role: ${ctx.data.skills.map((s) => s.name).join(', ')}`
  let analysis
  try {
    analysis = await analyzeResume(bytes.toString('base64'), context, user.id)
  } catch (err) {
    console.error('[resume] analysis failed', (err as Error).message)
    return jsonError(502, 'We could not read this resume. Please make sure it is a text-based PDF and try again.')
  }
  // Only the analysis is stored; the uploaded file is never written to disk or the database.
  await queryOne(
    `INSERT INTO resume_analyses (user_id, file_name, data) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO NOTHING RETURNING id`,
    [user.id, cleanText(file.name, 120) || 'resume.pdf', JSON.stringify(analysis)],
  )
  return jsonOk({ analysis })
}
