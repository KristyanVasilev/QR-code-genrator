import { notFound } from "next/navigation";

// Непознат адрес под езиков префикс → страницата not-found на същия език
export default function CatchAll() {
  notFound();
}
