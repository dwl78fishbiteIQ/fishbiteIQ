import { useState } from "react";
import { APP_PUBLISHED, APP_VERSION, publishedLabel } from "@/lib/app-version";

type UpdateCheck =
  | { state: "current" }
  | { state: "available"; version: string; published: string }
  | { state: "offline" };

export function AboutApp() {
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState<UpdateCheck | null>(null);

  async function checkForUpdate() {
    setChecking(true);
    try {
      const response = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("unavailable");
      const body = (await response.json()) as { version?: string; published?: string };
      const version = body.version?.trim() ?? "";
      const published = body.published?.trim() ?? "";
      if (version && version !== APP_VERSION) setCheck({ state: "available", version, published });
      else setCheck({ state: "current" });
    } catch {
      setCheck({ state: "offline" });
    } finally {
      setChecking(false);
    }
  }

  async function installLatest() {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration().catch(() => undefined);
      await registration?.update().catch(() => undefined);
    }
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-3xl text-fg">About FishBiteIQ</h2>
      <dl className="max-w-md rounded-xl border border-border bg-surface p-4">
        <div>
          <dt className="text-sm text-muted">Version installed</dt>
          <dd className="text-2xl text-fg">{APP_VERSION}</dd>
        </div>
        <div className="mt-4">
          <dt className="text-sm text-muted">Published</dt>
          <dd className="text-2xl text-fg">{publishedLabel(APP_PUBLISHED)}</dd>
        </div>
        <button
          type="button"
          onClick={() => void checkForUpdate()}
          disabled={checking}
          className="mt-4 h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg disabled:opacity-50"
        >
          {checking ? "Checking…" : "Check for Updates"}
        </button>
      </dl>
      <p className="max-w-xl text-sm text-muted">
        This is the version on this phone. Opening the home-screen app online loads a newer one when it has been
        published.
      </p>
      {check ? (
        <UpdateNotice
          check={check}
          onClose={() => setCheck(null)}
          onInstall={() => void installLatest()}
        />
      ) : null}
    </div>
  );
}

function UpdateNotice({
  check,
  onClose,
  onInstall,
}: {
  check: UpdateCheck;
  onClose: () => void;
  onInstall: () => void;
}) {
  const current = check.state === "current";
  const available = check.state === "available";
  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-title"
        className="w-full max-w-md space-y-3 rounded-xl border border-border bg-surface p-4"
      >
        <h2 id="update-title" className="text-2xl text-fg">
          {current ? "FishBiteIQ is up to date" : available ? "A newer version is published" : "Couldn't check"}
        </h2>
        <p className="text-sm text-fg">
          {current
            ? `Version ${APP_VERSION}, published ${publishedLabel(APP_PUBLISHED)}, is the latest.`
            : available
              ? `Version ${check.version}${check.published ? `, published ${publishedLabel(check.published)}` : ""}, is ready to install. This phone has ${APP_VERSION}.`
              : "The update check didn't finish. Try again when this phone has a signal."}
        </p>
        <div className="flex flex-wrap gap-2">
          {check.state === "offline" ? null : (
            <button
              type="button"
              onClick={onInstall}
              className="h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg"
            >
              Install latest version
            </button>
          )}
          <button type="button" onClick={onClose} className="h-11 rounded-lg border border-border px-4 text-sm text-fg">
            Close
          </button>
        </div>
      </section>
    </div>
  );
}
