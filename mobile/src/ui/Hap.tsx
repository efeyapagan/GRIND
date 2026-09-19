import { Text } from 'react-native';

/** Kucuk bilgi hapi (orn. "RIR 2"). */
export default function Hap({ children }: { children: React.ReactNode }) {
  return (
    <Text className="shrink-0 rounded bg-surface-3 px-2 py-1 text-label text-muted">{children}</Text>
  );
}
