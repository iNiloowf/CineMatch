"use client";

import Image from "next/image";

type AvatarBadgeProps = {
  initials: string;
  imageUrl?: string;
  sizeClassName?: string;
  textClassName?: string;
};

export function AvatarBadge({
  initials,
  imageUrl,
  sizeClassName = "h-12 w-12",
  textClassName = "text-sm font-semibold",
}: AvatarBadgeProps) {
  if (imageUrl) {
    return (
      <div
        className={`overflow-hidden rounded-full bg-violet-100 ${sizeClassName}`}
      >
        <Image
          src={imageUrl}
          alt="Profile"
          unoptimized
          width={160}
          height={160}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-violet-100 text-violet-700 ${sizeClassName} ${textClassName}`}
    >
      {initials}
    </div>
  );
}
