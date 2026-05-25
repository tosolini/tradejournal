import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { TagInput } from "../components/TagInput";
import { api } from "../lib/api";

type NotePayload = {
  note_date: string;
  mood?: string;
  market_condition?: string;
  market_volatility?: string;
  short_summary?: string;
  rich_text?: string;
};

type DailyNote = {
  id: number;
  note_date: string;
  mood?: string | null;
  market_condition?: string | null;
  market_volatility?: string | null;
  short_summary?: string | null;
  rich_text?: string | null;
};

type UserPreferencesPayload = {
  preferences?: {
    notes?: {
      filters?: {
        searchQuery?: string;
        activeTags?: string[];
      };
    };
  };
};

type MoodValue = "up" | "down" | "stale";

const MOOD_OPTIONS: Array<{ value: MoodValue }> = [
  { value: "up" },
  { value: "down" },
  { value: "stale" },
];

const VOLATILITY_OPTIONS = [
  { value: "low" },
  { value: "medium" },
  { value: "high" },
];

const MAX_FILTER_TAGS_VISIBLE = 24;

function parseMarketConditionTags(value?: string | null): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function MoodGlyph({ mood }: { mood: MoodValue }) {
  if (mood === "up") {
    return (
      <svg viewBox="0 0 16 16" className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M2 11 6 7l3 2 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (mood === "down") {
    return (
      <svg viewBox="0 0 16 16" className="h-4 w-4 text-rose-400" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M2 5 6 9l3-2 5 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 6h12M2 10h12" strokeLinecap="round" />
    </svg>
  );
}

function moodLabel(value?: string | null, fallback = "-"): string {
  if (value === "up") {
    return "Up";
  }
  if (value === "down") {
    return "Down";
  }
  if (value === "stale") {
    return "Stale";
  }
  return fallback;
}

export function NotesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const dateFilter = searchParams.get("date") || "";
  const selectedNoteIdParam = searchParams.get("noteId");
  const selectedNoteId = selectedNoteIdParam ? Number(selectedNoteIdParam) : null;
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [marketConditionTags, setMarketConditionTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilterTags, setActiveFilterTags] = useState<string[]>([]);
  const [showAllFilterTags, setShowAllFilterTags] = useState(false);
  const [tagManagerSearch, setTagManagerSearch] = useState("");
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [preferencesHydrated, setPreferencesHydrated] = useState(false);
  const [filtersSaveState, setFiltersSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const lastSavedFiltersRef = useRef<string>("");

  const { register, handleSubmit, reset, watch, setValue } = useForm<NotePayload>({
    defaultValues: {
      note_date: new Date().toISOString().slice(0, 10),
      mood: "stale",
      market_volatility: "medium",
    },
  });

  const selectedMood = watch("mood") as MoodValue | undefined;

  const { data } = useQuery({
    queryKey: ["notes", dateFilter],
    queryFn: () => {
      if (!dateFilter) {
        return api<DailyNote[]>("/api/notes");
      }
      const params = new URLSearchParams({ from_date: dateFilter, to_date: dateFilter });
      return api<DailyNote[]>(`/api/notes?${params.toString()}`);
    },
  });

  const { data: marketConditionSuggestions = [] } = useQuery({
    queryKey: ["notes", "market-condition-suggestions"],
    queryFn: () => api<string[]>("/api/notes/suggestions/market-condition"),
  });

  const { data: userPreferences, isFetched: userPreferencesFetched } = useQuery({
    queryKey: ["user-preferences"],
    queryFn: () => api<UserPreferencesPayload>("/api/auth/preferences"),
  });

  const createNote = useMutation({
    mutationFn: (payload: NotePayload) =>
      api("/api/notes", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["notes", "market-condition-suggestions"] });
      setEditingNoteId(null);
      setMarketConditionTags([]);
      reset({ note_date: new Date().toISOString().slice(0, 10), mood: "stale", market_volatility: "medium" });
      setIsNoteModalOpen(false);
    },
  });

  const updateNote = useMutation({
    mutationFn: ({ noteId, payload }: { noteId: number; payload: NotePayload }) =>
      api(`/api/notes/${noteId}`, { method: "PUT", body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["notes", "market-condition-suggestions"] });
      setEditingNoteId(null);
      setMarketConditionTags([]);
      reset({ note_date: new Date().toISOString().slice(0, 10), mood: "stale", market_volatility: "medium" });
      setIsNoteModalOpen(false);
    },
  });

  const deleteNote = useMutation({
    mutationFn: (noteId: number) => api(`/api/notes/${noteId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["notes", "market-condition-suggestions"] });
      if (editingNoteId) {
        setEditingNoteId(null);
        setMarketConditionTags([]);
        reset({ note_date: new Date().toISOString().slice(0, 10), mood: "stale", market_volatility: "medium" });
      }
    },
  });

  const savePreferences = useMutation({
    mutationFn: (payload: UserPreferencesPayload) =>
      api<UserPreferencesPayload>("/api/auth/preferences", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
  });

  const renameTag = useMutation({
    mutationFn: ({ oldTag, newTag }: { oldTag: string; newTag: string }) =>
      api<{ ok: boolean; updated_notes: number }>("/api/notes/tags/rename", {
        method: "POST",
        body: JSON.stringify({ old_tag: oldTag, new_tag: newTag }),
      }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["notes", "market-condition-suggestions"] });
      setActiveFilterTags((current) =>
        current.map((tag) => (tag.toLowerCase() === variables.oldTag.toLowerCase() ? variables.newTag : tag))
      );
    },
  });

  const deleteTag = useMutation({
    mutationFn: (tag: string) =>
      api<{ ok: boolean; updated_notes: number }>("/api/notes/tags/delete", {
        method: "POST",
        body: JSON.stringify({ tag }),
      }),
    onSuccess: (_, deletedTag) => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["notes", "market-condition-suggestions"] });
      setActiveFilterTags((current) => current.filter((tag) => tag.toLowerCase() !== deletedTag.toLowerCase()));
    },
  });

  const onSubmit = (values: NotePayload) => {
    const payload: NotePayload = {
      ...values,
      market_condition: marketConditionTags.length ? marketConditionTags.join(", ") : undefined,
      mood: values.mood || undefined,
      market_volatility: values.market_volatility || undefined,
      short_summary: values.short_summary || undefined,
      rich_text: values.rich_text || undefined,
    };
    if (editingNoteId) {
      updateNote.mutate({ noteId: editingNoteId, payload });
      return;
    }
    createNote.mutate(payload);
  };

  const onEdit = (note: DailyNote) => {
    setEditingNoteId(note.id);
    setMarketConditionTags(parseMarketConditionTags(note.market_condition));
    reset({
      note_date: note.note_date,
      mood: (note.mood as MoodValue | undefined) || "stale",
      market_volatility: note.market_volatility || "medium",
      short_summary: note.short_summary || "",
      rich_text: note.rich_text || "",
    });
    setIsNoteModalOpen(true);
  };

  const onOpenCreateModal = () => {
    setEditingNoteId(null);
    setMarketConditionTags([]);
    reset({ note_date: new Date().toISOString().slice(0, 10), mood: "stale", market_volatility: "medium" });
    setIsNoteModalOpen(true);
  };

  const onCancelModal = () => {
    setEditingNoteId(null);
    setMarketConditionTags([]);
    reset({ note_date: new Date().toISOString().slice(0, 10), mood: "stale", market_volatility: "medium" });
    setIsNoteModalOpen(false);
  };

  const allAvailableTags = useMemo(() => {
    const source = new Set<string>();
    for (const note of data || []) {
      for (const tag of parseMarketConditionTags(note.market_condition)) {
        source.add(tag);
      }
    }
    return Array.from(source).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredNotes = useMemo(() => {
    return (data || []).filter((note) => {
      const noteTags = parseMarketConditionTags(note.market_condition);
      const hasAllSelectedTags = activeFilterTags.every((filterTag) =>
        noteTags.some((tag) => tag.toLowerCase() === filterTag.toLowerCase())
      );
      if (!hasAllSelectedTags) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableParts = [
        note.note_date,
        note.short_summary || "",
        note.rich_text || "",
        note.mood || "",
        note.market_volatility || "",
        note.market_condition || "",
      ];
      return searchableParts.join(" ").toLowerCase().includes(normalizedSearch);
    });
  }, [activeFilterTags, data, normalizedSearch]);

  const toggleFilterTag = (tag: string) => {
    setActiveFilterTags((current) =>
      current.some((existing) => existing.toLowerCase() === tag.toLowerCase())
        ? current.filter((existing) => existing.toLowerCase() !== tag.toLowerCase())
        : [...current, tag]
    );
  };

  const resetFilters = () => {
    setSearchQuery("");
    setActiveFilterTags([]);
  };

  const clearDateFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("date");
    setSearchParams(next, { replace: true });
  };

  const visibleFilterTags = useMemo(() => {
    if (showAllFilterTags) {
      return allAvailableTags;
    }
    return allAvailableTags.slice(0, MAX_FILTER_TAGS_VISIBLE);
  }, [allAvailableTags, showAllFilterTags]);

  const hiddenFilterTagsCount = Math.max(allAvailableTags.length - visibleFilterTags.length, 0);

  const filteredManagedTags = useMemo(() => {
    const query = tagManagerSearch.trim().toLowerCase();
    if (!query) {
      return allAvailableTags;
    }
    return allAvailableTags.filter((tag) => tag.toLowerCase().includes(query));
  }, [allAvailableTags, tagManagerSearch]);

  const onRenameTag = (tag: string) => {
    const nextTag = window.prompt(t("notes.rename_tag_prompt"), tag)?.trim();
    if (!nextTag || nextTag.toLowerCase() === tag.toLowerCase()) {
      return;
    }
    renameTag.mutate({ oldTag: tag, newTag: nextTag });
  };

  const onDeleteTag = (tag: string) => {
    if (!window.confirm(t("notes.delete_tag_confirm", { tag }))) {
      return;
    }
    deleteTag.mutate(tag);
  };

  useEffect(() => {
    if (!userPreferencesFetched || preferencesHydrated) {
      return;
    }
    const savedFilters = userPreferences?.preferences?.notes?.filters;
    if (savedFilters) {
      if (typeof savedFilters.searchQuery === "string") {
        setSearchQuery(savedFilters.searchQuery);
      }
      if (Array.isArray(savedFilters.activeTags)) {
        setActiveFilterTags(savedFilters.activeTags.filter((tag): tag is string => typeof tag === "string"));
      }
      lastSavedFiltersRef.current = JSON.stringify({
        searchQuery: typeof savedFilters.searchQuery === "string" ? savedFilters.searchQuery : "",
        activeTags: Array.isArray(savedFilters.activeTags)
          ? savedFilters.activeTags.filter((tag): tag is string => typeof tag === "string")
          : [],
      });
    }
    setPreferencesHydrated(true);
  }, [preferencesHydrated, userPreferences, userPreferencesFetched]);

  useEffect(() => {
    if (!preferencesHydrated) {
      return;
    }

    const nextFiltersSnapshot = JSON.stringify({
      searchQuery,
      activeTags: activeFilterTags,
    });

    if (nextFiltersSnapshot === lastSavedFiltersRef.current) {
      if (filtersSaveState !== "idle") {
        setFiltersSaveState("idle");
      }
      return;
    }

    setFiltersSaveState("saving");
    const timerId = window.setTimeout(() => {
      savePreferences.mutate({
        preferences: {
          notes: {
            filters: {
              searchQuery,
              activeTags: activeFilterTags,
            },
          },
        },
      }, {
        onSuccess: () => {
          lastSavedFiltersRef.current = nextFiltersSnapshot;
          setFiltersSaveState("saved");
        },
        onError: () => {
          setFiltersSaveState("error");
        },
      });
    }, 250);

    return () => window.clearTimeout(timerId);
  }, [activeFilterTags, filtersSaveState, preferencesHydrated, searchQuery]);

  useEffect(() => {
    if (filtersSaveState !== "saved") {
      return;
    }
    const timerId = window.setTimeout(() => setFiltersSaveState("idle"), 1200);
    return () => window.clearTimeout(timerId);
  }, [filtersSaveState]);

  useEffect(() => {
    if (searchParams.get("new") !== "1") {
      return;
    }
    setEditingNoteId(null);
    setMarketConditionTags([]);
    reset({ note_date: new Date().toISOString().slice(0, 10), mood: "stale", market_volatility: "medium" });
    setIsNoteModalOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("new");
    setSearchParams(next, { replace: true });
  }, [reset, searchParams, setSearchParams]);

  return (
    <>
      <section className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t("notes.title")}</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="rounded bg-teal-500 px-3 py-1 text-xs font-semibold text-slate-900"
            >
              {t("notes.new_note")}
            </button>
            <span className={`text-xs ${
              filtersSaveState === "error"
                ? "text-rose-300"
                : filtersSaveState === "saved"
                  ? "text-teal-300"
                  : "text-slate-400"
            }`}>
              {filtersSaveState === "saving" && t("notes.filters_saving")}
              {filtersSaveState === "saved" && t("notes.filters_saved")}
              {filtersSaveState === "error" && t("notes.filters_error")}
              {filtersSaveState === "idle" && t("notes.filters_synced")}
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-teal-500/50 hover:text-teal-200"
            >
              {t("notes.reset_filters")}
            </button>
          </div>
        </div>
        {dateFilter ? (
          <div className="mb-3 flex items-center justify-between rounded border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-sm text-teal-200">
            <span>{t("notes.active_date_filter", { date: dateFilter })}</span>
            <button
              type="button"
              onClick={clearDateFilter}
              className="rounded border border-teal-500/40 px-2 py-1 text-xs text-teal-100 hover:bg-teal-500/20"
            >
              {t("notes.remove_date_filter")}
            </button>
          </div>
        ) : null}
        <div className="mb-3 space-y-2">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("notes.search_placeholder")}
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
          />
          <div className="flex flex-wrap gap-2">
            {visibleFilterTags.map((tag) => {
              const isActive = activeFilterTags.some((activeTag) => activeTag.toLowerCase() === tag.toLowerCase());
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleFilterTag(tag)}
                  className={`rounded-full border px-2 py-1 text-xs ${
                    isActive
                      ? "border-teal-400 bg-teal-500/20 text-teal-200"
                      : "border-slate-600 bg-slate-900 text-slate-300 hover:border-teal-500/50 hover:text-teal-200"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
            {allAvailableTags.length === 0 ? <span className="text-xs text-slate-500">{t("notes.no_tags_available")}</span> : null}
            {hiddenFilterTagsCount > 0 ? (
              <button
                type="button"
                onClick={() => setShowAllFilterTags(true)}
                className="rounded-full border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-300 hover:border-teal-500/50 hover:text-teal-200"
              >
                +{hiddenFilterTagsCount} altri
              </button>
            ) : null}
            {showAllFilterTags && allAvailableTags.length > MAX_FILTER_TAGS_VISIBLE ? (
              <button
                type="button"
                onClick={() => setShowAllFilterTags(false)}
                className="rounded-full border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-300 hover:border-teal-500/50 hover:text-teal-200"
              >
                {t("notes.show_less")}
              </button>
            ) : null}
          </div>
        </div>
        <details className="mb-3 rounded border border-slate-700/70 bg-slate-900/40 px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-slate-200">{t("notes.tag_management")}</summary>
          <div className="mt-3 space-y-2">
            <input
              value={tagManagerSearch}
              onChange={(event) => setTagManagerSearch(event.target.value)}
              placeholder={t("notes.tag_management_search")}
              className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
            />
            <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
              {filteredManagedTags.map((tag) => (
                <div key={`manage-${tag}`} className="flex items-center justify-between gap-2 rounded border border-slate-700 px-2 py-1">
                  <span className="truncate text-sm text-slate-200">{tag}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => onRenameTag(tag)}
                      className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-teal-500/50 hover:text-teal-200"
                    >
                      {t("notes.rename")}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTag(tag)}
                      className="rounded border border-rose-500/40 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10"
                    >
                      {t("notes.delete")}
                    </button>
                  </div>
                </div>
              ))}
              {filteredManagedTags.length === 0 ? <div className="text-xs text-slate-500">{t("notes.no_tag_found")}</div> : null}
            </div>
          </div>
        </details>
        <div className="space-y-3">
          {filteredNotes.map((note) => (
            <article
              key={note.id}
              className={`rounded border p-3 ${
                selectedNoteId === note.id
                  ? "border-teal-400 bg-teal-500/10"
                  : "border-slate-700 bg-slate-900/40"
              }`}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="text-sm text-slate-400">{note.note_date} - {note.short_summary || t("notes.no_summary")}</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(note)}
                    className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-teal-500/50 hover:text-teal-200"
                  >
                    {t("notes.edit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(t("notes.delete_note_confirm"))) {
                        deleteNote.mutate(note.id);
                      }
                    }}
                    className="rounded border border-rose-500/40 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10"
                  >
                    {t("notes.delete")}
                  </button>
                </div>
              </div>

              <div className="grid gap-2 text-sm md:grid-cols-2">
                <div className="rounded border border-slate-700/70 bg-slate-900/60 px-2 py-1">
                  <div className="text-xs uppercase tracking-wide text-slate-500">{t("notes.mood")}</div>
                  <div className="mt-1 flex items-center gap-2 text-slate-200">
                    {note.mood === "up" || note.mood === "down" || note.mood === "stale" ? (
                      <MoodGlyph mood={note.mood} />
                    ) : null}
                    <span>{t(`notes.mood_${(note.mood || "").toLowerCase()}`, { defaultValue: moodLabel(note.mood) })}</span>
                  </div>
                </div>
                <div className="rounded border border-slate-700/70 bg-slate-900/60 px-2 py-1">
                  <div className="text-xs uppercase tracking-wide text-slate-500">{t("notes.volatility")}</div>
                  <div className="mt-1 text-slate-200">{note.market_volatility || "-"}</div>
                </div>
                <div className="rounded border border-slate-700/70 bg-slate-900/60 px-2 py-1 md:col-span-2">
                  <div className="text-xs uppercase tracking-wide text-slate-500">{t("notes.market_condition_tags")}</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {parseMarketConditionTags(note.market_condition).length > 0 ? (
                      parseMarketConditionTags(note.market_condition).map((tag) => (
                        <button
                          key={`${note.id}-${tag}`}
                          type="button"
                          onClick={() => toggleFilterTag(tag)}
                          className="rounded-full border border-teal-500/40 bg-teal-500/15 px-2 py-0.5 text-xs text-teal-200"
                        >
                          {tag}
                        </button>
                      ))
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>
                </div>
                {/* <div className="rounded border border-slate-700/70 bg-slate-900/60 px-2 py-1 md:col-span-2">
                  <div className="text-xs uppercase tracking-wide text-slate-500">{t("notes.short_summary")}</div>
                  <div className="mt-1 font-medium text-teal-200">{note.short_summary || t("notes.no_summary")}</div>
                </div> */}
                <div className="rounded border border-slate-700/70 bg-slate-900/60 px-2 py-1 md:col-span-2">
                  <div className="text-xs uppercase tracking-wide text-slate-500">{t("notes.notes")}</div>
                  <div className="mt-1 whitespace-pre-wrap text-slate-300">{note.rich_text || t("notes.no_details")}</div>
                </div>
              </div>
            </article>
          ))}
          {data && data.length === 0 ? <div className="text-sm text-slate-400">{t("notes.no_notes_yet")}</div> : null}
          {data && data.length > 0 && filteredNotes.length === 0 ? (
            <div className="text-sm text-slate-400">{t("notes.no_notes_match")}</div>
          ) : null}
        </div>
      </section>

      {isNoteModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-100">{editingNoteId ? t("notes.edit_note") : t("notes.new_note")}</h2>
              <button
                type="button"
                onClick={onCancelModal}
                className="rounded bg-slate-700 px-3 py-2 text-sm font-semibold text-slate-200"
              >
                {t("common.close")}
              </button>
            </div>

            <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
              <input type="hidden" {...register("mood")} />
              <input type="date" {...register("note_date")} className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2" />
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-wide text-slate-400">{t("notes.mood")}</label>
                <div className="grid grid-cols-3 gap-2">
                  {MOOD_OPTIONS.map((option) => {
                    const isSelected = selectedMood === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setValue("mood", option.value, { shouldDirty: true })}
                        className={`flex items-center justify-center gap-2 rounded border px-3 py-2 text-sm ${
                          isSelected
                            ? "border-teal-400 bg-teal-500/15 text-teal-200"
                            : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
                        }`}
                      >
                        <MoodGlyph mood={option.value} />
                        {t(`notes.mood_${option.value}`)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <TagInput
                label={t("notes.market_condition")}
                placeholder={t("notes.tag_input_placeholder")}
                value={marketConditionTags}
                suggestions={marketConditionSuggestions}
                onChange={setMarketConditionTags}
              />
              <select
                {...register("market_volatility")}
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
              >
                {VOLATILITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t("notes.volatility")}: {t(`notes.volatility_${option.value}`)}
                  </option>
                ))}
              </select>
              <input {...register("short_summary")} placeholder={t("notes.short_summary")} className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2" />
              <textarea {...register("rich_text")} rows={6} placeholder={t("notes.notes")} className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2" />

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onCancelModal}
                  className="rounded border border-slate-600 px-3 py-2 text-sm text-slate-300"
                >
                  {t("common.cancel")}
                </button>
                <button className="rounded bg-teal-500 px-3 py-2 text-sm font-semibold text-slate-900">
                  {editingNoteId ? t("notes.update_note") : t("notes.save_note")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
