import { useTranslation } from "react-i18next";

type Props = {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
};

export function ConfirmModal({ message, confirmLabel, onConfirm, onCancel, isPending }: Props) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <p className="mb-5 text-slate-200">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded bg-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded bg-red-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {confirmLabel ?? t("assets.delete")}
          </button>
        </div>
      </div>
    </div>
  );
}
