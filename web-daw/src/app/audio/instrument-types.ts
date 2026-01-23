export type InstrumentType =
  | 'synth'
  | 'pad'
  | 'bass'
  | 'drum'
  | 'piano'
  | 'ep'
  | 'guitar'
  | 'strings'
  | 'distortion_guitar'
  | 'trombone'
  | 'choir';

export const INSTRUMENT_LABELS: Record<InstrumentType, string> = {
  synth: 'Synth',
  pad: 'Pad',
  bass: 'Bass',
  drum: 'Drum',
  piano: 'Piano',
  ep: 'Electric Piano',
  guitar: 'Guitar',
  strings: 'Strings',
  distortion_guitar: 'Distortion Guitar',
  trombone: 'Trombone',
  choir: 'Choir'
};
