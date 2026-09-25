import { Icon, type IconName } from '@/components/ui/Icon';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { LinkButton } from '@/components/ui/LinkButton';
import { useI18n } from '@/i18n/locale';
import { loginPath } from '@/routes/paths';
import { cn } from '@/lib/cn';

function SectionHeading({ id, eyebrow, title, body, inverse }: { id: string; eyebrow: string; title: string; body?: string; inverse?: boolean }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className={cn('m-0 text-sm font-semibold', inverse ? 'text-[#8fd6b3]' : 'text-brand')}>{eyebrow}</p>
      <h2 id={id} className={cn('mb-0 mt-3 text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl', inverse ? 'text-white' : 'text-ink')}>
        {title}
      </h2>
      {body && <p className={cn('mb-0 mt-4 text-pretty text-base leading-relaxed sm:text-lg', inverse ? 'text-[#c5dcd1]' : 'text-subtle')}>{body}</p>}
    </div>
  );
}

export function Features() {
  const { t } = useI18n();
  return (
    <section id="features" aria-labelledby="features-title" className="scroll-mt-20 border-t border-line/70 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading id="features-title" eyebrow={t.features.eyebrow} title={t.features.title} body={t.features.body} />
        <ul className="m-0 mt-14 grid list-none gap-px overflow-hidden rounded-2xl border border-line bg-line p-0 sm:grid-cols-2 lg:grid-cols-4">
          {t.features.items.map(item => (
            <li key={item.title} className="group flex gap-4 bg-white p-5 transition-colors duration-200 hover:bg-[#fbfcfa] sm:block sm:p-6">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mint text-brand ring-1 ring-[#d3e8db] transition-transform duration-200 group-hover:-translate-y-0.5">
                <Icon name={item.icon as IconName} size={20} />
              </span>
              <div>
                <h3 className="m-0 text-base font-bold text-ink sm:mt-5">{item.title}</h3>
                <p className="mb-0 mt-1.5 text-sm leading-relaxed text-subtle sm:mt-2">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const { t } = useI18n();
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading id="how-title" eyebrow={t.how.eyebrow} title={t.how.title} />
        <div className="relative mt-14">
          {/* connector line between the numbered steps (desktop) */}
          <div aria-hidden="true" className="absolute inset-x-[16.6%] top-6 hidden h-px bg-linear-to-r from-transparent via-[#cfe0d5] to-transparent md:block" />
          <ol className="relative m-0 grid list-none gap-10 p-0 md:grid-cols-3 md:gap-8">
          {t.how.steps.map((step, i) => (
            <li key={step.title} className="relative text-center">
              <span className="relative mx-auto grid size-12 place-items-center rounded-full border border-[#cfe3d6] bg-white text-lg font-bold text-brand shadow-lift">
                {i + 1}
              </span>
              <h3 className="mb-0 mt-5 text-lg font-bold text-ink">{step.title}</h3>
              <p className="mx-auto mb-0 mt-2 max-w-xs text-sm leading-relaxed text-subtle">{step.body}</p>
            </li>
          ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

export function Workflow() {
  const { t } = useI18n();
  const steps = t.workflow.steps;
  return (
    <section aria-labelledby="workflow-title" className="relative overflow-hidden bg-brand-night py-20 sm:py-24">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,#1f6b5233,transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading id="workflow-title" eyebrow={t.workflow.eyebrow} title={t.workflow.title} inverse />
        <ol className="m-0 mt-12 flex list-none flex-col items-stretch gap-3 p-0 lg:flex-row lg:items-center lg:justify-center lg:gap-2">
          {steps.map((step, i) => (
            <li key={step.label} className="flex flex-col items-center gap-3 lg:flex-row lg:gap-2">
              <div className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-medium text-white lg:w-auto">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-[#8fd6b3]">
                  <Icon name={step.icon as IconName} size={16} />
                </span>
                {step.label}
              </div>
              {i < steps.length - 1 && (
                /* stacked on small screens: point down (the RTL-mirrored arrow needs the opposite turn) */
                <span aria-hidden="true" className="text-[#5f8f7c] max-lg:rotate-90 max-lg:rtl:-rotate-90">
                  <Icon name="arrow" size={16} />
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Benefits() {
  const { t } = useI18n();
  return (
    <section aria-labelledby="benefits-title" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading id="benefits-title" eyebrow={t.benefits.eyebrow} title={t.benefits.title} />
        <ul className="m-0 mt-14 grid list-none gap-x-10 gap-y-10 p-0 sm:grid-cols-2">
          {t.benefits.items.map(item => (
            <li key={item.title} className="flex gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-white text-brand shadow-lift">
                <Icon name={item.icon as IconName} size={20} />
              </span>
              <div>
                <h3 className="m-0 text-base font-bold text-ink">{item.title}</h3>
                <p className="mb-0 mt-1.5 text-sm leading-relaxed text-subtle">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function CallToAction() {
  const { t } = useI18n();
  return (
    <section aria-labelledby="cta-title" className="px-4 pb-20 sm:px-6 sm:pb-28">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-linear-to-br from-brand-deep via-brand to-[#2f8a68] px-6 py-14 text-center shadow-hero sm:px-12 sm:py-16">
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <span className="inline-flex rounded-2xl bg-white p-2.5 shadow-lift">
            <BrandLogo size={44} />
          </span>
          <h2 id="cta-title" className="mb-0 mt-6 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {t.cta.title}
          </h2>
          <p className="mx-auto mb-0 mt-3 max-w-xl text-base text-[#d6ece1]">{t.cta.body}</p>
          <LinkButton to={loginPath({ mode: 'signup' })} size="lg" variant="inverse" className="mt-8">
            {t.cta.button} <Icon name="arrow" size={18} />
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
