import "./globals.css";

export const metadata = {
  title: "CI/CD Pipeline Generator",
  description: "AI-Powered CI/CD Pipeline Generator for Websites & Chrome Extensions (GitHub Actions)",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
