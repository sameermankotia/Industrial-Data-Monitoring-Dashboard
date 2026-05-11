import styles from './css/AuthBrand.module.css';

interface Props {
  title: string;
  subtitle: string;
}

export default function AuthBrand({ title, subtitle }: Props) {
  return (
    <div className={styles.brand}>
      <div className={styles.logo} aria-hidden="true">
        <span className={styles.logoText}>ID</span>
      </div>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>
    </div>
  );
}
