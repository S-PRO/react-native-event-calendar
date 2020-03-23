//
// FIXME: add flow
import {
  VirtualizedList,
  View,
  TouchableOpacity,
  Image,
  Text,
} from 'react-native';
import _ from 'lodash';
import moment from 'moment';
import React from 'react';

import styleConstructor from './style';

import DayView from './DayView';

/* TYPES */
// FIXME: Detail type anotation.
// type _t_props = {
//   size?: number,
//   formatHeader?: string,
//   width: number,
//   createEvent: Function,
//   daysShownOnScreen: number,
//   virtualizedListProps?: Object,
//   events: Array<Object>,
//   initDate: string,
//   hideHeader?: boolean,
//   hideArrow?: boolean,
//   styles?: Object,
//   eventComponent?: React.Node
//   headerComponent?: React.Node
// }
// type _t_state = {
//   dates: Array<Moment>,
//   index: number
// }

const DATE_FORMAT = 'DD MMMM YYYY';

export default class EventCalendar extends React.Component {
  constructor(props) {
    super(props);

    const start = props.start ? props.start : 0;
    const end = props.end ? props.end : 24;

    this.styles = styleConstructor(props.styles, (end - start) * props.offset);
    this.state = {
      positionY: -1,
      dates: this.populateDatesHeader(moment(this.props.initDate)),
      index: this.props.size,
    };
  }

  componentDidMount() {
    if (this.props.onRef) {
      this.props.onRef(this);
    }
  }

  componentWillUnmount() {
    if (this.props.onRef) {
      this.props.onRef(undefined);
    }
  }

  componentDidUpdate(prevProps, prevState) {
    // One possible fix...
    if (prevProps.daysShownOnScreen !== this.props.daysShownOnScreen) {
      let dates = [];
      if (this.props.daysShownOnScreen === 7) {
        dates = this._getWeekDays();
      } else {
        dates = this.populateDatesHeader(moment(this.props.initDate));
      }
      this.setState(() => ({ index: this.state.index, dates }));
      this._goToDate(this.props.initDate);
    }
    if (this.props.initDate && (prevProps.initDate !== this.props.initDate)) {

      this.setState(() => ({
        index: this.props.size,
        dates: this.populateDatesHeader(moment(this.props.initDate))
      }));
      this._goToDate(this.props.initDate);
    }
  }

  _getWeekDays = (date): { [string]: Array<any> } => {
    const begin = moment(date).isoWeekday(1);
    begin.startOf('isoWeek');

    const data = [];

    for (let i = 0; i < 7; i++) {
      data.push(begin.clone());
      begin.add(1, 'd');
    }

    return data;
  };

  static defaultProps = {
    size: 30,
    daysShownOnScreen: 1,
    initDate: new Date(),
    formatHeader: DATE_FORMAT,
    offset: 100
  };

  _getItemLayout = (data, index) => {
    const { width } = this.props;
    return { length: width, offset: width * index, index };
  };

  _getItem = (events, index) => {
    const offset = (this.props.daysShownOnScreen - 1) / 2;
    const dateStart = moment(this.props.initDate).add(
      index - this.props.size - offset,
      'days'
    );
    const dateEnd = moment(this.props.initDate).add(
      index - this.props.size + offset,
      'days'
    );

    return _.filter(events, event => {
      const eventStartTime = moment(event.start);
      return (
        eventStartTime >= dateStart.clone().startOf('day') &&
        eventStartTime <= dateEnd.clone().endOf('day')
      );
    });
  };

  _renderItem = ({ index, item }) => {
    const {
      width,
      format24h,
      initDate,
      scrollToFirst = true,
      start = 0,
      end = 24,
      daysShownOnScreen,
      offset,
    } = this.props;

    const date = moment(initDate).add(index - this.props.size, 'days');
    let dates = this.populateDatesHeader(date);

    return (
      <DayView
        eventComponent={this.props.eventComponent}
        dates={dates}
        index={index}
        format24h={format24h}
        formatHeader={this.props.formatHeader}
        headerStyle={this.props.headerStyle}
        renderEvent={this.props.renderEvent}
        eventTapped={this.props.eventTapped}
        events={item}
        width={width}
        daysShownOnScreen={daysShownOnScreen}
        styles={this.styles}
        scrollToFirst={scrollToFirst}
        start={start}
        end={end}
        offset={offset}
        createEvent={this.props.createEvent}
        positionY={this.state.positionY}
        setPositionY={(position: number) => this.setState(() => ({positionY: position}))}
      />
    );
  };

