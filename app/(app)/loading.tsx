import { Card } from "@/components/ui/Card";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;
}

export default function AppLoading() {
  return (
    <div className="space-y-8">
      <div>
        <SkeletonBlock className="h-8 w-48" />
        <SkeletonBlock className="mt-2 h-4 w-72" />
      </div>
      <Card>
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="mt-3 h-4 w-4/5" />
        <SkeletonBlock className="mt-3 h-32 w-full" />
      </Card>
      <Card>
        <SkeletonBlock className="h-4 w-40" />
        <SkeletonBlock className="mt-4 h-24 w-full" />
      </Card>
    </div>
  );
}
