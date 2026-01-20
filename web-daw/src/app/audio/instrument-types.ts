export type InstrumentType =
  | 'synth'
  | 'pad'
  | 'bass'
  | 'pluck'
  | 'drum'
  | 'piano'
  | 'ep'
  | 'guitar'
  | 'strings';

export const INSTRUMENT_LABELS: Record<InstrumentType, string> = {
  synth: 'Synth',
  pad: 'Pad',
  bass: 'Bass',
  pluck: 'Pluck',
  drum: 'Drum',
  piano: 'Piano',
  ep: 'Electric Piano',
  guitar: 'Guitar',
  strings: 'Strings'
};
