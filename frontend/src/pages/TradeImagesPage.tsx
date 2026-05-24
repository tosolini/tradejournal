import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ImageAnnotationEditor } from "../components/ImageAnnotationEditor";
import { TradeDetail, api, fetchTradeImageBlobUrl } from "../lib/api";

export function TradeImagesPage() {
  const params = useParams<{ tradeId: string }>();
  const tradeId = Number(params.tradeId || 0);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<number, string>>({});
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["trade-detail", tradeId],
    queryFn: () => api<TradeDetail>(`/api/trades/${tradeId}`),
    enabled: tradeId > 0,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error("Nessun file selezionato");
      }
      const token = localStorage.getItem("token");
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:18000"}/api/uploads/trade/${tradeId}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trade-detail", tradeId] });
      setFile(null);
      setError(null);
      setMessage("Immagine caricata.");
    },
    onError: () => {
      setMessage(null);
      setError("Upload immagine non riuscito.");
    },
  });

  useEffect(() => {
    const previousUrls = Object.values(thumbnailUrls);
    let cancelled = false;

    const loadThumbnails = async () => {
      if (!data?.images?.length) {
        setThumbnailUrls({});
        return;
      }

      const entries = await Promise.all(
        data.images.map(async (image) => {
          const variant = image.annotated_path ? "annotated" : "original";
          try {
            const url = await fetchTradeImageBlobUrl(image.id, variant);
            return [image.id, url] as const;
          } catch {
            return [image.id, ""] as const;
          }
        })
      );

      if (cancelled) {
        for (const [, url] of entries) {
          if (url) {
            URL.revokeObjectURL(url);
          }
        }
        return;
      }

      const next: Record<number, string> = {};
      for (const [id, url] of entries) {
        if (url) {
          next[id] = url;
        }
      }
      setThumbnailUrls(next);

      for (const url of previousUrls) {
        URL.revokeObjectURL(url);
      }
    };

    loadThumbnails();

    return () => {
      cancelled = true;
    };
  }, [data?.images]);

  useEffect(() => {
    if (!data?.images?.length) {
      setSelectedImageId(null);
      setSelectedImageUrl(null);
      return;
    }
    if (selectedImageId === null) {
      setSelectedImageId(data.images[0].id);
    }
  }, [data?.images, selectedImageId]);

  const selectedImage = useMemo(
    () => data?.images.find((image) => image.id === selectedImageId) ?? null,
    [data?.images, selectedImageId]
  );

  useEffect(() => {
    let revoked = false;
    let currentUrl: string | null = null;

    const load = async () => {
      if (!selectedImage) {
        setSelectedImageUrl(null);
        return;
      }
      try {
        const variant = selectedImage.annotated_path ? "annotated" : "original";
        const url = await fetchTradeImageBlobUrl(selectedImage.id, variant);
        if (revoked) {
          URL.revokeObjectURL(url);
          return;
        }
        currentUrl = url;
        setSelectedImageUrl(url);
      } catch {
        setSelectedImageUrl(null);
      }
    };

    load();

    return () => {
      revoked = true;
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [selectedImage]);

  const saveAnnotated = async (blob: Blob) => {
    if (!selectedImageId) {
      throw new Error("Seleziona un'immagine prima di salvare");
    }
    const token = localStorage.getItem("token");
    const form = new FormData();
    form.append("file", new File([blob], `annotated-${selectedImageId}.png`, { type: "image/png" }));

    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || "http://localhost:18000"}/api/uploads/trade-images/${selectedImageId}/annotated`,
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      }
    );
    if (!response.ok) {
      throw new Error(await response.text());
    }

    await qc.invalidateQueries({ queryKey: ["trade-detail", tradeId] });
    await qc.invalidateQueries({ queryKey: ["trades"] });
  };

  if (!tradeId) {
    return <div className="text-sm text-red-400">Trade non valido.</div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Immagini Trade #{tradeId}</h1>
        <p className="text-sm text-slate-400">Carica screenshot e usa l'editor annotazioni.</p>
        <div className="mt-3">
          <Link
            to={`/trades/${tradeId}`}
            className="inline-flex rounded bg-slate-700 px-3 py-2 text-sm font-semibold text-white"
          >
            Torna alla scheda trade
          </Link>
        </div>
      </div>

      <section className="card space-y-3 p-4">
        <h2 className="text-lg font-semibold">Upload immagine</h2>
        <input
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
        />
        <button
          type="button"
          onClick={() => uploadMutation.mutate()}
          disabled={uploadMutation.isPending || !file}
          className="w-fit rounded bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950"
        >
          {uploadMutation.isPending ? "Uploading..." : "Upload"}
        </button>
        {message ? <div className="text-sm text-emerald-300">{message}</div> : null}
        {error ? <div className="text-sm text-red-400">{error}</div> : null}
      </section>

      <section className="card overflow-x-auto">
        <div className="border-b border-slate-700/80 px-4 py-3 text-lg font-semibold">Immagini registrate</div>
        {isLoading ? (
          <div className="px-4 py-3 text-sm text-slate-400">Caricamento...</div>
        ) : data?.images?.length ? (
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.images.map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={async () => {
                  if (zoomImageUrl) {
                    URL.revokeObjectURL(zoomImageUrl);
                  }
                  setSelectedImageId(image.id);
                  try {
                    const variant = image.annotated_path ? "annotated" : "original";
                    const zoomUrl = await fetchTradeImageBlobUrl(image.id, variant);
                    setZoomImageUrl(zoomUrl);
                  } catch {
                    setZoomImageUrl(null);
                  }
                }}
                className={`overflow-hidden rounded border text-left transition ${
                  selectedImageId === image.id ? "border-teal-400" : "border-slate-700"
                }`}
              >
                <div className="aspect-video bg-slate-900">
                  {thumbnailUrls[image.id] ? (
                    <img
                      src={thumbnailUrls[image.id]}
                      alt={`Trade image ${image.id}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-500">Preview non disponibile</div>
                  )}
                </div>
                <div className="px-2 py-1 text-xs text-slate-300">
                  #{image.id} {image.annotated_path ? "(annotata)" : "(originale)"}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-4 py-3 text-sm text-slate-400">Nessuna immagine.</div>
        )}
      </section>

      <section className="card p-4">
        <h2 className="mb-3 text-lg font-semibold">Editor annotazioni</h2>
        {selectedImageUrl ? (
          <ImageAnnotationEditor
            initialImageSrc={selectedImageUrl}
            onSaveAnnotated={saveAnnotated}
            showFileLoader={false}
          />
        ) : (
          <div className="text-sm text-slate-400">Seleziona un'immagine dalla galleria per iniziare.</div>
        )}
      </section>

      {zoomImageUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
          <div className="relative w-full max-w-6xl">
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(zoomImageUrl);
                setZoomImageUrl(null);
              }}
              className="absolute right-2 top-2 rounded bg-slate-800 px-3 py-2 text-sm text-white"
            >
              Chiudi
            </button>
            <img src={zoomImageUrl} alt="Zoom trade image" className="max-h-[88vh] w-full rounded object-contain" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
