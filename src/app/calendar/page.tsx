'use client';

import * as React from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CalendarPage() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());

  return (
    <MainLayout>
      <div className="w-full max-w-md px-4 flex flex-col gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Calendar Test Page</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
            />
            <p className="text-sm text-muted-foreground">
              Selected Date: {date ? date.toLocaleDateString() : 'None'}
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
