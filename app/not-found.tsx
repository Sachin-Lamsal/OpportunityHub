import Link from "next/link";
import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium text-indigo-600">404</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-3 max-w-md text-slate-600">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button href="/dashboard">Go to dashboard</Button>
        <Button href="/" variant="outline">
          Home
        </Button>
      </div>
      <Link
        href="/opportunities"
        className="mt-4 text-sm text-indigo-600 hover:text-indigo-700"
      >
        Browse opportunities
      </Link>
    </div>
  );
}
