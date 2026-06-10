import styles from '../index.module.less';

export default function TextList({ items }: { items?: string[] }) {
  if (!items?.length) {
    return <span className={styles.muted}>无</span>;
  }

  return (
    <ul className={styles.listBlock}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
