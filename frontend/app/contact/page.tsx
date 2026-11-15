import Image from "next/image";
import { ContactForm } from "@/components/contact-form";
import { TornEdge } from "@/components/torn-edge";

export default function Page() {
  return (
    <div>
      <section className="relative isolate min-h-[380px] overflow-hidden text-white">
        <Image src="/hero-community.png" alt="" fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-teal/90 via-teal/70 to-teal/35" />
        <div className="relative mx-auto flex min-h-[380px] max-w-3xl flex-col items-center justify-center px-4 pb-16 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-orange">Contact us</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-6xl">
            Write to <span className="font-script text-5xl text-orange sm:text-7xl">us</span>.
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/90 sm:text-lg">
            Questions about an account, an organisation, or a listing can come through this page.
          </p>
        </div>
        <TornEdge />
      </section>

      <section className="relative z-10 -mt-14 mx-auto max-w-xl px-4 pb-20">
        <ContactForm />
      </section>
    </div>
  );
}
