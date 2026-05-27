type NamedRecord = {
  id: string;
  name: string;
};

export type MatchResult<T> =
  | { kind: "none"; query: string }
  | { kind: "ambiguous"; query: string; matches: T[] }
  | { kind: "match"; value: T };

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function resolveByName<T extends NamedRecord>(
  records: T[],
  query: string | undefined | null,
): MatchResult<T> {
  const trimmed = query?.trim() ?? "";
  if (!trimmed) {
    return { kind: "none", query: "" };
  }

  const normalizedQuery = normalizeSearchText(trimmed);
  const exact = records.filter((record) => normalizeSearchText(record.name) === normalizedQuery);
  if (exact.length === 1) {
    return { kind: "match", value: exact[0] };
  }
  if (exact.length > 1) {
    return { kind: "ambiguous", query: trimmed, matches: exact };
  }

  const contains = records.filter((record) =>
    normalizeSearchText(record.name).includes(normalizedQuery),
  );
  if (contains.length === 1) {
    return { kind: "match", value: contains[0] };
  }
  if (contains.length > 1) {
    return { kind: "ambiguous", query: trimmed, matches: contains };
  }

  return { kind: "none", query: trimmed };
}

export function summarizeMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) {
    return `${remaining}min`;
  }
  if (remaining === 0) {
    return `${hours}h`;
  }
  return `${hours}h${String(remaining).padStart(2, "0")}`;
}
