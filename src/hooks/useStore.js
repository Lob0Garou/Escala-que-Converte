import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FLAGS } from '../lib/featureFlags';

/**
 * useStore — Carrega e gerencia as lojas do usuário autenticado.
 *
 * Se REQUIRE_AUTH=false ou supabase=null, retorna stores=[] e activeStore=null
 * sem fazer nenhuma requisição.
 */
export const useStore = (user, preferredStoreId = null) => {
  const [stores, setStores]           = useState([]);
  const [activeStore, setActiveStore] = useState(null);
  const [isLoading, setIsLoading]     = useState(false);
  const [storeError, setStoreError]   = useState(null);

  // Carrega lojas quando o usuário autentica
  useEffect(() => {
    if (!FLAGS.REQUIRE_AUTH || !supabase || !user) {
      setIsLoading(false);
      return;
    }

    const loadStores = async () => {
      setIsLoading(true);
      setStoreError(null);

      try {
        // Busca todas as lojas onde o usuário é membro
        const { data, error } = await supabase
          .from('store_members')
          .select(`
            role,
            stores (
              id, name, brand, timezone, open_hour, close_hour, owner_id, created_at
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { foreignTable: 'stores', ascending: false });

        if (error) throw error;

        const storeList = (data || [])
          .map((m) => ({ ...m.stores, role: m.role }))
          .filter(Boolean);

        setStores(storeList);

        // Restaura a última loja selecionada do localStorage
        const lastStoreId = localStorage.getItem('eqc_active_store_id');
        const preferredStore = preferredStoreId
          ? storeList.find((s) => s.id === preferredStoreId)
          : null;

        const lastStore = lastStoreId
          ? storeList.find((s) => s.id === lastStoreId)
          : null;

        setActiveStore(preferredStore || lastStore || storeList[0] || null);
      } catch (err) {
        setStoreError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadStores();
  }, [preferredStoreId, user]);

  // Persiste a seleção de loja no localStorage
  const selectStore = useCallback((store) => {
    setActiveStore(store);
    if (store?.id) {
      localStorage.setItem('eqc_active_store_id', store.id);
    }
  }, []);

  const createStore = useCallback(async ({ name, brand, openHour, closeHour }) => {
    if (!supabase || !user) return { error: { message: 'Não autenticado.' } };
    setStoreError(null);

    const { data, error } = await supabase.rpc('create_store', {
      p_name:       name,
      p_brand:      brand || null,
      p_open_hour:  openHour  ?? 8,
      p_close_hour: closeHour ?? 22,
    });

    if (error) {
      setStoreError(error.message);
      return { error };
    }

    // A RPC retorna um array — pegamos o primeiro item
    const newStore = Array.isArray(data) ? { ...data[0], role: 'owner' } : { ...data, role: 'owner' };
    setStores((prev) => [newStore, ...prev]);
    setActiveStore(newStore);
    localStorage.setItem('eqc_active_store_id', newStore.id);
    return { data: newStore };
  }, [user]);


  const deleteStore = useCallback(async (storeId) => {
    if (!supabase || !user) return { error: { message: 'Não autenticado.' } };
    setStoreError(null);

    const { error } = await supabase
      .from('stores')
      .delete()
      .eq('id', storeId);

    if (error) {
      setStoreError(error.message);
      return { error };
    }

    setStores((prev) => {
      const remaining = prev.filter((s) => s.id !== storeId);
      
      // Se deletou a loja ativa, muda para a próxima (ou null) no activeStore
      setActiveStore((currentActive) => {
        if (currentActive?.id === storeId) {
          const nextStore = remaining[0] || null;
          if (nextStore) {
            localStorage.setItem('eqc_active_store_id', nextStore.id);
          } else {
            localStorage.removeItem('eqc_active_store_id');
          }
          return nextStore;
        }
        return currentActive;
      });

      return remaining;
    });

    return { data: true };
  }, [user]);

  return {
    stores,
    activeStore,
    isLoading,
    storeError,
    selectStore,
    createStore,
    deleteStore,

  };
};

export default useStore;
