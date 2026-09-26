import { Link } from 'react-router';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { LoolifyAttribution } from '@/components/brand/LoolifyAttribution';
import { useI18n } from '@/i18n/locale';
import { ROUTES, loginPath } from '@/routes/paths';
import { LANDING_SECTIONS } from './sections';

const linkClass = 'text-sm text-subtle no-underline transition-colors hover:text-ink';

export function SiteFooter() {
  const { t } = useI18n();
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-brand-night/10 bg-paper">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 px-4 py-12 sm:grid-cols-[1.6fr_1fr_1fr] sm:px-6">
        <div className="col-span-2 sm:col-span-1">
          <Link to={ROUTES.home} className="inline-flex rounded-lg no-underline" aria-label="Study Planner">
            <BrandLogo size={30} withName nameClassName="text-base" />
          </Link>
          <p className="mb-0 mt-3 max-w-xs text-sm leading-relaxed text-subtle">{t.brandTagline}</p>
        </div>
        <nav aria-labelledby="footer-product">
          <h2 id="footer-product" className="m-0 text-sm font-semibold text-ink">
            {t.footer.product}
          </h2>
          <ul className="m-0 mt-3 grid list-none gap-2 p-0">
            {LANDING_SECTIONS.map(s => (
              <li key={s.id}>
                <a href={`#${s.id}`} className={linkClass}>
                  {t.nav[s.key]}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-labelledby="footer-account">
          <h2 id="footer-account" className="m-0 text-sm font-semibold text-ink">
            {t.footer.account}
          </h2>
          <ul className="m-0 mt-3 grid list-none gap-2 p-0">
            <li>
              <Link to={loginPath()} className={linkClass}>
                {t.nav.signIn}
              </Link>
            </li>
            <li>
              <Link to={loginPath({ mode: 'signup' })} className={linkClass}>
                {t.nav.getStarted}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-subtle sm:flex-row sm:px-6">
          <p className="m-0">
            © {year} <span dir="ltr">Study Planner</span>. {t.footer.rights}
          </p>
          <LoolifyAttribution label={t.developedBy} />
        </div>
      </div>
    </footer>
  );
}
