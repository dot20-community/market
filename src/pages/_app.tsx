import { NextUIProvider } from "@nextui-org/react";
import { type AppType } from "next/app";
import { Inter } from "next/font/google";
import "~/styles/globals.css";
import { api } from "~/utils/api";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <main className={`font-san ${inter.variable}`}>
      <NextUIProvider>
        <Component {...pageProps} />
      </NextUIProvider>
    </main>
  );
};

export default api.withTRPC(MyApp);
