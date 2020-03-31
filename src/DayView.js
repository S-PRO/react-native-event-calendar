// @flow

import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import React from 'react';
import moment from 'moment';
import _ from 'lodash';
import populateMultipleEvents from './Packer';
import CONSTANTS from './constants';

let changeTimer = null;

export const doSomethingsLater = (
  cb: () => Promise<void> | void,
  delay: number = 300
) => {
  if (changeTimer) {
    clearTimeout(changeTimer);
  }
  changeTimer = setTimeout(() => {
    if (cb) {
      cb();
    }
    changeTimer = false;
  }, delay);
};

const componentStyles = StyleSheet.create({
  positionCreateEvent: {
    height: CONSTANTS.CALENDAR_HEIGHT_CARD - 5,
    borderWidth: 3,
    borderStyle: 'solid',
    borderColor: '#ccffff',
    borderRadius: 7,
    left: CONSTANTS.LEFT_MARGIN,
    backgroundColor: '#2d50f3',
    opacity: 0.35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textCreateEvent: {
    color: '#ffffff',
    fontSize: 25,
  },
});
function range(from, to) {
  return Array.from(Array(to), (next, i) => from + i);
}

export const getHourTitle = (i: number) => {
  const timeText = moment('00:00', 'hh:mm').add(i, 'h');
  return {
    formatHour: `${timeText && timeText.format('HH')}:00`,
    formatAmPm: '',
  };
};

type _t_props = {|
  // eventComponent: undefined,
  onRefScrollView: Function,
  dates: Array<any>,
  // index: number,
  format24h: boolean,
  // formatHeader: string,
  // headerStyle: undefined,
  createEvent: (position: number) => void,
  setPositionY: (position: number) => void,
  positionY: number,
  renderEvent: Function,
  eventTapped: Function,
  events: Array<Object>,
  width: number,
  daysShownOnScreen: number,
  styles: Object,
  scrollToFirst: boolean,
  start: number,
  end: number,
  minThreshold: number,
  offset: number,
  isDisplayLayers?: boolean,
  contentOffset: { x: number, y: number },
  handleEndDrag: Function,
|};

export default class DayView extends React.PureComponent<_t_props> {
  constructor(props) {
    super(props);
    this.calendarHeight = (props.end - props.start) * props.offset;
    const width = props.width - CONSTANTS.LEFT_MARGIN;
    const packedEvents = populateMultipleEvents({
      events: props.events,
      screenWidth: width,
      dayStart: props.start,
      daysShownOnScreen: props.daysShownOnScreen,
      dates: props.dates,
      offset: props.offset,
      isDisplayLayers: props.isDisplayLayers,
    });

    this.state = {
      _scrollY: this._getFirstEventPosition(packedEvents),
      packedEvents,
    };
  }

  disableEventTouchPlusButton = false;

  _getFirstEventPosition = packedEvents => {
    // get offset for first event
    const { end, start } = this.props;
    const offset = this.calendarHeight / (end - start);
    const initPosition = _.min(_.map(packedEvents, 'top')) - offset;

    return initPosition < 0 ? 0 : initPosition;
  };

  componentDidUpdate(prev: _t_props) {
    const { events, dates } = prev;
    let { width } = this.props;
    width -= CONSTANTS.LEFT_MARGIN;
    if (
      (events?.length !== this.props.events?.length ||
        JSON.stringify(events) !== JSON.stringify(this.props.events)) &&
      dates !== this.props.dates
    ) {
      this.updatePackedEvents(
        populateMultipleEvents({
          events: this.props.events,
          screenWidth: width,
          dayStart: this.props.start,
          daysShownOnScreen: this.props.daysShownOnScreen,
          dates: this.props.dates,
          offset: this.props.offset,
          isDisplayLayers: this.props.isDisplayLayers,
        })
      );
    }
  }

  updatePackedEvents = packedEvents => {
    this.setState(
      () => ({
        _scrollY: this._getFirstEventPosition(packedEvents),
        packedEvents,
      }),
      () => {
        if (this.props.scrollToFirst) {
          this.scrollToFirst();
        }
      }
    );
  };

  componentDidMount() {
    if (this.props.scrollToFirst) {
      this.scrollToFirst();
    }
  }

  scrollToFirst() {
    setTimeout(() => {
      if (this.state && this.state._scrollY && this._scrollView) {
        this._scrollView.scrollTo({
          x: 0,
          y: this.state._scrollY,
          animated: true,
        });
      }
    }, 1);
  }

  _renderRedLine() {
    const { offset } = this.props;
    const { width, styles } = this.props;
    const timeNowHour = moment().hour();
    const timeNowMin = moment().minutes();
    return (
      <>
        <View
          key="timeNow"
          style={[
            styles.lineNow,
            {
              top:
                offset * (timeNowHour - this.props.start) +
                (offset * timeNowMin) / 60,
              width: width - 20,
            },
          ]}
        />
        <View
          key="timeNow-round"
          style={[
            styles.lineNow,
            styles.lineNowRound,
            {
              top:
                offset * (timeNowHour - this.props.start) +
                (offset * timeNowMin) / 60 -
                4,
            },
          ]}
        />
      </>
    );
  }

  _renderLines() {
    const { start, end } = this.props;
    const offset = this.calendarHeight / (end - start);

    return range(start, end + 1).map((i, index) => {
      const timeText = getHourTitle(i);

      const { width, styles } = this.props;
      return [
        <Text
          key={`timeLabel${i}`}
          style={[styles.timeLabel, { top: offset * index - 5 }]}
        >
          {i !== start ? timeText.formatHour : ''}
        </Text>,
        <Text
          key={`timeLabelAm${i}`}
          style={[styles.timeLabel, { top: offset * index + 6 }]}
        >
          {i !== start ? timeText.formatAmPm : ''}
        </Text>,
        i === start ? null : (
          <View
            key={`line${i}`}
            style={[styles.line, { top: offset * index, width: width - 20 }]}
          />
        ),
        <View
          key={`lineHalf${i}`}
          style={[
            styles.line,
            { top: offset * (index + 0.5), width: width - 20 },
          ]}
        />,
      ];
    });
  }

  _renderTimeLabels() {
    const { styles, start, end } = this.props;
    const offset = this.calendarHeight / (end - start);
    return range(start, end).map((item, i) => (
      <View key={`line${+i}`} style={[styles.line, { top: offset * i }]} />
    ));
  }

  _onEventTapped(event) {
    this.props.eventTapped(event);
  }

  _renderEvents() {
    const { styles, renderEvent } = this.props;
    const { packedEvents } = this.state;
    const events = packedEvents.map((event, i) => {
      const style = {
        left: event.left,
        height: event.height,
        // TODO: remove width because this not shown correct for users.
        // width: event.width,
        top: event.top,
      };

      const eventColor = {
        backgroundColor: event.color,
      };

      // Fixing the number of lines for the event title makes this calculation easier.
      // However it would make sense to overflow the title to a new line if needed
      const numberOfLines = Math.floor(
        event.height / CONSTANTS.TEXT_LINE_HEIGHT
      );
      const formatTime = this.props.format24h ? 'HH:mm' : 'hh:mm A';
      return (
        <TouchableOpacity
          activeOpacity={0.5}
          onPress={() => this._onEventTapped(this.props.events[event.index])}
          onPressIn={() => {
            this.disableEventTouchPlusButton = true;
            doSomethingsLater(() => {
              this.disableEventTouchPlusButton = false;
            }, 500);
          }}
          key={+i}
          style={[styles.event, style, event.color && eventColor]}
        >
          {renderEvent ? (
            renderEvent(event)
          ) : (
            <View>
              <Text numberOfLines={1} style={styles.eventTitle}>
                {event.title || 'Event'}
              </Text>
              {numberOfLines > 1 ? (
                <Text
                  numberOfLines={numberOfLines - 1}
                  style={[styles.eventSummary]}
                >
                  {event.summary || ' '}
                </Text>
              ) : null}
              {numberOfLines > 2 ? (
                <Text style={styles.eventTimes} numberOfLines={1}>
                  {moment(event.start).format(formatTime)} -{' '}
                  {moment(event.end).format(formatTime)}
                </Text>
              ) : null}
            </View>
          )}
        </TouchableOpacity>
      );
    });

    return (
      <View>
        <View style={{ marginLeft: CONSTANTS.LEFT_MARGIN }}>{events}</View>
      </View>
    );
  }

  render() {
    const {
      styles,
      offset,
      createEvent,
      setPositionY,
      positionY,
      minThreshold,
      contentOffset,
      onRefScrollView,
      handleEndDrag,
    } = this.props;
    let touchMovePositionX = 0;

    return (
      <ScrollView
        contentOffset={contentOffset}
        ref={ref => {
          this._scrollView = ref;
          if (onRefScrollView) {
            onRefScrollView(ref);
          }
        }}
        onScrollEndDrag={e => {
          if (handleEndDrag) {
            handleEndDrag(e);
          }
        }}
        contentContainerStyle={[
          styles.contentStyle,
          { width: this.props.width },
        ]}
        onTouchStart={() => {
          touchMovePositionX = 0;
        }}
        onTouchMove={() => {
          touchMovePositionX++;
        }}
        onTouchEnd={e => {
          // minimum threshold for position change
          if (
            !this.disableEventTouchPlusButton &&
            touchMovePositionX < (minThreshold || CONSTANTS.MINIMUM_THRESHOLD)
          ) {
            const { locationY } = e.nativeEvent;
            // need determine current vertical position
            //  for best experience need recalculate start position for block add event
            // offset - height of start and end time.
            let currentPositionY =
              Math.round((locationY - offset / 2) / offset) * offset;
            // new value does not go abroad
            currentPositionY =
              currentPositionY < this.calendarHeight - offset
                ? currentPositionY + 5
                : this.calendarHeight - offset;
            setPositionY(currentPositionY);
          }
        }}
      >
        {this._renderLines()}
        {this._renderEvents()}
        {this._renderRedLine()}
        {positionY > 0 && createEvent && (
          <TouchableOpacity
            style={[
              componentStyles.positionCreateEvent,
              {
                top: positionY - 2,
                width: this.props.width - (CONSTANTS.LEFT_MARGIN + 5),
              },
            ]}
            onPressIn={() => {
              createEvent(positionY / offset);
              setPositionY(-1);
            }}
          >
            <Text style={componentStyles.textCreateEvent}>+</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }
}
