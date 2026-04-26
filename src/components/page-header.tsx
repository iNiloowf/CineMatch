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
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 space-y-2.5">
        {eyebrow ? <p className="app-eyebrow">{eyebrow}</p> : null}
        <div className="space-y-1.5">
          <h1 className="app-page-title">{title}</h1>
          <p className="app-page-lead max-w-prose">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
