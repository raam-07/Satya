import { SkHeader, SkLine } from '@/components/Skeleton'

export default function Loading() {
  return (
    <div className="md:max-w-3xl md:mx-auto">
      <SkHeader />
      <div className="px-4 md:px-6 py-5">
        <div className="flex items-center gap-2 mb-3">
          <SkLine w={64} h={18} />
          <SkLine w={48} h={18} />
        </div>
        <SkLine w="90%" h={18} />
        <SkLine w="65%" h={18} className="mt-2" />
        <div className="mt-6 space-y-2">
          <SkLine w="100%" h={12} />
          <SkLine w="94%" h={12} />
          <SkLine w="70%" h={12} />
        </div>
      </div>
    </div>
  )
}
