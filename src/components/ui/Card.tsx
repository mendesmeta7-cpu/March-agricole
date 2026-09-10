import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

export default function Card({
  children,
  className = "",
  hover = false,
  padding = "md",
}: CardProps) {
  const paddingStyles = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-200/90 shadow-sm ${
        hover ? "hover:border-forest-300 hover:shadow-md transition-all duration-200" : ""
      } ${paddingStyles[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
