import React, { useEffect, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import Linkify from 'linkifyjs/react';
import relativeTime from 'dayjs/plugin/relativeTime';
import cronParser from 'cron-parser';
import './App.css';

dayjs.extend(relativeTime);

interface IChore {
  id: number;
  title: string;
  description?: string;
  schedule: string;
  done_at: string;
}

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    apiKey: process.env.REACT_APP_API_KEY,
  },
});

const App = () => {
  const [chores, setChores] = useState([] as IChore[]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const result = await apiClient.get('/chore');
      setChores(result.data);
      setIsLoading(false);
    })();
  }, []);

  const handleChore = async (id: number) => {
    if (!window.confirm('Mark this chore done?')) {
      return;
    }

    await apiClient.patch(`/chore/${id}/done`);
    const result = await apiClient.get('/chore');
    setChores(result.data);
  };

  const formatNextExecution = (date: dayjs.Dayjs) => {
    if (dayjs().isSame(date, 'day')) {
      return 'today!';
    }

    return `${date.format('D.M.YYYY')}, ${date.add(1, 'day').fromNow()}`;
  };

  const renderChores = () => {
    return chores.map(chore => {
      const { id, title, description, schedule, done_at } = chore;
      const [, , day, month, weekday] = schedule.split(' ');

      const lastExecution = dayjs(done_at)
        .startOf('day')
        .toDate();

      // Calculate next execution from the last execution.
      const parsed = cronParser.parseExpression(schedule, { currentDate: lastExecution });
      const nextExecution = dayjs(parsed.next().toString()).startOf('day');
      const isDue = dayjs().isSame(nextExecution, 'day');
      const isLate = dayjs().isAfter(nextExecution, 'day');

      const choreClasses = ['chore', ...[isDue && 'due'], ...[isLate && 'late']].filter(Boolean);

      return (
        <div key={id} className={choreClasses.join(' ')}>
          <div className="title">
            <div className="title--left">
              <code>
                {day} {month} {weekday}
              </code>
              {title}
            </div>
            <div className="title--right">
              {(isDue || isLate) && (
                <button
                  onClick={() => handleChore(id)}
                  className={`button button--${isDue ? 'due' : 'late'}`}
                >
                  {isDue ? 'Today' : 'Late'}
                </button>
              )}
            </div>
          </div>
          {description && (
            <div className="description">
              <Linkify>{description}</Linkify>
            </div>
          )}
          <div className="schedule">
            Last done{' '}
            {dayjs(done_at)
              .startOf('day')
              .format('D.M.YYYY')}{' '}
            and {isLate ? 'was' : 'is'} due {formatNextExecution(nextExecution)}
          </div>
        </div>
      );
    });
  };

  return isLoading ? (
    <div className="spinner--wrap">
      <div className="spinner">
        <div className="bounce1"></div>
        <div className="bounce2"></div>
        <div className="bounce3"></div>
      </div>
    </div>
  ) : (
    <div className="chores">{renderChores()}</div>
  );
};

export default App;