  _goToPage(index) {
    if (index <= 0 || index >= this.props.size * 2) {
      return;
    }
    const date = moment(this.props.initDate).add(
      index - this.props.size,
      'days'
    );
    this.refs.calendar.scrollToIndex({ index, animated: false });
    this.setState({ index, date: this.populateDatesHeader(date) });
  }

  _goToDate(date) {
    const earliestDate = moment(this.props.initDate).subtract(
      this.props.size,
      'days'
    );
    const index = moment(date).diff(earliestDate, 'days');
    this._goToPage(index);
  }

  populateDatesHeader = date => {
    const { daysShownOnScreen } = this.props;
    const offset = (daysShownOnScreen - 1) / 2;
    const dateStart = date.clone().subtract(offset, 'd');
    const prepareDates = [];
    for (let i = 0; i < daysShownOnScreen; i++) {
      prepareDates.push(dateStart.clone());
      dateStart.add(1, 'days');
    }
    return prepareDates;
  };

  render() {
    const {
      width,
      virtualizedListProps,
      events,
      initDate,
      formatHeader,
      hideHeader,
      daysShownOnScreen,
      headerComponent,
      hideArrow,
    } = this.props;
    return (
      <View style={[this.styles.container, { width }]}>
        {!hideHeader ? (
          <View
            style={[
              this.styles.header,
              this.state.dates.length > 1 && this.styles.leftMarginHeader,
            ]}
          >
            {!hideArrow ? (
              <TouchableOpacity
                onPress={() => this._goToPage(this.state.index - 1)}
              >
                <Image
                  source={require('./back.png')}
                  style={this.styles.arrow}
                />
              </TouchableOpacity>
            ) : null}

            {this.state.dates.map(
              (date, index) =>
                headerComponent ? (
                  <View
                    key={`${index}-${date.format()}`}
                    style={this.styles.containerTextHeader}
                  >
                    {headerComponent({
                      date: date.format(formatHeader || DATE_FORMAT),
                      isActive:
                        date.format(DATE_FORMAT) ===
                        moment().format(DATE_FORMAT),
                    })}
                  </View>
                ) : (
                  <Text
                    key={`${index}-${date.format()}`}
                    style={this.styles.headerText}
                  >
                    {date.format(formatHeader || DATE_FORMAT)}
                  </Text>
                )
            )}
            {!hideArrow ? (
              <TouchableOpacity
                onPress={() => this._goToPage(this.state.index + 1)}
              >
                <Image
                  source={require('./forward.png')}
                  style={this.styles.arrow}
                />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
        <VirtualizedList
          ref="calendar"
          windowSize={2}
          initialNumToRender={2}
          initialScrollIndex={this.props.size}
          data={events}
          extraData={events}
          getItemCount={() => this.props.size * 2}
          getItem={this._getItem}
          keyExtractor={(item, index) => index.toString()}
          getItemLayout={this._getItemLayout}
          horizontal
          pagingEnabled
          renderItem={this._renderItem}
          style={{ width: width }}
          onMomentumScrollEnd={event => {
            const index = parseInt(event.nativeEvent.contentOffset.x / width);
            const date = moment(this.props.initDate).add(
              index - this.props.size,
              'days'
            );
            if (this.props.dateChanged) {
              this.props.dateChanged(date.format('YYYY-MM-DD'));
            }
            let dates = this.populateDatesHeader(date);
            this.setState(() => ({ index, dates, positionY: -1 }));
          }}
          {...virtualizedListProps}
        />
      </View>
    );
  }
}
