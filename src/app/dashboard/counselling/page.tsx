import { redirect } from 'next/navigation'

// AI counselling is now the counsellor chat itself.
export default function Page() {
  redirect('/dashboard')
}
