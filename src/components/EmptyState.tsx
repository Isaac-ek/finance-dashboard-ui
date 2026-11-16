import { SearchX } from "lucide-react";
export function EmptyState() {
  return (
    <div className="empty-state">
      <SearchX size={24} aria-hidden="true" />
      <h3>No matching transactions</h3>
      <p>
        Try a different search or clear the filters. The overview continues to
        show the whole reporting month.
      </p>
    </div>
  );
}
