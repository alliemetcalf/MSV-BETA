"use client"

import * as React from "react"
import { getDaysInMonth } from "date-fns"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DateDropdownsProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  disabled?: (date: Date) => boolean
}

export function DateDropdowns({ date, setDate, disabled }: DateDropdownsProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 20 }, (_, i) => currentYear - 10 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  const selectedYear = date ? date.getFullYear() : currentYear
  const selectedMonth = date ? date.getMonth() + 1 : new Date().getMonth() + 1
  const selectedDay = date ? date.getDate() : new Date().getDate()

  const daysInMonth = getDaysInMonth(new Date(selectedYear, selectedMonth - 1))
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const handleYearChange = (year: string) => {
    const newYear = parseInt(year)
    const newDate = new Date(date || new Date())
    newDate.setFullYear(newYear)

    // Adjust day if it's out of bounds for the new month/year
    const newDaysInMonth = getDaysInMonth(newDate)
    if (newDate.getDate() > newDaysInMonth) {
      newDate.setDate(newDaysInMonth)
    }
    setDate(newDate)
  }

  const handleMonthChange = (month: string) => {
    const newMonth = parseInt(month) - 1
    const newDate = new Date(date || new Date())
    newDate.setMonth(newMonth)

    // Adjust day if it's out of bounds for the new month
    const newDaysInMonth = getDaysInMonth(newDate)
    if (newDate.getDate() > newDaysInMonth) {
      newDate.setDate(newDaysInMonth)
    }
    setDate(newDate)
  }

  const handleDayChange = (day: string) => {
    const newDay = parseInt(day)
    const newDate = new Date(date || new Date())
    newDate.setDate(newDay)
    setDate(newDate)
  }

  return (
    <div className="flex gap-2">
      <Select
        value={String(selectedYear)}
        onValueChange={handleYearChange}
        disabled={!!disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={String(year)}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={String(selectedMonth)}
        onValueChange={handleMonthChange}
        disabled={!!disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          {months.map((month) => (
            <SelectItem key={month} value={String(month)}>
              {new Date(0, month - 1).toLocaleString("default", {
                month: "long",
              })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={String(selectedDay)}
        onValueChange={handleDayChange}
        disabled={!!disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Day" />
        </SelectTrigger>
        <SelectContent>
          {days.map((day) => (
            <SelectItem key={day} value={String(day)}>
              {day}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
