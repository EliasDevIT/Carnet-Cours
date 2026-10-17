import type { Metadata } from "next";
import { LinksBoard } from "./links-board";
import { getCourses, getLinks } from "@/lib/queries";

export const metadata: Metadata = { title: "Liens" };

export default function LinksPage() {
  const courses = getCourses().map(({ id, name, color, trimester_name }) => ({ id, name, color, trimester_name }));
  return <LinksBoard links={getLinks()} courses={courses} />;
}
