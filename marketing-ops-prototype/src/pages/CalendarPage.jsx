import { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Calendar, Clock, Globe } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

const CalendarPage = () => {
  const { data, loadCollections } = useData();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    loadCollections(['CONTENT_CALENDAR', 'ASSETS']);
  }, [loadCollections]);

  const calendarItems = data.CONTENT_CALENDAR || [];
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getItemsForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return calendarItems.filter(item => item.publish_date === dateStr);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Content Calendar</h1>
        <p className="text-slate-600">Publishing schedule and content planning</p>
      </div>

      <div className="modern-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="btn-secondary"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="btn-secondary"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="btn-secondary"
            >
              Next
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-semibold text-slate-600 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {daysInMonth.map((day) => {
            const items = getItemsForDate(day);
            const isToday = isSameDay(day, new Date());
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[100px] p-2 rounded-lg border ${
                  isToday ? 'bg-primary-50 border-primary-300' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-primary-700' : 'text-slate-700'}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {items.slice(0, 2).map((item) => (
                    <div
                      key={item.calendar_id}
                      className="text-xs p-1 rounded bg-white border border-slate-200 truncate"
                      title={`${item.channel} - ${item.publish_time || ''}`}
                    >
                      <span className="font-semibold capitalize">{item.channel}</span>
                    </div>
                  ))}
                  {items.length > 2 && (
                    <div className="text-xs text-slate-500">+{items.length - 2} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="modern-card p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Upcoming Publications</h2>
        <div className="space-y-3">
          {calendarItems
            .filter(item => item.publish_date >= format(new Date(), 'yyyy-MM-dd'))
            .sort((a, b) => new Date(a.publish_date) - new Date(b.publish_date))
            .slice(0, 10)
            .map((item) => (
              <div key={item.calendar_id} className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-primary-600" />
                    <div>
                      <p className="font-semibold text-slate-900">
                        {format(new Date(item.publish_date), 'MMM dd, yyyy')}
                      </p>
                      <p className="text-sm text-slate-600 capitalize">{item.channel}</p>
                    </div>
                  </div>
                  <span className={`badge ${
                    item.status === 'published' ? 'badge-success' :
                    item.status === 'cancelled' ? 'badge-danger' :
                    'badge-info'
                  } capitalize`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;

