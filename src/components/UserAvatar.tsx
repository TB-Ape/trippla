"use client";

interface UserAvatarProps {
  name: string | null;
  email: string;
  image?: string | null;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-xl",
};

export function UserAvatar({ name, email, image, size = "md" }: UserAvatarProps) {
  const initial = (name || email)[0].toUpperCase();
  const cls = sizeClasses[size];

  if (image) {
    return (
      <img
        src={image}
        alt={name || email}
        className={`${cls} rounded-full object-cover flex-shrink-0`}
      />
    );
  }

  return (
    <div className={`${cls} bg-gradient-to-br from-teal-400 via-cyan-500 to-emerald-500 rounded-full flex items-center justify-center font-bold flex-shrink-0`}>
      {initial}
    </div>
  );
}
