import { Redirect } from 'expo-router';

/** web/src/routes.tsx: `/profile` -> `/profile/records` (Rekorlar varsayilan sekme). */
export default function ProfileIndexRedirect() {
  return <Redirect href="/profile/records" />;
}
