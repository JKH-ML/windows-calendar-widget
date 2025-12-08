import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useCalendarContext } from '../calendar-context'
import { addHours, format, set } from 'date-fns'
import { DateTimePicker } from '@/components/form/date-time-picker'
import { ColorPicker } from '@/components/form/color-picker'
import { useLanguage } from '@/components/language-provider'
import { useEffect } from 'react'

const formSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    start: z.string(),
    end: z.string(),
    color: z.string(),
    allDay: z.boolean().default(false),
    recurrence: z.string().default('none'),
    recurrenceCustom: z.string().optional(),
    location: z.string().optional(),
    alert: z.string().default('none'),
    alertOffset: z.number().optional(),
    description: z.string().optional(),
    syncStatus: z.string().optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.start)
      const end = new Date(data.end)
      return end >= start
    },
    {
      message: 'End time must be after start time',
      path: ['end'],
    }
  )

export default function CalendarNewEventDialog() {
  const {
    newEventDialogOpen,
    setNewEventDialogOpen,
    date,
    events,
    setEvents,
    api,
  } = useCalendarContext()
  const { t, resolvedLanguage } = useLanguage()

  const baseStart = set(date, { hours: 13, minutes: 0, seconds: 0, milliseconds: 0 })
  const baseEnd = addHours(baseStart, 1)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      start: format(baseStart, "yyyy-MM-dd'T'HH:mm"),
      end: format(baseEnd, "yyyy-MM-dd'T'HH:mm"),
      color: '7',
      allDay: true,
      recurrence: 'none',
      recurrenceCustom: '',
      location: '',
      alert: 'none',
      alertOffset: 0,
      description: '',
      syncStatus: 'local',
    },
  })

  // When the selected calendar date changes, refresh start/end defaults if dialog opens
  useEffect(() => {
    if (newEventDialogOpen) {
      const start = set(date, { hours: 13, minutes: 0, seconds: 0, milliseconds: 0 })
      const end = addHours(start, 1)
      form.reset({
        ...form.getValues(),
        start: format(start, "yyyy-MM-dd'T'HH:mm"),
        end: format(end, "yyyy-MM-dd'T'HH:mm"),
        allDay: true,
      })
    }
  }, [date, newEventDialogOpen, form])

  function onSubmit(values: z.infer<typeof formSchema>) {
    const newEvent = {
      id: crypto.randomUUID(),
      title: values.title,
      start: new Date(values.start),
      end: new Date(values.end),
      color: values.color,
      allDay: values.allDay,
      recurrence: values.recurrence,
      recurrenceCustom: values.recurrenceCustom,
      location: values.location,
      alert: values.alert,
      alertOffset: values.alertOffset ?? 0,
      description: values.description,
      syncStatus: values.syncStatus ?? 'local',
    }

    if (api?.create) {
      api
        .create(newEvent as any)
        .catch((err) => console.error('Failed to save event', err))
    } else {
      setEvents([...events, newEvent])
    }
    setNewEventDialogOpen(false)
    form.reset()
  }

  return (
    <Dialog open={newEventDialogOpen} onOpenChange={setNewEventDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('dialogCreateTitle')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">
                    {t('dialogFieldTitle')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        resolvedLanguage === 'ko' ? '일정 제목' : 'Event title'
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="start"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">
                    {t('dialogFieldStart')}
                  </FormLabel>
                  <FormControl>
                    <DateTimePicker field={field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="end"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">
                    {t('dialogFieldEnd')}
                  </FormLabel>
                  <FormControl>
                    <DateTimePicker field={field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">
                    {t('dialogFieldColor')}
                  </FormLabel>
                  <FormControl>
                    <ColorPicker field={field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="allDay"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-3">
                    <FormLabel className="font-bold mb-0">종일</FormLabel>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="h-4 w-4"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recurrence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">반복</FormLabel>
                    <FormControl>
                      <select
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        {...field}
                      >
                        <option value="none">반복 안 함</option>
                        <option value="daily">매일</option>
                        <option value="weekly">매주</option>
                        <option value="monthly">매월</option>
                        <option value="yearly">매년</option>
                        <option value="custom">맞춤설정</option>
                      </select>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">위치</FormLabel>
                  <FormControl>
                    <Input placeholder="장소를 입력하세요" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="alert"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">알림</FormLabel>
                  <FormControl>
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      {...field}
                    >
                      <option value="none">없음</option>
                      <option value="5m">5분 전</option>
                      <option value="10m">10분 전</option>
                      <option value="15m">15분 전</option>
                      <option value="30m">30분 전</option>
                      <option value="1h">1시간 전</option>
                      <option value="1d">1일 전</option>
                      <option value="custom">맞춤설정</option>
                    </select>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">설명</FormLabel>
                  <FormControl>
                    <textarea
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit">{t('dialogSubmitCreate')}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
