const PROBE_DATABASE = 'meal-planner-persistence-probe';

export function persistenceIsAvailable(): boolean {
  try {
    const request = indexedDB.open(PROBE_DATABASE);
    request.onsuccess = () => {
      request.result.close();
      indexedDB.deleteDatabase(PROBE_DATABASE);
    };
    return true;
  } catch {
    return false;
  }
}
