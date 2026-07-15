import { SkHeader, SkLine } from '@/components/Skeleton'

export default function Loading() {
  return (
    <div className="md:max-w-3xl md:mx-auto">
      <SkHeader />
      {/* Milestone timeline skeleton */}
      <div className="px-4 md:px-6 py-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3 mb-6">
            <div className="flex flex-col items-center">
              <div className="sk" style={{ width: 10, height: 10, borderRadius: '50%' }} />
              <div className="w-[2px] flex-1 mt-1 bg-[var(--border)]" />
            </div>
            <div className="flex-1">
              <SkLine w={80} h={9} />
              <SkLine w="88%" h={13} className="mt-1.5" />
              <SkLine w="60%" h={13} className="mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
