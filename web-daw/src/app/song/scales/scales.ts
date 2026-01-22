import { Frequency } from "tone";

export type ScaleType = 'major' | 'minor' | 'harmonicMinor' | 'pentatonic' | 'blues';

export const SCALES: Record<ScaleType, number[]> = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
    pentatonic: [0, 3, 5, 7, 10],
    blues: [0, 3, 5, 6, 7, 10]
};

export const KEYS = [
  { label: 'C',  value: 0 },
  { label: 'C♯/D♭', value: 1 },
  { label: 'D',  value: 2 },
  { label: 'D♯/E♭', value: 3 },
  { label: 'E',  value: 4 },
  { label: 'F',  value: 5 },
  { label: 'F♯/G♭', value: 6 },
  { label: 'G',  value: 7 },
  { label: 'G♯/A♭', value: 8 },
  { label: 'A',  value: 9 },
  { label: 'A♯/B♭', value: 10 },
  { label: 'B',  value: 11 },
];


export function isPitchAllowed(
    pitch: string,
    keyRoot: number,
    scaleType: ScaleType
): boolean {
    const midi = Frequency(pitch).toMidi();

    if (typeof midi !== 'number' || Number.isNaN(midi)) {
        return false;
    }

    const pitchClass = midi % 12;
    const relative = (pitchClass - keyRoot + 12) % 12;

    return SCALES[scaleType].includes(relative);
}

