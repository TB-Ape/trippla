"use client";

import { Modal } from "@/components/ui/modal";

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
  tripId?: string | null;
}

const APP_SHORTCUTS = [
  { keys: ["G", "T"], description: "Go to Trips" },
  { keys: ["G", "M"], description: "Go to Templates" },
  { keys: ["G", "B"], description: "Go to Bucket List" },
  { keys: ["?"], description: "Show / hide this help" },
];

const TRIP_SHORTCUTS = [
  { keys: ["G", "O"], description: "Overview" },
  { keys: ["G", "I"], description: "Itinerary" },
  { keys: ["G", "A"], description: "Accommodations" },
  { keys: ["G", "X"], description: "Expenses" },
  { keys: ["G", "R"], description: "Transport" },
  { keys: ["G", "P"], description: "Packing" },
  { keys: ["G", "L"], description: "Polls" },
  { keys: ["G", "S"], description: "Stages" },
];

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <tr>
      <td className="py-1.5 pr-6 whitespace-nowrap">
        {keys.map((k, i) => (
          <span key={i}>
            {i > 0 && <span className="text-gray-600 text-xs mx-1">then</span>}
            <kbd className="inline-block px-1.5 py-0.5 text-xs font-mono bg-white/10 border border-white/20 text-gray-300">
              {k}
            </kbd>
          </span>
        ))}
      </td>
      <td className="py-1.5 text-sm text-gray-400">{description}</td>
    </tr>
  );
}

export function KeyboardShortcutsHelp({ open, onClose, tripId }: KeyboardShortcutsHelpProps) {
  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-sm">
      <Modal.Header>
        <h2 className="text-sm font-bold uppercase tracking-widest text-white">Keyboard Shortcuts</h2>
      </Modal.Header>
      <Modal.Body>
        <div className="space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Navigation</p>
            <table className="w-full">
              <tbody>
                {APP_SHORTCUTS.map((s) => (
                  <ShortcutRow key={s.description} {...s} />
                ))}
              </tbody>
            </table>
          </div>
          {tripId && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">This Trip</p>
              <table className="w-full">
                <tbody>
                  {TRIP_SHORTCUTS.map((s) => (
                    <ShortcutRow key={s.description} {...s} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal.Body>
    </Modal>
  );
}
