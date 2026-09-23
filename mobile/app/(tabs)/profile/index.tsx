import { Redirect } from 'expo-router';

/** web/src/routes.tsx: `/profile` -> `/profile/history` (#283: Gecmis varsayilan sekme). */
export default function ProfileIndexRedirect() {
  return <Redirect href="/profile/history" />;
}
