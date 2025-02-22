import Image from 'next/image'

export function SponsorHero() {
  return (
    <div className="mb-12">
      <div className="mb-8 text-center">
        <h1 className="mb-6 text-3xl font-bold tracking-tight">成为 OneIMG 的赞助者</h1>
        <p className="mb-2 text-lg">
          OneIMG 是采用 MIT 许可的开源项目，使用完全免费。
        </p>
        <p className="text-lg">
          项目维护和新功能开发需要大量努力，只有在赞助者的支持下才能持续进行。
        </p>
      </div>

      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
          <div className="flex-shrink-0 h-[330px]">
            <Image
              src="/images/alipay_qrcode.png"
              alt="赞助二维码"
              width={200}
              height={200}
              className="rounded-lg shadow-sm h-full"
            />
          </div>
          <div className="flex-shrink-0 h-[330px]">
            <Image
              src="/images/wechat_qrcode.png"
              alt="赞助二维码"
              width={200}
              height={200}
              className="rounded-lg shadow-sm h-full"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
