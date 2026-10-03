import { render, screen } from '@testing-library/react-native';
import { History, Trophy } from 'lucide-react-native';
import ProfilSekmeleri from './ProfilSekmeleri';

jest.mock('expo-router', () => ({
  usePathname: () => '/profile/history',
  useRouter: () => ({ navigate: jest.fn() }),
}));

/**
 * #591: sekme cubugunun alt cizgisi NativeWind kenarligi (`border-surface-3`) degil SVG sac teli
 * (spec Karar 9 ince cizim dili).
 */
test('alt cizgi SVG ile cizilir', async () => {
  await render(
    <ProfilSekmeleri
      sekmeler={[
        { to: '/profile/history', etiketAnahtari: 'kabuk.sekmeGecmis', ikon: History },
        { to: '/profile/records', etiketAnahtari: 'kabuk.sekmeRekorlar', ikon: Trophy },
      ]}
    />,
  );

  expect(screen.getByTestId('profil-sekmeleri').props.className).not.toMatch(/border-surface/);
  expect(screen.getByTestId('profil-sekmeleri-cizgi')).toBeTruthy();
});
