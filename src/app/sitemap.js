export default function sitemap() {
  return [
    ...["folio","observatory"].map(slug=>({url:`https://prathmesh-portfolio.vercel.app/work/${slug}`,changeFrequency:"monthly",priority:.7})),
    {
      url: "https://prathmesh-portfolio.vercel.app",
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
