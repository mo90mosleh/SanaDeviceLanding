import { icons } from "lucide-react";

export function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = (icons as Record<string, React.ComponentType<{ className: string }>>)[name];
  if (!Cmp) return null;
  return <Cmp className={className ?? ""} />;
}
