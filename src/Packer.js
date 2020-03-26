// @flow
import moment from 'moment';

// TYPES
import type { Moment } from 'moment';

const DATE_FORMATS = {
  SERVER_DATE_FORMAT: 'YYYY-MM-DD',
  HHmm: 'HH:mm',
  YYYY_MM_DD__H_M_S: 'YYYY-MM-DD HH:mm:ss',
};

export const setMoment = (value?: string): Moment => {
  if (value) {
    return moment(value);
  }
  return moment();
};
/**
  used for parsing date before sending to server
 */
export const formatDateForServer = (date: Moment): ?string => {
  if (date) {
    return date.format(DATE_FORMATS.SERVER_DATE_FORMAT);
  }
  return null;
};

/**
 * used for parsing time before show user
 */
export const formatEventDate = (
  time: string,
  dateFormat: string = DATE_FORMATS.HHmm
) => moment(time, DATE_FORMATS.YYYY_MM_DD__H_M_S).format(dateFormat);

type _t_packedEvent = {
  ...Object,
  left?: number,
  top?: number,
  height?: number,
  width?: number,
};

const buildEvent = data => {
  const { column, left, width, dayStart, offset } = data;
  const columnCalculated: _t_packedEvent = { ...column };
  const startTime = setMoment(column.start);
  const endTime = column.end
    ? setMoment(column.end)
    : startTime.clone().add(1, 'hour');
  const dayStartTime = startTime
    .clone()
    .hour(dayStart)
    .minute(0);
  const diffHours = startTime.diff(dayStartTime, 'hours', true);

  columnCalculated.top = diffHours * offset;
  columnCalculated.height = endTime.diff(startTime, 'hours', true) * offset;
  columnCalculated.width = width;
  columnCalculated.left = left;

  return columnCalculated;
};

const collision = (a, b) => a.end > b.start && a.start < b.end;

const pack = data => {
  const {
    columns,
    width,
    calculatedEvents,
    dayStart,
    offset,
    defaultLeft,
    isDisplayLayers,
  } = data;
  const colLength = columns.length;

  for (let i = 0; i < colLength; i++) {
    const col = columns[i];
    for (let j = 0; j < col.length; j++) {
      const distanceBetweenBlocks = colLength > 3 ? 1 : 4;
      // you need to divide the width by the number of collisions found colLength
      // columns list of events that happen at the same time
      // distanceBetweenBlocks - the distance between blocks.
      let W =
        colLength > 1
          ? width / colLength - distanceBetweenBlocks
          : width - distanceBetweenBlocks;

      // based on the width, this is the indent from the left edge depending on the event serial number.
      // defaultLeft offset for each day.
      let L =
        defaultLeft +
        (i
          ? i * (W - distanceBetweenBlocks) + i * distanceBetweenBlocks * 2
          : 0);

      if (isDisplayLayers) {
        L = (i / colLength) * 46;
        W = width - 16;
      }

      calculatedEvents.push(
        buildEvent({
          column: col[j],
          left: L,
          width: W,
          dayStart,
          offset,
        })
      );
    }
  }
};

// sorted event conducts the layering of several events at the same time.
/**
 * sorted all events, find colision and resolve this.
 *
 * @param {*} events - list of events
 * @param {*} screenWidth - screen width
 * @param {*} dayStart - dayStart - from which time to start building events
 * @param {*} offset - distance between the clocks on the event grid
 * @param { boolean } isDisplayLayers - switching between views
 * @returns
 */
export const populateEvents = (data: {
  events: Array<Object>,
  screenWidth: number,
  dayStart: number,
  defaultLeft: number,
  offset: number,
  isDisplayLayers: boolean,
}) => {
  const {
    events,
    screenWidth,
    dayStart,
    defaultLeft,
    offset,
    isDisplayLayers,
  } = data;
  let lastEnd;
  let columns;
  const calculatedEvents = [];
  const sortedEvents = events
    .map(ev => ({ ...ev }))
    .sort((a, b) => {
      if (a.start < b.start) return -1;
      if (a.start > b.start) return 1;
      if (a.end < b.end) return -1;
      if (a.end > b.end) return 1;
      return 0;
    });

  columns = [];
  lastEnd = null;

  sortedEvents.forEach(ev => {
    if (lastEnd !== null && ev.start >= lastEnd) {
      pack({
        columns,
        width: screenWidth,
        calculatedEvents,
        dayStart,
        offset,
        defaultLeft,
        isDisplayLayers,
      });
      columns = [];
      lastEnd = null;
    }

    let placed = false;
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      if (!collision(col[col.length - 1], ev)) {
        col.push(ev);
        placed = true;
        break;
      }
    }

    if (!placed) {
      columns.push([ev]);
    }

    if (lastEnd === null || ev.end > lastEnd) {
      lastEnd = ev.end;
    }
  });

  if (columns.length > 0) {
    pack({
      columns,
      width: screenWidth,
      calculatedEvents,
      dayStart,
      offset,
      defaultLeft,
      isDisplayLayers,
    });
  }
  return calculatedEvents;
};

/**
 * Main Function count all events
 *
 * @params events
 * @params screenWidth - screen width
 * @params dayStart - from which time to start building events
 * @params daysShownOnScreen - the number of days that are displayed on the screen
 * @params dates
 * @params offset - distance between the clocks on the event grid
 */
// events breaks by days change width and left margin for each event
export const populateMultipleEvents = (data: {
  events: Array<Object>,
  screenWidth: number,
  dayStart: number,
  daysShownOnScreen: number,
  dates: Moment[],
  offset: number,
  isDisplayLayers: boolean,
}) => {
  const {
    events,
    screenWidth,
    dayStart,
    daysShownOnScreen = 1,
    dates,
    offset,
    isDisplayLayers,
  } = data;

  const preparedEvents = [];
  const gridEvents = {};

  dates.forEach(date => {
    // $FlowFixMe
    gridEvents[formatDateForServer(date)] = [];
  });

  events.forEach((item, index) => {
    const key = formatEventDate(item.start, DATE_FORMATS.SERVER_DATE_FORMAT);
    if (gridEvents[key]) {
      gridEvents[key].push({
        ...item,
        index,
      });
    }
  });

  const widthOneItem = screenWidth / daysShownOnScreen;
  const gridEventsPopulated = Object.keys(gridEvents).map((dayKey, index) =>
    populateEvents({
      events: gridEvents[dayKey],
      screenWidth: widthOneItem,
      dayStart,
      defaultLeft: widthOneItem * index,
      offset,
      isDisplayLayers,
    })
  );

  gridEventsPopulated.forEach(col => {
    col.forEach(event => {
      preparedEvents.push({
        ...event,
        width: event.width,
        left: event.left,
      });
    });
  });

  return preparedEvents;
};

export default populateMultipleEvents;
