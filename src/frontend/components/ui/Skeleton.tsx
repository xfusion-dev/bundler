export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-white/10 ${className}`} />
  );
}

export function BundleCardSkeleton() {
  return (
    <div className="border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.03] p-5">
      <div className="flex items-center justify-between gap-8">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Skeleton className="w-12 h-12 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="w-8 h-8 rounded-full" />
          </div>
          <div className="text-right min-w-[120px]">
            <Skeleton className="h-7 w-24 mb-1 ml-auto" />
            <Skeleton className="h-4 w-16 ml-auto" />
          </div>
          <div className="text-right min-w-[100px]">
            <Skeleton className="h-4 w-20 mb-1 ml-auto" />
            <Skeleton className="h-5 w-16 ml-auto" />
          </div>
          <Skeleton className="w-6 h-6 flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}

export function BundleDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-black">
      <div className="px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="w-16 h-16" />
            <div>
              <Skeleton className="h-10 w-64 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="border border-white/10 bg-white/5 p-8">
                <Skeleton className="h-[400px] w-full" />
              </div>
              <div className="border border-white/10 bg-white/5 p-8">
                <Skeleton className="h-64 w-full" />
              </div>
            </div>

            <div className="space-y-6">
              <div className="border border-white/10 bg-white/5 p-8">
                <Skeleton className="h-96 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PortfolioSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <Skeleton className="w-12 h-12" />
              <div>
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="text-right">
              <Skeleton className="h-6 w-24 mb-1 ml-auto" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AssetCardSkeleton() {
  return (
    <div className="border border-white/10 bg-white/5 p-6">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-5 w-24 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div>
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div>
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
    </div>
  );
}
