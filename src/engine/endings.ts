export type EndingTier = 'triumph' | 'neutral' | 'failure';

const ENDING_TIER: Record<string, EndingTier> = {
  ending_triumph: 'triumph',
  ending_justice: 'triumph',
  ending_henry_confronts: 'triumph',
  ending_clara_ally_triumph: 'triumph',
  ending_quiet: 'neutral',
  ending_refused: 'neutral',
  ending_silence: 'neutral',
  ending_failed_accusation: 'failure',
  ending_framed_clara: 'failure',
  ending_framed_agnes: 'failure',
  ending_framed_henry: 'failure',
  ending_framed_doctor: 'failure',
  ending_clara_betrayed: 'failure',
  ending_too_late: 'failure',
  ending_murdered: 'failure',
  ending_bribed: 'failure',
};

const ENDING_TITLE: Record<string, string> = {
  ending_triumph: 'Justice in Iron',
  ending_justice: 'A Letter in His Own Hand',
  ending_henry_confronts: 'A Father\'s Verdict',
  ending_clara_ally_triumph: 'Clara Takes the Room',
  ending_quiet: 'A Packet for Cape Town',
  ending_refused: 'The Road Home',
  ending_silence: 'No Name Given',
  ending_failed_accusation: 'Laughed Out of the House',
  ending_framed_clara: 'Salford in November',
  ending_framed_agnes: 'The Thames at Wapping',
  ending_framed_henry: 'Ten Past Five',
  ending_framed_doctor: 'A Liverpool Office',
  ending_clara_betrayed: 'The Witness She Should Have Been',
  ending_too_late: 'The Constables\' Tea',
  ending_murdered: 'The East Stair',
  ending_bribed: 'Two Hundred and Fifty Guineas',
};

export function getEndingTier(id: string): EndingTier {
  return ENDING_TIER[id] || 'neutral';
}

export function getEndingTitle(id: string): string {
  return ENDING_TITLE[id] || id.replace('ending_', '').replace(/_/g, ' ');
}

export function getEndingMessage(id: string): { headline: string; subtitle: string; button: string } {
  const tier = getEndingTier(id);
  if (tier === 'triumph') {
    return {
      headline: 'An Ending Discovered',
      subtitle: 'You named the killer and the room held.',
      button: 'Begin Again',
    };
  }
  if (tier === 'neutral') {
    return {
      headline: 'An Ending Discovered',
      subtitle: 'Not every truth is told. Not every truth must be.',
      button: 'Begin Again',
    };
  }
  return {
    headline: 'This Was Not the Best Outcome',
    subtitle: 'The killer remains at liberty. There is another way through the morning.',
    button: 'Try Again',
  };
}
