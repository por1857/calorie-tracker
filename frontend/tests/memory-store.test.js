// Prüft den MemoryStore gegen den gemeinsamen Store-Vertrag.
// Für den IndexedDB-Store (Schritt 2) kommt eine gleiche Datei dazu.

import { runStoreContract } from './store-contract.js';
import { createMemoryStore } from '../js/storage/memory-store.js';

runStoreContract('MemoryStore', (options) => createMemoryStore(options));
