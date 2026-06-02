import { Tag } from 'antd';
import styles from './index.module.less';

interface StatusTagProps {
  /** 业务状态原始值 */
  value: string;
  /** 状态 → Antd Tag color 映射 */
  colorMap: Record<string, string>;
  /** 状态 → 显示文案映射，缺失时回退到原始 value */
  labelMap: Record<string, string>;
}

/**
 * 通用状态 Tag。统一 bordered={false}，未匹配时使用 default 色与原始 value。
 */
export default function StatusTag({ value, colorMap, labelMap }: StatusTagProps) {
  return (
    <Tag color={colorMap[value] ?? 'default'} bordered={false} className={styles.tag}>
      {labelMap[value] ?? value}
    </Tag>
  );
}
