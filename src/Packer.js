//
// FIXME: add flow

import moment from 'moment';
import CONSTANTS from './constants';

const DATE_FORMAT_TIME = 'YYYY-MM-DD HH:mm:ss';
const DATE_FORMAT = 'YYYY-MM-DD';

function buildEvent(column, left, width, dayStart, offset) {
  const startTime = moment(column.start);
  const endTime = column.end
    ? moment(column.end)
    : startTime.clone().add(1, 'hour');
  const dayStartTime = startTime
    .clone()
    .hour(dayStart)
    .minute(0);
  const diffHours = startTime.diff(dayStartTime, 'hours', true);

  column.top = diffHours * offset;
  column.height = endTime.diff(startTime, 'hours', true) * offset;
  column.width = width;
  column.left = left;

  return column;
}

function collision(a, b) {
  return a.end > b.start && a.start < b.end;
}

function pack(columns, width, calculatedEvents, dayStart, offset) {
  const colLength = columns.length;
  for (let i = 0; i < colLength; i++) {
    const col = columns[i];
    for (let j = 0; j < col.length; j++) {
      // const colSpan = expand(col[j], i, columns);
      // let L = i / colLength * width;

      // const L = (i / colLength) * 46;
      const distanceBetweenBlocks = colLength < 3 ? 2 : 1;

      const L = i ? width / (i + 1) + distanceBetweenBlocks : 0;
      // let W = width * colSpan / colLength - 10
      // + 160
      const W =
        colLength > 1 ? width / colLength - distanceBetweenBlocks : width;

      calculatedEvents.push(buildEvent(col[j], L, W, dayStart, offset));
    }
  }
}

/**
 * sorted all events, find colision and resolve this.
 *
 * @param {*} events - list of events
 * @param {*} screenWidth - screen width
 * @param {*} dayStart - dayStart - from which time to start building events
 * @param {*} offset - distance between the clocks on the event grid
 * @returns
 */
function populateEvents(events, screenWidth, dayStart, offset) {
  let lastEnd;
  let columns;
  const calculatedEvents = [];
  events = events
    .map((ev, index) => ({ ...ev, index }))
    .sort((a, b) => {
      if (a.start < b.start) return -1;
      if (a.start > b.start) return 1;
      if (a.end < b.end) return -1;
      if (a.end > b.end) return 1;
      return 0;
    });

  columns = [];
  lastEnd = null;
  events.forEach(ev => {
    if (lastEnd !== null && ev.start >= lastEnd) {
      pack(columns, screenWidth, calculatedEvents, dayStart, offset);
      columns = [];
      lastEnd = null;
    }

    let placed = false;
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      // if there is a conflict
      if (!collision(col[col.length - 1], ev)) {
        // TODO: rm not used
        // col.push(ev);
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
    pack(columns, screenWidth, calculatedEvents, dayStart, offset);
  }

  return calculatedEvents;
}

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
const populateMultipleEvents = (
  events,
  screenWidth,
  dayStart,
  daysShownOnScreen,
  dates,
  offset
) => {
  const preparedEvents = [];
  const gridEvents = {};

  dates.forEach(date => {
    gridEvents[date.format(DATE_FORMAT)] = [];
  });
  // We place all the events in the necessary columns, that is, by the day.
  events.forEach(item => {
    const key = moment(item.start, DATE_FORMAT_TIME).format(DATE_FORMAT);
    if (gridEvents[key]) {
      gridEvents[key].push(item);
    }
  });

  // go through the days and watch all the events for this day.
  const gridEventsPopulated = Object.keys(gridEvents).map(key =>
    populateEvents(
      gridEvents[key],
      screenWidth - CONSTANTS.LEFT_MARGIN,
      dayStart,
      offset
    )
  );

  gridEventsPopulated.forEach((col, index) => {
    col.forEach(event => {
      preparedEvents.push({
        ...event,
        width: event.width / daysShownOnScreen,
        left: (event.width / daysShownOnScreen) * index + event.left,
      });
    });
  });

  return preparedEvents;
};

export default populateMultipleEvents;
