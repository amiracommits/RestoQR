'use client'

import { useRouter, useSearchParams } from 'next/navigation'

type DateRangeFiltersProps = {
  defaultFrom: string
  defaultTo: string
}

export default function DateRangeFilters({ defaultFrom, defaultTo }: DateRangeFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateDate = (key: 'from' | 'to', value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(key, value)
    router.replace(`/admin/reports/cierres?${params.toString()}`)
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[420px]">
      <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
        Desde
        <input
          type="date"
          defaultValue={defaultFrom}
          onChange={(e) => updateDate('from', e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-neutral-100 outline-none focus:border-[#E85D26] focus:ring-2 focus:ring-[#E85D26]/20"
        />
      </label>
      <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
        Hasta
        <input
          type="date"
          defaultValue={defaultTo}
          onChange={(e) => updateDate('to', e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-neutral-100 outline-none focus:border-[#E85D26] focus:ring-2 focus:ring-[#E85D26]/20"
        />
      </label>
    </div>
  )
}
