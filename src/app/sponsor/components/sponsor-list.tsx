import { CircleUserRoundIcon } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
interface Sponsor {
  id: string
  name: string
  tier: 'diamond' | 'gold' | 'silver' | 'bronze'
  logo: string
  website: string
  description: string
  amount: number
}

const sponsors: Sponsor[] = [
  {
    id: '1',
    name: '微信用户 st***9',
    tier: 'bronze',
    logo: '/sponsors/tech-corp.png',
    website: '',
    description: 'oneimg 好用',
    amount: 66.66,
  },
]

const tierColors = {
  diamond: 'bg-violet-100 text-violet-800',
  gold: 'bg-yellow-100 text-yellow-800',
  silver: 'bg-gray-100 text-gray-800',
  bronze: 'bg-orange-100 text-orange-800',
}

const tierNames = {
  diamond: '钻石赞助者',
  gold: '金牌赞助者',
  silver: '银牌赞助者',
  bronze: '铜牌赞助者',
}

export function SponsorList() {
  return (
    <div className="rounded-md border md:w-[960px] mx-auto">
      <Table>
        <TableCaption className="mb-4">赞助时，您可以留下想分享的话语或宣传内容。</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Logo</TableHead>
            <TableHead>用户</TableHead>
            <TableHead>级别</TableHead>
            <TableHead>金额(¥)</TableHead>
            <TableHead className="hidden md:table-cell">备注</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sponsors.map(sponsor => (
            <TableRow key={sponsor.id}>
              <TableCell>
                <Button variant="ghost" className="">
                  <CircleUserRoundIcon className="w-6 h-6"/>
                </Button>
              </TableCell>
              <TableCell>
              <a
                href={sponsor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:underline">
                {sponsor.name}
                </a>
              </TableCell>
              <TableCell>
                <Badge className={tierColors[sponsor.tier]}>
                  {tierNames[sponsor.tier]}
                </Badge>
              </TableCell>
              <TableCell>
                {sponsor.amount}
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">
                {sponsor.description}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
