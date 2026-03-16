"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2 } from "lucide-react"

interface ScheduleEntry {
  id: string
  day: string
  startTime: string
  endTime: string
}

interface ScheduleBuilderProps {
  schedule: ScheduleEntry[]
  setSchedule: (schedule: ScheduleEntry[]) => void
}

export function ScheduleBuilder({ schedule, setSchedule }: ScheduleBuilderProps) {
  const [selectedDay, setSelectedDay] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const days = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"]

  const clearFieldError = (fieldName: string) => {
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
    }
  }

  const addScheduleEntry = () => {
    const errors: Record<string, string> = {}

    if (!selectedDay) {
      errors.day = "Selecione o dia"
    }
    if (!startTime) {
      errors.startTime = "Informe o horário"
    }
    if (!endTime) {
      errors.endTime = "Informe o horário"
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    const newEntry: ScheduleEntry = {
      id: Date.now().toString(),
      day: selectedDay,
      startTime,
      endTime,
    }
    setSchedule([...schedule, newEntry])
    setSelectedDay("")
    setStartTime("")
    setEndTime("")
    setFieldErrors({})
  }

  const removeScheduleEntry = (id: string) => {
    setSchedule(schedule.filter((entry) => entry.id !== id))
  }

  return (
    <div className="md-card p-5">
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-3">
            <Label htmlFor="day">Dia da Semana</Label>
            <Select value={selectedDay} onValueChange={(value) => {
              setSelectedDay(value)
              clearFieldError('day')
            }}>
              <SelectTrigger id="day" className={fieldErrors.day ? 'border-red-500 ring-red-500' : ''}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {days.map((day) => (
                  <SelectItem key={day} value={day}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.day && (
              <p className="text-sm text-red-500">{fieldErrors.day}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label htmlFor="start-time">Horário Início</Label>
            <Input
              id="start-time"
              type="time"
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value)
                clearFieldError('startTime')
              }}
              className={fieldErrors.startTime ? 'border-red-500 ring-red-500' : ''}
            />
            {fieldErrors.startTime && (
              <p className="text-sm text-red-500">{fieldErrors.startTime}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label htmlFor="end-time">Horário Fim</Label>
            <Input
              id="end-time"
              type="time"
              value={endTime}
              onChange={(e) => {
                setEndTime(e.target.value)
                clearFieldError('endTime')
              }}
              className={fieldErrors.endTime ? 'border-red-500 ring-red-500' : ''}
            />
            {fieldErrors.endTime && (
              <p className="text-sm text-red-500">{fieldErrors.endTime}</p>
            )}
          </div>
        </div>

        <Button
          onClick={addScheduleEntry}
          className="w-full md-button-contained bg-secondary"
        >
          <Plus className="h-4 w-4 mr-2" /> Adicionar Horário
        </Button>

        {schedule.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dia</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.day}</TableCell>
                    <TableCell>{entry.startTime}</TableCell>
                    <TableCell>{entry.endTime}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeScheduleEntry(entry.id)}
                        className="h-8 w-8 rounded-full text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}

