"use client";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <div className="flex w-full min-w-0 max-w-full items-start justify-between gap-3 sm:gap-4">
      <div className="min-w-0 flex-1 space-y-2">
        {eyebrow ? <p className="app-eyebrow">{eyebrow}</p> : null}
        <div className="space-y-2">
          <h1 className="app-page-title">{title}</h1>
          <p className="app-page-lead">{description}</p>
        </div>
      </div>
      {action ? <div className="shrink-0 self-center sm:pt-0.5">{action}</div> : null}
    </div>
  );
}
