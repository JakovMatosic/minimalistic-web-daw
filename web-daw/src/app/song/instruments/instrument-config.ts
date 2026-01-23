import { InstrumentType } from '../../audio/instrument-types';

export interface Note {
  pitch: string;
  start: number;
  duration: number;
}

export interface Pattern {
  id: string;
  name: string;
  track: { notes: Note[] };
  minOctave: number;
  maxOctave: number;
}

export interface Instrument {
  id: string;
  name: string;
  type: InstrumentType;
  patterns: Pattern[];
  volume?: number;
  detune?: number;
  decay?: number;
  reverb?: number;
}

/** Default octave ranges per instrument */
export const OCTAVE_RANGES: Record<InstrumentType, [number, number]> = {
  drum: [3, 4],
  bass: [2, 4],
  piano: [3, 6],
  ep: [3, 6],
  guitar: [3, 6],
  strings: [3, 6],
  pad: [3, 7],
  synth: [4, 6],
  distortion_guitar: [3, 6],
  trombone: [2, 5],
  choir: [3, 6]
};

/** Factory: creates a new instrument with its default pattern */
export function createInstrument(
  type: InstrumentType,
  index: number
): Instrument {
  const [minOct, maxOct] = OCTAVE_RANGES[type];

  return {
    id: `${type}-${index}`,
    name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${index}`,
    type,
    volume: 80,
    detune: 0,
    decay: 50,
    reverb: 0,
    patterns: [
      {
        id: 'p1',
        name: type === 'drum' ? 'Beat 1' : 'Pattern 1',
        track: { notes: [] },
        minOctave: minOct,
        maxOctave: maxOct
      }
    ]
  };
}
