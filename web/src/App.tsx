import { Outlet } from 'react-router-dom';

/**
 * Korumalı alanın ortak yerleşim köküdür -- gerçek sayfa içeriği `routes.tsx`'teki alt
 * route'lardan `Outlet` ile gelir. Görsel tasarım bilerek yok (spec); bu bilerek bir
 * navigasyon çerçevesi bile eklemiyor, Task 3'ün kapsamı sadece kimlik + korumalı yönlendirme.
 */
export default function App() {
  return <Outlet />;
}
