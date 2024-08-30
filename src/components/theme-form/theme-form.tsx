import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import type { ThemeContent } from '@/types/type'

const formSchema = z.object({
  title: z.string(),
  content: z.string(),
  theme: z.string(),
})

interface ThemeFormProps {
  onSubmit: (content: ThemeContent) => Promise<void>;
}

export function ThemeForm({ onSubmit }: ThemeFormProps) {
  // Define a form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
    },
  })

  function handleContentSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
    const content = {
      title: values.title,
      content: values.content,
      theme: values.theme,
    } as ThemeContent
    onSubmit(content)
  }

  return (
    <div className="w-full h-full max-w-sm mx-auto mt-48">
      <h2 className="text-2xl font-bold mb-4 text-center">新建项目</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleContentSubmit)}>
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>标题</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="title"
                    required
                    placeholder="请输入项目的标题"
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
                <FormLabel>副标题</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="content"
                    placeholder="请输入项目的副标题"
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
                <FormLabel>模版</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择一个主题模版" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="wechat_post">微信公众号长图推文</SelectItem>
                    <SelectItem value="red_post">小红书推文</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="mt-8">保存</Button>
        </form>
      </Form>
    </div>
  )
}
