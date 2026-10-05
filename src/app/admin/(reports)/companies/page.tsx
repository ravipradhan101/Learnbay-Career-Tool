import { PageHead } from '@/components/admin/parts'
import { CompanyAdmin, type AdminCompany } from '@/components/admin/CompanyAdmin'
import { requireAdmin } from '@/lib/admin-auth'
import { query } from '@/lib/db'
import { HIRING_CATEGORIES } from '@/lib/hiring'

export const metadata = { title: 'Companies' }

/** The companies learners see in the chat ("Where Learnbay alumni work" and the full list to browse). */
export default async function CompaniesPage() {
  await requireAdmin()
  const companies = await query<AdminCompany>(`SELECT id, name, category, alumni, featured FROM hiring_companies ORDER BY featured DESC, alumni DESC, lower(name)`)
  return (
    <>
      <PageHead title="Companies" sub="Shown to learners in the chat: 15 featured names first, then the full list to search. Tick “Alumni work here” only for companies Learnbay can show its alumni work at; the counsellor describes only those that way." />
      <CompanyAdmin companies={companies} categories={HIRING_CATEGORIES} />
    </>
  )
}
