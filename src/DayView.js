// @flow

import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import populateEvents from './Packer';
import React from 'react';
import moment from 'moment';
import _ from 'lodash';

const LEFT_MARGIN = 35 - 1;
// const RIGHT_MARGIN = 10
const CALENDER_HEIGHT = 2400;
// const EVENT_TITLE_HEIGHT = 15
const TEXT_LINE_HEIGHT = 17;
// const MIN_EVENT_TITLE_WIDTH = 20
// const EVENT_PADDING_LEFT = 4

const CALENDAR_HEIGHT_CARD = 100;
const MINIMUM_THRESHOLD = 20;

const componentStyles = StyleSheet.create({
  positionCreateEvent: {
    height: CALENDAR_HEIGHT_CARD - 10,
    borderWidth: 3,
    borderStyle: "solid",
    borderColor: "#ccffff",
    borderRadius: 7,
    left: LEFT_MARGIN,
    backgroundColor: "#00CDCE",
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.6
  },
  textCreateEvent: {
    color: "#ffffff",
    fontSize: 25,
  }
});
function range(from, to) {
  return Array.from(Array(to), (_, i) => from + i);
}

export const getHourTitle = (i: number) => {
  const timeText = moment("00:00", "hh:mm").add(i, 'h');
  return {
    formatHour: timeText && timeText.format("hh"),
    formatAmPm: timeText && timeText.format("a")
  };
};

type _t_props = {|
  eventComponent: undefined,
  dates: Array<any>,
  index: number,
  format24h: boolean,
  formatHeader: string,
  headerStyle: undefined,
  renderEvent: Function,
  eventTapped: Function,
  events: Array<Object>,
  width: number,
  daysShownOnScreen: number,
  styles: Object,
  scrollToFirst: boolean,
  start: number,
  end: number,
  offset: number
|}

export default class DayView extends React.PureComponent<_t_props> {
  constructor(props) {
    super(props);
    this.calendarHeight = (props.end - props.start) * props.offset;
    const width = props.width - LEFT_MARGIN;
    const packedEvents = populateEvents(
      props.events,
      width,
      props.start,
      props.daysShownOnScreen,
      props.dates,
      props.offset
    );

    this.state = {
      _scrollY: this._getFirstEventPosition(packedEvents),
      packedEvents,
    };
  }

  _getFirstEventPosition = (packedEvents) => {
    // get offset for first event
    const offset = this.calendarHeight / (this.props.end - this.props.start);
    const initPosition =
    _.min(_.map(packedEvents, 'top')) - offset;

    return initPosition < 0 ? 0 : initPosition;
  }

  componentDidUpdate(prev: _t_props) {
    const {
      events, start, dates, offset, daysShownOnScreen
    } = prev;
    const width = this.props.width - LEFT_MARGIN;
    if (events?.length !== this.props.events?.length &&
        dates !== this.props.dates
    ) {
      const packedEvents = populateEvents(
        this.props.events,
        width,
        this.props.start,
        this.props.daysShownOnScreen,
        this.props.dates,
        this.props.offset
      );

      this.setState(() => ({
        _scrollY: this._getFirstEventPosition(packedEvents),
        packedEvents,
      }), () => {
        this.props.scrollToFirst && this.scrollToFirst();
      });

    }
  }

  // componentWillReceiveProps(nextProps) {
  //   const width = nextProps.width - LEFT_MARGIN;
  //   this.setState({
  //     packedEvents: populateEvents(
  //       nextProps.events,
  //       width,
  //       nextProps.start,
  //       nextProps.daysShownOnScreen,
  //       nextProps.dates,
  //       nextProps.offset
  //     ),
  //   });
  // }

  componentDidMount() {
    this.props.scrollToFirst && this.scrollToFirst();
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
    const { format24h, offset } = this.props;
    const { width, styles } = this.props;
    const timeNowHour = moment().hour();
    const timeNowMin = moment().minutes();
    return (
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
    );
  }

  _renderLines() {
    const { format24h, start, end } = this.props;
    const offset = this.calendarHeight / (end - start);

    return range(start, end + 1).map((i, index) => {
      const timeText = getHourTitle(i);

      const { width, styles } = this.props;
      return [
        <Text
          key={`timeLabel${i}`}
          style={[styles.timeLabel, { top: (offset * index) - 6 }]}
        >
          {i !== start ? timeText.formatHour : ""}
        </Text>,
        <Text
          key={`timeLabelAm${i}`}
          style={[styles.timeLabel, { top: (offset * index) + 6 }]}
        >
          {i !== start ? timeText.formatAmPm : ""}
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
      <View key={`line${i}`} style={[styles.line, { top: offset * i }]} />
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
      const numberOfLines = Math.floor(event.height / TEXT_LINE_HEIGHT);
      const formatTime = this.props.format24h ? 'HH:mm' : 'hh:mm A';
      return (
        <TouchableOpacity
          activeOpacity={0.5}
          onPress={() => this._onEventTapped(this.props.events[event.index])}
          key={i}
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
        <View style={{ marginLeft: LEFT_MARGIN }}>{events}</View>
      </View>
    );
  }

  render() {
    const { styles, offset, createEvent, setPositionY, positionY } = this.props;
    let touchMovePositionX = 0;

    return (
      <ScrollView
        ref={ref => (this._scrollView = ref)}
        contentContainerStyle={[
          styles.contentStyle,
          { width: this.props.width },
        ]}
        onTouchStart={() => { touchMovePositionX = 0; }}
        onTouchMove={() => { touchMovePositionX++; }}
        onTouchEnd={(e) => {
          // minimum threshold for position change
          if (touchMovePositionX < MINIMUM_THRESHOLD) {
            const { locationY } = e.nativeEvent;
            // need determine current vertical position
            //  for best experience need recalculate start position for block add event
            // offset - height of start and end time.
            let currentPositionY = Math.round((locationY - (offset / 2)) / offset) * offset;
            // new value does not go abroad
            currentPositionY = currentPositionY < this.calendarHeight - offset
                ? currentPositionY + 5
                : this.calendarHeight - offset;
            setPositionY(currentPositionY)
          }
        }}
      >
        {this._renderLines()}
        {this._renderEvents()}
        {this._renderRedLine()}
        {
            positionY > 0 && createEvent && (
            <TouchableOpacity
              style={[
                componentStyles.positionCreateEvent,
                {
                  top: positionY + 5,
                  width: this.props.width - (LEFT_MARGIN + 5)
                 }
              ]}
              onPressIn={() => {
                createEvent(positionY / offset);
                setPositionY(-1)
             }}
            >
              <Text
                style={componentStyles.textCreateEvent}
              >
                +
              </Text>
            </TouchableOpacity>
            )
          }
      </ScrollView>
    );
  }
}
