'use client';

import * as React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { MainLayout } from '@/components/MainLayout';

export default function CalendarPage() {
  const [date, setDate] = React.useState<Date | undefined>(undefined);

  React.useEffect(() => {
    setDate(new Date());
  }, []);

  return (
    <MainLayout>
      <div className="flex flex-col items-center gap-4">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="rounded-md border"
        />
        <p className="mt-4">
          Selected date: {date ? date.toDateString() : 'Loading...'}
        </p>
      </div>
    </MainLayout>
  );
}
