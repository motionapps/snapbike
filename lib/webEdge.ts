import { Platform } from 'react-native';

// Browser layout: content keeps 15% side margins, but scroll views still span
// the full width so their scrollbar sits at the window edge.
const EDGE = 15;
const IS_WEB = Platform.OS === 'web';

/** On a full-width container (app root, modal sheet): the side margins. */
export const webPage = IS_WEB ? { paddingHorizontal: `${EDGE}%` as const } : null;

/**
 * On a vertical ScrollView/FlatList directly inside a webPage container:
 * stretches it back over the margins. Percent margins are relative to the
 * padded parent, which is (100 - 2 * EDGE)% of the full width.
 */
export const webScroll = IS_WEB
  ? { marginHorizontal: `${(-EDGE / (100 - 2 * EDGE)) * 100}%` as const }
  : null;

/** On that scroll view's contentContainerStyle: puts the margins back. */
export const webScrollContent = IS_WEB ? { marginHorizontal: `${EDGE}%` as const } : null;

/** Full-width buttons in the browser: centered, 10% in from each side. */
export const webButton = IS_WEB ? { marginHorizontal: '10%' as const } : null;

/** Browser: cards two per row; a lone card still takes only half the row. */
const GRID_GAP = 10;
export const webGrid = IS_WEB
  ? { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: GRID_GAP }
  : { gap: GRID_GAP };
export const webHalf = IS_WEB ? { width: `calc(50% - ${GRID_GAP / 2}px)` as never } : null;
