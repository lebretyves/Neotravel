import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, Lock, ShieldCheck, Users } from "lucide-react";
import { getLocalAdminEmail, isLocalAuthEnabled } from "@/shared/lib/auth/localAuth";
import { isDemoMode } from "@/shared/lib/demo/demoMode";
import { getAdminUser } from "@/shared/lib/supabase/auth-server";
import { AdminLoginForm } from "./AdminLoginForm";
import styles from "./admin-connexion.module.css";

export const metadata = {
  title: "Connexion administration — NeoTravel",
  description:
    "Espace administration NeoTravel : accès sécurisé au dashboard commercial, aux relances et à la revue humaine."
};

const features = [
  {
    icon: BarChart3,
    title: "Pilotage commercial",
    body: "Pipeline des demandes, devis, KPIs et croissance en un seul espace."
  },
  {
    icon: Users,
    title: "Revue humaine",
    body: "Traitez les cas sensibles escaladés et gardez la main sur les décisions."
  },
  {
    icon: ShieldCheck,
    title: "Accès sécurisé",
    body: "Authentification Supabase : seuls les comptes administrateurs entrent."
  }
];

type SearchParams = Promise<{ redirect?: string | string[] }>;

function safeRedirect(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  // Only allow internal redirects to avoid open-redirect abuse.
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/dashboard";
}

export default async function AdminConnexionPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const redirectTo = safeRedirect(params?.redirect);

  // If a session already exists, skip the login screen.
  if (isLocalAuthEnabled()) {
    const email = await getLocalAdminEmail();
    if (email) redirect(redirectTo);
  } else if (!isDemoMode()) {
    const user = await getAdminUser();
    if (user) redirect(redirectTo);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.logo} href="/" aria-label="NeoTravel accueil">
          <Image src="/logo-neotravel-v12.svg" alt="" width={250} height={72} priority />
        </Link>
        <Link className={styles.backLink} href="/">
          Retour accueil
        </Link>
      </header>

      <section className={styles.hero} aria-labelledby="admin-connexion-title">
        <div className={styles.copy}>
          <p className={styles.kicker}>Espace administration</p>
          <h1 id="admin-connexion-title">Dashboard commercial NeoTravel</h1>
          <p>
            Accédez au pilotage interne : demandes, qualification, devis déterministes, relances,
            revue humaine et audit. Réservé aux administrateurs NeoTravel.
          </p>
        </div>

        <AdminLoginForm redirectTo={redirectTo} />
      </section>

      <section className={styles.featureGrid} aria-label="Ce que couvre l'administration">
        {features.map((feature) => {
          const Icon = feature.icon;

          return (
            <article className={styles.featureCard} key={feature.title}>
              <span className={styles.iconWrap}>
                <Icon aria-hidden="true" size={24} />
              </span>
              <div>
                <h2>{feature.title}</h2>
                <p>{feature.body}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.trustBand}>
        <Lock aria-hidden="true" size={22} />
        <p>
          Connexion chiffrée. Les accès administration sont distincts de l&apos;espace client et
          tracés dans l&apos;audit NeoTravel.
        </p>
        <ShieldCheck aria-hidden="true" size={22} />
      </section>
    </main>
  );
}
