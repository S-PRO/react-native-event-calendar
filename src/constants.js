// @flow

import { Platform } from 'react-native';

export default {
  LEFT_MARGIN: 34,
  TEXT_LINE_HEIGHT: 17,
  CALENDAR_HEIGHT_CARD: 100,
  MINIMUM_THRESHOLD: Platform.select({ android: 20, ios: 3 }),
};
