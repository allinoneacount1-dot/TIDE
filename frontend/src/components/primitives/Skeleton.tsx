import { cn } from "@/lib/cn";

/**
 * Skeletons mirror the shape of the content they stand in for, at the same
 * dimensions, so nothing shifts when data lands. A generic grey box that gets
 * replaced by a taller table is a layout shift with extra steps.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden="true" />;
}

export function SkeletonRows({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-px", className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  );
}

export function SkeletonFigure({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden="true">
      <Skeleton className="h-2.5 w-16" />
      <Skeleton className="h-7 w-28" />
    </div>
  );
}
