"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export type ComboboxOption = {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onChange: (value: string) => void
  onInputChange?: (value: string) => void;
  placeholder?: string
  searchPlaceholder?: string
  emptyPlaceholder?: string
  className?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  onInputChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyPlaceholder = "No options found.",
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  
  // To manage the text inside the input
  const [inputValue, setInputValue] = React.useState(value || '');

  React.useEffect(() => {
    // Sync input with external value changes
    setInputValue(value || '');
  }, [value]);

  const handleSelect = (currentValue: string) => {
    // currentValue is the `value` from the `options` prop
    const selectedOption = options.find(o => o.value.toLowerCase() === currentValue.toLowerCase());
    const finalValue = selectedOption ? selectedOption.label : currentValue;
    
    onChange(finalValue);
    setInputValue(finalValue);
    setOpen(false)
  }
  
  const handleInputChange = (search: string) => {
    setInputValue(search);
    if(onInputChange) {
        onInputChange(search);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      const exactMatch = options.find(o => o.label.toLowerCase() === inputValue.toLowerCase());
      if (exactMatch) {
         handleSelect(exactMatch.value);
      } else {
         handleSelect(inputValue);
      }
    }
  }


  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          <span className="truncate">
            {value
              ? options.find((option) => option.label.toLowerCase() === value.toLowerCase())?.label ?? value
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command
           onKeyDown={handleKeyDown}
           filter={(value, search) => {
            const option = options.find(o => o.value.toLowerCase() === value.toLowerCase());
            if (option?.label.toLowerCase().includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          <CommandInput 
            placeholder={searchPlaceholder} 
            value={inputValue}
            onValueChange={handleInputChange}
          />
          <CommandList>
            <CommandEmpty>{emptyPlaceholder}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => handleSelect(currentValue)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value && value.toLowerCase() === option.label.toLowerCase() ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}