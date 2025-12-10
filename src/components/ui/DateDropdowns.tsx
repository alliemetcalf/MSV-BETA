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
import { Button } from "./button"
import { XIcon } from "lucide-react"

interface DateDropdownsProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  disabled?: boolean
  disabledDate?: (date: Date) => boolean
}

export function DateDropdowns({ date, setDate, disabled, disabledDate }: DateDropdownsProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 20 }, (_, i) => currentYear - 10 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  const selectedYear = date ? date.getFullYear() : undefined
  const selectedMonth = date ? date.getMonth() + 1 : undefined
  const selectedDay = date ? date.getDate() : undefined

  const daysInMonth = getDaysInMonth(new Date(selectedYear || currentYear, (selectedMonth || 1) - 1))
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const handleYearChange = (year: string) => {
    const newYear = parseInt(year)
    const newDate = new Date(date || `${newYear}-01-01T12:00:00.000Z`)
    newDate.setFullYear(newYear)

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
    
    // If no date was set, also set year and day to prevent weird defaults
    if (!date) {
        newDate.setFullYear(currentYear);
        newDate.setDate(1);
    }

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
    
    // If no date was set, also set year and month
    if (!date) {
        newDate.setFullYear(currentYear);
        newDate.setMonth(0);
    }
    
    setDate(newDate)
  }
  
  const handleClearDate = () => {
    setDate(undefined);
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedYear ? String(selectedYear) : ""}
        onValueChange={handleYearChange}
        disabled={disabled}
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
        value={selectedMonth ? String(selectedMonth) : ""}
        onValueChange={handleMonthChange}
        disabled={disabled}
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
        value={selectedDay ? String(selectedDay) : ""}
        onValueChange={handleDayChange}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Day" />
        </SelectTrigger>
        <SelectContent>
          {days.map((day) => (
            <SelectItem 
                key={day} 
                value={String(day)}
                disabled={disabledDate ? disabledDate(new Date(selectedYear || currentYear, (selectedMonth || 1) - 1, day)) : false}
            >
              {day}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {date && !disabled && (
        <Button variant="ghost" size="icon" onClick={handleClearDate} className="h-8 w-8">
            <XIcon className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}
    </div>
  )
}
