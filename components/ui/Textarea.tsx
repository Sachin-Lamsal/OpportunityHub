import { type TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export default function Textarea({ label, id, className = "", ...props }: TextareaProps) {
  const textareaId = id ?? props.name;

  return (
    <div>
      <label htmlFor={textareaId} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <textarea
        id={textareaId}
        rows={3}
        className={`mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${className}`}
        {...props}
      />
    </div>
  );
}
