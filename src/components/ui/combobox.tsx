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
  onInputChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyPlaceholder?: string
  className?: string
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
  const [inputValue, setInputValue] = React.useState(value || '');

  React.useEffect(() => {
    // When the external value changes, sync the input if the popover is not open.
    if (!open) {
      setInputValue(value || '');
    }
  }, [value, open]);


  const handleSelect = (currentValue: string) => {
    // currentValue is the `value` from the `options` prop, which is what we want to find.
    const selectedOption = options.find(o => o.value.toLowerCase() === currentValue.toLowerCase());
    
    // The value passed to onChange should be the `label` or the new typed value.
    const finalValue = selectedOption ? selectedOption.label : currentValue;
    
    onChange(finalValue);
    setInputValue(finalValue); // Display the selected label in the input
    setOpen(false)
  }
  
  const handleInputChange = (search: string) => {
    setInputValue(search);
    if(onInputChange) {
        onInputChange(search);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // This allows creating a new item by pressing Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      // Check if the current input value matches an existing option label
      const exactMatch = options.find(o => o.label.toLowerCase() === inputValue.toLowerCase());
      const valueToSubmit = exactMatch ? exactMatch.label : inputValue;
      
      onChange(valueToSubmit);
      setInputValue(valueToSubmit);
      setOpen(false);
    }
  }
  
  // The value displayed in the button should be the currently selected value.
  const displayValue = value
    ? options.find((option) => option.label.toLowerCase() === value.toLowerCase())?.label ?? value
    : placeholder;

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
            {displayValue}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command
           onKeyDown={handleKeyDown}
           // The filter function for CMDK works on the `value` prop of CommandItem.
           filter={(itemValue, search) => {
              const option = options.find(o => o.value.toLowerCase() === itemValue.toLowerCase());
              // We want to search by label, not by value.
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
            <CommandEmpty>
              {inputValue ? `Add "${inputValue}"` : emptyPlaceholder}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value} // CMDK uses this value for filtering and selection
                  onSelect={(currentValue) => {
                    // onSelect gives the `value` prop of the selected CommandItem
                    handleSelect(currentValue)
                  }}
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
