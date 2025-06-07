import { format } from "date-fns"

import { cn } from "@/lib/class.utils"
import DateUtils from "@/lib/date.utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import inputClass from "../../helpers/ClassNameHelper"

export default function DatePickerField({
  value,
  onChange,
}: {
  value?: Date
  onChange: (date: Date | undefined) => void
}) {
  const formatted = value ? format(value, "dd/MM/yyyy") : "Pick a date"

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(inputClass, "py-6 px-10 text-gray-500")}
        >
          {formatted}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          initialFocus
          title={formatted}
          fromDate={DateUtils.minAvailableDate}
          toDate={DateUtils.maxAvailableDate}
        />
      </PopoverContent>
    </Popover>
  )
}
