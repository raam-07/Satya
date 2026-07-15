import { SkLine } from '@/components/Skeleton'

export default function Loading() {
  return (
    <div className="md:max-w-2xl md:mx-auto px-4 py-8">
      <SkLine w={100} h={10} />
      <div className="border rounded-sm bg-[var(--surface)] overflow-hidden mt-6" style={{ borderColor: 'var(--border-md)' }}>
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: 'var(--border-md)' }}>
          <SkLine w={44} h={16} />
          <SkLine w={110} h={10} />
        </div>
        <div className="sk w-full" style={{ height: 240, borderRadius: 0 }} />
        <div className="p-6">
          <SkLine w="95%" h={24} />
          <SkLine w="75%" h={24} className="mt-2" />
          <div className="mt-6 space-y-2">
            <SkLine w="100%" h={13} />
            <SkLine w="97%" h={13} />
            <SkLine w="90%" h={13} />
            <SkLine w="55%" h={13} />
          </div>
        </div>
      </div>
    </div>
  )
}
