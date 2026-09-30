"use client";

import { useSyncExternalStore } from "react";
import { repository } from "./repository";

export function useDatabase() {
  return useSyncExternalStore(
    repository.subscribe,
    repository.getSnapshot,
    repository.getServerSnapshot
  );
}
