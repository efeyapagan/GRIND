import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { i18nBaslat } from '@grind/shared/i18n';
import './index.css';
import { sistemDinleyicisiKur, temayiTazele } from './lib/tema';
import { etkinDil } from './lib/dil';
import { AuthProvider } from './auth/AuthContext';
import { router } from './routes';

const sorguIstemcisi = new QueryClient();

// #177: dil ilk render'dan once cozulur -- kaynaklar paketin icinde, yanip sonen dil yok.
const dil = etkinDil();
i18nBaslat(dil);
document.documentElement.lang = dil;

// #178: index.html'deki satir ici script temayi ilk boyadan once zaten yazdi; burada tekrar
// cozulmesi o script'in yoksayilmasi ihtimaline karsi ucuz bir guvenlik agidir. Dinleyici uygulama
// omru boyunca yasar (temizleyicisi bilerek cagrilmaz).
temayiTazele();
sistemDinleyicisiKur();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={sorguIstemcisi}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
