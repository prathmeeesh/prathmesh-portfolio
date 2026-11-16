import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "Prathmesh Pawar | Software Developer";
const description =
  "C#/.NET software developer with commercial ASP.NET MVC experience, hands-on ASP.NET Core and REST API project work, and interests in AI-enabled applications.";

export const metadata = {
  metadataBase: new URL("https://prathmesh-portfolio.vercel.app"),
  title,
  description,
  authors: [{ name: "Prathmesh Pawar" }],
  alternates: { canonical: "/" },
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "Prathmesh Pawar",
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/opengraph-image"],
  },
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
