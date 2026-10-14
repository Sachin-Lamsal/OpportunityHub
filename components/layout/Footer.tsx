import { APP_NAME } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <p className="text-sm text-slate-600">
          © {new Date().getFullYear()} {APP_NAME}. Built for students in Kathmandu.
        </p>
        <p className="text-sm text-slate-500">
          NEB · IGCSE · AS · A-Level
        </p>
      </div>
    </footer>
  );
}
