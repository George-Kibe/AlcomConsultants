import type { FormEvent } from "react";

/**
 * onSubmit handler that passes the form's data to `handler`. Used instead of a form
 * `action`, because React resets a form after its action runs and would wipe what the
 * visitor typed whenever there's an error to correct.
 */
export function submitWith(handler: (form: FormData) => unknown) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handler(new FormData(event.currentTarget));
  };
}
