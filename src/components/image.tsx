import Image from "next/image";

export default function ImageWrapper({ file, className }: {file: File, className?: string}) {
  let src = URL.createObjectURL(file)

  // if (file && file.type.startsWith('image/')) {
  //   const reader = new FileReader()
  //   reader.onload = (e) => {
  //     if (e.target) {
  //       src = e.target.result as string
  //     }
  //   }
  //   reader.readAsDataURL(file)
  // }


  return (
    <Image
      src={src}
      alt={file.name}
      width={100}
      height={100}
      className={className}
    />
  )
}