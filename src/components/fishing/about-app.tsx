import { APP_PUBLISHED, APP_VERSION, publishedLabel } from "@/lib/app-version";

export function AboutApp() {
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
      </dl>
      <p className="max-w-xl text-sm text-muted">
        This is the version on this phone. Opening the home-screen app online loads a newer one when it has been
        published.
      </p>
    </div>
  );
}
