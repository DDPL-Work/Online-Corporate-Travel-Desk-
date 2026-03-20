import React from "react";

const SkeletonPulse = ({ className }) => (
  <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} />
);

const HotelDetailsSkeleton = () => {
  return (
    <div className="min-h-screen bg-blue-50 pb-20">
      {/* Header Skeleton */}
      <div className="bg-white border-b border-slate-200 pt-8 pb-4">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-start">
          <div className="space-y-4 w-full max-w-xl">
            <SkeletonPulse className="h-8 w-3/4" /> {/* Name */}
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <SkeletonPulse key={i} className="h-4 w-4 rounded-full" />
              ))}
            </div>
            <SkeletonPulse className="h-4 w-1/2" /> {/* Address */}
          </div>
          <SkeletonPulse className="h-10 w-32" /> {/* Back Button */}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Gallery Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 h-[400px]">
          <div className="md:col-span-2 h-full">
            <SkeletonPulse className="h-full w-full rounded-2xl" />
          </div>
          <div className="grid grid-cols-2 grid-rows-2 gap-3 md:col-span-2">
            <SkeletonPulse className="h-full w-full rounded-2xl" />
            <SkeletonPulse className="h-full w-full rounded-2xl" />
            <SkeletonPulse className="h-full w-full rounded-2xl" />
            <SkeletonPulse className="h-full w-full rounded-2xl" />
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Info Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
              <div className="flex items-center gap-3">
                <SkeletonPulse className="h-10 w-10" />
                <SkeletonPulse className="h-6 w-40" />
              </div>
              <div className="space-y-3">
                <SkeletonPulse className="h-4 w-full" />
                <SkeletonPulse className="h-4 w-full" />
                <SkeletonPulse className="h-4 w-2/3" />
              </div>
            </div>

            {/* Amenities Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
              <SkeletonPulse className="h-6 w-32" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <SkeletonPulse key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
             {/* Sticky Card Skeleton */}
             <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
                <SkeletonPulse className="h-6 w-3/4" />
                <div className="space-y-4">
                   <SkeletonPulse className="h-4 w-full" />
                   <SkeletonPulse className="h-4 w-full" />
                </div>
                <SkeletonPulse className="h-12 w-full rounded-xl" />
             </div>
          </div>
        </div>

        {/* Rooms Skeleton */}
        <div className="space-y-4">
           <SkeletonPulse className="h-8 w-48" />
           {[1, 2, 3].map((i) => (
             <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 flex gap-6">
                <SkeletonPulse className="h-40 w-60 rounded-xl" />
                <div className="flex-1 space-y-4">
                   <SkeletonPulse className="h-6 w-1/3" />
                   <SkeletonPulse className="h-4 w-full" />
                   <SkeletonPulse className="h-4 w-2/3" />
                </div>
                <div className="w-40 space-y-4">
                   <SkeletonPulse className="h-8 w-full" />
                   <SkeletonPulse className="h-12 w-full rounded-xl" />
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default HotelDetailsSkeleton;