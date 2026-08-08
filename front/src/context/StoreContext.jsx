import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from 'react';

import * as store from '../db/store';

const StoreContext =
  createContext(null);

export function StoreProvider({
  children,
}) {
  const db =
    useSyncExternalStore(
      store.subscribe,
      store.getSnapshot,
      store.getSnapshot,
    );

  useEffect(() => {
    store.bootstrap();
  }, []);

  const currentUser =
    db.currentUserId
      ? db.users[
          db.currentUserId
        ]
      : null;

  const value = {
    db,
    currentUser,
    store,
  };

  return (
    <StoreContext.Provider
      value={value}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx =
    useContext(
      StoreContext,
    );

  if (!ctx) {
    throw new Error(
      'useStore must be used within StoreProvider',
    );
  }

  return ctx;
}