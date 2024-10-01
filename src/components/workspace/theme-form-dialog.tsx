import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import type { ThemeContent } from '@/types/common'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { themeTemplates } from '@/lib/constants'

const formSchema = z.object({
  title: z.string(),
  content: z.string(),
  theme: z.string(),
})

interface ThemeFormProps {
  onSubmit: (content: ThemeContent) => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void
}

export function ThemeFormDialog({ onSubmit, onOpenChange, open }: ThemeFormProps) {
  // Define a form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
    },
  })

  async function handleContentSubmit(values: z.infer<typeof formSchema>) {
    const content = {
      title: values.title,
      content: values.content,
      theme: values.theme,
    } as ThemeContent
    await onSubmit(content)
    // reset dialog state
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-2xl mb-4">新建项目</DialogTitle>
          <DialogDescription className="hidden">
            save as images
          </DialogDescription>
        </DialogHeader>
        <div className="w-full h-full">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleContentSubmit)} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    {/* <FormLabel>项目名称</FormLabel> */}
                    <FormControl>
                      <Input
                        {...field}
                        type="title"
                        required
                        placeholder="项目名称"
                        className="h-12"
                      />
                    </FormControl>
                    {/* <FormDescription>This is your email</FormDescription> */}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    {/* <FormLabel>副标题</FormLabel> */}
                    <FormControl>
                      <Input
                        {...field}
                        type="content"
                        placeholder="描述"
                        className="h-12"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="theme"
                render={({ field }) => (
                  <FormItem>
                    {/* <FormLabel>模版</FormLabel> */}
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 placeholder:text-muted-foreground">
                          <SelectValue placeholder="选择模版" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          {themeTemplates.map(template => (
                            <SelectItem key={template.value} value={template.value} disabled={template.disabled}>
                              {template.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="mt-8 h-12">保存</Button>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
