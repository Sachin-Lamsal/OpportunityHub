import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function AppFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-center sm:flex-row sm:px-6 sm:text-left">
        <p className="text-xs text-slate-500">
          {APP_NAME} · Portfolio helper for students in Kathmandu
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-500">
          <Link href="/ai-suggestions" className="hover:text-slate-700">
            AI tips
          </Link>
          <Link href="/profile" className="hover:text-slate-700">
            Profile
          </Link>
        </div>
      </div>
    </footer>
  );
}
