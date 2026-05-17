"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import type { QueryFilter } from "zerithdb-sdk";
import { useZerith } from "./useZerith";

// Helper hook to deep-compare the filter to avoid unnecessary re-subscriptions
function useDeepCompareMemoize<T>(value: T) {
  const ref = useRef<T>(value);
  if (JSON.stringify(value) !== JSON.stringify(ref.current)) {
    ref.current = value;
  }
  return ref.current;
}

/**
 * Reactive hook to query a collection.
 * Automatically updates when local or remote (P2P) changes occur.
 * @param collectionName The name of the collection to query
 * @param filter A MongoDB-style query filter. Must be JSON-serializable.
 */
export function useQuery<T extends Record<string, any> = Record<string, any>>(
  collectionName: string,
  filter: QueryFilter<T> = {}
) {
  const app = useZerith();
  const [data, setData] = useState<(T & { _id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const memoizedFilter = useDeepCompareMemoize(filter);

  const fetchQuery = useCallback(async () => {
    try {
      const collection = app.db<T>(collectionName);
      const docs = await collection.find(memoizedFilter);
      setData(docs as (T & { _id: string })[]);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    }
  }, [app, collectionName, memoizedFilter]);

  useEffect(() => {
    fetchQuery();

    const bc = new BroadcastChannel(`zerithdb_${app.config.appId}_react`);

    const handleMutation = (event: { collection: string }) => {
      if (event.collection === collectionName) {
        fetchQuery();
        bc.postMessage({ collection: collectionName });
      }
    };
    app.dbClient.on("mutation", handleMutation);

    bc.onmessage = (event) => {
      if (event.data?.collection === collectionName) {
        fetchQuery();
      }
    };

    const handleRemoteUpdate = (event: { collectionName: string }) => {
      if (event.collectionName === collectionName) {
        fetchQuery();
      }
    };
    app.sync.on("update:remote", handleRemoteUpdate);

    return () => {
      app.dbClient.off("mutation", handleMutation);
      app.sync.off("update:remote", handleRemoteUpdate);
      bc.close();
    };
  }, [fetchQuery, app, collectionName]);

  const insert = useCallback(
    async (item: T) => {
      return app.db<T>(collectionName).insert(item);
    },
    [app, collectionName]
  );

  const remove = useCallback(
    async (id: string) => {
      // delete() takes a QueryFilter, not a raw id string
      return app.db<T>(collectionName).delete({ _id: id } as any);
    },
    [app, collectionName]
  );

  return { data, loading, error, insert, remove };
}
