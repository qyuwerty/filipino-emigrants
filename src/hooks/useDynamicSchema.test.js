import { describe, it, expect } from 'vitest';
import { selectBaseData } from './useDynamicSchema';

describe('selectBaseData', () => {
  it('returns CSV data when present', () => {
    const csvData = [{ id: 1 }];
    const localData = [{ id: 2 }];
    const firestoreData = [{ id: 3 }];
    const result = selectBaseData(csvData, localData, firestoreData);
    expect(result).toBe(csvData);
  });

  it('falls back to local data when CSV is empty', () => {
    const csvData = [];
    const localData = [{ id: 2 }];
    const firestoreData = [{ id: 3 }];
    const result = selectBaseData(csvData, localData, firestoreData);
    expect(result).toBe(localData);
  });

  it('falls back to Firestore data when CSV and local are empty', () => {
    const csvData = [];
    const localData = [];
    const firestoreData = [{ id: 3 }];
    const result = selectBaseData(csvData, localData, firestoreData);
    expect(result).toBe(firestoreData);
  });

  it('returns empty array when all sources empty', () => {
    const result = selectBaseData([], [], []);
    expect(result).toEqual([]);
  });
});
