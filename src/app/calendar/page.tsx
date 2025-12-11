'use client';

import * as React from 'react';
import 'react-day-picker/dist/style.css';
import { Calendar } from '@/components/ui/calendar';
import { MainLayout } from '@/components/MainLayout';

export default function CalendarPage() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());

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
          Selected date: {date ? date.toDateString() : 'None'}
        </p>
      </div>
    </MainLayout>
  );
}
