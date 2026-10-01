import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { getLanguage, LANG_COOKIE } from '@/lib/i18n'
import { ReportPage, reportMetadata } from '@/components/UpscReportPage'

export const revalidate = false

type Props = { params: { week: string }; searchParams?: { lang?: string } }

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  return reportMetadata('weekly', params.week, getLanguage(cookies().get(LANG_COOKIE)?.value, searchParams?.lang))
}

export default async function Page({ params, searchParams }: Props) {
  return <ReportPage kind="weekly" periodKey={params.week} lang={getLanguage(cookies().get(LANG_COOKIE)?.value, searchParams?.lang)} />
}
