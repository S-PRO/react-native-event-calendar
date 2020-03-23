//
// FIXME: add flow

import moment from 'moment';

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

function expand(ev, column, columns) {
  let colSpan = 1;

  for (let i = column + 1; i < columns.length; i++) {
    let col = columns[i];
    for (let j = 0; j < col.length; j++) {
      let ev1 = col[j];
      if (collision(ev, ev1)) {
        return colSpan;
      }
    }
    colSpan++;
  }

  return colSpan;
}

function pack(columns, width, calculatedEvents, dayStart, offset) {
  let colLength = columns.length;

  for (let i = 0; i < colLength; i++) {
    let col = columns[i];
    for (let j = 0; j < col.length; j++) {
      let colSpan = expand(col[j], i, columns);
      // let L = i / colLength * width;
      let L = (i / colLength) * 46;
      // let W = width * colSpan / colLength - 10
      let W = width - 16;
      calculatedEvents.push(buildEvent(col[j], L, W, dayStart, offset));
    }
  }
}

function populateEvents(events, screenWidth, dayStart, offset) {
  let lastEnd;
  let columns;
  let self = this;
  let calculatedEvents = [];

  events = events
    .map((ev, index) => ({ ...ev, index: index }))
    .sort(function(a, b) {
      if (a.start < b.start) return -1;
      if (a.start > b.start) return 1;
      if (a.end < b.end) return -1;
      if (a.end > b.end) return 1;
      return 0;
    });

  columns = [];
  lastEnd = null;

  events.forEach(function(ev, index) {
    if (lastEnd !== null && ev.start >= lastEnd) {
      pack(columns, screenWidth, calculatedEvents, dayStart, offset);
      columns = [];
      lastEnd = null;
    }

    let placed = false;
    for (let i = 0; i < columns.length; i++) {
      let col = columns[i];
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
    pack(columns, screenWidth, calculatedEvents, dayStart, offset);
  }
  return calculatedEvents;
}

const populateMultipleEvents = (
  events,
  screenWidth,
  dayStart,
  daysShownOnScreen,
  dates,
  offset,
) => {
  let preparedEvents = [];
  const gridEvents = {};

  dates.map(date => (gridEvents[date.format(DATE_FORMAT)] = []));

  events.forEach(item => {
    const key = moment(item.start, DATE_FORMAT_TIME).format(DATE_FORMAT);
    if (gridEvents[key]) {
      gridEvents[key].push(item);
    }
  });

  let gridEventsPopulated = Object.keys(gridEvents).map((key, index) => {
    return populateEvents(gridEvents[key], screenWidth, dayStart, offset);
  });

  gridEventsPopulated = gridEventsPopulated.map((col, index) => {
    col.map(event => {
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
