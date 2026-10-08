import Link from 'next/link'
import { BellIcon, ChatIcon, CheckIcon, IdCardIcon, LogoMark, SparkleIcon, SyringeIcon } from '@/components/ui/Icons'
import { createClient } from '@/lib/supabase/server'

const FEATURES = [
  {
    icon: SyringeIcon,
    title: 'Every jab and deworming, in order',
    body: 'Copy the dates from the vet booklet once. SGPetCare works out the next booster and tells you when it is close, so you are not flipping through stamps at the counter.',
  },
  {
    icon: IdCardIcon,
    title: 'AVS licence that never lapses',
    body: 'Green, amber or red at a glance, with a reminder before the expiry. Works for dogs and for cats under the cat licensing rules.',
  },
  {
    icon: SparkleIcon,
    title: 'Vet notes in plain English',
    body: 'Paste the discharge summary or snap a photo of it. "1/2 tab PO BID x 5d" becomes "half a tablet by mouth, twice a day, for five days", with anything to follow up flagged.',
  },
  {
    icon: ChatIcon,
    title: 'Questions answered for Singapore',
    body: 'Safe walking times in this heat, tick and heartworm prevention, HDB pet rules, roughly what things cost. General guidance that knows where you live.',
  },
]

const STEPS = [
  { n: '1', title: 'Add your pet', body: 'Name, breed, birthday and a photo. The microchip and licence numbers if you have them nearby.' },
  { n: '2', title: 'Log what is in the booklet', body: 'The last vaccination and deworming are enough to start. Add vet visits as they happen.' },
  { n: '3', title: 'Get told before things are due', body: 'One email or push notification with everything coming up, two weeks ahead by default.' },
]

export default async function Landing() {
  let signedIn = false
  try {
    const {
      data: { user },
    } = await createClient().auth.getUser()
    signedIn = Boolean(user)
  } catch {
    signedIn = false
  }

  return (
    <div className="overflow-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 font-display text-[19px] font-bold tracking-tight">
          <LogoMark size={32} />
          SGPetCare
        </Link>
        <nav className="flex items-center gap-2">
          {signedIn ? (
            <Link href="/pets" className="btn-primary">
              Open my pets
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                Sign in
              </Link>
              <Link href="/signup" className="btn-primary">
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
          <div aria-hidden className="pointer-events-none absolute -right-40 -top-20 h-[520px] w-[520px] rounded-full bg-primary/10 blur-3xl" />
          <div className="relative">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/60 px-3 py-1 text-[12px] font-semibold text-primary-ink">
              Made for pet owners in Singapore
            </p>
            <h1 className="mt-5 font-display text-[42px] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              The vet booklet,
              <br />
              <span className="text-primary">without the guesswork.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-muted">
              Vaccinations, deworming, AVS licence renewals and vet visits for every pet in the house, in one place. You get a heads up before
              anything is due, and vet notes explained in words that make sense.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={signedIn ? '/pets' : '/signup'} className="btn-primary px-6 py-3 text-[15px]">
                {signedIn ? 'Open my pets' : 'Start with your first pet'}
              </Link>
              <a href="#how" className="btn-secondary px-6 py-3 text-[15px]">
                How it works
              </a>
            </div>
            <p className="mt-4 text-[13px] text-muted">Free for one pet. Sign in with Google.</p>
          </div>

          <HeroPreview />
        </section>

        <section className="border-y border-border bg-surface/70">
          <div className="mx-auto grid max-w-6xl gap-px px-5 py-16 sm:px-8 md:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="p-2 sm:p-6">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <f.icon size={22} />
                </span>
                <h2 className="mt-4 font-display text-xl font-bold tracking-tight">{f.title}</h2>
                <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-10 px-5 py-20 sm:px-8">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Ten minutes with the booklet, then it runs itself</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="card p-6">
                <span className="font-display text-4xl font-extrabold text-primary/30">{s.n}</span>
                <h3 className="mt-2 font-display text-lg font-bold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="card p-7">
              <p className="eyebrow">Free</p>
              <p className="mt-2 font-display text-4xl font-extrabold tracking-tight">$0</p>
              <ul className="mt-5 space-y-2.5 text-[14px]">
                {['1 pet', 'Vaccination, deworming and vet visit records', 'Due date reminders by email and push', 'Pet care questions'].map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <CheckIcon size={16} className="text-valid" /> {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card relative overflow-hidden border-primary/30 p-7 shadow-lift">
              <div aria-hidden className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-2xl" />
              <p className="eyebrow text-primary-ink">Pro</p>
              <p className="mt-2 font-display text-4xl font-extrabold tracking-tight">
                $4<span className="text-base font-semibold text-muted"> / month</span>
              </p>
              <ul className="relative mt-5 space-y-2.5 text-[14px]">
                {['Every pet in the house', 'Vet notes explained in plain English', 'AVS licence renewal reminders', 'Photos of invoices and certificates kept with each record'].map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <CheckIcon size={16} className="text-primary" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="flex items-center gap-2 font-semibold text-text">
            <LogoMark size={22} /> SGPetCare
          </p>
          <p className="max-w-xl leading-relaxed">
            SGPetCare is a record keeping tool, not veterinary advice. Always consult a licensed veterinarian for your pet&apos;s health
            concerns. Licence renewals are done with AVS on the NParks website.
          </p>
        </div>
      </footer>
    </div>
  )
}

/** A static mock of the pet page, so the first thing people see is the product. */
function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden>
      <div className="card rotate-[-1.5deg] p-5 shadow-lift">
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary-soft to-subtle text-3xl">🐕</span>
          <div>
            <p className="font-display text-2xl font-bold tracking-tight">Mochi</p>
            <p className="text-[13px] text-muted">Toy Poodle · 3 yrs 2 mths</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-valid/10 px-2.5 py-1 text-[11px] font-semibold text-valid ring-1 ring-valid/20">
            <span className="h-1.5 w-1.5 rounded-full bg-valid" /> Licence valid
          </span>
        </div>
        <div className="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {[
            { icon: SyringeIcon, t: 'DHPPi booster', d: 'Due in 9 days', c: 'text-expiring', bg: 'bg-expiring/10' },
            { icon: BellIcon, t: 'NexGard Spectra', d: 'Due in 3 weeks', c: 'text-muted', bg: 'bg-primary-soft text-primary' },
            { icon: IdCardIcon, t: 'AVS licence renewal', d: 'Due in 7 months', c: 'text-muted', bg: 'bg-primary-soft text-primary' },
          ].map((r) => (
            <div key={r.t} className="flex items-center gap-3 bg-surface px-4 py-3">
              <span className={`grid h-9 w-9 place-items-center rounded-xl ${r.bg} ${r.c}`}>
                <r.icon size={17} />
              </span>
              <p className="flex-1 text-[14px] font-semibold">{r.t}</p>
              <p className={`text-[12px] font-semibold ${r.c}`}>{r.d}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card absolute -bottom-10 -left-4 w-[78%] rotate-[2deg] p-4 shadow-lift sm:-left-10">
        <p className="eyebrow flex items-center gap-1.5 text-primary-ink">
          <SparkleIcon size={12} /> In plain English
        </p>
        <p className="mt-2 text-[13px] leading-relaxed">
          Give half a tablet of metronidazole by mouth twice a day for 5 days, with food. Book a recheck in a week if the tummy upset has not
          settled.
        </p>
      </div>
    </div>
  )
}
