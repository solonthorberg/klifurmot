import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
    // Sidebar
    sidebarOpen: boolean;
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;

    // Modals
    activeModal: string | null;
    modalData: unknown;
    openModal: (modal: string, data?: unknown) => void;
    closeModal: () => void;

    // Loading overlay
    globalLoading: boolean;
    setGlobalLoading: (loading: boolean) => void;
}

export const useUiStore = create<UiState>()(
    persist(
        (set) => ({
            // Sidebar
            sidebarOpen: true,
            toggleSidebar: () =>
                set((state) => ({ sidebarOpen: !state.sidebarOpen })),
            setSidebarOpen: (open) => set({ sidebarOpen: open }),

            // Modals
            activeModal: null,
            modalData: null,
            openModal: (modal, data = null) =>
                set({ activeModal: modal, modalData: data }),
            closeModal: () => set({ activeModal: null, modalData: null }),

            // Loading
            globalLoading: false,
            setGlobalLoading: (loading) => set({ globalLoading: loading }),
        }),
        {
            name: 'ui-storage',
            partialize: (state) => ({
                sidebarOpen: state.sidebarOpen,
            }),
        },
    ),
);
