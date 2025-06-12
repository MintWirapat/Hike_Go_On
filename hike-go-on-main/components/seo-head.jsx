export function SeoHead({ title, description, keywords, ogImage, ogUrl, noIndex = false }) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://hikegoon.com"
  const fullTitle = title ? `${title} | HikeGoon` : "HikeGoon - แพลตฟอร์มค้นหาสถานที่แคมป์ปิ้งในประเทศไทย"
  const fullDescription = description || "ค้นหาและจองสถานที่แคมป์ปิ้งที่ดีที่สุดในประเทศไทย พร้อมรีวิวจากผู้ใช้จริง"
  const fullKeywords = keywords || "แคมป์ปิ้ง, ท่องเที่ยว, เต็นท์, อุปกรณ์แคมป์, ธรรมชาติ, ประเทศไทย"
  const fullOgImage = ogImage || `${baseUrl}/og-image.jpg`
  const fullOgUrl = ogUrl || baseUrl

  return {
    title: fullTitle,
    description: fullDescription,
    keywords: fullKeywords,
    openGraph: {
      title: fullTitle,
      description: fullDescription,
      url: fullOgUrl,
      images: [
        {
          url: fullOgImage,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
      type: "website",
      locale: "th_TH",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: fullDescription,
      images: [fullOgImage],
    },
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  }
}
