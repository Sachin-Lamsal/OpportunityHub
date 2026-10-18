"use client";

import { startTransition, type FormEvent } from "react";

/**
 * Submits a `useActionState` action from an `onSubmit` handler instead of the
 * `<form action={...}>` prop.
 *
 * React 19 resets a form's DOM state as soon as a form action *starts*, not when
 * it succeeds (`requestFormReset(formFiber)` is called before the action runs —
 * `node_modules/react-dom/cjs/react-dom-client.development.js:8955`). With
 * uncontrolled inputs every field therefore snaps back to its `defaultValue` the
 * moment the user hits submit, so a validation error ("Add an official source
 * link before submitting") discards everything they typed.
 *
 * React explicitly supports calling the returned action inside `startTransition`
 * — "Either call the returned function inside startTransition, or pass it to an
 * `action` or `formAction` prop" (react-dom-client.development.js:8430) — which
 * keeps `isPending` accurate and never resets the form.
 *
 * The submitter button is copied into the FormData because `new FormData(form)`
 * omits it while the `action` prop includes it. Forms whose submit buttons carry
 * `name`/`value` (for example `submission_intent`) depend on this.
 */
export function useActionFormSubmit(
  action: (formData: FormData) => void,
): (event: FormEvent<HTMLFormElement>) => void {
  return (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const submitter = (event.nativeEvent as SubmitEvent).submitter as
      | HTMLButtonElement
      | HTMLInputElement
      | null;

    if (submitter && submitter.name) {
      formData.append(submitter.name, String(submitter.value ?? ""));
    }

    startTransition(() => {
      action(formData);
    });
  };
}