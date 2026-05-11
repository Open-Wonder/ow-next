'use client';

import { usePathname } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import TopBar from '@/components/layout/TopBar/TopBar';
import HistorySidebar from '@/components/layout/HistorySidebar/HistorySidebar';
import ViewTransition from '@/components/layout/ViewTransition/ViewTransition';
import ChatLanding from '@/components/chat/ChatLanding/ChatLanding';
import EditCanvas from '@/components/chat/EditCanvas/EditCanvas';
import LibraryView from '@/components/library/LibraryView/LibraryView';
import ManageListView from '@/components/manage/ManageListView/ManageListView';
import ImageStyleModal from '@/components/manage/ManagerModal/ImageStyleModal';
import ProductsModal from '@/components/manage/ManagerModal/ProductsModal';
import CharactersModal from '@/components/manage/ManagerModal/CharactersModal';
import { ChatProvider, useChat } from '@/lib/chat-context';
import { BrandProvider } from '@/lib/brand-context';
import styles from './layout.module.css';

function CreateView() {
  const { state } = useChat();
  const hasImageSession =
    (state.mode === 'imagine' ||
      state.mode === 'product' ||
      state.mode === 'character' ||
      state.mode === 'create') &&
    state.currentSession &&
    (state.currentSession.messages.length > 0 || state.currentSession.generatedAssets.length > 0);
  const showSplitCanvas =
    state.canvasOpen && !hasImageSession;

  return (
    <div className={styles.createView}>
      <div className={showSplitCanvas ? styles.splitLayout : styles.fullLayout}>
        <div className={showSplitCanvas ? styles.chatPanel : styles.chatPanelFull}>
          <ChatLanding />
        </div>
        <AnimatePresence>
          {showSplitCanvas && (
            <div className={styles.canvasPanel}>
              <EditCanvas />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function LibraryPanel() {
  return (
    <div className={styles.libraryView}>
      <LibraryView />
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className={styles.libraryView}>
      <ManageListView />
    </div>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state } = useChat();
  const isManageRoute = pathname === '/manage' || pathname?.startsWith('/manage/');

  return (
    <div className={styles.shell}>
      <HistorySidebar />
      <div className={styles.contentArea}>
        <TopBar />
        <div className={styles.main}>
          {isManageRoute ? (
            <main className={styles.manageOutlet}>{children}</main>
          ) : (
            <ViewTransition
              createView={<CreateView />}
              libraryView={<LibraryPanel />}
              settingsView={<SettingsPanel />}
            />
          )}
        </div>
      </div>
      <AnimatePresence>
        {state.activeManagerModal === 'imageStyle' && <ImageStyleModal key="imageStyle" />}
        {state.activeManagerModal === 'products' && <ProductsModal key="products" />}
        {state.activeManagerModal === 'characters' && <CharactersModal key="characters" />}
      </AnimatePresence>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <BrandProvider>
      <ChatProvider>
        <AppShell>{children}</AppShell>
      </ChatProvider>
    </BrandProvider>
  );
}
