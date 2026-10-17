import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import { AutoSync } from "@/components/auto-sync";
import { getSetting } from "@/lib/db";
import { countHomeworkDue, getCourses, getCurrentTrimester, getTrimesters } from "@/lib/queries";
import "./globals.css";

// Données locales qui changent à chaque action : toutes les pages sont rendues à la demande.
export const dynamic = "force-dynamic";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Carnet", template: "%s · Carnet" },
  description: "Tous tes cours, fichiers, contrôles et liens au même endroit.",
};

const themeScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const trimesters = getTrimesters();
  const courses = getCourses();
  const current = getCurrentTrimester();

  return (
    <html lang="fr" className={`${bricolage.variable} ${instrument.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <div className="lg:grid lg:grid-cols-[17rem_1fr]">
          <Sidebar
            trimesters={trimesters}
            courses={courses.map(({ id, name, color, trimester_id }) => ({ id, name, color, trimester_id }))}
            currentTrimesterId={current?.id ?? null}
            schoolYear={getSetting("school_year")}
            homeworkDue={countHomeworkDue()}
          />
          <main className="min-w-0 px-4 pb-16 pt-5 sm:px-6 lg:px-10 lg:pt-8">{children}</main>
        </div>
        <AutoSync />
      </body>
    </html>
  );
}
