import Section from "./ui/Section";

export default function Contact() {
  return (
    <Section
      id="contact"
      kicker="Contact"
      title="Let’s work together"
      subtitle="For roles in the UK (graduate/junior .NET, full stack, data-driven teams), reach out."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-slate-300/20 bg-slate-950/45 backdrop-blur p-5">
          <div className="text-sm font-semibold">Reach out</div>
          <p className="mt-3 text-xs text-gray-300 leading-6">
            Open to UK graduate/junior roles and software engineering opportunities.
          </p>
          <div className="mt-4 text-xs text-gray-200 space-y-2">
            <div><span className="text-gray-400">Email:</span> prathmeshwork01@gmail.com</div>
            <div><span className="text-gray-400">Phone:</span> +44 7727 091049</div>
            <div>
              <span className="text-gray-400">LinkedIn:</span>{" "}
              <a className="text-blue-200 underline decoration-dotted" href="https://www.linkedin.com/in/prathmesh-pawar-29b5a7228" target="_blank" rel="noreferrer">
                prathmesh-pawar-29b5a7228
              </a>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-300/20 bg-slate-950/45 backdrop-blur p-5">
          <div className="text-sm font-semibold">Message form</div>
          <p className="mt-2 text-xs text-gray-400">
            Front-end only (we can connect Formspree or a Next.js API route next).
          </p>
          <form className="mt-4 space-y-3">
            <input className="w-full rounded-xl bg-black/40 border border-slate-300/20 px-3 py-2 text-xs outline-none focus:border-blue-400/60"
              placeholder="Your name" />
            <input className="w-full rounded-xl bg-black/40 border border-slate-300/20 px-3 py-2 text-xs outline-none focus:border-blue-400/60"
              placeholder="Email" type="email" />
            <textarea className="w-full rounded-xl bg-black/40 border border-slate-300/20 px-3 py-2 text-xs outline-none focus:border-blue-400/60 min-h-[110px]"
              placeholder="Message" />
            <button type="button" className="text-xs rounded-full px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:brightness-110 transition">
              Send
            </button>
          </form>
        </div>
      </div>
    </Section>
  );
}
