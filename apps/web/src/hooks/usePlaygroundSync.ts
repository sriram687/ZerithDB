"use client";

import { useEffect, useState } from "react";
import {
  mergePlaygroundNotes,
  type PlaygroundNote,
} from "@/lib/playground-queries";

const INITIAL_NOTE: PlaygroundNote = {
  id: "seed",
  text: "Welcome! Run a query to see CRDT sync.",
  timestamp: Date.now(),
};

export function usePlaygroundSync(initialNote: PlaygroundNote = INITIAL_NOTE) {
  const [isOnline, setIsOnline] = useState(true);
  const [clientA, setClientA] = useState<PlaygroundNote[]>([initialNote]);
  const [clientB, setClientB] = useState<PlaygroundNote[]>([initialNote]);
  const [syncCount, setSyncCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [peerStatus, setPeerStatus] = useState<"connecting" | "connected" | "offline">(
    "connecting"
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setPeerStatus("connected");
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isOnline) {
      setPeerStatus("offline"); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }

    setPeerStatus("connecting");
    const timer = setTimeout(() => setPeerStatus("connected"), 600);
    return () => clearTimeout(timer);
  }, [isOnline]);

  useEffect(() => {
    if (!isOnline) return;

    const merged = mergePlaygroundNotes(clientA, clientB);
    const mergedJson = JSON.stringify(merged);
    const changedA = mergedJson !== JSON.stringify(clientA);
    const changedB = mergedJson !== JSON.stringify(clientB);

    if (changedA) setClientA(merged); // eslint-disable-line react-hooks/set-state-in-effect
    if (changedB) setClientB(merged);
    if (changedA || changedB) {
      setSyncCount((prev) => prev + 1);
      setLastSyncedAt(Date.now());
    }
  }, [clientA, clientB, isOnline]);

  const insertOnClientA = (note: PlaygroundNote) => {
    setClientA((prev) => [...prev, note]);
  };

  return {
    isOnline,
    setIsOnline,
    clientA,
    clientB,
    syncCount,
    isLoading,
    peerStatus,
    lastSyncedAt,
    insertOnClientA,
  };
}
